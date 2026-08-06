-- Preserve the paid access that existed before the subscription redesign and
-- make profile provisioning self-healing for the production auth project.

alter table public.profiles
  add column if not exists entitlement_source text;

-- The previous NamoLux offer was lifetime access. Snapshot the profiles that
-- production already considered Pro before subscription-only logic is enabled.
update public.profiles
set entitlement_source = case
  when plan in ('pro', 'starter', 'founder') then 'legacy_lifetime'
  else 'free'
end
where entitlement_source is null;

alter table public.profiles
  alter column entitlement_source set default 'free',
  alter column entitlement_source set not null;

alter table public.profiles
  drop constraint if exists profiles_entitlement_source_check;

alter table public.profiles
  add constraint profiles_entitlement_source_check
  check (entitlement_source in ('free', 'legacy_lifetime', 'subscription'));

comment on column public.profiles.entitlement_source is
  'Authoritative paid-access source. legacy_lifetime survives subscription cancellation.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    plan,
    subscription_status,
    entitlement_source
  ) values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'free',
    'inactive',
    'free'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Repair any historical auth users that somehow missed the provisioning
-- trigger. Phone-only accounts are not enabled for this project.
insert into public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  plan,
  subscription_status,
  entitlement_source
)
select
  users.id,
  users.email,
  users.raw_user_meta_data->>'full_name',
  users.raw_user_meta_data->>'avatar_url',
  'free',
  'inactive',
  'free'
from auth.users as users
left join public.profiles as profiles on profiles.id = users.id
where profiles.id is null
  and users.email is not null
on conflict (id) do nothing;
