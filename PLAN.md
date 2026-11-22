# NesiPlan — Volledig bouwplan (A → Z)

> Werknaam: **NesiPlan** (overal vervangbaar via `APP_NAME` in `src/lib/config.ts`).
> Een mobiele web-app (PWA) waarin vrienden en vriendinnen afspraken aanvragen bij **Nesibe** (owner), met rollen, çiğköfte-munten, veilingen, groepsactiviteiten, pushmeldingen, kaarten, foto-albums, badges en een maandelijkse Wrapped.
>
> **Voor Claude Code:** lees eerst `CLAUDE.md`, dan dit hele document. Werk **fase per fase** (sectie 14). Na elke fase: build/lint/typecheck moeten slagen → commit → push naar `main` → Vercel deployt automatisch. Vraag Rayan alleen iets als een stap echt handwerk vereist (bv. Supabase-dashboard).

---

## Inhoud

1. Concept & rollen
2. Tech stack
3. Accounts, GitHub, Vercel & Supabase opzetten
4. Projectstructuur
5. Environment variables
6. Database-schema (SQL)
7. Row Level Security (SQL)
8. Database-functies (RPC's) & business-logica
9. Cron jobs
10. Pushmeldingen (PWA + Web Push)
11. Features in detail (F1–F16)
12. Schermen & UX
13. Design
14. Bouwfasen met acceptatiecriteria
15. Seed-accounts
16. Testen
17. Bekende beperkingen

---

## 1. Concept & rollen

Nesibe is de spil: alle afspraken staan op **haar** agenda. Vrienden vragen haar tijd aan (1-op-1) of maken groepsactiviteiten waarbij Nesibe en getagde mensen betrokken zijn.

| Rol | Wie | Rechten |
|---|---|---|
| `owner` 👑 | **Nesibe** | Ziet alles. Accepteert/weigert aanvragen, doet tegenvoorstellen, kiest veilingwinnaars, beheert haar beschikbaarheid en privé-taken/blokken, verstuurt "Vrij vandaag", finaliseert polls, keurt terugkerende reeksen goed. Kan geen aanvraag bij zichzelf doen. |
| `admin` 🛡️💞 | **Rayan** (BF-account) | Technisch beheer: rollen wijzigen, gebruikers verwijderen, munten bijstellen, groepen/instellingen/uitnodigingscode beheren. Ziet alle afspraken. **Hoogste prioriteit** van alle aanvragers: gratis priority, staat bovenaan in Nesibe's inbox, wint gelijke biedingen van iedereen (ook van VIP), mag buiten Nesibe's vrije uren aanvragen ("BF-privilege"). Ziet **niet** Nesibe's privé-taken/blokken (alleen "bezet"). |
| `vip` ⭐ | **Dragos** | Gratis priority (kost geen çiğköfte), aanvragen staan bovenaan (na Rayan), **gouden badge + gouden glow** op zijn naam/kaart, wint een gelijk bod van gewone members. |
| `member` 🙂 | Iedereen anders | Aanvragen doen, bieden, groepsactiviteiten maken, ideeën posten, foto's uploaden. Priority kost 1 çiğköfte. |

**Prioriteitsvolgorde (sorteren & tie-break):** `admin (3) > vip (2) > member (0)`. Binnen dezelfde rol: priority-aanvragen eerst, daarna oudste eerst.

**Zichtbaarheid voor members/vip:** ze zien van Nesibe's agenda enkel **vrij/bezet**, plus de afspraken waar ze zelf in zitten (eigen aanvragen + groepsactiviteiten waarin ze getagd zijn). Geen titels, namen of locaties van andermans afspraken.

**Çiğköfte-munten 🌶️:** puur virtuele, vriendschappelijke munten. Iedereen krijgt er **2 bij registratie** en **2 elke 1ste van de maand** (max. saldo 6, instelbaar). Gebruik: priority-aanvraag (1, gratis voor admin/vip) en bieden in veilingen.

---

## 2. Tech stack

| Onderdeel | Keuze | Waarom |
|---|---|---|
| Framework | **Next.js** (laatste stabiele versie, App Router, TypeScript, `src/`-map) | Draait native op Vercel |
| Styling | **Tailwind CSS** + **shadcn/ui** | Snel, consistente componenten |
| Animaties | `motion` (Framer Motion), `canvas-confetti` | Confetti bij "ja!", swipes, Wrapped-stories |
| Backend | **Supabase**: Postgres, Auth, Storage, Realtime, `pg_cron`, `pg_net` | Accounts, database, bestanden, cron, alles gratis tier |
| Supabase-client | `@supabase/supabase-js` + `@supabase/ssr` | Sessies in cookies voor server components |
| Push | Web Push (VAPID) met npm `web-push` in een Next.js API-route | Werkt op Android + iPhone (geïnstalleerde PWA) |
| PWA | `public/manifest.webmanifest` + handgeschreven `public/sw.js` | Installeerbaar op beginscherm, push |
| Kaart | `leaflet` + `react-leaflet` + OpenStreetMap-tiles | Gratis, geen API-key |
| Geocoding | Nominatim (OpenStreetMap) via eigen proxy-route | Gratis; max 1 req/s, User-Agent verplicht |
| Datums | `date-fns` + `date-fns-tz`, tijdzone **Europe/Brussels** | Correcte lokale tijden |
| Formulieren | `react-hook-form` + `zod` | Validatie client & server |
| Agenda-sync | npm `ics` → `.ics`-feed | Google/Apple Agenda-abonnement |
| Afbeeldingen | `browser-image-compression` | Foto's verkleinen vóór upload |
| Wrapped delen | `html-to-image` | Story als afbeelding opslaan/delen |
| Tests | `vitest` (+ optioneel Playwright) | Logica testen |
| Package manager | `npm` | |

Supabase-regio: **Central EU (Frankfurt)**.

---

## 3. Accounts, GitHub, Vercel & Supabase opzetten

### 3.1 Wat Rayan zelf moet doen (eenmalig, ±15 min)

1. **Supabase**: maak een project `nesiplan` aan (regio Frankfurt). Noteer: Project URL, anon/publishable key, service_role/secret key, project ref, database-wachtwoord.
2. Supabase → **Authentication → Providers → Email**: zet **"Confirm email" UIT** (makkelijker voor vrienden).
3. Supabase → **Authentication → URL Configuration**: Site URL = Vercel-URL (na stap 5), en voeg `http://localhost:3000/**` en `https://<vercel-url>/**` toe bij Redirect URLs.
4. Supabase → **Database → Extensions**: zet `pg_cron` en `pg_net` aan (de migration doet ook `create extension`, maar dit is de zekerste manier).
5. **Vercel**: na de eerste push (fase 0) → "Add New Project" → importeer GitHub-repo `Smix4444/nesiplan` → framework Next.js → voeg alle env vars uit sectie 5 toe → Deploy. Vanaf dan **deployt elke push naar `main` automatisch**.
6. **GitHub Secrets** (repo → Settings → Secrets → Actions) voor automatische migrations: `SUPABASE_ACCESS_TOKEN` (via supabase.com/dashboard/account/tokens), `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

### 3.2 Wat Claude Code doet

```bash
npx create-next-app@latest nesiplan --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd nesiplan
npx shadcn@latest init
git init && git add -A && git commit -m "chore: init Next.js project"
gh repo create Smix4444/nesiplan --private --source=. --remote=origin --push   # als gh niet beschikbaar is: vraag Rayan de repo aan te maken en de remote-URL te geven
npx supabase init
npx supabase link --project-ref <ref>        # vraagt db-wachtwoord
```

Migrations staan in `supabase/migrations/` en gaan mee naar GitHub. Toepassen:
- lokaal: `npx supabase db push`
- automatisch: GitHub Action (sectie 3.3) bij elke push die `supabase/migrations/**` wijzigt.

Types genereren na elke schema-wijziging:
```bash
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

### 3.3 `.github/workflows/supabase-migrations.yml`

```yaml
name: Supabase migrations
on:
  push:
    branches: [main]
    paths: ['supabase/migrations/**']
  workflow_dispatch:
jobs:
  migrate:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      - run: supabase db push
```

### 3.4 Git-workflow (belangrijk: alles moet naar GitHub & Vercel)

- Werk op `main` (klein privéproject). Eén commit per afgeronde deeltaak, conventional commits (`feat:`, `fix:`, `chore:`, `db:`).
- **Vóór elke push**: `npm run lint && npm run typecheck && npm run build` moet slagen. Nooit een kapotte build pushen: Vercel deployt `main` meteen.
- Na een push met migrations: controleer of de GitHub Action groen is (`gh run list --limit 3`).
- Nieuwe env var toegevoegd? Zet hem ook in **Vercel → Settings → Environment Variables** (vraag Rayan) en in `.env.example`.
- `.env.local` staat in `.gitignore` en wordt **nooit** gecommit.

---

## 4. Projectstructuur

```
nesiplan/
├─ CLAUDE.md
├─ PLAN.md
├─ .env.example
├─ .github/workflows/supabase-migrations.yml
├─ public/
│  ├─ manifest.webmanifest
│  ├─ sw.js
│  └─ icons/ (icon-192.png, icon-512.png, maskable-512.png, badge-72.png, apple-touch-icon.png)
├─ scripts/
│  ├─ seed-users.ts          # maakt Nesibe, Rayan, Dragos aan (sectie 15)
│  ├─ test-flows.ts          # end-to-end flows tegen de echte DB (sectie 16)
│  └─ generate-icons.ts      # optioneel: iconen genereren uit één SVG met sharp
├─ supabase/
│  ├─ config.toml
│  └─ migrations/
│     ├─ 20261122000001_schema.sql
│     ├─ 20261122000002_rls.sql
│     ├─ 20261122000003_functions.sql
│     ├─ 20261122000004_cron.sql
│     ├─ 20261122000005_storage.sql
│     └─ 20261122000006_seed_data.sql   # badges, groepen, voorbeeldideeën
└─ src/
   ├─ app/
   │  ├─ layout.tsx                 # fonts, theme, manifest-link, SW-registratie
   │  ├─ (auth)/login/page.tsx
   │  ├─ (auth)/register/page.tsx
   │  ├─ install/page.tsx           # installatie-uitleg iPhone/Android
   │  ├─ (app)/layout.tsx           # bottom nav + auth-guard
   │  ├─ (app)/page.tsx             # Home (rol-afhankelijk)
   │  ├─ (app)/agenda/page.tsx
   │  ├─ (app)/new/page.tsx         # wizard: aanvraag / groepsactiviteit / reeks
   │  ├─ (app)/appointments/[id]/page.tsx
   │  ├─ (app)/inbox/page.tsx       # alleen owner
   │  ├─ (app)/auctions/[id]/page.tsx
   │  ├─ (app)/planning/page.tsx    # alleen owner: taken & blokken
   │  ├─ (app)/availability/page.tsx# alleen owner
   │  ├─ (app)/ideas/page.tsx
   │  ├─ (app)/wallet/page.tsx
   │  ├─ (app)/badges/page.tsx
   │  ├─ (app)/wrapped/[period]/page.tsx
   │  ├─ (app)/notifications/page.tsx
   │  ├─ (app)/profile/page.tsx
   │  ├─ (app)/settings/page.tsx
   │  ├─ (app)/admin/page.tsx       # alleen admin (+ owner leesrechten)
   │  └─ api/
   │     ├─ push/subscribe/route.ts
   │     ├─ push/dispatch/route.ts
   │     ├─ geocode/route.ts
   │     └─ calendar/[token]/route.ts
   ├─ components/
   │  ├─ ui/                        # shadcn
   │  ├─ nav/BottomNav.tsx
   │  ├─ agenda/ (WeekView, DayTimeline, MonthGrid, FreeBusyBar, Legend)
   │  ├─ appointment/ (RequestCard, AppointmentCard, StatusPill, CounterSheet, RsvpBar, CheckInButton)
   │  ├─ auction/ (AuctionCard, BidSheet, BidList)
   │  ├─ map/ (LocationPicker, MiniMap, RouteButtons)
   │  ├─ people/ (Avatar, UserName met badge/glow, PeoplePicker, GroupChips)
   │  ├─ wrapped/ (StorySlides, ShareButton)
   │  └─ push/ (EnablePushButton, InstallPrompt)
   ├─ lib/
   │  ├─ config.ts                  # APP_NAME, TZ, categorieën
   │  ├─ supabase/client.ts | server.ts | admin.ts
   │  ├─ database.types.ts
   │  ├─ availability.ts            # vrije vensters berekenen
   │  ├─ priority.ts                # sorteren + tie-break
   │  ├─ dates.ts                   # TZ-helpers
   │  ├─ push.ts                    # web-push wrapper
   │  ├─ categories.ts
   │  └─ validators.ts              # zod-schema's
   └─ middleware.ts (of proxy.ts in Next 16+)   # sessie-refresh + redirects
```

---

## 5. Environment variables

`.env.example`:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=           # of de nieuwe "publishable key"
SUPABASE_SERVICE_ROLE_KEY=               # of de nieuwe "secret key" — NOOIT client-side, NOOIT committen
NEXT_PUBLIC_VAPID_PUBLIC_KEY=            # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:rayan@example.com
PUSH_DISPATCH_SECRET=                    # lange random string (openssl rand -hex 32)
NOMINATIM_USER_AGENT=NesiPlan/1.0 (rayan@example.com)
```

Daarnaast eenmalig in de **Supabase SQL editor** (niet in een migration, want er zit een secret in):
```sql
insert into private.config(key, value) values
  ('app_url', 'https://<jouw-vercel-url>'),
  ('dispatch_secret', '<zelfde waarde als PUSH_DISPATCH_SECRET>'),
  ('invite_code', 'cigkofte2026')
on conflict (key) do update set value = excluded.value;
```

---

## 6. Database-schema (SQL)

`supabase/migrations/20261122000001_schema.sql`

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists private;   -- NIET blootgesteld via de API

-- ========== ENUMS ==========
create type app_role       as enum ('owner','admin','vip','member');
create type appt_type      as enum ('solo','group');
create type appt_status    as enum ('pending','countered','auction','accepted','declined','cancelled','expired');
create type rsvp_status    as enum ('invited','going','maybe','not_going');
create type appt_category  as enum ('koffie','eten','brunch','shoppen','film','sport','studeren','uitgaan','wandelen','gaming','selfcare','anders');
create type coin_reason    as enum ('welcome','monthly_grant','priority_request','priority_refund','bid_hold','bid_refund','admin_adjust');
create type counter_status as enum ('open','accepted','rejected','superseded');
create type owner_item_kind as enum ('block','task');
create type poll_vote_value as enum ('yes','maybe','no');
create type series_status  as enum ('pending','accepted','declined','ended');
create type series_freq    as enum ('weekly','biweekly','monthly');

-- ========== CONFIG ==========
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

-- ========== IDEEËN ==========
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
  first_starts_at timestamptz not null,     -- eerste voorkomen (lokale tijd bepaalt weekdag/uur)
  duration_minutes int not null check (duration_minutes between 15 and 720),
  until_date date not null,                 -- max 6 maanden na start (check in RPC)
  location_name text, location_address text, lat double precision, lng double precision,
  status series_status not null default 'pending',
  generated_until date,
  created_at timestamptz not null default now()
);

-- ========== VEILINGEN ==========
create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  day date not null,                        -- lokale datum (Europe/Brussels)
  status text not null default 'open' check (status in ('open','closed','cancelled','expired')),
  closes_at timestamptz not null,           -- deadline voor bieden/kiezen
  winner_appointment_id uuid,
  owner_reminded boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- ========== AFSPRAKEN ==========
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  type appt_type not null default 'solo',
  title text not null check (char_length(title) between 1 and 80),
  category appt_category not null default 'anders',
  description text check (char_length(description) <= 500),
  created_by uuid not null references public.profiles on delete cascade,
  starts_at timestamptz,                    -- null zolang een datumpoll open is
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
alter table public.auctions
  add constraint auctions_winner_fk foreign key (winner_appointment_id) references public.appointments(id) on delete set null;

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

create table public.appointment_groups (        -- welke groepen getagd werden (voor weergave)
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
  sweetener text check (char_length(sweetener) <= 100),  -- "ik trakteer bubble tea 🧋"
  updated_at timestamptz not null default now(),
  unique (auction_id, user_id)
);

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
  from public.profiles p left join public.coin_ledger l on l.user_id = p.id
  group by p.id;

-- ========== NESIBE: BESCHIKBAARHEID, TAKEN & BLOKKEN ==========
create table public.availability_rules (       -- wekelijkse vrije vensters
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6),   -- 0 = maandag
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create table public.owner_items (               -- privé: enkel Nesibe ziet inhoud
  id uuid primary key default gen_random_uuid(),
  kind owner_item_kind not null,
  title text not null check (char_length(title) between 1 and 80),
  notes text,
  starts_at timestamptz,          -- block: verplicht
  ends_at timestamptz,            -- block: verplicht
  due_date date,                  -- task: optioneel
  done boolean not null default false,
  color text,
  created_at timestamptz not null default now(),
  check (kind = 'task' or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);
create table public.free_today (                -- "Ik ben vrij vandaag"-oproepen
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles on delete cascade,
  day date not null,
  from_time time not null,
  to_time time not null,
  message text check (char_length(message) <= 140),
  group_id uuid references public.groups on delete set null,  -- null = iedereen
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
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
  period date,                        -- null = permanent, anders 1ste dag van de maand
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_code, period)
);
-- NULL's zijn altijd "uniek" in Postgres → aparte index voor permanente badges
create unique index user_badges_permanent on public.user_badges (user_id, badge_code) where period is null;
create table public.wrapped (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  period date not null,               -- 1ste dag van de maand
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
```

---

## 7. Row Level Security (SQL)

`supabase/migrations/20261122000002_rls.sql`

**Principe:** clients **lezen** via RLS en **schrijven** bijna uitsluitend via `security definer` RPC-functies (sectie 8). Zo kan niemand via de API zijn eigen status op "accepted" zetten of gratis munten geven.

```sql
-- ---------- Helpers (public, stable, security definer) ----------
create or replace function public.my_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() = 'owner', false)
$$;
create or replace function public.is_staff() returns boolean   -- owner of admin
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('owner','admin'), false)
$$;
create or replace function public.role_weight(r app_role) returns int
language sql immutable as $$
  select case r when 'owner' then 4 when 'admin' then 3 when 'vip' then 2 else 0 end
$$;
create or replace function public.can_see_appointment(a_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff()
      or exists (select 1 from appointments where id = a_id and created_by = auth.uid())
      or exists (select 1 from appointment_participants where appointment_id = a_id and user_id = auth.uid())
$$;

-- ---------- RLS aanzetten op alles ----------
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles: iedereen ingelogd mag lezen; eigen profiel beperkt updaten (geen role!)
create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles update own" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated;
grant update (display_name, emoji, color, avatar_url, notif_prefs) on profiles to authenticated;

-- app_settings
create policy "settings read" on app_settings for select to authenticated using (true);
create policy "settings staff update" on app_settings for update to authenticated using (is_staff());

-- groups
create policy "groups read" on groups for select to authenticated using (true);
create policy "groups staff write" on groups for all to authenticated using (is_staff()) with check (is_staff());
create policy "group_members read" on group_members for select to authenticated using (true);
create policy "group_members staff write" on group_members for all to authenticated using (is_staff()) with check (is_staff());

-- appointments & gerelateerd: enkel lezen, schrijven via RPC
create policy "appts read" on appointments for select to authenticated using (can_see_appointment(id));
create policy "participants read" on appointment_participants for select to authenticated using (can_see_appointment(appointment_id));
create policy "counters read" on counter_proposals for select to authenticated using (can_see_appointment(appointment_id));
create policy "appt_groups read" on appointment_groups for select to authenticated using (can_see_appointment(appointment_id));
create policy "poll_options read" on poll_options for select to authenticated using (can_see_appointment(appointment_id));
create policy "poll_votes read" on poll_votes for select to authenticated
  using (exists (select 1 from poll_options o where o.id = option_id and can_see_appointment(o.appointment_id)));

-- auctions & bids: staff + betrokken bieders
create policy "auctions read" on auctions for select to authenticated
  using (is_staff() or exists (select 1 from appointments a where a.auction_id = auctions.id and a.created_by = auth.uid()));
create policy "bids read" on bids for select to authenticated
  using (is_staff() or exists (select 1 from appointments a where a.auction_id = bids.auction_id and a.created_by = auth.uid()));

-- munten: iedereen mag lezen (scorebord), niemand schrijft rechtstreeks
create policy "ledger read" on coin_ledger for select to authenticated using (true);

-- beschikbaarheid: iedereen leest de vrije vensters, owner/admin schrijven
create policy "avail read" on availability_rules for select to authenticated using (true);
create policy "avail write" on availability_rules for all to authenticated using (is_staff()) with check (is_staff());

-- owner_items: ENKEL Nesibe (ook Rayan niet)
create policy "owner items" on owner_items for all to authenticated using (is_owner()) with check (is_owner());

-- free_today
create policy "free_today read" on free_today for select to authenticated
  using (is_staff() or group_id is null
         or exists (select 1 from group_members gm where gm.group_id = free_today.group_id and gm.user_id = auth.uid()));

-- ideas
create policy "ideas read" on ideas for select to authenticated using (true);
create policy "ideas insert" on ideas for insert to authenticated with check (created_by = auth.uid());
create policy "ideas update" on ideas for update to authenticated using (created_by = auth.uid() or is_staff());
create policy "ideas delete" on ideas for delete to authenticated using (created_by = auth.uid() or is_staff());
create policy "idea_votes read" on idea_votes for select to authenticated using (true);
create policy "idea_votes own" on idea_votes for insert to authenticated with check (user_id = auth.uid());
create policy "idea_votes delete own" on idea_votes for delete to authenticated using (user_id = auth.uid());

-- saved_places
create policy "places read" on saved_places for select to authenticated using (true);
create policy "places insert" on saved_places for insert to authenticated with check (created_by = auth.uid());
create policy "places delete" on saved_places for delete to authenticated using (created_by = auth.uid() or is_staff());

-- recurring_series
create policy "series read" on recurring_series for select to authenticated using (created_by = auth.uid() or is_staff());

-- memories
create policy "memories read" on memories for select to authenticated using (can_see_appointment(appointment_id));
create policy "memories insert" on memories for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from appointment_participants p where p.appointment_id = memories.appointment_id and p.user_id = auth.uid())
  and exists (select 1 from appointments a where a.id = memories.appointment_id and a.status = 'accepted' and a.starts_at < now())
);
create policy "memories delete" on memories for delete to authenticated using (user_id = auth.uid() or is_staff());

-- badges & wrapped
create policy "badges read" on badges for select to authenticated using (true);
create policy "user_badges read" on user_badges for select to authenticated using (true);
create policy "wrapped read" on wrapped for select to authenticated using (user_id = auth.uid() or is_staff());

-- push & notificaties
create policy "push own" on push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif read own" on notifications for select to authenticated using (user_id = auth.uid());
create policy "notif mark read" on notifications for update to authenticated using (user_id = auth.uid());
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;

-- agenda-token
create policy "cal token own" on calendar_tokens for select to authenticated using (user_id = auth.uid());
```

---

## 8. Database-functies (RPC's) & business-logica

`supabase/migrations/20261122000003_functions.sql`

**Regels voor alle functies:**
- `language plpgsql security definer set search_path = public, private`.
- Interne helpers en jobs staan in schema **`private`** (niet aanroepbaar via de API).
- Publieke RPC's: `revoke execute ... from public, anon; grant execute ... to authenticated;`
- Foutmeldingen in het Nederlands, kort en een beetje grappig (worden letterlijk als toast getoond).
- "Lokale datum" = `(ts at time zone 'Europe/Brussels')::date` (haal tz uit `app_settings`).

### 8.1 Nieuwe gebruiker (trigger)

```sql
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_coins int;
begin
  select monthly_coins into v_coins from app_settings where id = 1;
  insert into profiles (id, username, display_name)
  values (new.id,
          lower(new.raw_user_meta_data->>'username'),
          coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username'));
  insert into coin_ledger (user_id, amount, reason, note) values (new.id, v_coins, 'welcome', 'Welkom! 🌶️');
  insert into calendar_tokens (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
```

### 8.2 Meldingen

```sql
-- private.notify(user_ids uuid[], type text, pref_key text, title text, body text, url text)
-- Voegt per ontvanger een rij toe in notifications, TENZIJ profiles.notif_prefs->>pref_key = 'false'.
-- Slaat de huidige gebruiker (auth.uid()) over, behalve als expliciet meegegeven.

-- Trigger: elke nieuwe notification → pg_net POST naar /api/push/dispatch
create or replace function private.dispatch_push() returns trigger
language plpgsql security definer set search_path = public, private, extensions as $$
declare v_url text; v_secret text;
begin
  select value into v_url from private.config where key = 'app_url';
  select value into v_secret from private.config where key = 'dispatch_secret';
  if v_url is null then return new; end if;
  perform net.http_post(
    url := v_url || '/api/push/dispatch',
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type','application/json','x-dispatch-secret', v_secret)
  );
  return new;
end $$;
create trigger notifications_push after insert on public.notifications
  for each row execute function private.dispatch_push();
```

### 8.3 Beschikbaarheid

- `public.get_busy_slots(p_from timestamptz, p_to timestamptz) returns table(starts_at timestamptz, ends_at timestamptz)`: security definer; geeft **alleen tijden** terug (geen titels/namen) van:
  - afspraken met status `accepted` (incl. groepsactiviteiten),
  - `owner_items` van kind `block`.
- `public.get_day_demand(p_day date) returns int`: aantal openstaande (`pending`/`auction`) solo-aanvragen op die dag. Wordt in de wizard getoond: *"⚔️ Er ligt al een aanvraag op deze dag, je komt in een veiling."*
- `private.is_slot_free(p_start timestamptz, p_end timestamptz) returns boolean`: true als het hele interval binnen één `availability_rules`-venster valt (lokale weekdag + tijd, maandag = 0) **en** niet overlapt met `get_busy_slots`.
- Client-side (`lib/availability.ts`): vrije vensters = wekelijkse regels voor die dag − busy-slots. Tijdkeuzes in de wizard in stappen van 15 min, alleen binnen vrije vensters.

### 8.4 Aanvraag doen (solo) — volledig uitgeschreven

```sql
create or replace function public.request_appointment(
  p_title text, p_category appt_category, p_description text,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text default null, p_location_address text default null,
  p_lat double precision default null, p_lng double precision default null,
  p_is_priority boolean default false, p_idea_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare
  v_uid uuid := auth.uid();
  v_role app_role;
  v_owner uuid;
  v_id uuid;
  v_s app_settings;
  v_day date;
  v_has_contenders boolean;
  v_name text;
begin
  select * into v_s from app_settings where id = 1;
  select role, display_name into v_role, v_name from profiles where id = v_uid;
  if v_role is null then raise exception 'Je bent niet ingelogd'; end if;
  if v_role = 'owner' then raise exception 'Nesibe, je kan geen afspraak met jezelf maken 😄'; end if;
  select id into v_owner from profiles where role = 'owner';

  if p_ends_at <= p_starts_at then raise exception 'Eindtijd moet na de starttijd liggen'; end if;
  if p_starts_at < now() + make_interval(mins => v_s.min_notice_minutes) then
    raise exception 'Iets te last-minute, minstens % min op voorhand', v_s.min_notice_minutes;
  end if;
  if v_role <> 'admin' and not private.is_slot_free(p_starts_at, p_ends_at) then
    raise exception 'Nesibe is dan niet vrij 🙅‍♀️';
  end if;

  -- priority: 1 çiğköfte voor members, gratis voor admin & vip
  if p_is_priority and v_role = 'member'
     and (select balance from coin_balances where user_id = v_uid) < 1 then
    raise exception 'Geen çiğköftes meer 🥲 Volgende maand krijg je er 2 bij';
  end if;

  insert into appointments (type, title, category, description, created_by, starts_at, ends_at,
                            location_name, location_address, lat, lng, is_priority, idea_id)
  values ('solo', p_title, p_category, p_description, v_uid, p_starts_at, p_ends_at,
          p_location_name, p_location_address, p_lat, p_lng, p_is_priority, p_idea_id)
  returning id into v_id;

  if p_is_priority and v_role = 'member' then
    insert into coin_ledger (user_id, amount, reason, appointment_id) values (v_uid, -1, 'priority_request', v_id);
  end if;

  insert into appointment_participants (appointment_id, user_id, rsvp)
  values (v_id, v_uid, 'going'), (v_id, v_owner, 'invited');

  -- veiling-check: andere openstaande solo-aanvraag van iemand anders op dezelfde dag?
  v_day := (p_starts_at at time zone v_s.timezone)::date;
  select exists (
    select 1 from appointments a
    where a.id <> v_id and a.type = 'solo' and a.series_id is null
      and a.status in ('pending','auction') and a.created_by <> v_uid
      and (a.starts_at at time zone v_s.timezone)::date = v_day
      and (v_s.auction_scope = 'same_day'
           or tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, p_ends_at))
  ) into v_has_contenders;

  if v_has_contenders then
    perform private.start_or_join_auction(v_id, v_day);
  else
    perform private.notify(array[v_owner], 'request_new', 'requests',
      private.request_title(v_role, p_is_priority, v_name, p_category),
      p_title || ' · ' || to_char(p_starts_at at time zone v_s.timezone, 'Dy DD/MM HH24:MI'),
      '/inbox');
  end if;
  return v_id;
end $$;
```

`private.request_title(role, is_priority, name, category)` geeft de meldingstitel:
- admin → `💞 Rayan wil afspreken`
- vip → `⭐ VIP Dragos wil afspreken`
- priority → `🌶️ PRIORITY: Tuana wil ☕ koffie`
- anders → `☕ Tuana wil koffie drinken` (emoji per categorie, zie `lib/categories.ts`, spiegel in SQL)

### 8.5 Veilingen

**`private.start_or_join_auction(p_appt uuid, p_day date)`**
1. Zoek een `auctions`-rij met `day = p_day` en `status = 'open'`; maak er anders een aan.
2. `closes_at` = vroegste `starts_at` van alle kanshebbers − `min_notice_minutes` (wordt bijgewerkt als er een vroegere bijkomt).
3. Zet alle kanshebbers (de nieuwe plus de bestaande `pending`/`auction` solo-aanvragen van andere mensen die dag) op `status = 'auction'` en vul `auction_id` in.
4. Maak voor elke kanshebber zonder bod een `bids`-rij met `amount = 0`.
5. Meldingen: alle kanshebbers krijgen *"⚔️ Veiling! Iemand anders wil ook [dag] met Nesibe. Bied çiğköftes!"* (`/auctions/:id`). Nesibe krijgt *"⚔️ Veiling voor [dag]: X aanvragen"*.

**`public.place_bid(p_auction uuid, p_amount int, p_sweetener text default null)`**
1. De veiling moet `open` zijn en `now() < closes_at`; de gebruiker moet een afspraak in die veiling hebben.
2. Haal het huidige bod op (`old`). Check: `p_amount <= balance + old` (het vorige bod staat al "vast").
3. Ledger: `+old` (`bid_refund`, als old > 0) en `-p_amount` (`bid_hold`, als p_amount > 0). Update `bids.amount`, `sweetener` en `updated_at`.
4. Meldingen: Nesibe → *"🌶️ Melisa biedt 2 çiğköftes (+ 'ik trakteer bubble tea')"*. Wie nu niet meer bovenaan staat volgens de tie-break → *"😱 Je bent overboden!"*

**Aanbevolen winnaar (sortering, ook in `lib/priority.ts`):**
`amount DESC` → `role_weight DESC` (Rayan > Dragos > members) → `is_priority DESC` → `bids.updated_at ASC`.
Daardoor wint **Dragos elk gelijk bod van members** en wint Rayan van iedereen. Nesibe ziet een 🏆 "aanbevolen" label, maar **zij kiest vrij** (ook een lager bod).

**`public.close_auction(p_auction uuid, p_winner uuid, p_also_accept uuid[] default '{}')`**: enkel owner.
1. Winnaar → `accepted`, `decided_at = now()`. Het bod blijft betaald (de hold wordt niet terugbetaald).
2. Afspraken in `p_also_accept` → ook `accepted`, maar hun bod wordt **terugbetaald** (Nesibe is royaal).
3. Alle andere → `declined`, `decline_reason = 'Veiling verloren 🥲'`, bod terugbetaald (`bid_refund`). Een priority-munt wordt **niet** terugbetaald.
4. Veiling → `closed`, `winner_appointment_id`, `closed_at`.
5. Meldingen: winnaar *"🏆 Je hebt de veiling gewonnen!"* (+confetti in de app), verliezers *"🥲 Veiling verloren, je çiğköftes zijn terug"*, plus een link naar de nieuwe-aanvraag-wizard met de eerstvolgende vrije dag voorgesteld.

**Randgevallen:**
- Een kanshebber annuleert → bod terug. Blijft er nog maar één over → veiling `cancelled`, die afspraak terug naar `pending`, Nesibe krijgt een gewone aanvraagmelding.
- `closes_at` voorbij en Nesibe heeft niet gekozen → housekeeping-job (sectie 9) stuurt **één keer** een herinnering (`owner_reminded`). Is de vroegste starttijd voorbij → veiling `expired`, alle afspraken `expired`, alle biedingen **en** priority-munten terug.

### 8.6 Reageren op aanvragen

- **`public.respond_appointment(p_id uuid, p_action text, p_reason text default null)`** (owner; `p_action` = `accept` | `decline`)
  - Alleen voor status `pending` (veilingen gaan via `close_auction`).
  - Bij accept: check opnieuw op overlap met accepted afspraken/blokken; bij overlap een fout met de vraag eerst te verplaatsen.
  - accept → `accepted` + melding *"✅ Nesibe zegt ja! [titel] op [datum]"* (`/appointments/:id`).
  - decline → `declined` + optionele reden + melding *"❌ Nesibe kan niet: [reden]"*. Priority-munt **wordt terugbetaald** (`priority_refund`) bij een weigering.
- **`public.counter_propose(p_id uuid, p_starts timestamptz, p_ends timestamptz, p_message text)`** (owner): oude open voorstellen → `superseded`; nieuw voorstel `open`; afspraak → `countered`. Melding aan de aanvrager: *"🔁 Nesibe stelt voor: zo 24/11 16:00 — 'liever namiddag?'"*
- **`public.respond_counter(p_counter uuid, p_action text, p_starts timestamptz default null, p_ends timestamptz default null)`** (aanvrager; `accept` | `reject` | `repropose`)
  - accept → afspraak krijgt de nieuwe tijden en wordt `accepted`. Melding aan Nesibe.
  - reject → afspraak `cancelled` (door aanvrager), priority-munt terug.
  - repropose → nieuwe tijden (moeten vrij zijn), status terug naar `pending`, melding aan Nesibe.
- **`public.cancel_appointment(p_id uuid, p_reason text)`** (maker, owner of admin): status `cancelled`; biedingen terug; alle andere deelnemers krijgen *"🚫 [titel] is geannuleerd"*. Telt mee voor de 💀-badge als de maker < 24u vóór de start annuleert.

### 8.7 Groepsactiviteiten, RSVP & poll

- **`public.create_group_activity(p_title, p_category, p_description, p_starts_at, p_ends_at, p_location..., p_user_ids uuid[], p_group_ids uuid[], p_poll_options jsonb default null, p_poll_closes_at timestamptz default null)`**
  - Deelnemers = maker + Nesibe (altijd) + `p_user_ids` + alle leden van `p_group_ids` (zonder dubbels). Groepen worden opgeslagen in `appointment_groups`.
  - Zonder poll: tijden verplicht; status `pending`; Nesibe moet accepteren (zelfde `respond_appointment`). Gemaakt door Nesibe zelf → meteen `accepted`.
  - Met poll: 2–4 opties in `poll_options`, `has_poll = true`, `starts_at` null, standaard `poll_closes_at` = +48u.
  - Groepsactiviteiten doen **niet** mee aan veilingen.
  - Melding aan alle getagden: *"🎉 Melisa nodigt je uit: Girls night 💅 — za 30/11 19:00"* of *"🗳️ Stem mee: wanneer gaan we bowlen?"*
- **`public.rsvp(p_id uuid, p_status rsvp_status)`**: enkel voor deelnemers; melding aan de maker (gebundeld: maximum één per uur).
- **`public.vote_poll(p_option uuid, p_vote poll_vote_value)`**: upsert.
- **`public.finalize_poll(p_id uuid, p_option uuid)`** (owner, of de maker als Nesibe "go" gaf): tijden overnemen, `has_poll = false`, status `accepted`, melding aan iedereen *"📅 Het wordt zaterdag 30/11 om 19:00!"*

### 8.8 Vrij vandaag

- **`public.broadcast_free_today(p_from time, p_to time, p_message text, p_group uuid default null)`** (owner): maakt een rij in `free_today` met `expires_at` = vandaag `p_to`. Melding aan de doelgroep: *"✨ Nesibe is vrij vandaag van 14:00 tot 18:00! 'wie gaat mee koffie drinken?'"* → url `/new?prefill=free_today&id=...`
- Op Home zien vrienden een opvallende banner zolang die niet verlopen is, met de knop **"Ik ben in! 🙋"** die de wizard opent met datum en uren vooraf ingevuld (de gewone aanvraagflow, dus ook veilingen als er meerdere zijn).

### 8.9 Terugkerende afspraken

- **`public.request_series(p_title, p_category, p_freq, p_first_starts_at, p_duration_minutes, p_until_date, p_location...)`**: `until_date` maximaal 6 maanden na de start. Status `pending`. Melding aan Nesibe: *"🔁 Tuana wil elke woensdag 10:00 koffie"*.
- **`public.respond_series(p_series uuid, p_accept boolean)`** (owner): bij accept → `private.generate_series_occurrences(p_series)` maakt meteen afspraken aan tot 8 weken vooruit (status `accepted`, `series_id`, beide deelnemers `going`). Een voorkomen dat botst met een blok of afspraak wordt **overgeslagen** en de maker krijgt een melding *"⚠️ 11/12 overgeslagen, Nesibe is dan bezet"*.
- Eén voorkomen annuleren = gewone `cancel_appointment`. Reeks stoppen: **`public.end_series(p_series)`** (maker of owner) → `ended` en alle toekomstige voorkomens `cancelled`.

### 8.10 Check-in

- **`public.check_in(p_id uuid)`**: enkel deelnemers van een `accepted` afspraak, tussen start −30 min en start +60 min. Zet `checked_in_at`. Op tijd = `checked_in_at <= starts_at + 5 min`. Telt voor de ⏰-badge.

### 8.11 Admin

- **`public.admin_set_role(p_user uuid, p_role app_role)`**: enkel admin; `owner` kan niet toegekend of afgenomen worden via de app.
- **`public.admin_adjust_coins(p_user uuid, p_amount int, p_note text)`**: enkel admin → ledger `admin_adjust`.
- **`public.admin_delete_user(p_user uuid)`**: wordt via een server action met de service-role uitgevoerd (`auth.admin.deleteUser`). Profiel en gerelateerde data verdwijnen via cascade.
- **`public.username_to_email(p_username text) returns text`**: security definer, ook voor `anon`, zodat je kan inloggen met gebruikersnaam (bewuste keuze voor een vriendenapp).

---

## 9. Cron jobs

`supabase/migrations/20261122000004_cron.sql`. `pg_cron` draait in **UTC**; alle functies rekenen intern met `Europe/Brussels`.

```sql
select cron.schedule('nesiplan-reminders',    '*/5 * * * *', $$select private.job_reminders()$$);
select cron.schedule('nesiplan-housekeeping', '*/15 * * * *', $$select private.job_housekeeping()$$);
select cron.schedule('nesiplan-monthly-coins','5 0 1 * *',   $$select private.job_monthly_coins()$$);
select cron.schedule('nesiplan-wrapped',      '0 2 1 * *',   $$select private.job_monthly_wrapped()$$);
select cron.schedule('nesiplan-recurring',    '0 3 * * *',   $$select private.job_generate_recurring()$$);
select cron.schedule('nesiplan-badges',       '30 3 * * *',  $$select private.job_daily_badges()$$);
```

| Job | Wat |
|---|---|
| `job_reminders` | Voor `accepted` afspraken en deelnemers met rsvp `going` (Nesibe altijd): **24u-herinnering** als de start binnen 24u valt maar nog meer dan 1u weg is en `reminded_24h = false` → *"⏰ Morgen: koffie met Tuana om 14:00 @ Café X"*. **1u-herinnering** als de start binnen 60 min valt en `reminded_1h = false` → *"🏃 Over 1 uur: ... — tik voor route"* (url naar de afspraak). Daarna de flags zetten. |
| `job_housekeeping` | `pending`/`countered` aanvragen waarvan de start voorbij is → `expired` + priority-munt terug + melding. Veiling-afhandeling uit 8.5. Polls voorbij `poll_closes_at` → herinnering naar Nesibe om te finaliseren. `free_today` die verlopen is wordt genegeerd (filter in de query, geen delete). |
| `job_monthly_coins` | Voor elk profiel behalve de owner: `+least(monthly_coins, coin_cap - balance)` als dat > 0 → `monthly_grant`. Melding *"🌶️ Je kreeg 2 nieuwe çiğköftes!"* |
| `job_monthly_wrapped` | Berekent Wrapped voor de vorige maand (sectie 11, F14), maandbadges, melding *"🎁 Jouw NesiPlan Wrapped van november is er!"* |
| `job_generate_recurring` | Voor elke `accepted` reeks: voorkomens aanvullen tot 8 weken vooruit (tot `until_date`). Reeks voorbij `until_date` → `ended`. |
| `job_daily_badges` | Permanente badges controleren en toekennen (F15), melding per nieuwe badge. |

---

## 10. Pushmeldingen (PWA + Web Push)

### 10.1 Manifest — `public/manifest.webmanifest`
```json
{
  "name": "NesiPlan",
  "short_name": "NesiPlan",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFF8F1",
  "theme_color": "#D7263D",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
In `layout.tsx`: `<link rel="manifest">`, `<link rel="apple-touch-icon">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `viewport-fit=cover` + safe-area padding (notch/home-indicator).

### 10.2 Service worker — `public/sw.js`
```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(d.title || 'NesiPlan', {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: d.tag,
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { await c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  })());
});
```

### 10.3 Abonneren (client) — `components/push/EnablePushButton.tsx`
1. Registreer `/sw.js` in een client component in de root layout.
2. Detecteer iOS zonder standalone-modus (`navigator.standalone !== true` en niet `matchMedia('(display-mode: standalone)')`) → toon **geen** push-knop maar verwijs naar `/install`.
3. Op **klik** (verplicht een user gesture): `Notification.requestPermission()` → `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY) })` → `POST /api/push/subscribe` met de subscription-JSON.
4. Na de eerste login verschijnt een onboarding-kaart: *"Zet meldingen aan zodat je weet wanneer Nesibe ja zegt 🔔"*. Voor Nesibe: *"Zet meldingen aan om aanvragen te krijgen"*.

### 10.4 API-routes
- `POST /api/push/subscribe`: ingelogde gebruiker (server-client); upsert in `push_subscriptions` op `endpoint`. `DELETE` om uit te schrijven.
- `POST /api/push/dispatch` (`runtime = 'nodejs'`):
  1. Check de header `x-dispatch-secret === PUSH_DISPATCH_SECRET`, anders 401.
  2. Service-role client: haal de notificatie op, plus alle `push_subscriptions` van `user_id`.
  3. `webpush.sendNotification(sub, JSON.stringify({ title, body, url, tag: type }))` voor elke subscription.
  4. Status 404/410 → subscription verwijderen.
- `lib/push.ts`: `webpush.setVapidDetails(VAPID_SUBJECT, PUBLIC, PRIVATE)`.

### 10.5 In-app meldingen
- Bel-icoon rechtsboven met een badge-teller van ongelezen (Supabase Realtime op `notifications` gefilterd op `user_id`).
- `/notifications`: lijst, tik = markeer als gelezen + navigeer, knop "alles gelezen".
- Realtime ook op `appointments`/`bids` zodat de inbox en veilingen live bijwerken.

### 10.6 Meldingen-overzicht

| Gebeurtenis | Ontvanger(s) | Voorbeeldtekst | Pref-key |
|---|---|---|---|
| Nieuwe solo-aanvraag | Nesibe | ☕ Tuana wil koffie drinken — za 23/11 14:00 | requests |
| Priority / VIP / BF-aanvraag | Nesibe | 🌶️ PRIORITY … / ⭐ VIP Dragos … / 💞 Rayan … | requests |
| Geaccepteerd / geweigerd | aanvrager | ✅ Nesibe zegt ja! / ❌ Nesibe kan niet | requests |
| Tegenvoorstel / antwoord | aanvrager / Nesibe | 🔁 Nesibe stelt zo 16:00 voor | requests |
| Veiling gestart | kanshebbers + Nesibe | ⚔️ Veiling voor zaterdag! | auction |
| Nieuw bod | Nesibe | 🌶️ Melisa biedt 2 | auction |
| Overboden | bieder | 😱 Je bent overboden! | auction |
| Veiling beslist | winnaar / verliezers | 🏆 Gewonnen! / 🥲 Verloren, munten terug | auction |
| Groepsuitnodiging / poll | getagden | 🎉 Girls night 💅 — za 19:00 | group |
| Poll beslist | deelnemers | 📅 Het wordt zaterdag! | group |
| RSVP (gebundeld) | maker | 👍 3 mensen komen | group |
| Vrij vandaag | doelgroep | ✨ Nesibe is vrij van 14–18u | free_today |
| Herinnering 24u / 1u | deelnemers (going) | ⏰ Morgen … / 🏃 Over 1 uur … | reminders |
| Annulering | andere deelnemers | 🚫 … geannuleerd | requests |
| Eerste foto's in album | andere deelnemers | 📸 Tuana deelde foto's van koffie | memories |
| Nieuwe reeks-aanvraag | Nesibe | 🔁 Elke woensdag koffie? | requests |
| Maandmunten | iedereen | 🌶️ +2 çiğköftes | monthly |
| Wrapped klaar | iedereen | 🎁 Je Wrapped van november | monthly |
| Badge verdiend | gebruiker | 🏅 Nieuwe badge: Koffiekoning ☕ | badges |

---

## 11. Features in detail

### F1 — Solo-aanvraag (koffiedate enz.)
Wizard `/new` (één scherm per stap, grote knoppen, voortgangsbalk):
1. **Wat?** Categorie-chips met emoji (☕ koffie, 🍝 eten, 🥞 brunch, 🛍️ shoppen, 🎬 film, 🏋️ sport, 📚 studeren, 🪩 uitgaan, 🚶‍♀️ wandelen, 🎮 gaming, 💅 selfcare, ✨ anders) + vrij tekstveld voor de activiteit (bv. "coffee date bij Kolonel Koffie").
2. **Wanneer?** Horizontale dagenstrip (14 dagen) met per dag een vrij/bezet-balkje; daaronder tijdchips van 15 min binnen vrije vensters + duur-chips (30 min, 1u, 1u30, 2u, 3u, custom). Bezette dagen grijs. Melding als er al vraag is op die dag (veiling).
3. **Waar?** (F12) optioneel.
4. **Extra:** notitie, priority-toggle (*"🌶️ Priority — kost 1 çiğköfte (je hebt er 2)"*; voor Dragos/Rayan: *"🌶️ Priority — gratis ⭐"*).
5. **Overzicht** → Versturen → succesanimatie.

### F2 — Groepsactiviteiten
Zelfde wizard, maar met toggle **Solo / Groep** bovenaan. Extra stap **Wie?**:
- Groep-chips: **Girls 💅**, **Boys 🏋️**, **Full group 🫶** (incl. boyfriends), plus groepen die de admin aanmaakt.
- People picker met avatars om losse mensen te taggen of weg te halen.
- Nesibe is altijd deelnemer (vast chip "👑 Nesibe").
Op de detailpagina: avatars met RSVP-status, knoppen **Ik kom ✅ / Misschien 🤔 / Kan niet ❌**.

### F3 — Datumpoll (Doodle-style)
In de groepswizard: "Datum nog niet zeker? → Laat stemmen". Voeg 2–4 tijdopties toe. Deelnemers stemmen per optie ✅/🤔/❌. Resultatenbalk per optie. Nesibe (of de maker) tikt **"Kies deze"** → finalize.

### F4 — Vrij/bezet-agenda van Nesibe
`/availability` (enkel owner/admin): weekrooster met vrije vensters (bv. ma–vr 16:00–22:00, za–zo 10:00–23:00). Tik en sleep of voeg toe via een formulier. Blokken (F-taken) maken haar automatisch bezet.
Vrienden zien in `/agenda` alleen groene "vrij"- en grijze "bezet"-zones, plus hun eigen afspraken in kleur.

### F4b — Nesibe's taken & blokken (haar eigen planning, "duidelijk overzicht")
`/planning` (enkel owner):
- **Blok** = privé-agendapunt met tijden (les, werk, sport…) → anderen zien alleen "bezet".
- **Taak** = to-do met optionele deadline en checkbox (examen leren, cadeau kopen…).
Haar Home toont **"Mijn dag"**: één tijdlijn met afspraken (kleur per categorie), blokken (gestreept) en taken voor vandaag (checkboxes), plus "Deze week" eronder.

### F5 — Tegenvoorstel
Op elke aanvraagkaart heeft Nesibe drie knoppen: **✅ Ja**, **🔁 Ander moment**, **❌ Nee**. "Ander moment" opent een sheet met dezelfde dag/tijd-kiezer + optioneel bericht. De aanvrager ziet het voorstel met **Oké! / Nee / Nog iets anders**.

### F6 — "Ik ben vrij vandaag"-knop
Grote knop op Nesibe's Home. Sheet: van–tot (standaard nu tot 22:00), bericht, doelgroep (iedereen of een groep). Zie 8.8.

### F7 — Herinneringen
24u en 1u vooraf (sectie 9). Per type uit te zetten in `/settings`.

### F8 — Agenda-sync
`GET /api/calendar/[token]` (`.ics`, `runtime = 'nodejs'`): zoek de gebruiker via `calendar_tokens` (service-role).
- Owner: alle `accepted` afspraken + haar blokken.
- Anderen: enkel `accepted` afspraken waar ze deelnemer zijn.
- Velden: titel (`☕ Koffie met Tuana`), locatie, beschrijving met link naar de app, `UID = appointment.id@nesiplan`.
- `/settings` toont de knop **"Abonneer in agenda"** (`webcal://…`) + uitleg voor Google Calendar ("Via URL toevoegen") en iPhone. Link opnieuw genereren = nieuw token.
- Let op: Google ververst geabonneerde agenda's maar om de paar uur (zie sectie 17).

