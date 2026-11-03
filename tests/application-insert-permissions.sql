-- Run with a migration-capable connection. Each synthetic insert and its trigger
-- effects are rolled back inside a subtransaction: no applicant or LINE event persists.
do $$
declare
  video_link text;
begin
  foreach video_link in array array[null::text, 'https://www.instagram.com/reel/example/'] loop
    begin
      set local role anon;
      insert into public.model_applications (
        id, division, full_name, date_of_birth, city, contact, email, social,
        contact_channels, social_channels, experience, experience_categories,
        experience_other, height_cm, bust_cm, waist_cm, hips_cm, shoe_eu,
        confirmed_accurate_and_adult, application_data_use_consent,
        opportunity_emails_opt_in, walking_video_url, photo_manifest
      ) values (
        gen_random_uuid(), 'female', 'Rollback-only intake regression',
        date '2000-01-01', 'Bangkok', 'Line: regression', 'regression@example.invalid', null,
        '{"Line":"regression"}', '{}', null, '{}', '{}', 170, 82, 64, 90, 38.5,
        true, true, false, video_link,
        '[{"slot":"face","path":"rollback-only/face.jpg","mime_type":"image/jpeg","size_bytes":100}]'
      );
      raise exception using errcode = 'ZX001', message = 'Roll back successful regression insert';
    exception when sqlstate 'ZX001' then
      null;
    end;
  end loop;
end;
$$;
