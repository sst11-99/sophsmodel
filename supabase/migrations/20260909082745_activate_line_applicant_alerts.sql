-- Activated after signed LINE event verified the applicants group.
create trigger queue_line_application after insert on public.model_applications
for each row execute function private.queue_line_application();
select cron.schedule('sophs-line-applications','* * * * *','select private.dispatch_line_applications();');

-- User-authorized browser test was saved before activation. Queue it once.
insert into private.line_application_events(application_id)
select id from public.model_applications
where full_name='TEST — Mali Example (AI demo)'
  and email='mali.example@example.com' and source='website'
  and created_at::date=date '2026-09-09'
on conflict(application_id) do nothing;
