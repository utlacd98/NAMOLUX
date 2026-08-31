alter table public.brand_launch_kits
  alter column shortlist_entry_id drop not null;

alter table public.brand_launch_kits
  add column if not exists domain_name text;

update public.brand_launch_kits as kit
set domain_name = lower(entry.primary_domain)
from public.naming_shortlist_entries as entry
where kit.shortlist_entry_id = entry.id
  and kit.domain_name is null;

update public.brand_launch_kits
set domain_name = lower(brand_name) || '.com'
where domain_name is null;

alter table public.brand_launch_kits
  alter column domain_name set not null;

alter table public.brand_launch_kits
  add constraint brand_launch_kits_domain_name_check
  check (
    char_length(domain_name) between 3 and 253
    and domain_name = lower(domain_name)
    and domain_name ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
  );

create index if not exists brand_launch_kits_shortlist_entry_user_idx
  on public.brand_launch_kits (shortlist_entry_id, user_id)
  where shortlist_entry_id is not null;
