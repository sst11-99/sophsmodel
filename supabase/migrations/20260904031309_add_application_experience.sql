alter table public.model_applications
  add column if not exists experience text
  check (experience is null or char_length(trim(experience)) <= 2000);

grant insert (experience) on table public.model_applications to anon;
