-- ============================================================================
-- NesiPlan — schema
-- Alle tijden zijn timestamptz; "lokale datum" betekent altijd Europe/Brussels.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Niet blootgesteld via de API: interne helpers, jobs en secrets.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ========== ENUMS ==========
create type app_role        as enum ('owner','admin','vip','member');
create type appt_type       as enum ('solo','group');
create type appt_status     as enum ('pending','countered','auction','accepted','declined','cancelled','expired');
create type rsvp_status     as enum ('invited','going','maybe','not_going');
create type appt_category   as enum ('koffie','eten','brunch','shoppen','film','sport','studeren','uitgaan','wandelen','gaming','selfcare','anders');
create type coin_reason     as enum ('welcome','monthly_grant','priority_request','priority_refund','bid_hold','bid_refund','admin_adjust');
create type counter_status  as enum ('open','accepted','rejected','superseded');
create type owner_item_kind as enum ('block','task');
create type poll_vote_value as enum ('yes','maybe','no');
create type series_status   as enum ('pending','accepted','declined','ended');
create type series_freq     as enum ('weekly','biweekly','monthly');

-- ========== CONFIG ==========
-- app_url, dispatch_secret en invite_code worden handmatig gezet (zie PLAN par. 5).
create table private.config (key text primary key, value text not null);

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  timezone text not null default 'Europe/Brussels',
  monthly_coins int not null default 2,
  coin_cap int not null default 6,
  auction_scope text not null default 'same_day' check (auction_scope in ('same_day','overlap')),
  min_notice_minutes int not null default 60,
  max_photos_per_user_per_appt int not null default 10
);
insert into public.app_settings default values;

-- ========== PROFIELEN ==========
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 30),
  emoji text not null default '🙂',
  color text not null default '#E4572E',
  avatar_url text,
  role app_role not null default 'member',
  notif_prefs jsonb not null default '{"requests":true,"reminders":true,"free_today":true,"group":true,"auction":true,"monthly":true,"badges":true,"memories":true}',
  created_at timestamptz not null default now()
);
-- Er kan er maar een koningin zijn.
create unique index one_owner on public.profiles ((role)) where role = 'owner';

-- ========== GROEPEN ==========
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null default '👥',
  color text not null default '#7C5CFF',
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid references public.groups on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);

-- ========== IDEEEN ==========
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  description text check (char_length(description) <= 300),
  category appt_category not null default 'anders',
  created_by uuid not null references public.profiles on delete cascade,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.idea_votes (
  idea_id uuid references public.ideas on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  primary key (idea_id, user_id)
);

-- ========== FAVORIETE PLEKKEN ==========
create table public.saved_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

-- ========== TERUGKERENDE REEKSEN ==========
create table public.recurring_series (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles on delete cascade,
  title text not null,
  category appt_category not null default 'anders',
  freq series_freq not null default 'weekly',
  first_starts_at timestamptz not null,
  duration_minutes int not null check (duration_minutes between 15 and 720),
  until_date date not null,
  location_name text,
  location_address text,
  lat double precision,
  lng double precision,
  status series_status not null default 'pending',
  generated_until date,
  created_at timestamptz not null default now()
);
create index on public.recurring_series (created_by);

-- ========== VEILINGEN ==========
create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  status text not null default 'open' check (status in ('open','closed','cancelled','expired')),
  closes_at timestamptz not null,
  winner_appointment_id uuid,
  owner_reminded boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
-- Hoogstens een open veiling per dag.
create unique index auctions_one_open_per_day on public.auctions (day) where status = 'open';

-- ========== AFSPRAKEN ==========
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  type appt_type not null default 'solo',
  title text not null check (char_length(title) between 1 and 80),
  category appt_category not null default 'anders',
  description text check (char_length(description) <= 500),
  created_by uuid not null references public.profiles on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text,
  location_address text,
  lat double precision,
  lng double precision,
  is_priority boolean not null default false,
  status appt_status not null default 'pending',
  auction_id uuid references public.auctions on delete set null,
  series_id uuid references public.recurring_series on delete set null,
  idea_id uuid references public.ideas on delete set null,
  has_poll boolean not null default false,
  poll_closes_at timestamptz,
  decline_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (has_poll or (starts_at is not null and ends_at is not null))
);
create index on public.appointments (starts_at);
create index on public.appointments (status);
create index on public.appointments (created_by);
create index on public.appointments (auction_id);
create index on public.appointments (series_id);
alter table public.auctions
  add constraint auctions_winner_fk foreign key (winner_appointment_id)
  references public.appointments(id) on delete set null;

