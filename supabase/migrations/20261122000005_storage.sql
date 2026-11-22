-- ============================================================================
-- NesiPlan — opslag
--   avatars   : publiek leesbaar, pad {user_id}/...
--   memories  : privé, pad {appointment_id}/{user_id}/{uuid}.jpg
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ------------------------------------------------------------- avatars ----

create policy "avatars zijn publiek leesbaar"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "eigen avatar uploaden"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "eigen avatar vervangen"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "eigen avatar verwijderen"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------ memories ----
-- De eerste map is de afspraak, de tweede de uploader. Alleen deelnemers van
-- die afspraak zien de foto's; uploaden mag enkel in je eigen map.

create policy "herinneringen zien als deelnemer"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_see_appointment(((storage.foldername(name))[1])::uuid)
  );

create policy "herinneringen uploaden als deelnemer"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'memories'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (
      select 1 from public.appointment_participants p
      where p.appointment_id = ((storage.foldername(name))[1])::uuid
        and p.user_id = auth.uid()
    )
  );

create policy "eigen herinneringen verwijderen"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'memories'
    and ((storage.foldername(name))[2] = auth.uid()::text or public.is_staff())
  );

-- ---------------------------------------------------- limiet op foto's ----

/** Max. foto's per persoon per afspraak (instelbaar in app_settings). */
create or replace function private.enforce_photo_limit() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_max int;
  v_count int;
begin
  select max_photos_per_user_per_appt into v_max from app_settings where id = 1;

  select count(*) into v_count
  from memories
  where appointment_id = new.appointment_id and user_id = new.user_id;

  if v_count >= v_max then
    raise exception 'Max % foto''s per afspraak, laat ook wat ruimte voor de rest 📸', v_max;
  end if;
  return new;
end $$;

create trigger memories_photo_limit before insert on public.memories
  for each row execute function private.enforce_photo_limit();
