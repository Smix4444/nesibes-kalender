-- ============================================================================
-- NesiPlan — geplande jobs
-- pg_cron draait in UTC; alle functies rekenen intern met Europe/Brussels.
-- ============================================================================

-- -------------------------------------------------------- herinneringen ----

/** 24u- en 1u-herinneringen voor wie "ik kom" zei (Nesibe altijd). */
create or replace function private.job_reminders() returns void
language plpgsql security definer set search_path = public, private as $$
declare r record;
begin
  -- 24 uur vooraf: binnen een dag, maar nog meer dan een uur weg.
  for r in
    select p.appointment_id, p.user_id, a.title, a.starts_at, a.location_name, a.category
    from appointment_participants p
    join appointments a on a.id = p.appointment_id
    join profiles pr on pr.id = p.user_id
    where a.status = 'accepted'
      and a.starts_at is not null
      and not p.reminded_24h
      and (p.rsvp = 'going' or pr.role = 'owner')
      and a.starts_at <= now() + interval '24 hours'
      and a.starts_at >  now() + interval '1 hour'
  loop
    perform private.notify(
      array[r.user_id], 'reminder_24h', 'reminders',
      '⏰ Morgen: ' || private.category_emoji(r.category) || ' ' || r.title,
      private.fmt_dt(r.starts_at) || coalesce(' @ ' || nullif(r.location_name, ''), ''),
      '/appointments/' || r.appointment_id, true
    );
    update appointment_participants set reminded_24h = true
    where appointment_id = r.appointment_id and user_id = r.user_id;
  end loop;

  -- 1 uur vooraf.
  for r in
    select p.appointment_id, p.user_id, a.title, a.starts_at, a.location_name, a.category
    from appointment_participants p
    join appointments a on a.id = p.appointment_id
    join profiles pr on pr.id = p.user_id
    where a.status = 'accepted'
      and a.starts_at is not null
      and not p.reminded_1h
      and (p.rsvp = 'going' or pr.role = 'owner')
      and a.starts_at <= now() + interval '60 minutes'
      and a.starts_at >  now() - interval '15 minutes'
  loop
    perform private.notify(
      array[r.user_id], 'reminder_1h', 'reminders',
      '🏃 Over 1 uur: ' || private.category_emoji(r.category) || ' ' || r.title,
      coalesce(nullif(r.location_name, '') || ' — tik voor de route', 'Tik voor de details'),
      '/appointments/' || r.appointment_id, true
    );
    update appointment_participants set reminded_1h = true
    where appointment_id = r.appointment_id and user_id = r.user_id;
  end loop;
end $$;

-- ----------------------------------------------------------- opruimwerk ----

create or replace function private.job_housekeeping() returns void
language plpgsql security definer set search_path = public, private as $$
declare
  r record;
  v_owner uuid := private.owner_id();
begin
  -- 1. Aanvragen waarvan het moment voorbij is zonder antwoord.
  for r in
    select * from appointments
    where status in ('pending','countered')
      and starts_at is not null
      and starts_at < now()
  loop
    update appointments set status = 'expired', decided_at = now() where id = r.id;
    perform private.refund_priority(r.id);
    perform private.notify(
      array[r.created_by], 'request_expired', 'requests',
      '⌛ Geen antwoord op tijd',
      r.title || ' is verlopen. Je çiğköftes staan terug.',
      '/new', true
    );
  end loop;

  -- 2a. Veiling gesloten maar Nesibe koos nog niet: één herinnering.
  for r in
    select * from auctions
    where status = 'open' and now() >= closes_at and not owner_reminded
  loop
    perform private.notify(
      array[v_owner], 'auction_reminder', 'auction',
      '⚔️ Kies nog een winnaar!',
      'De veiling van ' || to_char(r.day, 'DD/MM') || ' wacht op jou.',
      '/auctions/' || r.id, true
    );
    update auctions set owner_reminded = true where id = r.id;
  end loop;

  -- 2b. Het moment zelf is voorbij: veiling verloopt, alles terugbetaald.
  for r in
    select au.* from auctions au
    where au.status = 'open'
      and not exists (
        select 1 from appointments a
        where a.auction_id = au.id and a.status = 'auction' and a.starts_at > now()
      )
  loop
    declare a record;
    begin
      for a in select * from appointments where auction_id = r.id and status = 'auction' loop
        perform private.refund_bid(r.id, a.id);
        perform private.refund_priority(a.id);
        update appointments set status = 'expired', decided_at = now() where id = a.id;
        perform private.notify(
          array[a.created_by], 'auction_expired', 'auction',
          '⌛ Veiling verlopen',
          'Niemand koos op tijd. Al je çiğköftes staan terug.',
          '/new', true
        );
      end loop;
      update auctions set status = 'expired', closed_at = now() where id = r.id;
    end;
  end loop;

  -- 3. Polls waarvan de stemtijd voorbij is: por de maker en Nesibe.
  for r in
    select * from appointments
    where has_poll and poll_closes_at is not null and poll_closes_at < now()
      and status = 'pending'
  loop
    perform private.notify(
      array[v_owner, r.created_by], 'poll_due', 'group',
      '🗳️ Kies een datum',
      'De stemming voor ' || r.title || ' is afgelopen.',
      '/appointments/' || r.id, true
    );
    -- Niet nog eens porren: schuif de deadline een dag op.
    update appointments set poll_closes_at = now() + interval '1 day' where id = r.id;
  end loop;
