-- ============================================================================
-- NesiPlan — RPC's en business-logica
--
-- Regels:
--   * alles `security definer set search_path = public, private`
--   * interne helpers en jobs staan in schema `private` (niet via de API)
--   * foutmeldingen in het Nederlands: ze worden letterlijk als toast getoond
--   * "lokale datum" = (ts at time zone app_settings.timezone)::date
-- ============================================================================

-- ---------------------------------------------------------------- helpers --

create or replace function private.tz() returns text
language sql stable security definer set search_path = public as $$
  select timezone from app_settings where id = 1
$$;

/** Lokale datum (Europe/Brussels) van een tijdstip. */
create or replace function private.local_date(p_ts timestamptz) returns date
language sql stable security definer set search_path = public, private as $$
  select (p_ts at time zone private.tz())::date
$$;

/** "za 23/11 14:00" — Nederlandse dagafkorting, 24u-notatie. */
create or replace function private.fmt_dt(p_ts timestamptz) returns text
language plpgsql stable security definer set search_path = public, private as $$
declare
  v_local timestamp;
  v_days text[] := array['ma','di','wo','do','vr','za','zo'];
begin
  if p_ts is null then return '?'; end if;
  v_local := p_ts at time zone private.tz();
  return v_days[extract(isodow from v_local)::int] || ' ' || to_char(v_local, 'DD/MM HH24:MI');
end $$;

create or replace function private.category_emoji(c appt_category) returns text
language sql immutable as $$
  select case c
    when 'koffie' then '☕' when 'eten' then '🍝' when 'brunch' then '🥞'
    when 'shoppen' then '🛍️' when 'film' then '🎬' when 'sport' then '🏋️'
    when 'studeren' then '📚' when 'uitgaan' then '🪩' when 'wandelen' then '🚶‍♀️'
    when 'gaming' then '🎮' when 'selfcare' then '💅' else '✨' end
$$;

create or replace function private.category_label(c appt_category) returns text
language sql immutable as $$
  select case c
    when 'koffie' then 'koffie' when 'eten' then 'eten' when 'brunch' then 'brunch'
    when 'shoppen' then 'shoppen' when 'film' then 'film' when 'sport' then 'sport'
    when 'studeren' then 'studeren' when 'uitgaan' then 'uitgaan' when 'wandelen' then 'wandelen'
    when 'gaming' then 'gaming' when 'selfcare' then 'selfcare' else 'iets leuks' end
$$;

create or replace function private.category_verb(c appt_category) returns text
language sql immutable as $$
  select case c
    when 'koffie' then 'koffie drinken' when 'eten' then 'gaan eten'
    when 'brunch' then 'brunchen' when 'shoppen' then 'gaan shoppen'
    when 'film' then 'een film kijken' when 'sport' then 'gaan sporten'
    when 'studeren' then 'samen studeren' when 'uitgaan' then 'uitgaan'
    when 'wandelen' then 'gaan wandelen' when 'gaming' then 'gamen'
    when 'selfcare' then 'een selfcare-dag doen' else 'afspreken' end
$$;

/** Meldingstitel voor een nieuwe aanvraag; rol gaat voor op priority. */
create or replace function private.request_title(
  p_role app_role, p_priority boolean, p_name text, p_category appt_category
) returns text
language sql stable set search_path = public, private as $$
  select case
    when p_role = 'admin' then '💞 ' || p_name || ' wil afspreken'
    when p_role = 'vip'   then '⭐ VIP ' || p_name || ' wil afspreken'
    when p_priority       then '🌶️ PRIORITY: ' || p_name || ' wil '
                               || private.category_emoji(p_category) || ' '
                               || private.category_label(p_category)
    else private.category_emoji(p_category) || ' ' || p_name || ' wil '
         || private.category_verb(p_category)
  end
$$;

/** Het profiel van Nesibe. */
create or replace function private.owner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where role = 'owner'
$$;

-- --------------------------------------------------------------- meldingen --

/**
 * Zet per ontvanger een rij in notifications, tenzij die het type uitzette.
 * De huidige gebruiker wordt overgeslagen (je hoeft jezelf niets te melden).
 */
create or replace function private.notify(
  p_user_ids uuid[],
  p_type text,
  p_pref_key text,
  p_title text,
  p_body text,
  p_url text default '/',
  p_include_self boolean default false
) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  if p_user_ids is null or array_length(p_user_ids, 1) is null then return; end if;

  insert into notifications (user_id, type, title, body, url)
  select distinct p.id, p_type, p_title, coalesce(p_body, ''), coalesce(p_url, '/')
  from profiles p
  where p.id = any(p_user_ids)
    and coalesce(p.notif_prefs ->> p_pref_key, 'true') <> 'false'
    and (p_include_self or auth.uid() is null or p.id is distinct from auth.uid());
end $$;

/** Elke nieuwe melding duwt een web-push via pg_net naar /api/push/dispatch. */
create or replace function private.dispatch_push() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from private.config where key = 'app_url';
  select value into v_secret from private.config where key = 'dispatch_secret';
  if v_url is null or v_secret is null then return new; end if;

  perform net.http_post(
    url := v_url || '/api/push/dispatch',
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret)
  );
  return new;
exception when others then
  -- Push mag nooit de transactie breken die de melding maakte.
  return new;
end $$;

create trigger notifications_push after insert on public.notifications
  for each row execute function private.dispatch_push();

-- ------------------------------------------------------------ nieuwe user --

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_coins int;
  v_username text;
