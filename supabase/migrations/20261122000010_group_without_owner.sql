-- ============================================================================
-- Vrienden mogen onderling afspreken zonder Nesibe.
--
-- Tot nu toe werd Nesibe altijd als deelnemer toegevoegd en moest zij elke
-- groepsactiviteit goedkeuren. Nu geldt:
--   * is ze niet getagd  -> ze doet niet mee en de afspraak staat meteen vast
--   * is ze wel getagd   -> het is haar tijd, dus zij bevestigt nog
-- ============================================================================

create or replace function public.create_group_activity(
  p_title text,
  p_category appt_category,
  p_description text,
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
  v_with_owner boolean;
  v_status appt_status;
begin
  if v_uid is null then raise exception 'Je bent niet ingelogd'; end if;

  if p_poll_options is not null and jsonb_array_length(p_poll_options) > 4 then
    raise exception 'Maximaal 4 datumopties, anders kiest niemand nog 😅';
  end if;

  if not v_has_poll then
    if p_starts_at is null or p_ends_at is null then
      raise exception 'Kies een moment, of laat iedereen stemmen';
    end if;
    if p_ends_at <= p_starts_at then raise exception 'Eindtijd moet na de starttijd liggen'; end if;
  end if;

  -- Deelnemers: de maker, wie hij tagt, en de leden van de getagde groepen.
  -- Nesibe zit er alleen bij als ze expliciet getagd is (of in zo'n groep zit).
  select array_agg(distinct x) into v_participants from (
    select v_uid as x
    union select unnest(coalesce(p_user_ids, '{}'::uuid[]))
    union select gm.user_id from group_members gm
      where gm.group_id = any(coalesce(p_group_ids, '{}'::uuid[]))
  ) s where x is not null;

  v_with_owner := v_owner is not null and v_owner = any(v_participants);

  v_status := case
    -- Zolang de datum nog niet vastligt is er niets om te bevestigen.
    when v_has_poll then 'pending'::appt_status
    -- Nesibe's tijd blijft via Nesibe lopen.
    when v_with_owner and v_uid <> v_owner then 'pending'::appt_status
    -- Onder vrienden: meteen geregeld.
    else 'accepted'::appt_status
  end;

  insert into appointments (
    type, title, category, description, created_by,
    starts_at, ends_at, location_name, location_address, lat, lng,
    has_poll, poll_closes_at, status, decided_at
  ) values (
    'group', p_title, p_category, p_description, v_uid,
    case when v_has_poll then null else p_starts_at end,
    case when v_has_poll then null else p_ends_at end,
    p_location_name, p_location_address, p_lat, p_lng,
    v_has_poll,
    case when v_has_poll then coalesce(p_poll_closes_at, now() + interval '48 hours') else null end,
    v_status,
    case when v_status = 'accepted' then now() else null end
  ) returning id into v_id;

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
      values (v_id, (v_option ->> 'starts_at')::timestamptz, (v_option ->> 'ends_at')::timestamptz);
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

-- Zonder Nesibe is er geen eigenaar die de poll afsluit: laat de maker dat
-- doen, en Nesibe alleen als zij erbij hoort.
create or replace function public.finalize_poll(p_id uuid, p_option uuid)
returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_appt appointments;
  v_option poll_options;
begin
  select * into v_appt from appointments where id = p_id;
  if not found then raise exception 'Die afspraak bestaat niet'; end if;
  if not v_appt.has_poll then raise exception 'Hier loopt geen poll'; end if;

  if v_appt.created_by <> auth.uid()
     and not (is_owner() and exists (
       select 1 from appointment_participants
       where appointment_id = p_id and user_id = auth.uid()
     ))
  then
    raise exception 'Alleen de maker kiest de datum';
  end if;

  select * into v_option from poll_options where id = p_option and appointment_id = p_id;
  if not found then raise exception 'Die optie hoort niet bij deze afspraak'; end if;

  update appointments
  set starts_at = v_option.starts_at,
      ends_at = v_option.ends_at,
      has_poll = false,
      poll_closes_at = null,
      status = 'accepted',
      decided_at = now()
  where id = p_id;

  perform private.notify(
    (select array_agg(user_id) from appointment_participants where appointment_id = p_id),
    'poll_finalized', 'group',
    '📅 Het wordt ' || private.fmt_dt(v_option.starts_at) || '!',
    v_appt.title,
    '/appointments/' || p_id,
    true
  );
end $$;
