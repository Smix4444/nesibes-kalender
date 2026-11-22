-- ============================================================================
-- NesiPlan — basisgegevens (badges, groepen, standaard beschikbaarheid)
-- Voorbeeldideeën worden aangemaakt door scripts/seed-users.ts: die hebben
-- een bestaande gebruiker nodig als `created_by`.
-- ============================================================================

insert into public.badges (code, name, emoji, description, is_role_badge) values
  ('owner',             'Queen',                        '👑', 'De agenda waar alles om draait.',               true),
  ('bf',                'De BF',                        '💞', 'Hoogste prioriteit, altijd.',                   true),
  ('vip',               'VIP Gold',                     '⭐', 'Gratis priority en een gouden randje.',         true),
  ('first_date',        'Eerste afspraak',              '🐣', 'Je allereerste geaccepteerde afspraak.',        false),
  ('koffiekoning',      'Koffiekoning(in)',             '☕', '5 koffie-afspraken op de teller.',              false),
  ('cigkofte_king',     'Çiğköfte-koning',              '🌶️', '3 veilingen gewonnen.',                         false),
  ('big_spender',       'Big spender',                  '💸', 'Ooit 4 of meer çiğköftes in één bod.',          false),
  ('on_time',           'Altijd op tijd',               '⏰', '5 keer op tijd ingecheckt.',                    false),
  ('party_animal',      'Feestbeest',                   '🎉', '5 groepsactiviteiten meegedaan.',               false),
  ('paparazzi',         'Paparazzi',                    '📸', '20 foto''s geüpload.',                          false),
  ('idea_machine',      'Ideeënmachine',                '💡', '5 ideeën gepost.',                              false),
  ('trendsetter',       'Trendsetter',                  '🔥', 'Een idee van jou kreeg 5 stemmen.',             false),
  ('loyal',             'Trouwe vriend(in)',            '🔁', 'Een vaste afspraak met 4 voorkomens.',          false),
  ('best_friend_month', 'Beste vriend(in) van de maand','🥇', 'De meeste uren met Nesibe deze maand.',         false),
  ('flaky_month',       'Meeste annulaties',            '💀', 'Twee of meer late afzeggingen in een maand.',   false),
  ('explorer',          'Ontdekker',                    '🗺️', 'Afgesproken op 5 verschillende plekken.',       false)
on conflict (code) do update
  set name = excluded.name,
      emoji = excluded.emoji,
      description = excluded.description,
      is_role_badge = excluded.is_role_badge;

-- Leden voegt Rayan toe via /admin zodra iedereen geregistreerd is.
insert into public.groups (name, emoji, color) values
  ('Girls',      '💅', '#FF8FAB'),
  ('Boys',       '🏋️', '#5C7AEA'),
  ('Full group', '🫶', '#9B5DE5')
on conflict (name) do nothing;

-- Standaard vrije vensters, zodat er meteen iets aangevraagd kan worden.
-- Nesibe past ze aan in /availability. (weekday 0 = maandag)
insert into public.availability_rules (weekday, start_time, end_time)
select w, '16:00'::time, '22:00'::time from generate_series(0, 4) w
where not exists (select 1 from public.availability_rules);

insert into public.availability_rules (weekday, start_time, end_time)
select w, '10:00'::time, '23:00'::time from generate_series(5, 6) w
where not exists (
  select 1 from public.availability_rules where weekday between 5 and 6
);
