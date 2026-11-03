create table public.model_preference_invites (
 id uuid primary key default gen_random_uuid(), token_hash text unique not null,
 label text not null, expires_at timestamptz not null, max_submissions int not null default 100,
 revoked boolean not null default false
);
create table public.model_preference_submissions (
 id uuid primary key, invite_id uuid not null references public.model_preference_invites(id),
 application_id uuid references public.model_applications(id),
 name text not null check (length(name) between 1 and 100),
 interests jsonb not null, talents jsonb not null, note text not null check(length(note)<=1000),
 created_at timestamptz not null default now(), schema_version int not null default 1
);
alter table public.model_preference_invites enable row level security;
alter table public.model_preference_submissions enable row level security;
revoke all on public.model_preference_invites, public.model_preference_submissions from anon, authenticated;
grant all on public.model_preference_invites, public.model_preference_submissions to service_role;
create index on public.model_preference_submissions(invite_id, created_at);
create function public.submit_model_preferences(p_hash text, p_id uuid, p_name text, p_interests jsonb, p_talents jsonb, p_note text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare inv public.model_preference_invites; previous public.model_preference_submissions;
begin
 select * into inv from public.model_preference_invites where token_hash=p_hash and not revoked and expires_at>now() for update;
 if not found then return jsonb_build_object('error','invalid_invitation'); end if;
 if length(trim(p_name)) not between 1 and 100 or length(p_note)>1000 or jsonb_typeof(p_interests)<>'array' or jsonb_typeof(p_talents)<>'array' then return jsonb_build_object('error','invalid_input'); end if;
 if jsonb_array_length(p_interests)>30 or jsonb_array_length(p_talents)>30 or exists(select 1 from jsonb_array_elements(p_interests || p_talents) x where jsonb_typeof(x)<>'string' or length(x #>> '{}') not between 1 and 80) then return jsonb_build_object('error','invalid_input'); end if;
 select * into previous from public.model_preference_submissions where id=p_id;
 if found then
  if previous.invite_id=inv.id and previous.name=p_name and previous.interests=p_interests and previous.talents=p_talents and previous.note=p_note then return jsonb_build_object('saved',true,'id',p_id); end if;
  return jsonb_build_object('error','request_conflict');
 end if;
 if (select count(*) from public.model_preference_submissions where invite_id=inv.id)>=inv.max_submissions then return jsonb_build_object('error','invitation_limit'); end if;
 if (select count(*) from public.model_preference_submissions where invite_id=inv.id and created_at>now()-interval '1 minute')>=10 then return jsonb_build_object('error','try_later'); end if;
 insert into public.model_preference_submissions(id,invite_id,name,interests,talents,note) values(p_id,inv.id,p_name,p_interests,p_talents,p_note);
 return jsonb_build_object('saved',true,'id',p_id);
end $$;
revoke all on function public.submit_model_preferences(text,uuid,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_model_preferences(text,uuid,text,jsonb,jsonb,text) to service_role;
