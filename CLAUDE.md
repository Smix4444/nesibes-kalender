# CLAUDE.md — NesiPlan

Lees `PLAN.md` volledig voor je iets bouwt. Dat is de bron van waarheid voor features, schema, rechten en volgorde.

## Werkwijze
- Bouw **fase per fase** volgens `PLAN.md` sectie 14. Begin pas aan de volgende fase als de acceptatiecriteria van de huidige gehaald zijn.
- Na elke fase (en na elke grotere deeltaak):
  1. `npm run lint && npm run typecheck && npm run build` moet slagen.
  2. Commit met een conventional commit (`feat:`, `fix:`, `db:`, `chore:`).
  3. `git push origin main` → Vercel deployt automatisch. Nooit een kapotte build pushen.
  4. Als er migrations bij zaten: controleer met `gh run list --limit 3` of de Supabase-Action groen is.
  5. Zet ✅ bij de fase in `PLAN.md`.
- Moet Rayan iets handmatig doen (Supabase-dashboard, Vercel env vars, `private.config` invullen, testen op zijn gsm)? Stop en geef hem een korte, genummerde checklist.

## Regels
- **Tijdzone:** altijd `Europe/Brussels`. Opslaan als `timestamptz`, tonen met `date-fns-tz` + locale `nl`.
- **Schrijven naar de database gebeurt via RPC-functies** (security definer), niet via directe inserts/updates vanuit de client, behalve waar RLS het expliciet toelaat (ideeën, stemmen, favoriete plekken, foto's, profielvelden, push-subscriptions, notificatie gelezen).
- Elke nieuwe tabel: RLS aan + policies in dezelfde migration.
- Nieuwe migration = nieuw bestand in `supabase/migrations/` (timestamp-prefix). Bestaande migrations die al gepusht zijn **nooit** aanpassen.
- Na een schemawijziging: `npx supabase gen types typescript --linked > src/lib/database.types.ts`.
- `SUPABASE_SERVICE_ROLE_KEY` alleen in server-code (`src/lib/supabase/admin.ts`, API-routes, scripts). Nooit in client components, nooit committen.
- Nieuwe env var → ook in `.env.example` zetten en Rayan vragen hem in Vercel toe te voegen.
- UI-teksten in het Nederlands, speels maar duidelijk. Foutmeldingen uit RPC's letterlijk als toast tonen.
- Mobile-first (390px), touch targets ≥ 44px, bottom sheets in plaats van modals.
- Leaflet alleen client-side laden (`dynamic(..., { ssr: false })`).
- Push-API-routes en de `.ics`-route: `export const runtime = 'nodejs'`.

## Rollen (kort)
owner = Nesibe 👑 · admin = Rayan 💞 (hoogste prioriteit) · vip = Dragos ⭐ (gratis priority, bovenaan, gouden badge, wint gelijk bod van members) · member = de rest.
Tie-break: bod ↓ → rolgewicht (admin 3 > vip 2 > member 0) ↓ → priority ↓ → tijdstip bod ↑.
