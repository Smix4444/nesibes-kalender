-- ============================================================================
-- Fix: create_group_activity liet een CASE met tekstwaarden los op de kolom
-- `status` (type appt_status). Postgres cast dat niet vanzelf, dus elke
-- groepsactiviteit faalde met:
--   column "status" is of type appt_status but expression is of type text
-- Gevonden door scripts/test-flows.ts tegen de echte database.
-- ============================================================================

create or replace function public.create_group_activity(
  p_title text,
  p_category appt_category,
  p_description text,
  -- null als er een datumpoll loopt: dan kiest de groep het moment nog
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_location_name text default null,
  p_location_address text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_user_ids uuid[] default '{}',
  p_group_ids uuid[] default '{}',
  p_poll_options jsonb default null,
  p_poll_closes_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid := private.owner_id();
  v_id uuid;
  v_has_poll boolean := p_poll_options is not null and jsonb_array_length(p_poll_options) >= 2;
  v_name text;
  v_option jsonb;
  v_participants uuid[];
begin
  if v_uid is null then raise exception 'Je bent niet ingelogd'; end if;
  if v_owner is null then raise exception 'Er is nog geen Nesibe-account 🤔'; end if;

  if p_poll_options is not null and jsonb_array_length(p_poll_options) > 4 then
    raise exception 'Maximaal 4 datumopties, anders kiest niemand nog 😅';
  end if;

  if not v_has_poll then
    if p_starts_at is null or p_ends_at is null then
      raise exception 'Kies een moment, of laat iedereen stemmen';
    end if;
    if p_ends_at <= p_starts_at then raise exception 'Eindtijd moet na de starttijd liggen'; end if;
  end if;

  insert into appointments (
    type, title, category, description, created_by,
    starts_at, ends_at, location_name, location_address, lat, lng,
    has_poll, poll_closes_at,
    -- Maakt Nesibe het zelf, dan staat het meteen vast.
    status
  ) values (
    'group', p_title, p_category, p_description, v_uid,
    case when v_has_poll then null else p_starts_at end,
    case when v_has_poll then null else p_ends_at end,
    p_location_name, p_location_address, p_lat, p_lng,
    v_has_poll,
    case when v_has_poll then coalesce(p_poll_closes_at, now() + interval '48 hours') else null end,
    case when v_uid = v_owner and not v_has_poll then 'accepted'::appt_status else 'pending'::appt_status end
  ) returning id into v_id;

  -- Deelnemers: maker + Nesibe + getagde mensen + alle leden van de groepen.
  select array_agg(distinct x) into v_participants from (
    select v_uid as x
    union select v_owner
    union select unnest(coalesce(p_user_ids, '{}'::uuid[]))
    union select gm.user_id from group_members gm where gm.group_id = any(coalesce(p_group_ids, '{}'::uuid[]))
  ) s where x is not null;

  insert into appointment_participants (appointment_id, user_id, rsvp)
  select v_id, u, case when u = v_uid then 'going'::rsvp_status else 'invited'::rsvp_status end
  from unnest(v_participants) u
  on conflict do nothing;

  insert into appointment_groups (appointment_id, group_id)
  select v_id, g from unnest(coalesce(p_group_ids, '{}'::uuid[])) g
  on conflict do nothing;

  if v_has_poll then
    for v_option in select * from jsonb_array_elements(p_poll_options) loop
      insert into poll_options (appointment_id, starts_at, ends_at)
      values (
        v_id,
        (v_option ->> 'starts_at')::timestamptz,
        (v_option ->> 'ends_at')::timestamptz
      );
    end loop;
  end if;

  select display_name into v_name from profiles where id = v_uid;

  if v_has_poll then
    perform private.notify(
      v_participants, 'group_poll', 'group',
      '🗳️ Stem mee: ' || p_title,
      'Wanneer komt het jou best uit?',
      '/appointments/' || v_id
    );
  else
    perform private.notify(
      v_participants, 'group_invite', 'group',
      '🎉 ' || v_name || ' nodigt je uit: ' || p_title,
      private.fmt_dt(p_starts_at),
      '/appointments/' || v_id
    );
  end if;

  return v_id;
end $$;

revoke execute on function public.create_group_activity(
  text, appt_category, text, timestamptz, timestamptz, text, text,
  double precision, double precision, uuid[], uuid[], jsonb, timestamptz
) from public, anon;
grant execute on function public.create_group_activity(
  text, appt_category, text, timestamptz, timestamptz, text, text,
  double precision, double precision, uuid[], uuid[], jsonb, timestamptz
) to authenticated;