### F9 — Çiğköfte-portemonnee 🌶️
`/wallet`: groot saldo met animatie, historiek (ledger met leesbare labels), **scorebord** (wie heeft er het meest, wie gaf er deze maand het meest uit, wie won de meeste veilingen). Uitleg-kaart: "Je krijgt er 2 per maand (max 6). Priority = 1. Bieden = zoveel je wil."

### F10 — Veiling
`/auctions/[id]`: kaarten per kanshebber (avatar, badge/glow, activiteit, uur, bod in grote cijfers, sweetener-tekst). Bieders: **"Verhoog bod"**-sheet met +/- en een sweetener-veld. Nesibe: per kaart een **"Kies deze 🏆"**-knop, een checkbox "ook accepteren" voor extra winnaars, en een 🏆-label bij de aanbevolen winnaar. Afteller tot `closes_at`. Live updates via Realtime.

### F11 — Ideeënbord 💡
`/ideas`: kaarten met titel, categorie en aantal stemmen (🔥). Sorteren op populair/nieuw. Knop **"Plan dit!"** opent de wizard met titel en categorie ingevuld (`idea_id`). Na een geaccepteerde afspraak met dat idee zet de maker of Nesibe het idee op ✅ "gedaan" (de app stelt het voor). Gedane ideeën staan in een apart tabblad.

