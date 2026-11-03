-- No applicant data or secrets belong in this migration.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.line_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.model_applications(id),
  dispatch_token text not null default encode(extensions.gen_random_bytes(32),'hex'),
  created_at timestamptz not null default now(),
  state text not null default 'pending' check(state in ('pending','processing','delivered','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  delivered_at timestamptz,
  last_error text,
  line_request_id text
);
alter table private.line_application_events enable row level security;
revoke all on private.line_application_events from public,anon,authenticated;
grant select,update on private.line_application_events to service_role;
create index line_application_events_due on private.line_application_events(next_attempt_at) where state in ('pending','processing');

create function private.queue_line_application() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into private.line_application_events(application_id) values(new.id) on conflict(application_id) do nothing;
  return new;
end;
$$;
revoke all on function private.queue_line_application() from public,anon,authenticated;

-- Invoker rights: only service_role may call these RPCs or touch the private table.
create function public.claim_line_application_event(p_id uuid,p_token text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare e private.line_application_events;
begin
  update private.line_application_events set state='processing',attempts=attempts+1,
    lease_id=gen_random_uuid(),lease_until=now()+interval '3 minutes'
  where id=p_id and dispatch_token=p_token and state in ('pending','processing')
    and next_attempt_at<=now() and (lease_until is null or lease_until<now())
    and created_at>now()-interval '23 hours' and attempts<15 returning * into e;
  if e.id is null then return null; end if;
  return jsonb_build_object('id',e.id,'lease_id',e.lease_id,'application',
    (select to_jsonb(a) from public.model_applications a where a.id=e.application_id));
end;
$$;
create function public.finish_line_application_event(p_id uuid,p_lease uuid,p_success boolean,p_error text,p_request_id text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  update private.line_application_events set
    state=case when p_success then 'delivered' when attempts>=15 or created_at<now()-interval '23 hours' then 'failed' else 'pending' end,
    delivered_at=case when p_success then now() else null end,
    next_attempt_at=now()+make_interval(secs=>least(3600,(power(2,least(attempts,10))*30)::integer)),
    lease_until=null,last_error=left(p_error,100),line_request_id=left(p_request_id,200)
  where id=p_id and lease_id=p_lease and state='processing';
  return found;
end;
$$;
revoke all on function public.claim_line_application_event(uuid,text) from public,anon,authenticated;
revoke all on function public.finish_line_application_event(uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_line_application_event(uuid,text) to service_role;
grant execute on function public.finish_line_application_event(uuid,uuid,boolean,text,text) to service_role;
grant select on public.model_applications to service_role;

create function private.dispatch_line_applications() returns integer
language plpgsql security definer set search_path='' as $$
declare e record; dispatched integer:=0;
begin
  update private.line_application_events set state='failed',last_error='RETRY_WINDOW_EXPIRED'
    where state in ('pending','processing') and (created_at<now()-interval '23 hours' or attempts>=15)
    and (lease_until is null or lease_until<now());
  for e in select id,dispatch_token from private.line_application_events
    where state in ('pending','processing') and next_attempt_at<=now()
    and (lease_until is null or lease_until<now()) order by created_at limit 10
  loop
    perform net.http_post(
      url:='https://zyzwvrogeudwvackduau.supabase.co/functions/v1/application-line-alert',
      headers:='{"Content-Type":"application/json"}'::jsonb,
      body:=jsonb_build_object('job_id',e.id,'dispatch_token',e.dispatch_token),timeout_milliseconds:=60000);
    dispatched:=dispatched+1;
  end loop;
  return dispatched;
end;
$$;
revoke all on function private.dispatch_line_applications() from public,anon,authenticated;

-- Activation is separate: only after token/group/API checks pass.
-- create trigger queue_line_application after insert on public.model_applications
-- for each row execute function private.queue_line_application();
-- select cron.schedule('sophs-line-applications','* * * * *','select private.dispatch_line_applications();');
