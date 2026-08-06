-- NamoLux Supabase Database Schema
-- Run this in Supabase SQL Editor
-- New installations must then apply the versioned migrations in
-- supabase/migrations (normally with `supabase db push`).

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Stores user profile information and subscription status

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  subscription_start TIMESTAMP WITH TIME ZONE,
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================================
-- GENERATION LOGS TABLE
-- ============================================================================
-- Tracks all metered requests for monthly rate limiting

CREATE TABLE public.generation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  generation_type TEXT DEFAULT 'domain' CHECK (
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
  ),
  keyword_used TEXT,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast monthly rate limit lookups
CREATE INDEX idx_generation_logs_ip_monthly ON generation_logs (ip_address, created_at DESC);
CREATE INDEX idx_generation_logs_user_monthly ON generation_logs (user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - CRITICAL
-- ============================================================================

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can only update safe profile fields on their own row.
-- Billing fields are service-role only via API routes/webhooks.
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

-- Enable RLS on generation_logs
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own logs" 
  ON public.generation_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

REVOKE ALL ON public.generation_logs FROM anon, authenticated;
GRANT SELECT ON public.generation_logs TO authenticated;
GRANT ALL ON public.generation_logs TO service_role;

-- Service role inserts logs from API routes and bypasses RLS.

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGN-UP (TRIGGER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- AUTO-UPDATE updated_at TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS FOR RATE LIMITING
-- ============================================================================

-- Get count of metered requests in the current UTC month for an IP
CREATE OR REPLACE FUNCTION public.get_ip_generation_count(check_ip INET)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.generation_logs
  WHERE ip_address::TEXT = check_ip::TEXT
    AND created_at >= date_trunc('month', timezone('utc', now()));
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Get count of metered requests in the current UTC month for a user
CREATE OR REPLACE FUNCTION public.get_user_generation_count(check_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.generation_logs
  WHERE user_id = check_user_id
    AND created_at >= date_trunc('month', timezone('utc', now()));
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Get the reset time for rate limiting
CREATE OR REPLACE FUNCTION public.get_rate_limit_reset_time(check_ip INET, check_user_id UUID DEFAULT NULL)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
  SELECT date_trunc('month', timezone('utc', now())) + INTERVAL '1 month';
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ip_generation_count(INET) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_generation_count(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_reset_time(INET, UUID) FROM PUBLIC;
