-- The browser always sends this column, including null when no link is entered.
-- Keep anonymous access insert-only and preserve the existing RLS policy.
grant insert (walking_video_url) on public.model_applications to anon;
