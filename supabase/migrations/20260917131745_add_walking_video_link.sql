alter table public.model_applications
  add column walking_video_url text
  constraint walking_video_url_safe check (
    walking_video_url is null or (
      length(walking_video_url) <= 1500
      and walking_video_url ~* '^https://[a-z0-9.-]+\.[a-z]{2,}([/?#][^[:space:]]*)?$'
    )
  );
