-- NamoLux billing tiers and profile hardening
-- Applies the 3-uses/month free tier, paid subscription access, and safe grants.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (email);

UPDATE public.profiles AS p
SET
  email = COALESCE(p.email, u.email),
  full_name = COALESCE(p.full_name, u.raw_user_meta_data->>'full_name'),
  avatar_url = COALESCE(p.avatar_url, u.raw_user_meta_data->>'avatar_url')
FROM auth.users AS u
WHERE p.id = u.id;

UPDATE public.profiles
SET plan = 'pro'
WHERE plan IN ('starter', 'founder');

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'pro'));

ALTER TABLE public.generation_logs
  DROP CONSTRAINT IF EXISTS generation_logs_generation_type_check;

ALTER TABLE public.generation_logs
  ADD CONSTRAINT generation_logs_generation_type_check
  CHECK (
    generation_type IN (
      'domain',
      'bulk',
      'seo',
      'palette',
      'deep-search',
      'analyze',
      'name-tools',
      'ai-chat'
    )
  );

CREATE INDEX IF NOT EXISTS idx_generation_logs_ip_monthly
  ON public.generation_logs (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_logs_user_monthly
  ON public.generation_logs (user_id, created_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id,
  email,
  full_name,
  avatar_url,
  plan,
  subscription_status,
  subscription_end,
  created_at,
  updated_at
) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, plan, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    'inactive'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert logs" ON public.generation_logs;

REVOKE ALL ON public.generation_logs FROM anon, authenticated;
GRANT SELECT ON public.generation_logs TO authenticated;
GRANT ALL ON public.generation_logs TO service_role;

CREATE OR REPLACE FUNCTION public.get_ip_generation_count(check_ip INET)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.generation_logs
  WHERE ip_address::TEXT = check_ip::TEXT
    AND created_at >= date_trunc('month', timezone('utc', now()));
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_generation_count(check_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.generation_logs
  WHERE user_id = check_user_id
    AND created_at >= date_trunc('month', timezone('utc', now()));
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_rate_limit_reset_time(check_ip INET, check_user_id UUID DEFAULT NULL)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
  SELECT date_trunc('month', timezone('utc', now())) + INTERVAL '1 month';
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
  END IF;
  IF to_regprocedure('public.handle_updated_at()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC;
  END IF;
  IF to_regprocedure('public.get_ip_generation_count(inet)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_ip_generation_count(INET) FROM PUBLIC;
  END IF;
  IF to_regprocedure('public.get_user_generation_count(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_user_generation_count(UUID) FROM PUBLIC;
  END IF;
  IF to_regprocedure('public.get_rate_limit_reset_time(inet,uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_rate_limit_reset_time(INET, UUID) FROM PUBLIC;
  END IF;
END $$;

COMMIT;
