# NesiPlan 🌶️📅

Een mobiele web-app (PWA) waarin vrienden afspraken aanvragen bij **Nesibe**.
Met rollen, çiğköfte-munten, veilingen, groepsactiviteiten, pushmeldingen,
kaarten, foto-albums, badges en een maandelijkse Wrapped.

> `PLAN.md` is de bron van waarheid voor features, schema en rechten.
> `CLAUDE.md` bevat de werkafspraken voor wie eraan bouwt.

---

## ⚡ Eerst dit: wat Rayan nog moet doen

De code is af en de build is groen, maar de app praat nog met niets. Deze
stappen zijn handwerk omdat ze accounts en secrets nodig hebben.

### 1. Supabase-project

1. Maak op [supabase.com](https://supabase.com) een project **`nesiplan`** aan,
   regio **Central EU (Frankfurt)**. Noteer het database-wachtwoord.
2. **Authentication → Providers → Email**: zet *Confirm email* **UIT**.
3. **Authentication → URL Configuration**: Site URL = je Vercel-URL, en zet bij
   Redirect URLs zowel `http://localhost:3000/**` als `https://<vercel-url>/**`.
4. **Database → Extensions**: zet `pg_cron` en `pg_net` aan.

### 2. `.env.local`

```bash
cp .env.example .env.local
```

Vul in (Project Settings → API):

| Variabele | Waar | 
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key — **nooit committen** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `PUSH_DISPATCH_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | je Vercel-URL (of `http://localhost:3000`) |

### 3. Database vullen

```bash
npx supabase link --project-ref <ref>   # vraagt het db-wachtwoord
npm run db:check                        # syntaxcontrole van de migrations
npm run db:push                         # past de 6 migrations toe
npm run db:types                        # echte types i.p.v. de gegenereerde
npm run seed                            # Nesibe, Rayan, Dragos + voorbeeldideeen
```

### 4. Secrets in de database

In de **Supabase SQL editor** (niet in een migration — hier zit een secret in):

```sql
insert into private.config(key, value) values
  ('app_url',         'https://<jouw-vercel-url>'),
  ('dispatch_secret', '<zelfde waarde als PUSH_DISPATCH_SECRET>'),
  ('invite_code',     'cigkofte2026')
on conflict (key) do update set value = excluded.value;
```

Zonder `app_url` en `dispatch_secret` worden meldingen wél opgeslagen, maar
niet als push verstuurd. Zonder `invite_code` kan niemand registreren.

### 5. GitHub & Vercel

1. Push naar de repo (`git push -u origin main`).
2. **Vercel** → Add New Project → importeer de repo → framework Next.js →
   zet alle variabelen uit `.env.local` erbij → Deploy.
3. **GitHub → Settings → Secrets → Actions**, voor de migratie-workflow:
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

### 6. Controleren

```bash
npm run test:flows   # end-to-end tegen de echte database
```

Daarna op een echte telefoon: open de app, zet hem op je beginscherm via
`/install`, en zet meldingen aan bij **Instellingen**.

---

## Aan de slag (dagelijks)

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | Wat |
|---|---|
| `npm run dev` | Dev-server |
| `npm run build` | Productiebuild |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run test` | Unit tests (vitest) |
| `npm run db:check` | Migrations door de echte Postgres-parser halen |
| `npm run db:push` | Migrations toepassen |
| `npm run db:types` | Types uit het gelinkte project |
| `npm run db:types:local` | Types uit de migrations (zonder project) |
| `npm run seed` | Seed-accounts aanmaken |
| `npm run test:flows` | Flows tegen de echte database |
| `npm run icons` | PWA-iconen genereren |

---

## Stack

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, `src/`) |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova / Base UI) |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, pg_cron, pg_net) |
| Push | Web Push (VAPID) via `web-push` |
| Kaart | Leaflet + OpenStreetMap, geocoding via Nominatim |
| Tijdzone | Europe/Brussels (`date-fns-tz`) |
| Hosting | Vercel (auto-deploy op `main`) |

### Twee keuzes die afwijken van het plan

- **Cache Components staat uit** (`next.config.ts`). Elke route is
  persoonsgebonden en realtime, dus er valt geen statische shell te winnen, en
  `use cache`-scopes kunnen de auth-cookies van Supabase niet verversen.
- **shadcn draait op Base UI**, niet Radix. Compositie gaat daar via
  `render={<Link />}` in plaats van `asChild`.

---

## Rollen

| Rol | Wie | Kort |
|---|---|---|
| `owner` 👑 | Nesibe | Ziet alles, beslist over elke aanvraag |
| `admin` 🛡️💞 | Rayan | Technisch beheer + hoogste aanvraagprioriteit |
| `vip` ⭐ | Dragos | Gratis priority, bovenaan, gouden glow |
| `member` 🙂 | De rest | Aanvragen, bieden, ideeën, foto's |

Tie-break bij veilingen: bod ↓ → rolgewicht (admin 3 > vip 2 > member 0) ↓ →
priority ↓ → tijdstip van het bod ↑.

---

## Database

Migrations staan in `supabase/migrations/` en worden bij elke push naar `main`
toegepast door `.github/workflows/supabase-migrations.yml`.

Schrijven gebeurt via `security definer` RPC-functies; clients lezen via RLS.
Foutmeldingen uit die functies zijn Nederlands en worden letterlijk als toast
getoond.

**Bestaande migrations nooit aanpassen zodra ze gepusht zijn** — maak een nieuw
bestand met een nieuwe timestamp.

---

## Bekende beperkingen

- **iPhone-push** werkt alleen als de app via Safari op het beginscherm staat
  (iOS 16.4+) en meldingen daarna via de knop in Instellingen aan staan.
- **Nominatim** mag 1 verzoek per seconde; de proxy in `/api/geocode` houdt dat
  tegen met een wachtrij en een cache van 10 minuten.
- **Google Agenda** ververst geabonneerde `.ics`-agenda's maar om de paar uur.
  In de app zelf zie je wijzigingen meteen.
- **Gratis Supabase-projecten** pauzeren na een week zonder activiteit.
- De **wachtwoorden van de seed-accounts staan in `scripts/seed-users.ts`**
  (bewuste keuze). Hou de repo privé.
