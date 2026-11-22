-- ============================================================================
-- Nesibe mag ook rollen toekennen, niet alleen Rayan.
-- De kroon blijft wel waar ze is: owner kan je niet geven of afnemen.
-- ============================================================================

create or replace function public.admin_set_role(p_user uuid, p_role app_role)
returns void
language plpgsql security definer set search_path = public, private as $$
declare v_target app_role;
begin
  if not is_staff() then
    raise exception 'Alleen Nesibe of Rayan mag rollen wijzigen 👑🛡️';
  end if;
  if p_role = 'owner' then
    raise exception 'De kroon geef je niet weg via de app 👑';
  end if;

  select role into v_target from profiles where id = p_user;
  if v_target is null then raise exception 'Die gebruiker bestaat niet'; end if;
  if v_target = 'owner' then raise exception 'Nesibe blijft de owner 👑'; end if;

  update profiles set role = p_role where id = p_user;
end $$;

revoke execute on function public.admin_set_role(uuid, app_role) from public, anon;
grant execute on function public.admin_set_role(uuid, app_role) to authenticated;