end $$;

-- ------------------------------------------------------------ maandmunten --

create or replace function private.job_monthly_coins() returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_s app_settings;
  r record;
  v_grant int;
begin
  select * into v_s from app_settings where id = 1;

  for r in
    select p.id, coalesce(b.balance, 0) as balance
    from profiles p
    left join coin_balances b on b.user_id = p.id
    where p.role <> 'owner'
  loop
    v_grant := least(v_s.monthly_coins, v_s.coin_cap - r.balance);
    if v_grant > 0 then
      insert into coin_ledger (user_id, amount, reason, note)
      values (r.id, v_grant, 'monthly_grant', 'Maandelijkse çiğköftes');

      perform private.notify(
        array[r.id], 'monthly_coins', 'monthly',
        '🌶️ Je kreeg ' || v_grant || ' nieuwe çiğköfte' || case when v_grant = 1 then '' else 's' end || '!',
        'Gebruik ze voor priority of om te bieden.',
        '/wallet', true
      );
    end if;
  end loop;
end $$;

-- ------------------------------------------------------- reeksen aanvullen --

create or replace function private.job_generate_recurring() returns void
language plpgsql security definer set search_path = public, private as $$
declare r record;
begin
  for r in select * from recurring_series where status = 'accepted' loop
    if r.until_date < (now() at time zone private.tz())::date then
      update recurring_series set status = 'ended' where id = r.id;
    else
      perform private.generate_series_occurrences(r.id);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- badges ---

create or replace function private.job_daily_badges() returns void
language plpgsql security definer set search_path = public, private as $$
declare r record;
begin
  -- 🐣 eerste geaccepteerde afspraak
  for r in
    select distinct p.user_id
    from appointment_participants p
    join appointments a on a.id = p.appointment_id
    join profiles pr on pr.id = p.user_id
    where a.status = 'accepted' and a.starts_at < now() and pr.role <> 'owner'
  loop
    perform private.award_badge(r.user_id, 'first_date');
  end loop;

  -- ☕ 5 koffie-afspraken
  for r in
    select p.user_id
    from appointment_participants p
    join appointments a on a.id = p.appointment_id
    join profiles pr on pr.id = p.user_id
    where a.status = 'accepted' and a.category = 'koffie' and a.starts_at < now()
      and pr.role <> 'owner'
    group by p.user_id having count(*) >= 5
  loop
    perform private.award_badge(r.user_id, 'koffiekoning');
  end loop;

  -- 🌶️ 3 veilingen gewonnen
  for r in
    select a.created_by as user_id
    from auctions au
    join appointments a on a.id = au.winner_appointment_id
    where au.status = 'closed'
    group by a.created_by having count(*) >= 3
  loop
    perform private.award_badge(r.user_id, 'cigkofte_king');
  end loop;

  -- 💸 ooit 4+ geboden in één keer
  for r in
    select distinct user_id from coin_ledger where reason = 'bid_hold' and amount <= -4
  loop
    perform private.award_badge(r.user_id, 'big_spender');
  end loop;

  -- ⏰ 5x op tijd ingecheckt
  for r in
    select p.user_id
    from appointment_participants p
    join appointments a on a.id = p.appointment_id
    where p.checked_in_at is not null and p.checked_in_at <= a.starts_at + interval '5 minutes'
    group by p.user_id having count(*) >= 5
  loop
    perform private.award_badge(r.user_id, 'on_time');
  end loop;

  -- 🎉 5 groepsactiviteiten
  for r in
    select p.user_id
    from appointment_participants p
    join appointments a on a.id = p.appointment_id
    join profiles pr on pr.id = p.user_id
    where a.type = 'group' and a.status = 'accepted' and a.starts_at < now()
      and p.rsvp = 'going' and pr.role <> 'owner'
    group by p.user_id having count(*) >= 5
  loop
    perform private.award_badge(r.user_id, 'party_animal');
  end loop;

  -- 📸 20 foto's
  for r in
    select user_id from memories group by user_id having count(*) >= 20
  loop
    perform private.award_badge(r.user_id, 'paparazzi');
  end loop;

  -- 💡 5 ideeën gepost
  for r in
    select created_by as user_id from ideas group by created_by having count(*) >= 5
  loop
    perform private.award_badge(r.user_id, 'idea_machine');
  end loop;

  -- 🔥 een idee met 5+ stemmen
  for r in
    select distinct i.created_by as user_id
    from ideas i
    join idea_votes v on v.idea_id = i.id
    group by i.id, i.created_by having count(v.user_id) >= 5
  loop
    perform private.award_badge(r.user_id, 'trendsetter');
  end loop;

  -- 🔁 actieve reeks met 4+ voorkomens
  for r in
    select s.created_by as user_id
    from recurring_series s
    join appointments a on a.series_id = s.id and a.status = 'accepted'
    where s.status = 'accepted'
    group by s.id, s.created_by having count(a.id) >= 4
  loop
    perform private.award_badge(r.user_id, 'loyal');
  end loop;

  -- 🗺️ afspraken op 5 verschillende locaties
  for r in
    select p.user_id
    from appointment_participants p
    join appointments a on a.id = p.appointment_id
    join profiles pr on pr.id = p.user_id
    where a.status = 'accepted' and a.starts_at < now()
      and nullif(a.location_name, '') is not null and pr.role <> 'owner'
    group by p.user_id having count(distinct lower(a.location_name)) >= 5
  loop
    perform private.award_badge(r.user_id, 'explorer');
  end loop;
