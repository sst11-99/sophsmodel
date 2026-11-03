create table public.model_applications (
  id uuid primary key,
  created_at timestamptz not null default now(),
  division text not null default 'female' check (division in ('female', 'male')),
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  date_of_birth date not null check (date_of_birth >= date '1900-01-01'),
  city text not null check (char_length(trim(city)) between 1 and 120),
  city_normalized text generated always as (lower(trim(city))) stored,
  contact text not null check (char_length(trim(contact)) between 3 and 240),
  email text not null check (char_length(trim(email)) between 3 and 320),
  social text check (social is null or char_length(trim(social)) <= 500),
  height_cm smallint not null check (height_cm between 145 and 200),
  bust_cm smallint not null check (bust_cm between 60 and 120),
  waist_cm smallint not null check (waist_cm between 45 and 110),
  hips_cm smallint not null check (hips_cm between 65 and 130),
  shoe_eu smallint not null check (shoe_eu between 34 and 46),
  photo_manifest jsonb not null check (
    jsonb_typeof(photo_manifest) = 'array'
    and jsonb_array_length(photo_manifest) between 1 and 6
  ),
  photo_count smallint generated always as (jsonb_array_length(photo_manifest)) stored,
  confirmed_accurate_and_adult boolean not null check (confirmed_accurate_and_adult),
  source text not null default 'website' check (source in ('website', 'manual', 'referral')),
  review_status text not null default 'new' check (review_status in ('new', 'reviewing', 'accepted', 'hold', 'declined')),
  ai_tags text[] not null default '{}',
  ai_profile jsonb not null default '{}',
  ai_summary text,
  last_reviewed_at timestamptz
);

create index model_applications_status_created_idx
  on public.model_applications (review_status, created_at desc);

create index model_applications_casting_idx
  on public.model_applications (division, city_normalized, height_cm);

create index model_applications_ai_tags_idx
  on public.model_applications using gin (ai_tags);

create index model_applications_ai_profile_idx
  on public.model_applications using gin (ai_profile);

alter table public.model_applications enable row level security;

revoke all on table public.model_applications from anon, authenticated;
grant usage on schema public to anon;
grant insert (
  id,
  division,
  full_name,
  date_of_birth,
  city,
  contact,
  email,
  social,
  height_cm,
  bust_cm,
  waist_cm,
  hips_cm,
  shoe_eu,
  photo_manifest,
  confirmed_accurate_and_adult
) on table public.model_applications to anon;

create policy "anonymous applicants can submit"
on public.model_applications
for insert
to anon
with check (
  date_of_birth <= (current_date - interval '18 years')::date
  and confirmed_accurate_and_adult
  and source = 'website'
  and review_status = 'new'
  and ai_tags = '{}'
  and ai_profile = '{}'
  and ai_summary is null
  and last_reviewed_at is null
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'model-applications',
  'model-applications',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "anonymous applicants can upload private photos"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'model-applications'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(face|profile|full-length|jeans|other-one|other-two)\.(jpg|jpeg|png)$'
);
