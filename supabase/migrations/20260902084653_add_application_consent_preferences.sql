alter table public.model_applications
  add column application_data_use_consent boolean not null default false,
  add column opportunity_emails_opt_in boolean not null default false;

grant insert (
  application_data_use_consent,
  opportunity_emails_opt_in
) on table public.model_applications to anon;

drop policy "anonymous applicants can submit"
on public.model_applications;

create policy "anonymous applicants can submit"
on public.model_applications
for insert
to anon
with check (
  date_of_birth <= (current_date - interval '18 years')::date
  and confirmed_accurate_and_adult
  and application_data_use_consent
  and source = 'website'
  and review_status = 'new'
  and ai_tags = '{}'
  and ai_profile = '{}'
  and ai_summary is null
  and last_reviewed_at is null
);
