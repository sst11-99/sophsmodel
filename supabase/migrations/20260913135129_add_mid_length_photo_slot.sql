-- Add one single-photo mid-length slot; retain every existing storage path.
alter table public.model_applications drop constraint model_applications_photo_manifest_check;
alter table public.model_applications add constraint model_applications_photo_manifest_check
  check (jsonb_typeof(photo_manifest) = 'array' and jsonb_array_length(photo_manifest) between 1 and 13);

alter policy "anonymous applicants can upload private photos" on storage.objects
with check (
  bucket_id = 'model-applications'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(face|mid-length|profile|full-length|jeans|other-one(-[2-4])?|other-two(-[2-4])?)\.(jpg|jpeg|png)$'
);