### F12 — Locatie & kaart 📍
- `LocationPicker`: zoekveld → `/api/geocode?q=` (proxy naar Nominatim met `NOMINATIM_USER_AGENT`, `countrycodes=be,nl`, `limit=5`, `accept-language=nl`, debounce 500 ms, eenvoudige in-memory cache), knop **"Mijn locatie"** (geolocation + reverse geocode), versleepbare marker op de kaart, chips met **favoriete plekken** (`saved_places`) + "⭐ Bewaar als favoriet".
- Leaflet alleen client-side (`dynamic(() => import(...), { ssr: false })`) + de standaard markericoon-fix.
- Detailpagina: mini-kaart + knoppen **Google Maps** (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`), **Waze** (`https://waze.com/ul?ll=LAT,LNG&navigate=yes`), **Apple Kaarten** (`https://maps.apple.com/?daddr=LAT,LNG`).

### F13 — Herinneringen-album 📸
Op de detailpagina van een voorbije `accepted` afspraak: **"Voeg foto's toe"**. Comprimeren client-side (max 1600px, ~0,5 MB, jpeg/webp), upload naar de bucket `memories` op pad `{appointment_id}/{user_id}/{uuid}.jpg`, daarna een rij in `memories`. Raster + fullscreen viewer met swipe, signed URLs (1u geldig). Maximum 10 foto's per persoon per afspraak. Profiel → tab "Herinneringen" toont alle albums chronologisch.

### F14 — Maandelijkse Wrapped 🎁
`private.job_monthly_wrapped()` berekent op de 1ste voor de vorige maand een rij per gebruiker in `wrapped.data`:

**Voor elke vriend(in):**
```json
{
  "period": "2026-11",
  "appointments": 6,
  "hours_with_nesibe": 9.5,
  "top_category": "koffie",
  "top_location": "Kolonel Koffie",
  "group_activities": 2,
  "coins_spent": 3,
  "auctions_won": 1,
  "auctions_lost": 1,
  "biggest_bid": 2,
  "photos": 7,
  "rank_hours": 2,
  "total_friends": 11,
  "on_time_checkins": 4,
  "cancellations": 0,
  "badges": ["koffiekoning", "best_friend_month"],
  "fun_line": "Jullie dronken samen 5 koffies ☕ — dat is 1 per 6 dagen"
}
```
**Voor Nesibe (uitgebreid):** totaal afspraken en uren, **top 3 vrienden** (uren + aantal), drukste weekdag, favoriete categorie en plek, aantal groepsactiviteiten, aantal veilingen en totaal "verdiende" çiğköftes, de gulste bieder, foto's, ideeën die gedaan werden, langste afspraak.
**Weergave** `/wrapped/[period]`: Instagram-stories-stijl (fullscreen slides, progress-balkjes bovenaan, tik links/rechts, automatisch door na 5s), grote cijfers met count-up-animatie, felle gradient per slide, laatste slide "Deel" → `html-to-image` → Web Share API of downloaden. Archief van vorige maanden in het profiel.

### F15 — Badges 🏅
Seed in `20261122000006_seed_data.sql`:

| code | emoji | naam | toekenning |
|---|---|---|---|
| `owner` | 👑 | Queen | rolbadge Nesibe |
| `bf` | 💞 | De BF | rolbadge Rayan |
| `vip` | ⭐ | VIP Gold | rolbadge Dragos (gouden glow) |
| `first_date` | 🐣 | Eerste afspraak | 1ste geaccepteerde afspraak |
| `koffiekoning` | ☕ | Koffiekoning(in) | 5 koffie-afspraken |
| `cigkofte_king` | 🌶️ | Çiğköfte-koning | 3 veilingen gewonnen |
| `big_spender` | 💸 | Big spender | ooit 4+ geboden in één keer |
| `on_time` | ⏰ | Altijd op tijd | 5× op tijd ingecheckt |
| `party_animal` | 🎉 | Feestbeest | 5 groepsactiviteiten |
| `paparazzi` | 📸 | Paparazzi | 20 foto's geüpload |
| `idea_machine` | 💡 | Ideeënmachine | 5 ideeën gepost |
| `trendsetter` | 🔥 | Trendsetter | een idee met 5+ stemmen |
| `loyal` | 🔁 | Trouwe vriend(in) | actieve reeks met 4+ voorkomens |
| `best_friend_month` | 🥇 | Beste vriend(in) van de maand | maandelijks: meeste uren met Nesibe (period) |
| `flaky_month` | 💀 | Meeste annulaties | maandelijks: meeste late annulaties (≥ 2) (period) |
| `explorer` | 🗺️ | Ontdekker | afspraken op 5 verschillende locaties |

Weergave: naast de naam de belangrijkste badge (`UserName`-component: rol-badge eerst). `/badges`: alle badges met behaalde in kleur, niet-behaalde grijs met een hint.

### F16 — Terugkerende afspraken 🔁
In de solo-wizard bij "Wanneer?": toggle **"Herhaal dit"** → frequentie (wekelijks / 2-wekelijks / maandelijks) + tot wanneer (max. 6 maanden). Zie 8.9. Op de detailpagina: label "🔁 Elke woensdag" + "Stop reeks".

### F17 — Profiel & instellingen
- Profiel: avatar (upload naar de publieke bucket `avatars`), weergavenaam, emoji, kleur, badges, herinneringen, Wrapped-archief.
- Instellingen: meldingen aan/uit per type, push (her)activeren, agenda-link, installatie-uitleg, dark mode (systeem / licht / donker), uitloggen.

### F18 — Admin (Rayan)
`/admin`: gebruikerslijst (rol wijzigen, munten +/−, verwijderen), groepen beheren (naam, emoji, leden), app-instellingen (munten per maand, cap, veiling-scope, min. op voorhand), uitnodigingscode wijzigen (server action → `private.config`), eenvoudige stats.

---

## 12. Schermen & UX

**Navigatie (onderaan, 5 items):** 🏠 Home · 📅 Agenda · ➕ (grote centrale knop) · 💡 Ideeën · 👤 Profiel.
Voor Nesibe wordt 💡 vervangen door 📥 **Inbox** met een teller (ideeën staan dan op Home). Bel-icoon rechtsboven op elk scherm.

**Home — Nesibe 👑**
1. Begroeting "Hoi Nesibe 👑" + datum.
2. Inbox-preview: aantal open aanvragen en veilingen, de bovenste 3 kaarten (gesorteerd: Rayan → Dragos → priority → oudste) met swipe ✅/❌ of de knoppen.
3. **"✨ Ik ben vrij vandaag"**-knop.
4. **Mijn dag**: tijdlijn van vandaag (afspraken + blokken + taken).
5. Deze week (compacte lijst), populaire ideeën.

**Home — vrienden**
1. "Hoi Tuana 🙂" + saldo-chip 🌶️ 2.
2. Banner "✨ Nesibe is vrij vandaag" (indien actief).
3. **"Is Nesibe vrij?"**-strip: de komende 7 dagen met vrij/bezet-balkjes, tik → wizard.
4. Mijn komende afspraken (status-pills: ⏳ wacht, 🔁 tegenvoorstel, ⚔️ veiling, ✅ bevestigd).
5. Uitnodigingen die nog een RSVP of stem nodig hebben.
6. Populaire ideeën.

**Agenda (`/agenda`)**: schakelaar Dag / Week / Maand + lijstweergave. Nesibe en Rayan: alles met titels, kleur per categorie, legenda. Vrienden: vrij/bezet + eigen afspraken. Tik op een eigen afspraak → detail; tik op een vrij vak → wizard met tijd ingevuld.

**Detail afspraak**: header met categorie-emoji en kleur, status-pill, wanneer (+ "toevoegen aan agenda" .ics-download), waar (mini-kaart + routeknoppen), wie (avatars + RSVP), poll (indien nodig), tegenvoorstel (indien nodig), check-in-knop (rond het startuur), album (na afloop), annuleren.

**Gebruiksgemak-regels**
- Mobile-first (390px), touch targets ≥ 44px, duim-vriendelijke knoppen onderaan, bottom sheets (shadcn `Drawer`) in plaats van modals.
- Lege staten met een grappige tekst + actieknop ("Nog geen afspraken… tijd voor koffie? ☕").
- Optimistische UI + toasts (`sonner`); fouten uit de RPC letterlijk tonen.
- Skeleton loaders; pull-to-refresh op Home en Inbox.
- Confetti bij: aanvraag geaccepteerd, veiling gewonnen, nieuwe badge.
- `navigator.vibrate(10)` bij belangrijke tikken (Android).
- Alle tijden in 24u-notatie, Nederlandse dag- en maandnamen (`date-fns/locale/nl`).
- Toegankelijkheid: echte `<button>`s, aria-labels op icoonknoppen, voldoende contrast.

**Installatiepagina `/install`**: detecteert het toestel. iPhone: 3 stappen met illustraties (Safari → Deel-icoon → "Zet op beginscherm" → open de app → zet meldingen aan). Android: knop "Installeer" via het `beforeinstallprompt`-event. Wordt getoond na de eerste login als de app niet standalone draait.

**Registratie `/register`**: uitnodigingscode, gebruikersnaam, weergavenaam, e-mail, wachtwoord, emoji-kiezer → daarna onboarding (3 slides: hoe aanvragen werken, wat çiğköftes zijn, meldingen aanzetten).
**Login `/login`**: gebruikersnaam óf e-mail + wachtwoord.

---

## 13. Design

- **Sfeer:** warm, speels, een beetje "Turkse snackbar meets Instagram": crèmekleurige achtergrond, çiğköfte-rood als accent, goud voor VIP.
- **Kleuren (CSS-variabelen / Tailwind-theme):**
  - `--bg #FFF8F1` · `--surface #FFFFFF` · `--text #1F1A17` · `--muted #8A7F78`
  - `--accent #D7263D` (çiğköfte-rood) · `--accent-2 #FF8A3D` (oranje) · `--success #2BB673` · `--warning #F5A524`
  - `--gold` gradient `#F7D774 → #D4A017` (Dragos: naam, ring rond avatar, glow `0 0 12px rgba(212,160,23,.6)`)
  - `--bf` roze `#FF5C8A` (Rayan: 💞-ring)
  - Dark mode: `--bg #16110F`, `--surface #221B18`, `--text #F7EFE9`
  - Categoriekleuren: koffie `#8B5E3C`, eten `#E4572E`, brunch `#F4A259`, shoppen `#C86FC9`, film `#3D5A80`, sport `#2BB673`, studeren `#5C7AEA`, uitgaan `#9B5DE5`, wandelen `#6A994E`, gaming `#00BBF9`, selfcare `#FF8FAB`, anders `#8A7F78`
- **Typografie** (via `next/font/google`): koppen **Bricolage Grotesque** (700–800), tekst **DM Sans**.
- **Vormen:** `rounded-2xl` kaarten, zachte schaduwen, pill-chips, grote cijfers voor munten en biedingen.
- **App-icoon:** een çiğköfte-vormpje (rood ovaal met vingerafdruk-ribbels) met een klein kalendertje; genereer de PNG's uit één SVG via `scripts/generate-icons.ts` (sharp).

---

## 14. Bouwfasen met acceptatiecriteria

> Na **elke** fase: `npm run lint && npm run typecheck && npm run build` → commit → `git push` → controleer of de Vercel-deploy en de GitHub Action groen zijn. Werk `PLAN.md` bij met ✅ bij de afgeronde fase.

| Fase | Inhoud | Klaar wanneer… |
|---|---|---|
| **0. Setup** ✅ | Next.js + Tailwind + shadcn, scripts `typecheck`/`test`, `.env.example`, `.gitignore`, GitHub-repo (private), `CLAUDE.md` + `PLAN.md` in de repo, Supabase CLI init + link, GitHub Action | Repo staat op GitHub, Rayan heeft het project in Vercel geïmporteerd, de lege app draait op de Vercel-URL |
| **1. Basis-UI & PWA** ✅ | Fonts, thema/dark mode, bottom nav, layouts, manifest, iconen, `sw.js`-registratie, `/install` | De app is installeerbaar op Android en iPhone en opent standalone |
| **2. Database** ✅ | Migrations 1–6 (schema, RLS, functies — eerst de helpers, trigger, notify en beschikbaarheid —, cron, storage, seed data), types genereren | `supabase db push` slaagt; in de dashboard staat RLS overal aan; cron jobs zichtbaar |
| **3. Auth & profielen** ✅ | Supabase SSR-clients, middleware/proxy, register met uitnodigingscode, login met gebruikersnaam of e-mail, profielpagina, `scripts/seed-users.ts` | Nesibe/Rayan/Dragos kunnen inloggen met de juiste rol en badge; nieuwe gebruiker krijgt 2 munten |
| **4. Beschikbaarheid & agenda** ✅ | `/availability`, `/planning` (taken + blokken), `get_busy_slots`, `lib/availability.ts` + tests, Agenda dag/week/maand, Home-strip "Is Nesibe vrij?" | Vrienden zien alleen vrij/bezet; Nesibe ziet alles; een blok maakt haar bezet |
| **5. Aanvragen & inbox** ✅ | Wizard (zonder locatie), `request_appointment`, `respond_appointment`, tegenvoorstel-flow, annuleren, Inbox met prioriteitssortering, detailpagina, in-app meldingen | Volledige flow aanvraag → tegenvoorstel → accept werkt; sortering Rayan > Dragos > priority > oud |
| **6. Munten & veilingen** ✅ | Priority-kost, `/wallet` + scorebord, veilinglogica (8.5), `/auctions/[id]` met Realtime | Twee aanvragen op dezelfde dag → veiling; biedingen houden munten vast; Nesibe kiest; verliezers terugbetaald; Dragos wint een gelijk bod van een member |
| **7. Groepen & polls** ✅ | Groepenbeheer (admin), groepswizard met tags, RSVP, datumpoll + finalize | Getagde mensen zien de activiteit, niet-getagden niet |
| **8. Pushmeldingen** ✅ | VAPID, `/api/push/*`, pg_net-trigger, `private.config` invullen (vraag Rayan), EnablePushButton, herinneringen-cron | Op een echte iPhone (geïnstalleerde PWA) en Android komt een melding binnen bij een nieuwe aanvraag en bij een herinnering |
| **9. Locatie** ✅ | `/api/geocode`, LocationPicker, MiniMap, routeknoppen, favoriete plekken | Een plek zoeken, kiezen, bewaren en openen in Google Maps/Waze werkt |
| **10. Vrij vandaag & reeksen** ✅ | `broadcast_free_today` + banner + prefill, reeksen (request/respond/generate/end) | Nesibe's oproep geeft een push + banner; een wekelijkse reeks verschijnt 8 weken vooruit |
| **11. Ideeën & album** ✅ | `/ideas` met stemmen en "Plan dit!", storage-buckets, album met compressie en viewer | Ideeën stemmen/plannen werkt; foto's alleen zichtbaar voor deelnemers |
| **12. Check-in, badges & Wrapped** ✅ | Check-in, badge-jobs, `/badges`, Wrapped-berekening + stories-UI + delen | `select private.job_monthly_wrapped()` handmatig uitvoeren geeft correcte Wrapped voor testdata |
| **13. Agenda-sync** ✅ | `/api/calendar/[token]`, instellingenpagina | Abonneren in Google Calendar en Apple Agenda toont de juiste afspraken |
| **14. Afwerking** ✅ | Lege staten, skeletons, confetti, toegankelijkheid, Lighthouse-check (PWA/perf), `scripts/test-flows.ts`, README met uitleg | Lighthouse ≥ 90 op mobiel voor performance en best practices; alle flows uit sectie 16 slagen |

---

## 15. Seed-accounts

> Op Rayans uitdrukkelijke vraag staan de wachtwoorden "voor de leukigheid" in de code. Hou de repo **private**. De **service-role key** komt wel uit `.env.local` en staat **nooit** in de code: wie die key heeft, kan de hele database lezen en wissen.

`scripts/seed-users.ts` (uitvoeren met `npx tsx scripts/seed-users.ts`):

```ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Vervang de e-mails door echte adressen als je wachtwoord-reset wil kunnen gebruiken.
const users = [
  { username: 'nesibe', display_name: 'Nesibe', email: 'nesibe@example.com', password: 'CigkofteQueen2026!', role: 'owner',  emoji: '👑', color: '#D7263D' },
  { username: 'rayan',  display_name: 'Rayan',  email: 'rayan@example.com',  password: 'DeBF2026!',          role: 'admin',  emoji: '💞', color: '#FF5C8A' },
  { username: 'dragos', display_name: 'Dragos', email: 'dragos@example.com', password: 'DragosVIP2026!',     role: 'vip',    emoji: '⭐', color: '#D4A017' },
] as const;

const roleBadge = { owner: 'owner', admin: 'bf', vip: 'vip' } as const;

for (const u of users) {
  // bestaat al? → overslaan (idempotent)
  const { data: existing } = await admin.from('profiles').select('id').eq('username', u.username).maybeSingle();
  let id = existing?.id as string | undefined;

  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { username: u.username, display_name: u.display_name },
    });
    if (error) throw error;
    id = data.user.id;
  }

  await admin.from('profiles').update({ role: u.role, emoji: u.emoji, color: u.color }).eq('id', id);
  const { data: hasBadge } = await admin.from('user_badges')
    .select('id').eq('user_id', id).eq('badge_code', roleBadge[u.role]).is('period', null).maybeSingle();
  if (!hasBadge) {
    await admin.from('user_badges').insert({ user_id: id, badge_code: roleBadge[u.role], period: null });
  }
  console.log(`✅ ${u.display_name} (${u.role}) klaar`);
}
```

Seed data in de migration (`20261122000006_seed_data.sql`): alle badges uit F15, groepen **Girls 💅**, **Boys 🏋️**, **Full group 🫶** (leden voegt Rayan toe via `/admin` zodra iedereen geregistreerd is), een paar voorbeeldideeën (zonder `created_by` kan niet → voeg die toe in `seed-users.ts` als Nesibe).

---

## 16. Testen

**Unit (vitest):**
- `lib/availability.ts`: vrije vensters min busy-slots, rand van middernacht, zomer/wintertijd (laatste zondag van maart/oktober).
- `lib/priority.ts`: sortering en tie-break (Rayan > Dragos > member, priority, tijd).
- Validators (zod).

**Flows tegen de echte database (`scripts/test-flows.ts`)**: maakt tijdelijk twee testmembers aan (`test_a`, `test_b`), voert deze scenario's uit met hun eigen sessie (`signInWithPassword`) en ruimt achteraf op:
1. test_a vraagt aan → Nesibe accepteert → status `accepted`, melding bestaat.
2. test_a vraagt priority aan → saldo −1; Nesibe weigert → saldo terug.
3. test_a en test_b op dezelfde dag → veiling; test_a biedt 2, test_b biedt 2 → aanbevolen = oudste bod; Nesibe kiest test_b → test_a krijgt munten terug, test_b niet.
4. Dragos en test_a bieden allebei 1 → aanbevolen = Dragos.
5. test_a probeert via de API een andermans afspraak te lezen → 0 rijen (RLS).
6. test_a probeert `update profiles set role='admin'` → fout.
7. test_a probeert buiten Nesibe's vrije uren aan te vragen → fout; Rayan mag het wel.
8. Groepsactiviteit met test_a getagd → test_a ziet ze, test_b niet.

**Handmatig op echte toestellen:** iPhone (Safari → beginscherm → push) en Android (Chrome) voor elke melding uit 10.6.

---

## 17. Bekende beperkingen (eerlijk)

- **iPhone-push** werkt alleen als de app via Safari op het beginscherm staat (iOS 16.4+) en meldingen daarna via een knop worden aangezet. Wie de app gewoon in Safari opent, krijgt geen push. Daarom bestaan `/install` en de onboarding.
- **Nominatim** is gratis maar traag-ish en streng (1 request/seconde, User-Agent verplicht). Voor een vriendengroep is dat ruim genoeg. Mocht het haperen: vervang het door Photon (komoot) of een Mapbox-key.
- **Google Calendar** ververst geabonneerde `.ics`-agenda's maar om de paar uur. Wijzigingen verschijnen daar dus niet meteen (in de app wel).
- **Gratis Supabase-projecten** worden gepauzeerd na een week zonder activiteit. Bij een actieve vriendengroep gebeurt dat niet, en anders zet je het met één klik terug aan.
- **Wachtwoorden in de code** (sectie 15): bewuste keuze. Wijzig ze na de eerste login via het profiel als je wil.
