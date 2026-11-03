create table private.line_groups (
 group_id text primary key check(group_id ~ '^C[0-9a-f]{32}$'),
 name text not null,
 last_seen_at timestamptz not null default now()
);
alter table private.line_groups enable row level security;
revoke all on private.line_groups from public,anon,authenticated;
grant select,insert,update on private.line_groups to service_role;
create function public.record_line_group(p_group_id text,p_name text) returns void
language sql security invoker set search_path='' as $$
 insert into private.line_groups(group_id,name) values(p_group_id,left(p_name,200))
 on conflict(group_id) do update set name=excluded.name,last_seen_at=now();
$$;
revoke all on function public.record_line_group(text,text) from public,anon,authenticated;
grant execute on function public.record_line_group(text,text) to service_role;
