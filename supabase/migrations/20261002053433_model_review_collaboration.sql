-- Separate model and agency choices. No shared passwords, public galleries or automatic account grants.
begin;
create schema if not exists review_private;
revoke all on schema review_private from public, anon, authenticated;
create table public.review_collections (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120), created_at timestamptz not null default now()
);
create table public.review_members (
 collection_id uuid references public.review_collections on delete cascade,
 email text not null check(email=lower(email) and length(email) between 3 and 254), role text not null check(role in ('model','agency')),
 primary key(collection_id,email)
);
create table public.review_photos (
 id uuid primary key default gen_random_uuid(), collection_id uuid not null references public.review_collections on delete cascade,
 storage_path text not null unique, original_name text not null check(length(original_name) between 1 and 255), photo_date text not null default '', ordinal integer not null default 0 check(ordinal>=0),
 uploaded_by uuid references auth.users, created_at timestamptz not null default now(),
 unique(collection_id,id), check(storage_path like collection_id::text||'/%' and storage_path !~ '\.\.' and length(storage_path)<400)
);
create table public.review_choices (
 collection_id uuid not null, photo_id uuid not null, side text not null check(side in ('model','agency')), selection jsonb not null,
 actor_user_id uuid references auth.users, revision bigint not null default 1, updated_at timestamptz not null default now(),
 primary key(collection_id,photo_id,side), foreign key(collection_id,photo_id) references public.review_photos(collection_id,id) on delete cascade,
 check(jsonb_typeof(selection)='object' and octet_length(selection::text)<16000),
 check(selection->>'decision' in ('keep','favourite','reject','unreviewed')),
 check(jsonb_typeof(selection->'types')='array' and jsonb_array_length(selection->'types')<=30),
 check(jsonb_typeof(selection->'uses')='array' and jsonb_array_length(selection->'uses')<=10),
 check(length(coalesce(selection->>'notes',''))<=4000)
);
create table public.review_links (
 id uuid primary key default gen_random_uuid(),collection_id uuid not null references public.review_collections on delete cascade,
 url text not null check(url ~ '^https?://' and length(url)<=4096),title text not null check(length(title)<=200),actor_user_id uuid not null references auth.users,created_at timestamptz not null default now()
);
create table public.review_changes (
 id bigint generated always as identity primary key,collection_id uuid not null,photo_id uuid not null,side text not null,
 actor_user_id uuid,previous_selection jsonb,next_selection jsonb not null,changed_at timestamptz not null default now(),revision bigint not null
);
create index review_members_email on public.review_members(email);
create index review_photos_collection on public.review_photos(collection_id,ordinal);
create index review_links_collection on public.review_links(collection_id);
create index review_changes_collection on public.review_changes(collection_id,changed_at desc);

alter table public.review_collections enable row level security;
alter table public.review_members enable row level security;
alter table public.review_photos enable row level security;
alter table public.review_choices enable row level security;
alter table public.review_links enable row level security;
alter table public.review_changes enable row level security;
revoke all on public.review_collections,public.review_members,public.review_photos,public.review_choices,public.review_links,public.review_changes from anon,authenticated;
grant select on public.review_collections,public.review_members,public.review_photos,public.review_choices,public.review_links,public.review_changes to authenticated;
grant insert on public.review_photos,public.review_links,public.review_choices to authenticated;
grant update(selection,actor_user_id) on public.review_choices to authenticated;
grant all on public.review_collections,public.review_members,public.review_photos,public.review_choices,public.review_links,public.review_changes to service_role;
grant usage,select on sequence public.review_changes_id_seq to service_role;
create policy own_membership on public.review_members for select to authenticated using(email=(select lower(auth.jwt()->>'email')));
create policy assigned_collections on public.review_collections for select to authenticated using(exists(select 1 from public.review_members m where m.collection_id=id));
create policy assigned_photos on public.review_photos for select to authenticated using(exists(select 1 from public.review_members m where m.collection_id=review_photos.collection_id));
create policy upload_assigned_photos on public.review_photos for insert to authenticated with check(uploaded_by=(select auth.uid()) and exists(select 1 from public.review_members m where m.collection_id=review_photos.collection_id));
create policy assigned_choices on public.review_choices for select to authenticated using(exists(select 1 from public.review_members m where m.collection_id=review_choices.collection_id));
create policy own_side_insert on public.review_choices for insert to authenticated with check(actor_user_id=(select auth.uid()) and exists(select 1 from public.review_members m where m.collection_id=review_choices.collection_id and m.role=side));
create policy own_side_update on public.review_choices for update to authenticated using(exists(select 1 from public.review_members m where m.collection_id=review_choices.collection_id and m.role=side)) with check(actor_user_id=(select auth.uid()) and exists(select 1 from public.review_members m where m.collection_id=review_choices.collection_id and m.role=side));
create policy assigned_links on public.review_links for select to authenticated using(exists(select 1 from public.review_members m where m.collection_id=review_links.collection_id));
create policy insert_assigned_links on public.review_links for insert to authenticated with check(actor_user_id=(select auth.uid()) and exists(select 1 from public.review_members m where m.collection_id=review_links.collection_id));
create policy assigned_history on public.review_changes for select to authenticated using(exists(select 1 from public.review_members m where m.collection_id=review_changes.collection_id));

-- Narrow trigger-only privilege: append-only audit, never exposed through the API.
create function review_private.record_choice_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.role()='authenticated' then
  if new.actor_user_id is distinct from auth.uid() then raise exception 'Incorrect actor' using errcode='42501';end if;
  if not exists(select 1 from public.review_members where collection_id=new.collection_id and email=lower(auth.jwt()->>'email') and role=new.side) then raise exception 'Not assigned to this version' using errcode='42501';end if;
 end if;
 if TG_OP='UPDATE' then
  if new.collection_id<>old.collection_id or new.photo_id<>old.photo_id or new.side<>old.side then raise exception 'Identity cannot change';end if;
  new.revision=old.revision+1;
 else new.revision=1;end if;
 new.updated_at=now();
 insert into public.review_changes(collection_id,photo_id,side,actor_user_id,previous_selection,next_selection,revision) values(new.collection_id,new.photo_id,new.side,new.actor_user_id,case when TG_OP='UPDATE' then old.selection else null end,new.selection,new.revision);
 return new;
end;$$;
revoke all on function review_private.record_choice_change() from public,anon,authenticated;
create trigger record_choice_change before insert or update on public.review_choices for each row execute function review_private.record_choice_change();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('model-review','model-review',false,26214400,array['image/jpeg','image/png','image/webp']);
create policy review_storage_read on storage.objects for select to authenticated using(bucket_id='model-review' and exists(select 1 from public.review_members m where m.collection_id::text=(storage.foldername(name))[1]));
create policy review_storage_upload on storage.objects for insert to authenticated with check(bucket_id='model-review' and exists(select 1 from public.review_members m where m.collection_id::text=(storage.foldername(name))[1]));
commit;
