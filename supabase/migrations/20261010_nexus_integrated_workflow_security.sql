-- ==============================================================================
-- NEXUS OPERATING PLATFORM — INTEGRATED ANALYTICS & WORKFLOW SECURITY MIGRATION
-- Compatible with existing multi-tenant schema referencing public.businesses(id)
-- Additive and idempotent: Preserves all existing rows, tables, and constraints.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ANALYTICS OVERRIDES TABLE
-- Persists manual metric overrides configured through the Integrated Analytics KPI editor.
CREATE TABLE IF NOT EXISTS public.analytics_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL CHECK (metric_value >= 0),
  updated_by TEXT NOT NULL DEFAULT 'admin',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_analytics_overrides_business_metric UNIQUE (business_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_analytics_overrides_business_key 
  ON public.analytics_overrides(business_id, metric_key);

-- Enable Row Level Security (RLS) on analytics_overrides
ALTER TABLE public.analytics_overrides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_overrides' AND policyname = 'Allow service_role full access on analytics_overrides'
  ) THEN
    CREATE POLICY "Allow service_role full access on analytics_overrides" 
      ON public.analytics_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_overrides' AND policyname = 'Allow authenticated read on analytics_overrides'
  ) THEN
    CREATE POLICY "Allow authenticated read on analytics_overrides" 
      ON public.analytics_overrides FOR SELECT TO authenticated USING (true);
  END IF;
END $$;


-- 2. WORKFLOW APPROVALS TABLE
-- Persists autonomous agent action checkpoints and manual governance requests.
CREATE TABLE IF NOT EXISTS public.workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure indexes on workflow approvals
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_business_status 
  ON public.workflow_approvals(business_id, status);

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_created_at 
  ON public.workflow_approvals(created_at DESC);

-- Enable Row Level Security (RLS) on workflow_approvals
ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workflow_approvals' AND policyname = 'Allow service_role full access on workflow_approvals'
  ) THEN
    CREATE POLICY "Allow service_role full access on workflow_approvals" 
      ON public.workflow_approvals FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workflow_approvals' AND policyname = 'Allow authenticated read on workflow_approvals'
  ) THEN
    CREATE POLICY "Allow authenticated read on workflow_approvals" 
      ON public.workflow_approvals FOR SELECT TO authenticated USING (true);
  END IF;
END $$;


-- 3. ANALYTICS EVENTS (AUDIT & TELEMETRY STREAM)
-- Records audit events for governance checks, approval decisions, and security blocks.
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_business_type_date 
  ON public.analytics_events(business_id, event_type, created_at DESC);

-- Enable Row Level Security (RLS) on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_events' AND policyname = 'Allow service_role full access on analytics_events'
  ) THEN
    CREATE POLICY "Allow service_role full access on analytics_events" 
      ON public.analytics_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_events' AND policyname = 'Allow authenticated read on analytics_events'
  ) THEN
    CREATE POLICY "Allow authenticated read on analytics_events" 
      ON public.analytics_events FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
