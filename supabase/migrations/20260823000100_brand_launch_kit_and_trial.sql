-- Brand Launch Kit records remain server-only. They are linked to a scored
-- shortlist winner so branding cannot be generated for an arbitrary name.

alter table public.profiles
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_subscription_id text;

create table if not exists public.brand_launch_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shortlist_entry_id uuid not null,
  brand_name text not null,
  business_description text not null,
  mvp_description text not null,
  audience text,
  visual_style text,
  palette_variants jsonb not null default '[]'::jsonb,
  selected_palette_index integer,
  logo_concepts jsonb not null default '[]'::jsonb,
  selected_logo_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_launch_kits_entry_owner_fkey
    foreign key (shortlist_entry_id, user_id)
    references public.naming_shortlist_entries(id, user_id)
    on delete cascade,
  constraint brand_launch_kits_name_length_check
    check (char_length(btrim(brand_name)) between 1 and 63),
  constraint brand_launch_kits_business_length_check
    check (char_length(btrim(business_description)) between 20 and 1500),
  constraint brand_launch_kits_mvp_length_check
    check (char_length(btrim(mvp_description)) between 20 and 1500),
  constraint brand_launch_kits_audience_length_check
    check (audience is null or char_length(audience) <= 280),
  constraint brand_launch_kits_style_length_check
    check (visual_style is null or char_length(visual_style) <= 80),
  constraint brand_launch_kits_variants_array_check
    check (jsonb_typeof(palette_variants) = 'array'),
  constraint brand_launch_kits_logos_array_check
    check (jsonb_typeof(logo_concepts) = 'array'),
  constraint brand_launch_kits_selected_palette_check
    check (selected_palette_index is null or selected_palette_index between 0 and 2)
);

create index if not exists brand_launch_kits_user_created_at_idx
  on public.brand_launch_kits (user_id, created_at desc);

alter table public.brand_launch_kits enable row level security;
revoke all on public.brand_launch_kits from public, anon, authenticated;
grant select, insert, update, delete on public.brand_launch_kits to service_role;

comment on table public.brand_launch_kits is
  'Server-only Brand Launch Kit briefs, palette directions, and private-logo metadata.';
