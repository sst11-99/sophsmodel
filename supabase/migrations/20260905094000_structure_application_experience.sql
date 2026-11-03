alter table public.model_applications
  add column if not exists experience_categories text[] not null default '{}',
  add column if not exists experience_other text[] not null default '{}';

alter table public.model_applications
  add constraint model_applications_experience_categories_count
    check (cardinality(experience_categories) <= 24),
  add constraint model_applications_experience_categories_length
    check (char_length(array_to_string(experience_categories, '')) <= 1000),
  add constraint model_applications_experience_other_count
    check (cardinality(experience_other) <= 8),
  add constraint model_applications_experience_other_length
    check (char_length(array_to_string(experience_other, '')) <= 640);

grant insert (
  experience_categories,
  experience_other
) on table public.model_applications to anon;

create table public.experience_options (
  normalized_label text primary key
    check (normalized_label = lower(trim(normalized_label)) and char_length(normalized_label) between 1 and 80),
  label text not null
    check (label = trim(label) and char_length(label) between 1 and 80),
  source text not null default 'observed'
    check (source in ('default', 'observed')),
  submission_count integer not null default 0
    check (submission_count >= 0),
  is_active boolean not null default false,
  sort_order smallint,
  created_at timestamptz not null default now(),
  promoted_at timestamptz
);

insert into public.experience_options (
  normalized_label,
  label,
  source,
  submission_count,
  is_active,
  sort_order,
  promoted_at
)
values
  ('advertising', 'Advertising', 'default', 0, true, 10, now()),
  ('runway', 'Runway', 'default', 0, true, 20, now()),
  ('photo shoots', 'Photo shoots', 'default', 0, true, 30, now()),
  ('social media', 'Social media', 'default', 0, true, 40, now())
on conflict (normalized_label) do update set
  label = excluded.label,
  source = 'default',
  is_active = true,
  sort_order = excluded.sort_order,
  promoted_at = coalesce(public.experience_options.promoted_at, now());

create index experience_options_active_sort_idx
  on public.experience_options (is_active, sort_order, label);

alter table public.experience_options enable row level security;

revoke all on table public.experience_options from anon, authenticated;
grant select on table public.experience_options to anon;

create policy "public can read active experience options"
on public.experience_options
for select
to anon
using (is_active);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.record_experience_suggestions()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  submitted_label text;
  normalized_label_value text;
  display_label text;
begin
  for submitted_label in
    select distinct trim(regexp_replace(item, '\s+', ' ', 'g'))
    from unnest(coalesce(new.experience_other, '{}')) as item
    where char_length(trim(regexp_replace(item, '\s+', ' ', 'g'))) between 1 and 80
  loop
    normalized_label_value := lower(submitted_label);
    display_label := upper(left(normalized_label_value, 1)) || substr(normalized_label_value, 2);

    insert into public.experience_options (
      normalized_label,
      label,
      source,
      submission_count,
      is_active,
      promoted_at
    )
    values (
      normalized_label_value,
      display_label,
      'observed',
      1,
      false,
      null
    )
    on conflict (normalized_label) do update set
      submission_count = public.experience_options.submission_count + 1,
      is_active = public.experience_options.is_active
        or public.experience_options.submission_count + 1 >= 4,
      promoted_at = case
        when not public.experience_options.is_active
          and public.experience_options.submission_count + 1 >= 4
        then now()
        else public.experience_options.promoted_at
      end;
  end loop;

  return new;
end;
$$;

revoke all on function private.record_experience_suggestions() from public, anon, authenticated;

create trigger model_applications_record_experience
after insert on public.model_applications
for each row
when (cardinality(new.experience_other) > 0)
execute function private.record_experience_suggestions();

notify pgrst, 'reload schema';
