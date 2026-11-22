-- ============================================================================
-- NesiPlan — Row Level Security
--
-- Principe: clients LEZEN via RLS en SCHRIJVEN bijna uitsluitend via
-- `security definer` RPC-functies (migration 3). Zo kan niemand via de API
-- zijn eigen aanvraag op 'accepted' zetten of zichzelf munten geven.
-- ============================================================================

-- ---------- Helpers ----------
-- Allemaal security definer: ze lezen profiles/appointments zonder zelf weer
-- door RLS te gaan (anders krijg je oneindige recursie in de policies).

create or replace function public.my_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() = 'owner', false)
$$;

-- owner of admin
create or replace function public.is_staff() returns boolean
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

revoke execute on function public.my_role(), public.is_owner(), public.is_staff(),
  public.can_see_appointment(uuid) from public, anon;
grant execute on function public.my_role(), public.is_owner(), public.is_staff(),
  public.can_see_appointment(uuid) to authenticated;
grant execute on function public.role_weight(app_role) to authenticated;

-- ---------- RLS aanzetten op alles ----------
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- profiles ----------
-- Iedereen die ingelogd is mag elkaars profiel lezen (avatars, namen, badges).
create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles update own" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Kolom-grants zijn wat `role` beschermt: niemand promoveert zichzelf.
revoke update on profiles from authenticated;
grant update (display_name, emoji, color, avatar_url, notif_prefs) on profiles to authenticated;

-- ---------- app_settings ----------
create policy "settings read" on app_settings for select to authenticated using (true);
create policy "settings staff update" on app_settings for update to authenticated
  using (is_staff()) with check (is_staff());

-- ---------- groepen ----------
create policy "groups read" on groups for select to authenticated using (true);
create policy "groups staff write" on groups for all to authenticated
  using (is_staff()) with check (is_staff());
create policy "group_members read" on group_members for select to authenticated using (true);
create policy "group_members staff write" on group_members for all to authenticated
  using (is_staff()) with check (is_staff());

-- ---------- afspraken & aanverwanten: enkel lezen, schrijven via RPC ----------
create policy "appts read" on appointments for select to authenticated
  using (can_see_appointment(id));
create policy "participants read" on appointment_participants for select to authenticated
  using (can_see_appointment(appointment_id));
create policy "counters read" on counter_proposals for select to authenticated
  using (can_see_appointment(appointment_id));
create policy "appt_groups read" on appointment_groups for select to authenticated
  using (can_see_appointment(appointment_id));
create policy "poll_options read" on poll_options for select to authenticated
  using (can_see_appointment(appointment_id));
create policy "poll_votes read" on poll_votes for select to authenticated
  using (exists (select 1 from poll_options o where o.id = option_id and can_see_appointment(o.appointment_id)));

-- ---------- veilingen & biedingen: staff + betrokken bieders ----------
create policy "auctions read" on auctions for select to authenticated
  using (is_staff() or exists (
    select 1 from appointments a where a.auction_id = auctions.id and a.created_by = auth.uid()
  ));
create policy "bids read" on bids for select to authenticated
  using (is_staff() or exists (
    select 1 from appointments a where a.auction_id = bids.auction_id and a.created_by = auth.uid()
  ));

-- ---------- munten ----------
-- Iedereen mag het grootboek lezen (scorebord), niemand schrijft rechtstreeks.
create policy "ledger read" on coin_ledger for select to authenticated using (true);

-- ---------- beschikbaarheid ----------
create policy "avail read" on availability_rules for select to authenticated using (true);
create policy "avail write" on availability_rules for all to authenticated
  using (is_staff()) with check (is_staff());

-- ---------- owner_items: ENKEL Nesibe (ook Rayan niet) ----------
create policy "owner items" on owner_items for all to authenticated
  using (is_owner()) with check (is_owner());

-- ---------- vrij vandaag ----------
create policy "free_today read" on free_today for select to authenticated
  using (is_staff() or group_id is null
         or exists (select 1 from group_members gm
                    where gm.group_id = free_today.group_id and gm.user_id = auth.uid()));

-- ---------- ideeen ----------
create policy "ideas read" on ideas for select to authenticated using (true);
create policy "ideas insert" on ideas for insert to authenticated with check (created_by = auth.uid());
create policy "ideas update" on ideas for update to authenticated
  using (created_by = auth.uid() or is_staff());
create policy "ideas delete" on ideas for delete to authenticated
  using (created_by = auth.uid() or is_staff());
create policy "idea_votes read" on idea_votes for select to authenticated using (true);
create policy "idea_votes own" on idea_votes for insert to authenticated with check (user_id = auth.uid());
create policy "idea_votes delete own" on idea_votes for delete to authenticated using (user_id = auth.uid());

-- ---------- favoriete plekken ----------
create policy "places read" on saved_places for select to authenticated using (true);
create policy "places insert" on saved_places for insert to authenticated
  with check (created_by = auth.uid());
create policy "places delete" on saved_places for delete to authenticated
  using (created_by = auth.uid() or is_staff());

-- ---------- reeksen ----------
create policy "series read" on recurring_series for select to authenticated
  using (created_by = auth.uid() or is_staff());

-- ---------- herinneringen (foto's) ----------
create policy "memories read" on memories for select to authenticated
  using (can_see_appointment(appointment_id));
create policy "memories insert" on memories for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from appointment_participants p
              where p.appointment_id = memories.appointment_id and p.user_id = auth.uid())
  and exists (select 1 from appointments a
              where a.id = memories.appointment_id and a.status = 'accepted' and a.starts_at < now())
);
create policy "memories delete" on memories for delete to authenticated
  using (user_id = auth.uid() or is_staff());

-- ---------- badges & wrapped ----------
create policy "badges read" on badges for select to authenticated using (true);
create policy "user_badges read" on user_badges for select to authenticated using (true);
create policy "wrapped read" on wrapped for select to authenticated
  using (user_id = auth.uid() or is_staff());

-- ---------- push & meldingen ----------
create policy "push own" on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif read own" on notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notif mark read" on notifications for update to authenticated
  using (user_id = auth.uid());
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;

-- ---------- agenda-token ----------
create policy "cal token own" on calendar_tokens for select to authenticated
  using (user_id = auth.uid());
