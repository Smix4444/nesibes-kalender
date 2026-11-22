# NesiPlan 🌶️📅

Een mobiele web-app (PWA) waarin vrienden afspraken aanvragen bij **Nesibe**.
Met rollen, çiğköfte-munten, veilingen, groepsactiviteiten, pushmeldingen,
kaarten, foto-albums, badges en een maandelijkse Wrapped.

> `PLAN.md` is de bron van waarheid voor features, schema en rechten.
> `CLAUDE.md` bevat de werkafspraken voor wie eraan bouwt.

## Stack

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, `src/`) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, pg_cron, pg_net) |
| Push | Web Push (VAPID) via `web-push` |
| Kaart | Leaflet + OpenStreetMap, geocoding via Nominatim |
| Tijdzone | Europe/Brussels (`date-fns-tz`) |
| Hosting | Vercel (auto-deploy op `main`) |

## Aan de slag

```bash
npm install
cp .env.example .env.local   # vul de Supabase- en VAPID-waarden in
npm run dev
```

## Scripts

| Script | Wat |
|---|---|
| `npm run dev` | Dev-server op http://localhost:3000 |
| `npm run build` | Productiebuild |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript zonder output |
| `npm run test` | Unit tests (vitest) |
| `npm run db:push` | Migrations naar Supabase pushen |
| `npm run db:types` | `src/lib/database.types.ts` genereren |
| `npm run seed` | Nesibe / Rayan / Dragos aanmaken |
| `npm run test:flows` | End-to-end flows tegen de echte database |
| `npm run icons` | PWA-iconen genereren uit de SVG |

## Rollen

| Rol | Wie | Kort |
|---|---|---|
| `owner` 👑 | Nesibe | Ziet alles, beslist over elke aanvraag |
| `admin` 🛡️💞 | Rayan | Technisch beheer + hoogste aanvraagprioriteit |
| `vip` ⭐ | Dragos | Gratis priority, bovenaan, gouden glow |
| `member` 🙂 | De rest | Aanvragen, bieden, ideeën, foto's |

## Database

Migrations staan in `supabase/migrations/` en worden bij elke push naar `main`
automatisch toegepast door `.github/workflows/supabase-migrations.yml`.
Schrijven naar de database gebeurt via `security definer` RPC-functies; clients
lezen via RLS.