begin
  select monthly_coins into v_coins from app_settings where id = 1;

  v_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  -- Alleen a-z, 0-9 en _ ; minstens 3 tekens (anders faalt de check-constraint).
  v_username := regexp_replace(v_username, '[^a-z0-9_]', '', 'g');
  if char_length(v_username) < 3 then
    v_username := 'vriend_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  v_username := substr(v_username, 1, 20);

  insert into profiles (id, username, display_name)
  values (
    new.id,
    v_username,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), v_username), 30)
  );

  insert into coin_ledger (user_id, amount, reason, note)
  values (new.id, coalesce(v_coins, 2), 'welcome', 'Welkom! 🌶️');

  insert into calendar_tokens (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- -------------------------------------------------------- beschikbaarheid --

/**
 * Bezette tijdvakken van Nesibe: enkel tijden, nooit titels of namen.
 * Security definer, zodat vrienden "bezet" zien zonder leesrecht op de inhoud.
 */
create or replace function public.get_busy_slots(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.starts_at, a.ends_at
  from appointments a
  where a.status = 'accepted'
    and a.starts_at is not null and a.ends_at is not null
    and a.starts_at < p_to and a.ends_at > p_from
  union all
  select o.starts_at, o.ends_at
  from owner_items o
  where o.kind = 'block'
    and o.starts_at < p_to and o.ends_at > p_from
  order by 1
$$;

/** Hoeveel openstaande solo-aanvragen liggen er al op deze lokale dag? */
create or replace function public.get_day_demand(p_day date)
returns int
language sql stable security definer set search_path = public, private as $$
  select count(*)::int
  from appointments a
  where a.type = 'solo'
    and a.series_id is null
    and a.status in ('pending','auction')
    and a.starts_at is not null
    and private.local_date(a.starts_at) = p_day
$$;

/** Botst dit tijdvak met een aanvaarde afspraak of een blok van Nesibe? */
create or replace function private.has_conflict(
  p_start timestamptz, p_end timestamptz, p_exclude_appointment uuid default null
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from appointments a
    where a.status = 'accepted'
      and a.starts_at is not null and a.ends_at is not null
      and (p_exclude_appointment is null or a.id <> p_exclude_appointment)
      and a.starts_at < p_end and a.ends_at > p_start
  ) or exists (
    select 1 from owner_items o
    where o.kind = 'block' and o.starts_at < p_end and o.ends_at > p_start
  )
$$;

/**
 * Valt het hele tijdvak binnen één wekelijks vrij venster van Nesibe én is het
 * nog vrij? Werkt in minuten sinds middernacht, zodat een afspraak die exact om
 * 24:00 eindigt ook nog past.
 */
create or replace function private.is_slot_free(p_start timestamptz, p_end timestamptz)
returns boolean
language plpgsql stable security definer set search_path = public, private as $$
declare
  v_local timestamp;
  v_weekday int;
  v_start_min numeric;
  v_end_min numeric;
begin
  if p_start is null or p_end is null or p_end <= p_start then return false; end if;

  v_local := p_start at time zone private.tz();
  v_weekday := extract(isodow from v_local)::int - 1;          -- 0 = maandag
  v_start_min := extract(epoch from v_local::time) / 60;
  v_end_min := v_start_min + extract(epoch from (p_end - p_start)) / 60;

  -- Binnen één venster van die weekdag?
  if not exists (
    select 1 from availability_rules r
    where r.weekday = v_weekday
      and extract(epoch from r.start_time) / 60 <= v_start_min
      and extract(epoch from r.end_time) / 60 >= v_end_min
  ) then
    return false;
  end if;

  return not private.has_conflict(p_start, p_end);
end $$;

-- ------------------------------------------------------------ terugbetalen --

/** Betaalt de priority-munt terug (eenmalig, alleen als hij betaald is). */
create or replace function private.refund_priority(p_appointment uuid)
returns void
language plpgsql security definer set search_path = public, private as $$
declare v_user uuid;
begin
  select user_id into v_user
  from coin_ledger
  where appointment_id = p_appointment and reason = 'priority_request'
  limit 1;
  if v_user is null then return; end if;

  if exists (
    select 1 from coin_ledger
    where appointment_id = p_appointment and reason = 'priority_refund'
  ) then
    return;
  end if;

  insert into coin_ledger (user_id, amount, reason, appointment_id, note)
  values (v_user, 1, 'priority_refund', p_appointment, 'Priority terugbetaald');
end $$;

/** Betaalt een vastgehouden bod terug en zet het bod op 0. */
create or replace function private.refund_bid(p_auction uuid, p_appointment uuid)
returns void
language plpgsql security definer set search_path = public, private as $$
declare v_bid record;
begin
  select * into v_bid from bids
  where auction_id = p_auction and appointment_id = p_appointment;
  if not found or v_bid.amount <= 0 then return; end if;

  insert into coin_ledger (user_id, amount, reason, appointment_id, auction_id, note)
  values (v_bid.user_id, v_bid.amount, 'bid_refund', p_appointment, p_auction, 'Bod terugbetaald');

  update bids set amount = 0, updated_at = now() where id = v_bid.id;
end $$;

-- ------------------------------------------------------------- aanvragen ---

create or replace function public.request_appointment(
  p_title text,
  p_category appt_category,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location_name text default null,
  p_location_address text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_is_priority boolean default false,
  p_idea_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare
  v_uid uuid := auth.uid();
  v_role app_role;
  v_name text;
  v_owner uuid;
  v_id uuid;
  v_s app_settings;
  v_day date;
  v_has_contenders boolean;
begin
  select * into v_s from app_settings where id = 1;
  select role, display_name into v_role, v_name from profiles where id = v_uid;

  if v_role is null then raise exception 'Je bent niet ingelogd'; end if;
  if v_role = 'owner' then
    raise exception 'Nesibe, je kan geen afspraak met jezelf maken 😄';
  end if;

  v_owner := private.owner_id();
  if v_owner is null then raise exception 'Er is nog geen Nesibe-account 🤔'; end if;

  if p_starts_at is null or p_ends_at is null then
    raise exception 'Kies een begin- en eindtijd';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'Eindtijd moet na de starttijd liggen';
  end if;
  if p_starts_at < now() + make_interval(mins => v_s.min_notice_minutes) then
    raise exception 'Iets te last-minute, minstens % min op voorhand', v_s.min_notice_minutes;
  end if;

  -- BF-privilege: Rayan mag buiten Nesibe's vrije uren aanvragen.
  if v_role <> 'admin' and not private.is_slot_free(p_starts_at, p_ends_at) then
    raise exception 'Nesibe is dan niet vrij 🙅‍♀️';
  end if;

  -- Priority kost 1 çiğköfte, maar is gratis voor admin en vip.
  if p_is_priority and v_role = 'member'
     and coalesce((select balance from coin_balances where user_id = v_uid), 0) < 1 then
    raise exception 'Geen çiğköftes meer 🥲 Volgende maand krijg je er % bij', v_s.monthly_coins;
  end if;

  insert into appointments (
    type, title, category, description, created_by, starts_at, ends_at,
    location_name, location_address, lat, lng, is_priority, idea_id
  ) values (
    'solo', p_title, p_category, p_description, v_uid, p_starts_at, p_ends_at,
    p_location_name, p_location_address, p_lat, p_lng, coalesce(p_is_priority, false), p_idea_id
  ) returning id into v_id;

  if p_is_priority and v_role = 'member' then
    insert into coin_ledger (user_id, amount, reason, appointment_id, note)
    values (v_uid, -1, 'priority_request', v_id, 'Priority-aanvraag');
  end if;

  insert into appointment_participants (appointment_id, user_id, rsvp)
  values (v_id, v_uid, 'going'), (v_id, v_owner, 'invited');

  -- Ligt er al een openstaande aanvraag van iemand anders op deze dag?
  v_day := private.local_date(p_starts_at);
  select exists (
    select 1 from appointments a
    where a.id <> v_id
      and a.type = 'solo'
      and a.series_id is null
      and a.status in ('pending','auction')
      and a.created_by <> v_uid
      and a.starts_at is not null
      and private.local_date(a.starts_at) = v_day
      and (v_s.auction_scope = 'same_day'
           or tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, p_ends_at))
  ) into v_has_contenders;

  if v_has_contenders then
    perform private.start_or_join_auction(v_id, v_day);
  else
    perform private.notify(
      array[v_owner], 'request_new', 'requests',
      private.request_title(v_role, coalesce(p_is_priority, false), v_name, p_category),
      p_title || ' · ' || private.fmt_dt(p_starts_at),
      '/inbox'
    );
  end if;

  return v_id;
end $$;

-- -------------------------------------------------------------- veilingen --

/** Start een veiling voor die dag of laat deze aanvraag meedoen. */
create or replace function private.start_or_join_auction(p_appointment uuid, p_day date)
returns uuid
language plpgsql security definer set search_path = public, private as $$
declare
  v_s app_settings;
  v_auction uuid;
  v_earliest timestamptz;
  v_contenders uuid[];
  v_count int;
begin
  select * into v_s from app_settings where id = 1;

  -- Alle kanshebbers: deze aanvraag plus de andere openstaande solo-aanvragen.
  select array_agg(a.id) into v_contenders
  from appointments a
  where a.type = 'solo'
    and a.series_id is null
    and a.status in ('pending','auction')
    and a.starts_at is not null
    and private.local_date(a.starts_at) = p_day;

  select min(a.starts_at) into v_earliest
  from appointments a where a.id = any(v_contenders);

  select id into v_auction from auctions where day = p_day and status = 'open';

  if v_auction is null then
    insert into auctions (day, closes_at)
    values (p_day, v_earliest - make_interval(mins => v_s.min_notice_minutes))
    returning id into v_auction;
  else
    -- Komt er een vroegere aanvraag bij, dan sluit de veiling vroeger.
    update auctions
    set closes_at = least(closes_at, v_earliest - make_interval(mins => v_s.min_notice_minutes))
    where id = v_auction;
  end if;

  update appointments
  set status = 'auction', auction_id = v_auction
  where id = any(v_contenders) and status in ('pending','auction');

  -- Iedereen begint op 0 çiğköftes.
  insert into bids (auction_id, appointment_id, user_id, amount)
  select v_auction, a.id, a.created_by, 0
  from appointments a
  where a.id = any(v_contenders)
  on conflict (auction_id, user_id) do nothing;

  v_count := coalesce(array_length(v_contenders, 1), 0);

  perform private.notify(
    (select array_agg(distinct a.created_by) from appointments a where a.id = any(v_contenders)),
    'auction_started', 'auction',
    '⚔️ Veiling!',
    'Iemand anders wil ook ' || to_char(p_day, 'DD/MM') || ' met Nesibe. Bied çiğköftes!',
    '/auctions/' || v_auction,
    true
  );
  perform private.notify(
    array[private.owner_id()], 'auction_started', 'auction',
    '⚔️ Veiling voor ' || to_char(p_day, 'DD/MM'),
    v_count || ' aanvragen op dezelfde dag',
    '/auctions/' || v_auction,
    true
  );

  return v_auction;
end $$;

create or replace function public.place_bid(
  p_auction uuid, p_amount int, p_sweetener text default null
) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_uid uuid := auth.uid();
  v_auction auctions;
  v_bid bids;
  v_balance int;
  v_name text;
  v_leader uuid;
begin
  if p_amount is null or p_amount < 0 then raise exception 'Een bod kan niet negatief zijn'; end if;

  select * into v_auction from auctions where id = p_auction;
  if not found then raise exception 'Die veiling bestaat niet'; end if;
  if v_auction.status <> 'open' then raise exception 'Deze veiling is al gesloten'; end if;
  if now() >= v_auction.closes_at then raise exception 'Te laat, de veiling is net gesloten ⏰'; end if;

  select * into v_bid from bids where auction_id = p_auction and user_id = v_uid;
  if not found then raise exception 'Je doet niet mee aan deze veiling'; end if;

  select coalesce(balance, 0) into v_balance from coin_balances where user_id = v_uid;
  -- Het vorige bod staat al vast, dat telt dus mee als beschikbaar.
  if p_amount > v_balance + v_bid.amount then
    raise exception 'Zoveel çiğköftes heb je niet 🌶️ (je hebt er %)', v_balance + v_bid.amount;
  end if;

  if v_bid.amount > 0 then
    insert into coin_ledger (user_id, amount, reason, appointment_id, auction_id, note)
    values (v_uid, v_bid.amount, 'bid_refund', v_bid.appointment_id, p_auction, 'Vorig bod vrijgegeven');
  end if;
  if p_amount > 0 then
    insert into coin_ledger (user_id, amount, reason, appointment_id, auction_id, note)
    values (v_uid, -p_amount, 'bid_hold', v_bid.appointment_id, p_auction, 'Bod vastgehouden');
  end if;

  update bids
  set amount = p_amount, sweetener = p_sweetener, updated_at = now()
  where id = v_bid.id;

  select display_name into v_name from profiles where id = v_uid;

  perform private.notify(
    array[private.owner_id()], 'auction_bid', 'auction',
    '🌶️ ' || v_name || ' biedt ' || p_amount || ' çiğköfte' || case when p_amount = 1 then '' else 's' end,
    coalesce(nullif(p_sweetener, ''), 'Veel plezier met kiezen 😄'),
    '/auctions/' || p_auction
  );

  -- Wie staat er nu bovenaan volgens de tie-break?
  select b.user_id into v_leader
  from bids b
  join profiles p on p.id = b.user_id
  join appointments a on a.id = b.appointment_id
  where b.auction_id = p_auction and a.status = 'auction'
  order by b.amount desc, role_weight(p.role) desc, a.is_priority desc, b.updated_at asc
  limit 1;

  if v_leader is not null and v_leader <> v_uid then
    perform private.notify(
      array[v_leader], 'auction_outbid', 'auction',
      '😱 Je bent overboden!',
      v_name || ' biedt nu ' || p_amount || '. Ga je hoger?',
      '/auctions/' || p_auction
    );
  end if;
end $$;

create or replace function public.close_auction(
  p_auction uuid, p_winner uuid, p_also_accept uuid[] default '{}'
) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_auction auctions;
  v_winner appointments;
  r record;
begin
  if not is_owner() then raise exception 'Alleen Nesibe kiest de winnaar 👑'; end if;

  select * into v_auction from auctions where id = p_auction;
  if not found then raise exception 'Die veiling bestaat niet'; end if;
  if v_auction.status <> 'open' then raise exception 'Deze veiling is al afgehandeld'; end if;

  select * into v_winner from appointments where id = p_winner and auction_id = p_auction;
  if not found then raise exception 'Die aanvraag hoort niet bij deze veiling'; end if;

  -- Winnaar: het bod blijft betaald.
  update appointments
  set status = 'accepted', decided_at = now()
  where id = p_winner;

  perform private.notify(
    array[v_winner.created_by], 'auction_won', 'auction',
    '🏆 Je hebt de veiling gewonnen!',
    v_winner.title || ' · ' || private.fmt_dt(v_winner.starts_at),
    '/appointments/' || p_winner
  );

  for r in
    select a.* from appointments a
    where a.auction_id = p_auction and a.id <> p_winner and a.status = 'auction'
  loop
    if r.id = any(p_also_accept) then
      -- Nesibe is royaal: ook geaccepteerd en het bod gaat terug.
      update appointments set status = 'accepted', decided_at = now() where id = r.id;
      perform private.refund_bid(p_auction, r.id);
      perform private.notify(
        array[r.created_by], 'auction_won', 'auction',
        '🎉 Nesibe zegt toch ja!',
        r.title || ' · ' || private.fmt_dt(r.starts_at) || ' — je çiğköftes krijg je terug',
        '/appointments/' || r.id
      );
    else
      update appointments
      set status = 'declined', decline_reason = 'Veiling verloren 🥲', decided_at = now()
      where id = r.id;
      perform private.refund_bid(p_auction, r.id);
      -- De priority-munt komt NIET terug bij een verloren veiling.
      perform private.notify(
        array[r.created_by], 'auction_lost', 'auction',
        '🥲 Veiling verloren',
        'Je çiğköftes staan weer op je saldo. Probeer een andere dag!',
        '/new'
      );
    end if;
  end loop;

  update auctions
  set status = 'closed', winner_appointment_id = p_winner, closed_at = now()
  where id = p_auction;
end $$;

/**
 * Blijft er na een annulering maar één kanshebber over, dan is het geen
 * veiling meer: terug naar een gewone aanvraag.
 */
create or replace function private.settle_thin_auction(p_auction uuid)
returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_remaining int;
  v_last appointments;
  v_role app_role;
  v_name text;
begin
  select count(*) into v_remaining
  from appointments where auction_id = p_auction and status = 'auction';
  if v_remaining <> 1 then return; end if;

  select * into v_last from appointments where auction_id = p_auction and status = 'auction';
  perform private.refund_bid(p_auction, v_last.id);

  update appointments set status = 'pending', auction_id = null where id = v_last.id;
  update auctions set status = 'cancelled', closed_at = now() where id = p_auction;

  select role, display_name into v_role, v_name from profiles where id = v_last.created_by;
  perform private.notify(
    array[private.owner_id()], 'request_new', 'requests',
    private.request_title(v_role, v_last.is_priority, v_name, v_last.category),
    v_last.title || ' · ' || private.fmt_dt(v_last.starts_at),
    '/inbox', true
  );
end $$;

-- ------------------------------------------------------ reageren op vragen --

create or replace function public.respond_appointment(
  p_id uuid, p_action text, p_reason text default null
) returns void
language plpgsql security definer set search_path = public, private as $$
declare v_appt appointments;
begin
  if not is_owner() then raise exception 'Alleen Nesibe beslist hierover 👑'; end if;

  select * into v_appt from appointments where id = p_id;
  if not found then raise exception 'Die afspraak bestaat niet'; end if;
  if v_appt.status not in ('pending','countered') then
    raise exception 'Deze aanvraag is al afgehandeld';
  end if;

  if p_action = 'accept' then
    if v_appt.has_poll then
      raise exception 'Kies eerst een datum uit de poll';
    end if;
    if private.has_conflict(v_appt.starts_at, v_appt.ends_at, v_appt.id) then
      raise exception 'Dat botst met iets anders. Stel eerst een ander moment voor 🔁';
    end if;

    update appointments set status = 'accepted', decided_at = now() where id = p_id;
    update counter_proposals set status = 'superseded' where appointment_id = p_id and status = 'open';

    perform private.notify(
      (select array_agg(user_id) from appointment_participants where appointment_id = p_id),
      'request_accepted', 'requests',
      '✅ Nesibe zegt ja!',
      v_appt.title || ' · ' || private.fmt_dt(v_appt.starts_at),
      '/appointments/' || p_id
    );

  elsif p_action = 'decline' then
    update appointments
    set status = 'declined', decline_reason = p_reason, decided_at = now()
    where id = p_id;
    update counter_proposals set status = 'superseded' where appointment_id = p_id and status = 'open';

    -- Bij een weigering krijg je je priority-munt terug.
    perform private.refund_priority(p_id);

    perform private.notify(
      array[v_appt.created_by], 'request_declined', 'requests',
      '❌ Nesibe kan niet',
      coalesce(nullif(p_reason, ''), 'Geen reden opgegeven') || ' — probeer een ander moment',
      '/new'
    );
  else
    raise exception 'Onbekende actie: %', p_action;
  end if;
end $$;

create or replace function public.counter_propose(
  p_id uuid, p_starts timestamptz, p_ends timestamptz, p_message text default null
) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare
  v_appt appointments;
  v_counter uuid;
begin
  if not is_owner() then raise exception 'Alleen Nesibe doet tegenvoorstellen 👑'; end if;

  select * into v_appt from appointments where id = p_id;
  if not found then raise exception 'Die afspraak bestaat niet'; end if;
  if v_appt.status not in ('pending','countered','auction') then
    raise exception 'Deze aanvraag is al afgehandeld';
  end if;
  if p_ends <= p_starts then raise exception 'Eindtijd moet na de starttijd liggen'; end if;
  if private.has_conflict(p_starts, p_ends, p_id) then
    raise exception 'Je bent dan zelf al bezet 🙈';
  end if;

  update counter_proposals set status = 'superseded' where appointment_id = p_id and status = 'open';

  insert into counter_proposals (appointment_id, proposed_by, starts_at, ends_at, message)
  values (p_id, auth.uid(), p_starts, p_ends, p_message)
  returning id into v_counter;

  update appointments set status = 'countered' where id = p_id;

  perform private.notify(
    array[v_appt.created_by], 'counter_proposed', 'requests',
    '🔁 Nesibe stelt iets anders voor',
    private.fmt_dt(p_starts) || coalesce(' — ' || nullif(p_message, ''), ''),
    '/appointments/' || p_id
  );

  return v_counter;
end $$;

create or replace function public.respond_counter(
  p_counter uuid,
  p_action text,
  p_starts timestamptz default null,
  p_ends timestamptz default null
) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_counter counter_proposals;
  v_appt appointments;
  v_name text;
begin
  select * into v_counter from counter_proposals where id = p_counter;
  if not found then raise exception 'Dat voorstel bestaat niet'; end if;
  if v_counter.status <> 'open' then raise exception 'Dit voorstel is niet meer open'; end if;

  select * into v_appt from appointments where id = v_counter.appointment_id;
  if v_appt.created_by <> auth.uid() then
    raise exception 'Dit is jouw aanvraag niet';
  end if;

  select display_name into v_name from profiles where id = auth.uid();

  if p_action = 'accept' then
    if private.has_conflict(v_counter.starts_at, v_counter.ends_at, v_appt.id) then
      raise exception 'Dat moment is ondertussen bezet 🙈';
    end if;
    update appointments
    set starts_at = v_counter.starts_at, ends_at = v_counter.ends_at,
        status = 'accepted', decided_at = now()
    where id = v_appt.id;
    update counter_proposals set status = 'accepted' where id = p_counter;

    perform private.notify(
      array[private.owner_id()], 'counter_accepted', 'requests',
      '👍 ' || v_name || ' gaat akkoord',
      v_appt.title || ' · ' || private.fmt_dt(v_counter.starts_at),
      '/appointments/' || v_appt.id
    );

  elsif p_action = 'reject' then
    update counter_proposals set status = 'rejected' where id = p_counter;
    update appointments set status = 'cancelled', decided_at = now() where id = v_appt.id;
    perform private.refund_priority(v_appt.id);

    perform private.notify(
      array[private.owner_id()], 'counter_rejected', 'requests',
      '🙃 ' || v_name || ' past liever',
      v_appt.title || ' is geannuleerd',
      '/inbox'
    );

  elsif p_action = 'repropose' then
    if p_starts is null or p_ends is null or p_ends <= p_starts then
      raise exception 'Kies een geldig nieuw moment';
    end if;
    if not private.is_slot_free(p_starts, p_ends) then
      raise exception 'Nesibe is dan niet vrij 🙅‍♀️';
    end if;

    update counter_proposals set status = 'rejected' where id = p_counter;
    update appointments
    set starts_at = p_starts, ends_at = p_ends, status = 'pending'
    where id = v_appt.id;

    perform private.notify(
      array[private.owner_id()], 'counter_reproposed', 'requests',
      '🔁 ' || v_name || ' stelt iets anders voor',
      v_appt.title || ' · ' || private.fmt_dt(p_starts),
      '/inbox'
    );
  else
    raise exception 'Onbekende actie: %', p_action;
  end if;
end $$;

create or replace function public.cancel_appointment(p_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_appt appointments;
  v_name text;
begin
  select * into v_appt from appointments where id = p_id;
  if not found then raise exception 'Die afspraak bestaat niet'; end if;

  if v_appt.created_by <> auth.uid() and not is_staff() then
    raise exception 'Dit is jouw afspraak niet';
  end if;
  if v_appt.status in ('cancelled','declined','expired') then
    raise exception 'Die afspraak is al weg';
  end if;

  update appointments
  set status = 'cancelled', decline_reason = p_reason, decided_at = now()
  where id = p_id;
  update counter_proposals set status = 'superseded' where appointment_id = p_id and status = 'open';

  if v_appt.auction_id is not null then
    perform private.refund_bid(v_appt.auction_id, p_id);
  end if;
  perform private.refund_priority(p_id);

  select display_name into v_name from profiles where id = auth.uid();

  perform private.notify(
    (select array_agg(user_id) from appointment_participants where appointment_id = p_id),
    'appointment_cancelled', 'requests',
    '🚫 ' || v_appt.title || ' is geannuleerd',
    coalesce(nullif(p_reason, ''), v_name || ' kan niet meer'),
    '/agenda'
  );

  if v_appt.auction_id is not null then
    perform private.settle_thin_auction(v_appt.auction_id);
  end if;
end $$;

-- ------------------------------------------- groepsactiviteiten & polls ----

create or replace function public.create_group_activity(
  p_title text,
  p_category appt_category,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
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
    case when v_uid = v_owner and not v_has_poll then 'accepted' else 'pending' end
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

create or replace function public.rsvp(p_id uuid, p_status rsvp_status)
returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_uid uuid := auth.uid();
  v_appt appointments;
  v_name text;
  v_going int;
begin
  select * into v_appt from appointments where id = p_id;
  if not found then raise exception 'Die afspraak bestaat niet'; end if;
  if not exists (select 1 from appointment_participants
                 where appointment_id = p_id and user_id = v_uid) then
    raise exception 'Je bent hier niet voor uitgenodigd';
  end if;

  update appointment_participants
  set rsvp = p_status
  where appointment_id = p_id and user_id = v_uid;

  select display_name into v_name from profiles where id = v_uid;
  select count(*) into v_going
  from appointment_participants where appointment_id = p_id and rsvp = 'going';

  -- Gebundeld: hoogstens één rsvp-melding per uur per afspraak.
  if not exists (
    select 1 from notifications
    where user_id = v_appt.created_by
      and type = 'rsvp'
      and url = '/appointments/' || p_id
      and created_at > now() - interval '1 hour'
  ) then
    perform private.notify(
      array[v_appt.created_by], 'rsvp', 'group',
      '👍 ' || v_going || ' mensen komen',
      v_name || ' reageerde op ' || v_appt.title,
      '/appointments/' || p_id
    );
  end if;
end $$;

create or replace function public.vote_poll(p_option uuid, p_vote poll_vote_value)
returns void
language plpgsql security definer set search_path = public, private as $$
declare v_appt uuid;
begin
  select appointment_id into v_appt from poll_options where id = p_option;
  if v_appt is null then raise exception 'Die optie bestaat niet'; end if;
  if not exists (select 1 from appointment_participants
                 where appointment_id = v_appt and user_id = auth.uid()) then
    raise exception 'Je mag hier niet over stemmen';
  end if;

  insert into poll_votes (option_id, user_id, vote)
  values (p_option, auth.uid(), p_vote)
  on conflict (option_id, user_id) do update set vote = excluded.vote;
end $$;

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
  if not is_owner() and v_appt.created_by <> auth.uid() then
    raise exception 'Alleen Nesibe of de maker kiest de datum';
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

-- ----------------------------------------------------------- vrij vandaag --

create or replace function public.broadcast_free_today(
  p_from time, p_to time, p_message text default null, p_group uuid default null
) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare
  v_id uuid;
  v_today date;
  v_targets uuid[];
begin
  if not is_owner() then raise exception 'Alleen Nesibe roept dit om 👑'; end if;
  if p_to <= p_from then raise exception 'De eindtijd moet na de starttijd liggen'; end if;

  v_today := (now() at time zone private.tz())::date;

  insert into free_today (created_by, day, from_time, to_time, message, group_id, expires_at)
  values (
    auth.uid(), v_today, p_from, p_to, p_message, p_group,
    ((v_today + p_to) at time zone private.tz())
  ) returning id into v_id;

  if p_group is null then
    select array_agg(id) into v_targets from profiles where role <> 'owner';
  else
    select array_agg(gm.user_id) into v_targets
    from group_members gm where gm.group_id = p_group;
  end if;

  perform private.notify(
    v_targets, 'free_today', 'free_today',
    '✨ Nesibe is vrij vandaag van ' || to_char(p_from, 'HH24:MI') || ' tot ' || to_char(p_to, 'HH24:MI') || '!',
    coalesce(nullif(p_message, ''), 'Wie heeft er zin?'),
    '/new?prefill=free_today&id=' || v_id
  );

  return v_id;
end $$;

-- ---------------------------------------------------- terugkerende reeksen --

create or replace function public.request_series(
  p_title text,
  p_category appt_category,
  p_freq series_freq,
  p_first_starts_at timestamptz,
  p_duration_minutes int,
  p_until_date date,
  p_location_name text default null,
  p_location_address text default null,
  p_lat double precision default null,
  p_lng double precision default null
) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare
  v_uid uuid := auth.uid();
  v_role app_role;
  v_name text;
  v_id uuid;
begin
  select role, display_name into v_role, v_name from profiles where id = v_uid;
  if v_role is null then raise exception 'Je bent niet ingelogd'; end if;
  if v_role = 'owner' then raise exception 'Nesibe, je hoeft het jezelf niet te vragen 😄'; end if;

  if p_until_date > (private.local_date(p_first_starts_at) + interval '6 months')::date then
    raise exception 'Maximaal 6 maanden vooruit, anders wordt het wel heel serieus 😅';
  end if;
  if p_duration_minutes < 15 or p_duration_minutes > 720 then
    raise exception 'Duur moet tussen 15 minuten en 12 uur liggen';
  end if;

  insert into recurring_series (
    created_by, title, category, freq, first_starts_at, duration_minutes, until_date,
    location_name, location_address, lat, lng
  ) values (
    v_uid, p_title, p_category, p_freq, p_first_starts_at, p_duration_minutes, p_until_date,
    p_location_name, p_location_address, p_lat, p_lng
  ) returning id into v_id;

  perform private.notify(
    array[private.owner_id()], 'series_new', 'requests',
    '🔁 ' || v_name || ' wil een vaste afspraak',
    p_title || ' · ' || case p_freq
      when 'weekly' then 'elke week'
      when 'biweekly' then 'om de twee weken'
      else 'elke maand' end || ' vanaf ' || private.fmt_dt(p_first_starts_at),
    '/inbox'
  );

  return v_id;
end $$;

/** Maakt voorkomens aan tot 8 weken vooruit; botsingen worden overgeslagen. */
create or replace function private.generate_series_occurrences(p_series uuid)
returns int
language plpgsql security definer set search_path = public, private as $$
declare
  v_series recurring_series;
  v_owner uuid := private.owner_id();
  v_cursor timestamptz;
  v_end timestamptz;
  v_horizon date;
  v_step interval;
  v_made int := 0;
  v_skipped text[] := '{}';
  v_appt uuid;
begin
  select * into v_series from recurring_series where id = p_series;
  if not found or v_series.status <> 'accepted' then return 0; end if;

  v_step := case v_series.freq
    when 'weekly' then interval '1 week'
    when 'biweekly' then interval '2 weeks'
    else interval '1 month' end;

  v_horizon := least(v_series.until_date, ((now() + interval '8 weeks') at time zone private.tz())::date);
  v_cursor := v_series.first_starts_at;

  while private.local_date(v_cursor) <= v_horizon loop
    v_end := v_cursor + make_interval(mins => v_series.duration_minutes);

    if v_cursor > now()
       and not exists (
         select 1 from appointments
         where series_id = p_series and starts_at = v_cursor
           and status not in ('cancelled','declined','expired')
       )
    then
      if private.has_conflict(v_cursor, v_end) then
        v_skipped := v_skipped || private.fmt_dt(v_cursor);
      else
        insert into appointments (
          type, title, category, created_by, starts_at, ends_at,
          location_name, location_address, lat, lng, status, series_id, decided_at
        ) values (
          'solo', v_series.title, v_series.category, v_series.created_by, v_cursor, v_end,
          v_series.location_name, v_series.location_address, v_series.lat, v_series.lng,
          'accepted', p_series, now()
        ) returning id into v_appt;

        insert into appointment_participants (appointment_id, user_id, rsvp)
        values (v_appt, v_series.created_by, 'going'), (v_appt, v_owner, 'going')
        on conflict do nothing;

        v_made := v_made + 1;
      end if;
    end if;

    v_cursor := v_cursor + v_step;
  end loop;

  update recurring_series set generated_until = v_horizon where id = p_series;

  if array_length(v_skipped, 1) > 0 then
    perform private.notify(
      array[v_series.created_by], 'series_skipped', 'requests',
      '⚠️ Een paar keer overgeslagen',
      array_to_string(v_skipped, ', ') || ' — Nesibe is dan bezet',
      '/agenda', true
    );
  end if;

  return v_made;
end $$;

create or replace function public.respond_series(p_series uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public, private as $$
declare v_series recurring_series;
begin
  if not is_owner() then raise exception 'Alleen Nesibe beslist hierover 👑'; end if;

  select * into v_series from recurring_series where id = p_series;
  if not found then raise exception 'Die reeks bestaat niet'; end if;
  if v_series.status <> 'pending' then raise exception 'Deze reeks is al afgehandeld'; end if;

  if p_accept then
    update recurring_series set status = 'accepted' where id = p_series;
    perform private.generate_series_occurrences(p_series);
    perform private.notify(
      array[v_series.created_by], 'series_accepted', 'requests',
      '🔁 Vaste afspraak bevestigd!',
      v_series.title || ' staat in de agenda',
      '/agenda'
    );
  else
    update recurring_series set status = 'declined' where id = p_series;
    perform private.notify(
      array[v_series.created_by], 'series_declined', 'requests',
      '❌ Geen vaste afspraak',
      'Nesibe houdt het liever los voor ' || v_series.title,
      '/new'
    );
  end if;
end $$;

create or replace function public.end_series(p_series uuid)
returns void
language plpgsql security definer set search_path = public, private as $$
declare v_series recurring_series;
begin
  select * into v_series from recurring_series where id = p_series;
  if not found then raise exception 'Die reeks bestaat niet'; end if;
  if v_series.created_by <> auth.uid() and not is_owner() then
    raise exception 'Dit is jouw reeks niet';
  end if;

  update recurring_series set status = 'ended' where id = p_series;
  update appointments
  set status = 'cancelled', decided_at = now()
  where series_id = p_series and starts_at > now() and status not in ('cancelled','expired');
end $$;

-- ---------------------------------------------------------------- check-in --

create or replace function public.check_in(p_id uuid)
returns timestamptz
language plpgsql security definer set search_path = public, private as $$
declare
  v_appt appointments;
  v_now timestamptz := now();
begin
  select * into v_appt from appointments where id = p_id;
  if not found then raise exception 'Die afspraak bestaat niet'; end if;
  if v_appt.status <> 'accepted' then raise exception 'Deze afspraak staat niet vast'; end if;
  if not exists (select 1 from appointment_participants
                 where appointment_id = p_id and user_id = auth.uid()) then
    raise exception 'Je hoort hier niet bij';
  end if;
  if v_now < v_appt.starts_at - interval '30 minutes' then
    raise exception 'Nog even geduld, inchecken kan vanaf 30 min op voorhand ⏰';
  end if;
  if v_now > v_appt.starts_at + interval '60 minutes' then
    raise exception 'Te laat om nog in te checken 🙈';
  end if;

  update appointment_participants
  set checked_in_at = v_now
  where appointment_id = p_id and user_id = auth.uid() and checked_in_at is null;

  return v_now;
end $$;

-- ------------------------------------------------------------------ badges --

create or replace function private.award_badge(
  p_user uuid, p_code text, p_period date default null
) returns boolean
language plpgsql security definer set search_path = public, private as $$
declare v_badge badges;
begin
  select * into v_badge from badges where code = p_code;
  if not found then return false; end if;

  if p_period is null then
    if exists (select 1 from user_badges
               where user_id = p_user and badge_code = p_code and period is null) then
      return false;
    end if;
  else
    if exists (select 1 from user_badges
               where user_id = p_user and badge_code = p_code and period = p_period) then
      return false;
    end if;
  end if;

  insert into user_badges (user_id, badge_code, period) values (p_user, p_code, p_period);

  perform private.notify(
    array[p_user], 'badge', 'badges',
    '🏅 Nieuwe badge: ' || v_badge.name || ' ' || v_badge.emoji,
    v_badge.description,
    '/badges', true
  );
  return true;
end $$;

-- ------------------------------------------------------------------- admin --

create or replace function public.admin_set_role(p_user uuid, p_role app_role)
returns void
language plpgsql security definer set search_path = public, private as $$
begin
  if my_role() <> 'admin' then raise exception 'Alleen Rayan mag rollen wijzigen 🛡️'; end if;
  if p_role = 'owner' then raise exception 'De kroon geef je niet weg via de app 👑'; end if;
  if (select role from profiles where id = p_user) = 'owner' then
    raise exception 'Nesibe blijft de owner 👑';
  end if;

  update profiles set role = p_role where id = p_user;
end $$;

create or replace function public.admin_adjust_coins(p_user uuid, p_amount int, p_note text default null)
returns void
language plpgsql security definer set search_path = public, private as $$
begin
  if my_role() <> 'admin' then raise exception 'Alleen Rayan speelt voor centrale bank 🛡️'; end if;
  if p_amount = 0 then return; end if;

  insert into coin_ledger (user_id, amount, reason, note)
  values (p_user, p_amount, 'admin_adjust', coalesce(p_note, 'Bijgesteld door de admin'));

  perform private.notify(
    array[p_user], 'coins', 'monthly',
    case when p_amount > 0 then '🌶️ +' || p_amount || ' çiğköftes!' else '🌶️ ' || p_amount || ' çiğköftes' end,
    coalesce(nullif(p_note, ''), 'Aangepast door de admin'),
    '/wallet', true
  );
end $$;

/**
 * Inloggen met gebruikersnaam in plaats van e-mail. Bewuste keuze voor een
 * vriendenapp: dit maakt bestaande gebruikersnamen opvraagbaar, meer niet.
 */
create or replace function public.username_to_email(p_username text)
returns text
language sql stable security definer set search_path = public, auth as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = lower(p_username)
$$;

-- ------------------------------------------------------------------ grants --

-- Standaard dicht: niets uitvoerbaar voor anon of publiek.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;

-- Inloggen met gebruikersnaam moet kunnen vóór je ingelogd bent.
grant execute on function public.username_to_email(text) to anon;
