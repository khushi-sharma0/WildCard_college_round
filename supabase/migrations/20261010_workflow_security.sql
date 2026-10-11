-- Additive bootstrap for analytics and Workflow Security. Existing records are preserved.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.workspaces (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nexus Demo Workspace')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  tags text[] DEFAULT '{}',
  source text DEFAULT 'organic',
  status text DEFAULT 'lead',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webinars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  jitsi_room text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  attended boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  plan_id uuid,
  status text DEFAULT 'active',
  mrr_cents integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  segment_id uuid,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text DEFAULT 'draft',
  sent_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Older single-workspace campaign tables are upgraded additively and their
-- existing rows are assigned to the workspace already used by the app.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
UPDATE public.campaigns
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;
ALTER TABLE public.campaigns ALTER COLUMN workspace_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  status text DEFAULT 'running',
  steps jsonb DEFAULT '[]'::jsonb,
  pending_tool jsonb DEFAULT NULL,
  final_text text,
  role text DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  tool text NOT NULL,
  args jsonb NOT NULL,
  status text DEFAULT 'pending',
  decided_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  role text NOT NULL,
  tool text NOT NULL,
  risk text NOT NULL,
  status text NOT NULL,
  args jsonb DEFAULT '{}'::jsonb,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Backfill workspace ownership on older single-workspace tables. No rows are deleted.
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.webinars ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.contacts SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.webinars SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.registrations SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.subscriptions SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.campaigns SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.events SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.agent_runs SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.approvals SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.audit_logs SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

ALTER TABLE public.contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.webinars ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.registrations ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.campaigns ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.agent_runs ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.approvals ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN workspace_id SET NOT NULL;

-- This migration preserves all existing records. It fails rather than deleting duplicate approvals.

ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT run_id
    FROM public.approvals
    WHERE run_id IS NOT NULL
    GROUP BY run_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate approval rows exist for a run_id. Resolve them before applying the Workflow Security unique index.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_unique_run
  ON public.approvals(run_id)
  WHERE run_id IS NOT NULL;

-- Backfill pending checkpoints already present in agent_runs without creating audit history.
INSERT INTO public.approvals (workspace_id, run_id, tool, args, status)
SELECT workspace_id, id, pending_tool->>'tool', COALESCE(pending_tool->'args', '{}'::jsonb), 'pending'
FROM public.agent_runs r
WHERE r.status = 'awaiting_approval'
  AND r.pending_tool IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.approvals a WHERE a.run_id = r.id);

CREATE OR REPLACE FUNCTION public.create_agent_approval_request(
  p_workspace_id uuid,
  p_run_id uuid,
  p_requester_role text,
  p_tool text,
  p_args jsonb,
  p_risk text,
  p_prompt text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.agent_runs%ROWTYPE;
  v_approval public.approvals%ROWTYPE;
BEGIN
  IF p_tool NOT IN ('send_campaign', 'manual_review') THEN
    RAISE EXCEPTION 'unsupported_approval_action';
  END IF;
  IF p_tool = 'send_campaign' AND p_risk <> 'high' THEN
    RAISE EXCEPTION 'campaign_send_requires_high_risk';
  END IF;

  UPDATE public.agent_runs
  SET prompt = p_prompt,
      status = 'awaiting_approval',
      pending_tool = jsonb_build_object('tool', p_tool, 'args', p_args, 'risk', p_risk),
      role = p_requester_role,
      updated_at = now()
  WHERE id = p_run_id AND workspace_id = p_workspace_id
  RETURNING * INTO v_run;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'agent_run_not_found';
  END IF;

  INSERT INTO public.approvals (workspace_id, run_id, tool, args, status)
  VALUES (p_workspace_id, p_run_id, p_tool, p_args, 'pending')
  RETURNING * INTO v_approval;

  INSERT INTO public.audit_logs (workspace_id, run_id, role, tool, risk, status, args, result)
  VALUES (p_workspace_id, p_run_id, p_requester_role, p_tool, p_risk, 'pending_approval', p_args,
          jsonb_build_object('message', 'Approval request created.'));

  RETURN jsonb_build_object('run', to_jsonb(v_run), 'approval', to_jsonb(v_approval));
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_agent_approval_request(
  p_run_id uuid,
  p_decided_by text,
  p_approved boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.agent_runs%ROWTYPE;
  v_approval public.approvals%ROWTYPE;
  v_status text;
  v_event text;
  v_message text;
  v_risk text;
BEGIN
  IF p_decided_by <> 'marketer' THEN
    RAISE EXCEPTION 'approval_permission_denied';
  END IF;

  SELECT * INTO v_approval
  FROM public.approvals
  WHERE run_id = p_run_id
  FOR UPDATE;

  IF NOT FOUND OR v_approval.status <> 'pending' THEN
    RAISE EXCEPTION 'approval_already_decided';
  END IF;

  SELECT * INTO v_run
  FROM public.agent_runs
  WHERE id = p_run_id AND status = 'awaiting_approval'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval_run_not_pending';
  END IF;

  v_risk := COALESCE(v_run.pending_tool->>'risk', 'high');

  v_status := CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END;
  v_event := CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END;
  v_message := CASE WHEN p_approved THEN 'Approved by Marketer; execution started.' ELSE 'Rejected by Marketer; action was not executed.' END;

  UPDATE public.approvals
  SET status = v_status, decided_by = p_decided_by, decided_at = now()
  WHERE id = v_approval.id
  RETURNING * INTO v_approval;

  UPDATE public.agent_runs
  SET status = v_status,
      pending_tool = CASE WHEN p_approved THEN pending_tool ELSE NULL END,
      updated_at = now()
  WHERE id = p_run_id
  RETURNING * INTO v_run;

  INSERT INTO public.audit_logs (workspace_id, run_id, role, tool, risk, status, args, result)
  VALUES (v_run.workspace_id, p_run_id, p_decided_by, v_approval.tool, v_risk, v_event, v_approval.args,
          jsonb_build_object('message', v_message));

  RETURN jsonb_build_object('run', to_jsonb(v_run), 'approval', to_jsonb(v_approval));
END;
$$;

REVOKE ALL ON FUNCTION public.create_agent_approval_request(uuid, uuid, text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decide_agent_approval_request(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_approval_request(uuid, uuid, text, text, jsonb, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_agent_approval_request(uuid, text, boolean) TO service_role;
