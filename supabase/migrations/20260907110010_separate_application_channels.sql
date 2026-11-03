-- Preserve the legacy primary contact/social fields and existing insert-only RLS.
alter table public.model_applications
  add column contact_channels jsonb not null default '{}'::jsonb,
  add column social_channels jsonb not null default '{}'::jsonb,
  add constraint model_applications_contact_channels_valid check (
    jsonb_typeof(contact_channels) = 'object'
    and contact_channels - array['Line', 'WhatsApp', 'Phone']::text[] = '{}'::jsonb
    and (not contact_channels ? 'Line' or
      (jsonb_typeof(contact_channels->'Line') = 'string' and char_length(btrim(contact_channels->>'Line')) between 1 and 200))
    and (not contact_channels ? 'WhatsApp' or
      (jsonb_typeof(contact_channels->'WhatsApp') = 'string' and char_length(btrim(contact_channels->>'WhatsApp')) between 1 and 200))
    and (not contact_channels ? 'Phone' or
      (jsonb_typeof(contact_channels->'Phone') = 'string' and char_length(btrim(contact_channels->>'Phone')) between 1 and 200))
  ),
  add constraint model_applications_social_channels_valid check (
    jsonb_typeof(social_channels) = 'object'
    and social_channels - array['Instagram', 'TikTok', 'Facebook']::text[] = '{}'::jsonb
    and (not social_channels ? 'Instagram' or
      (jsonb_typeof(social_channels->'Instagram') = 'string' and char_length(btrim(social_channels->>'Instagram')) between 1 and 300))
    and (not social_channels ? 'TikTok' or
      (jsonb_typeof(social_channels->'TikTok') = 'string' and char_length(btrim(social_channels->>'TikTok')) between 1 and 300))
    and (not social_channels ? 'Facebook' or
      (jsonb_typeof(social_channels->'Facebook') = 'string' and char_length(btrim(social_channels->>'Facebook')) between 1 and 300))
  );

grant insert (contact_channels, social_channels)
  on table public.model_applications to anon;
