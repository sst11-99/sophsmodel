-- Additive: old clients still work. Receipt capability never permits reading applicant data.
alter table public.model_applications add column receipt_token_hash text
  check (receipt_token_hash is null or receipt_token_hash ~ '^[0-9a-f]{64}$');
grant insert(receipt_token_hash) on public.model_applications to anon;
create function public.application_receipt(application_id uuid, receipt_token text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(
  select 1 from public.model_applications a
  where a.id=application_id
    and receipt_token ~ '^[0-9a-f]{64}$'
    and a.receipt_token_hash=encode(extensions.digest(receipt_token,'sha256'),'hex')
    and not exists(
      select 1 from jsonb_array_elements(a.photo_manifest) photo
      where split_part(photo->>'path','/',1) <> a.id::text
        or not exists(select 1 from storage.objects o
          where o.bucket_id='model-applications' and o.name=photo->>'path'
            and (o.metadata->>'size')::bigint=(photo->>'size_bytes')::bigint)
    )
 );
$$;
revoke all on function public.application_receipt(uuid,text) from public,anon,authenticated;
grant execute on function public.application_receipt(uuid,text) to anon;
comment on function public.application_receipt(uuid,text) is 'Returns only a boolean for a 256-bit client-held receipt capability; requires the row and all referenced uploads. No applicant data returned.';
