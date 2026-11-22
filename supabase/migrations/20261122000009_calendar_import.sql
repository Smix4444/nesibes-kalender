-- ============================================================================
-- Externe agenda (Apple/Google/school) als blokken in Nesibe's planning.
-- Zij abonneert zich op een .ics-link; een cron-job haalt die op en zet de
-- afspraken om in owner_items van het type 'block'.
-- ============================================================================

create table public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Mijn agenda' check (char_length(label) between 1 and 40),
  url text not null,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  event_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

-- Alleen Nesibe: dit zijn haar prive-agenda's.
create policy "feeds owner" on calendar_feeds for all to authenticated
  using (is_owner()) with check (is_owner());

-- Onderscheid tussen handmatige blokken en wat uit een agenda komt, zodat een
-- synchronisatie alleen haar eigen blokken opruimt.
alter table public.owner_items add column source text not null default 'manual';
alter table public.owner_items add column external_uid text;
create index owner_items_source on public.owner_items (source, external_uid);

-- ---------------------------------------------------------------- cron ----

/** Laat de app de agenda's ophalen; het parsen van .ics gebeurt in Node. */
create or replace function private.job_sync_calendars() returns void
language plpgsql security definer set search_path = public, private as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from calendar_feeds where enabled) then return; end if;

  select value into v_url from private.config where key = 'app_url';
  select value into v_secret from private.config where key = 'dispatch_secret';
  if v_url is null or v_secret is null then return; end if;

  perform net.http_post(
    url := v_url || '/api/calendar/import',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret)
  );
exception when others then
  return;
end $$;

select cron.schedule('nesiplan-calendar-sync', '17 */6 * * *', $$select private.job_sync_calendars()$$);