create table public.appointment_participants (
  appointment_id uuid references public.appointments on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  rsvp rsvp_status not null default 'invited',
  checked_in_at timestamptz,
  reminded_24h boolean not null default false,
  reminded_1h boolean not null default false,
  primary key (appointment_id, user_id)
);
create index on public.appointment_participants (user_id);

create table public.counter_proposals (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments on delete cascade,
  proposed_by uuid not null references public.profiles on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  message text check (char_length(message) <= 200),
  status counter_status not null default 'open',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on public.counter_proposals (appointment_id);

-- Welke groepen getagd werden (puur voor de weergave).
create table public.appointment_groups (
  appointment_id uuid references public.appointments on delete cascade,
  group_id uuid references public.groups on delete cascade,
  primary key (appointment_id, group_id)
);

-- ========== DATUMPOLL ==========
create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);
create index on public.poll_options (appointment_id);

create table public.poll_votes (
  option_id uuid references public.poll_options on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  vote poll_vote_value not null,
  primary key (option_id, user_id)
);

-- ========== BIEDINGEN ==========
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions on delete cascade,
  appointment_id uuid not null references public.appointments on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  amount int not null default 0 check (amount >= 0),
  sweetener text check (char_length(sweetener) <= 100),
  updated_at timestamptz not null default now(),
  unique (auction_id, user_id)
);
create index on public.bids (appointment_id);

-- ========== MUNTEN ==========
create table public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  amount int not null,
  reason coin_reason not null,
  appointment_id uuid references public.appointments on delete set null,
  auction_id uuid references public.auctions on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.coin_ledger (user_id);

create view public.coin_balances with (security_invoker = true) as
  select p.id as user_id, coalesce(sum(l.amount), 0)::int as balance
  from public.profiles p
  left join public.coin_ledger l on l.user_id = p.id
  group by p.id;

-- ========== NESIBE: BESCHIKBAARHEID, TAKEN & BLOKKEN ==========
-- weekday: 0 = maandag ... 6 = zondag
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- Prive van Nesibe: anderen zien hooguit "bezet".
create table public.owner_items (
  id uuid primary key default gen_random_uuid(),
  kind owner_item_kind not null,
  title text not null check (char_length(title) between 1 and 80),
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  due_date date,
  done boolean not null default false,
  color text,
  created_at timestamptz not null default now(),
  check (kind = 'task' or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);
create index on public.owner_items (starts_at);

create table public.free_today (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles on delete cascade,
  day date not null,
  from_time time not null,
  to_time time not null,
  message text check (char_length(message) <= 140),
  group_id uuid references public.groups on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (to_time > from_time)
);

-- ========== HERINNERINGEN (FOTO'S) ==========
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  storage_path text not null unique,
  caption text check (char_length(caption) <= 140),
  created_at timestamptz not null default now()
);
create index on public.memories (appointment_id);

-- ========== BADGES & WRAPPED ==========
create table public.badges (
  code text primary key,
  name text not null,
  emoji text not null,
  description text not null,
  is_role_badge boolean not null default false
);
create table public.user_badges (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  badge_code text not null references public.badges on delete cascade,
  period date,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_code, period)
);
-- NULLs zijn altijd "uniek" in Postgres, dus permanente badges apart afdwingen.
create unique index user_badges_permanent on public.user_badges (user_id, badge_code) where period is null;

create table public.wrapped (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  period date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, period)
);

-- ========== MELDINGEN ==========
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  url text not null default '/',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- ========== AGENDA-SYNC ==========
create table public.calendar_tokens (
  user_id uuid primary key references public.profiles on delete cascade,
  token uuid not null unique default gen_random_uuid()
);
