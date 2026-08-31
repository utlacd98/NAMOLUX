-- Cost and quality controls for the signed-in Name Sprint release.
-- Quotas continue to use the service-role-only usage_counters RPC; the same
-- feature key may have a daily Free window and monthly Pro window.

insert into public.collision_registry (
  normalized_name, display_name, entity_type, industries, geographies, fame_level,
  active_status, verification_source, registry_version, last_checked
)
values
  ('cadence', 'Cadence', 'company', array['software', 'semiconductors', 'electronic design automation'], array['global'], 'global', true, 'https://www.cadence.com/en_US/home.html', '2026.08.31.1', '2026-08-31T00:00:00Z'),
  ('tidal', 'TIDAL', 'brand', array['music streaming', 'media', 'consumer software'], array['global'], 'global', true, 'https://tidal.com/about', '2026.08.31.1', '2026-08-31T00:00:00Z'),
  ('mosaic', 'Mosaic', 'company', array['software', 'finance', 'analytics'], array['global'], 'sector', true, 'https://www.mosaic.tech/', '2026.08.31.1', '2026-08-31T00:00:00Z'),
  ('parallax', 'Parallax', 'company', array['software', 'electronics', 'creative tools'], array['global'], 'sector', true, 'https://www.parallax.com/about-parallax/', '2026.08.31.1', '2026-08-31T00:00:00Z'),
  ('accord', 'Accord', 'brand', array['software', 'business services', 'financial services'], array['global'], 'sector', true, 'internal-curated-registry', '2026.08.31.1', '2026-08-31T00:00:00Z'),
  ('warden', 'Warden', 'brand', array['software', 'security', 'technology'], array['global'], 'sector', true, 'internal-curated-registry', '2026.08.31.1', '2026-08-31T00:00:00Z'),
  ('zenith', 'Zenith', 'brand', array['consumer electronics', 'financial services', 'technology'], array['global'], 'global', true, 'internal-curated-registry', '2026.08.31.1', '2026-08-31T00:00:00Z')
on conflict (normalized_name) do update set
  display_name = excluded.display_name,
  entity_type = excluded.entity_type,
  industries = excluded.industries,
  geographies = excluded.geographies,
  fame_level = excluded.fame_level,
  active_status = excluded.active_status,
  verification_source = excluded.verification_source,
  registry_version = excluded.registry_version,
  last_checked = excluded.last_checked,
  updated_at = now();