end $$;

-- --------------------------------------------------------------- Wrapped ---

create or replace function private.job_monthly_wrapped() returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_owner uuid := private.owner_id();
  v_period date;
  v_from timestamptz;
  v_to timestamptz;
  v_total_friends int;
  r record;
  v_data jsonb;
  v_best uuid;
  v_flaky uuid;
  v_flaky_count int;
begin
  -- Vorige maand, in lokale tijd.
  v_period := (date_trunc('month', (now() at time zone private.tz())) - interval '1 month')::date;
  v_from := (v_period::timestamp at time zone private.tz());
  v_to := ((v_period + interval '1 month')::timestamp at time zone private.tz());

  select count(*) into v_total_friends from profiles where role <> 'owner';

  -- ---------- per vriend(in) ----------
  for r in
    select
      p.id,
      p.display_name,
      coalesce(stats.appointments, 0) as appointments,
      coalesce(stats.hours, 0) as hours,
      stats.top_category,
      stats.top_location,
      coalesce(grp.group_activities, 0) as group_activities,
      coalesce(spent.coins_spent, 0) as coins_spent,
      coalesce(won.auctions_won, 0) as auctions_won,
      coalesce(lost.auctions_lost, 0) as auctions_lost,
      coalesce(bid.biggest_bid, 0) as biggest_bid,
      coalesce(ph.photos, 0) as photos,
      coalesce(ontime.on_time, 0) as on_time_checkins,
      coalesce(canc.cancellations, 0) as cancellations
    from profiles p
    left join lateral (
      select
        count(*)::int as appointments,
        round(sum(extract(epoch from (a.ends_at - a.starts_at)) / 3600)::numeric, 1) as hours,
        mode() within group (order by a.category) as top_category,
        mode() within group (order by nullif(a.location_name, '')) as top_location
      from appointment_participants ap
      join appointments a on a.id = ap.appointment_id
      where ap.user_id = p.id and a.status = 'accepted'
        and a.starts_at >= v_from and a.starts_at < v_to
        and exists (select 1 from appointment_participants o
                    where o.appointment_id = a.id and o.user_id = v_owner)
    ) stats on true
    left join lateral (
      select count(*)::int as group_activities
      from appointment_participants ap
      join appointments a on a.id = ap.appointment_id
      where ap.user_id = p.id and a.type = 'group' and a.status = 'accepted'
        and a.starts_at >= v_from and a.starts_at < v_to
    ) grp on true
    left join lateral (
      select coalesce(-sum(amount), 0)::int as coins_spent
      from coin_ledger
      where user_id = p.id and amount < 0 and created_at >= v_from and created_at < v_to
    ) spent on true
    left join lateral (
      select count(*)::int as auctions_won
      from auctions au
      join appointments a on a.id = au.winner_appointment_id
      where a.created_by = p.id and au.closed_at >= v_from and au.closed_at < v_to
    ) won on true
    left join lateral (
      select count(*)::int as auctions_lost
      from appointments a
      join auctions au on au.id = a.auction_id
      where a.created_by = p.id and au.status = 'closed'
        and au.winner_appointment_id is distinct from a.id
        and au.closed_at >= v_from and au.closed_at < v_to
    ) lost on true
    left join lateral (
      select coalesce(max(-amount), 0)::int as biggest_bid
      from coin_ledger
      where user_id = p.id and reason = 'bid_hold'
        and created_at >= v_from and created_at < v_to
    ) bid on true
    left join lateral (
      select count(*)::int as photos
      from memories where user_id = p.id and created_at >= v_from and created_at < v_to
    ) ph on true
    left join lateral (
      select count(*)::int as on_time
      from appointment_participants ap
      join appointments a on a.id = ap.appointment_id
      where ap.user_id = p.id and ap.checked_in_at is not null
        and ap.checked_in_at <= a.starts_at + interval '5 minutes'
        and a.starts_at >= v_from and a.starts_at < v_to
    ) ontime on true
    left join lateral (
      select count(*)::int as cancellations
      from appointments a
      where a.created_by = p.id and a.status = 'cancelled'
        and a.decided_at >= v_from and a.decided_at < v_to
        and a.decided_at > a.starts_at - interval '24 hours'
    ) canc on true
    where p.role <> 'owner'
  loop
    v_data := jsonb_build_object(
      'period', to_char(v_period, 'YYYY-MM'),
      'appointments', r.appointments,
      'hours_with_nesibe', r.hours,
      'top_category', r.top_category,
      'top_location', r.top_location,
      'group_activities', r.group_activities,
      'coins_spent', r.coins_spent,
      'auctions_won', r.auctions_won,
      'auctions_lost', r.auctions_lost,
      'biggest_bid', r.biggest_bid,
      'photos', r.photos,
      'total_friends', v_total_friends,
      'on_time_checkins', r.on_time_checkins,
      'cancellations', r.cancellations,
      'rank_hours', (
        select count(*) + 1
        from (
          select ap.user_id, sum(extract(epoch from (a.ends_at - a.starts_at))) as secs
          from appointment_participants ap
          join appointments a on a.id = ap.appointment_id
          join profiles pp on pp.id = ap.user_id and pp.role <> 'owner'
          where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
          group by ap.user_id
        ) ranked
        where ranked.secs > coalesce(r.hours, 0) * 3600
      ),
      'fun_line', case
        when r.appointments = 0 then 'Een rustige maand 😴 — tijd om iets te plannen!'
        when r.top_category = 'koffie' then 'Jullie dronken samen ' || r.appointments || ' keer koffie ☕'
        else 'Jullie zagen elkaar ' || r.appointments || ' keer, goed voor ' || r.hours || ' uur 🫶'
      end
    );

    insert into wrapped (user_id, period, data) values (r.id, v_period, v_data)
    on conflict (user_id, period) do update set data = excluded.data;
  end loop;

  -- ---------- maandbadges ----------
  select ap.user_id into v_best
  from appointment_participants ap
  join appointments a on a.id = ap.appointment_id
  join profiles p on p.id = ap.user_id and p.role <> 'owner'
  where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
    and exists (select 1 from appointment_participants o
                where o.appointment_id = a.id and o.user_id = v_owner)
  group by ap.user_id
  order by sum(extract(epoch from (a.ends_at - a.starts_at))) desc
  limit 1;

  if v_best is not null then
    perform private.award_badge(v_best, 'best_friend_month', v_period);
  end if;

  select a.created_by, count(*)::int into v_flaky, v_flaky_count
  from appointments a
  where a.status = 'cancelled'
    and a.decided_at >= v_from and a.decided_at < v_to
    and a.decided_at > a.starts_at - interval '24 hours'
  group by a.created_by
  order by count(*) desc
  limit 1;

  if v_flaky is not null and v_flaky_count >= 2 then
    perform private.award_badge(v_flaky, 'flaky_month', v_period);
  end if;

  -- ---------- Wrapped voor Nesibe ----------
  if v_owner is not null then
    insert into wrapped (user_id, period, data)
    values (v_owner, v_period, jsonb_build_object(
      'period', to_char(v_period, 'YYYY-MM'),
      'is_owner', true,
      'appointments', (
        select count(*)::int from appointments a
        where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
          and exists (select 1 from appointment_participants o
                      where o.appointment_id = a.id and o.user_id = v_owner)
      ),
      'hours', (
        select coalesce(round(sum(extract(epoch from (a.ends_at - a.starts_at)) / 3600)::numeric, 1), 0)
        from appointments a
        where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
          and exists (select 1 from appointment_participants o
                      where o.appointment_id = a.id and o.user_id = v_owner)
      ),
      'top_friends', (
        select coalesce(jsonb_agg(t), '[]'::jsonb) from (
          select p.display_name as name, p.emoji,
                 count(*)::int as appointments,
                 round(sum(extract(epoch from (a.ends_at - a.starts_at)) / 3600)::numeric, 1) as hours
          from appointment_participants ap
          join appointments a on a.id = ap.appointment_id
          join profiles p on p.id = ap.user_id and p.role <> 'owner'
          where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
          group by p.id, p.display_name, p.emoji
          order by sum(extract(epoch from (a.ends_at - a.starts_at))) desc
          limit 3
        ) t
      ),
      'busiest_weekday', (
        select to_char(a.starts_at at time zone private.tz(), 'Day')
        from appointments a
        where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
        group by 1 order by count(*) desc limit 1
      ),
      'top_category', (
        select a.category from appointments a
        where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
        group by 1 order by count(*) desc limit 1
      ),
      'top_location', (
        select nullif(a.location_name, '') from appointments a
        where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
          and nullif(a.location_name, '') is not null
        group by 1 order by count(*) desc limit 1
      ),
      'group_activities', (
        select count(*)::int from appointments a
        where a.type = 'group' and a.status = 'accepted'
          and a.starts_at >= v_from and a.starts_at < v_to
      ),
      'auctions', (
        select count(*)::int from auctions where closed_at >= v_from and closed_at < v_to
      ),
      'coins_earned', (
        select coalesce(-sum(amount), 0)::int from coin_ledger
        where reason = 'bid_hold' and created_at >= v_from and created_at < v_to
      ),
      'most_generous', (
        select p.display_name from coin_ledger l
        join profiles p on p.id = l.user_id
        where l.reason = 'bid_hold' and l.created_at >= v_from and l.created_at < v_to
        group by p.display_name order by sum(-l.amount) desc limit 1
      ),
      'photos', (
        select count(*)::int from memories where created_at >= v_from and created_at < v_to
      ),
      'ideas_done', (
        select count(*)::int from ideas where done and created_at < v_to
      ),
      'longest_appointment', (
        select coalesce(round(max(extract(epoch from (a.ends_at - a.starts_at)) / 3600)::numeric, 1), 0)
        from appointments a
        where a.status = 'accepted' and a.starts_at >= v_from and a.starts_at < v_to
      )
    ))
    on conflict (user_id, period) do update set data = excluded.data;
  end if;

  -- ---------- iedereen een seintje ----------
  perform private.notify(
    (select array_agg(id) from profiles),
    'wrapped', 'monthly',
    '🎁 Jouw NesiPlan Wrapped is er!',
    'Benieuwd hoe je maand eruitzag?',
    '/wrapped/' || to_char(v_period, 'YYYY-MM'), true
  );
end $$;

-- ------------------------------------------------------------- planning ----

-- Idempotent: eerst de oude NesiPlan-jobs weghalen.
do $$
declare j record;
begin
  for j in select jobname from cron.job where jobname like 'nesiplan-%' loop
    perform cron.unschedule(j.jobname);
  end loop;
end $$;

select cron.schedule('nesiplan-reminders',     '*/5 * * * *',  $$select private.job_reminders()$$);
select cron.schedule('nesiplan-housekeeping',  '*/15 * * * *', $$select private.job_housekeeping()$$);
select cron.schedule('nesiplan-monthly-coins', '5 0 1 * *',    $$select private.job_monthly_coins()$$);
select cron.schedule('nesiplan-wrapped',       '0 2 1 * *',    $$select private.job_monthly_wrapped()$$);
select cron.schedule('nesiplan-recurring',     '0 3 * * *',    $$select private.job_generate_recurring()$$);
select cron.schedule('nesiplan-badges',        '30 3 * * *',   $$select private.job_daily_badges()$$);
