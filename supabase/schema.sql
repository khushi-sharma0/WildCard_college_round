-- ==============================================================================
-- NEXUS: AI-Powered Business Operating Platform
-- Database Schema & Hackathon Demo Seed Data
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONTACTS (CRM)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    source TEXT DEFAULT 'organic',
    status TEXT DEFAULT 'lead', -- 'lead', 'qualified', 'customer', 'lost'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

-- 3. SEGMENTS (Marketing Audience)
CREATE TABLE IF NOT EXISTS segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filter_tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_workspace_id ON segments(workspace_id);

-- 4. PAGES (Sites & Landing Pages)
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    html TEXT,
    css TEXT,
    gjs_data JSONB,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_workspace_slug ON pages(workspace_id, slug);

-- 5. PLANS (SaaS Billing)
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL DEFAULT 0,
    interval TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', 'one_time'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_workspace_id ON plans(workspace_id);

-- 6. WEBINARS (Webinar Management)
CREATE TABLE IF NOT EXISTS webinars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    jitsi_room TEXT NOT NULL,
    landing_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webinars_workspace_id ON webinars(workspace_id);

-- 7. REGISTRATIONS
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_webinar ON registrations(webinar_id);
CREATE INDEX IF NOT EXISTS idx_registrations_contact ON registrations(contact_id);

-- 8. SUBSCRIPTIONS (Fake SaaS Billing)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active', -- 'active', 'canceled'
    mrr_cents INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);

-- 9. CAMPAIGNS (Marketing Automation)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- 'draft', 'sending', 'sent'
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id);

-- 10. EVENTS (Analytics Stream)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'page_view', 'lead_created', 'webinar_registered', 'email_sent', 'subscribed', 'agent_action'
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_workspace_type ON events(workspace_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- 11. AGENT RUNS (Autonomous Agent Orchestration)
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    status TEXT DEFAULT 'running', -- 'running', 'awaiting_approval', 'completed', 'failed', 'rejected'
    steps JSONB DEFAULT '[]'::jsonb,
    pending_tool JSONB DEFAULT NULL,
    final_text TEXT,
    role TEXT DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON agent_runs(workspace_id);

-- 12. APPROVALS (Human-In-The-Loop Checkpoints)
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    args JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    decided_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_run ON approvals(run_id);

-- 13. AUDIT LOGS (Compliance & Security)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    tool TEXT NOT NULL,
    risk TEXT NOT NULL, -- 'low', 'medium', 'high'
    status TEXT NOT NULL, -- 'executed', 'blocked', 'pending_approval', 'rejected', 'error'
    args JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);


-- ==============================================================================
-- DEMO SEED DATA
-- Default Workspace: 00000000-0000-0000-0000-000000000001
-- ==============================================================================

INSERT INTO workspaces (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nexus Demo Workspace')
ON CONFLICT (id) DO NOTHING;

-- Seed Plans
INSERT INTO plans (id, workspace_id, name, price_cents, interval, description)
VALUES 
    ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000001', 'Retail Growth Pass', 4900, 'monthly', 'Access to weekly retail AI masterminds & templates'),
    ('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000001', 'Webinar VIP Ticket', 9900, 'one_time', 'Live Q&A seat + recording + exclusive retail benchmark deck'),
    ('11111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000001', 'Enterprise AI Pilot', 49900, 'monthly', 'Dedicated AI business agent for large multi-store retailers')
ON CONFLICT DO NOTHING;

-- Seed Segments
INSERT INTO segments (id, workspace_id, name, filter_tag)
VALUES 
    ('22222222-2222-2222-2222-222222222201', '00000000-0000-0000-0000-000000000001', 'Retail Decision Makers', 'retail'),
    ('22222222-2222-2222-2222-222222222202', '00000000-0000-0000-0000-000000000001', 'SaaS Founders', 'saas'),
    ('22222222-2222-2222-2222-222222222203', '00000000-0000-0000-0000-000000000001', 'Higher Ed Leaders', 'edu')
ON CONFLICT DO NOTHING;

-- Seed 50 Contacts (retail, saas, edu)
INSERT INTO contacts (workspace_id, name, email, tags, source, status, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Marcus Vance', 'marcus.vance@retailhub.demo', ARRAY['retail', 'vip'], 'inbound_page', 'lead', NOW() - INTERVAL '12 days'),
    ('00000000-0000-0000-0000-000000000001', 'Elena Rostova', 'elena@nordicgoods.demo', ARRAY['retail'], 'webinar', 'qualified', NOW() - INTERVAL '11 days'),
    ('00000000-0000-0000-0000-000000000001', 'Sarah Jenkins', 'sarah.j@apollostores.demo', ARRAY['retail'], 'campaign', 'customer', NOW() - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000001', 'Devon Miller', 'devon@omnichannel.demo', ARRAY['retail'], 'inbound_page', 'lead', NOW() - INTERVAL '9 days'),
    ('00000000-0000-0000-0000-000000000001', 'Chloe Zhao', 'chloe@fashioncart.demo', ARRAY['retail', 'ecommerce'], 'referral', 'qualified', NOW() - INTERVAL '9 days'),
    ('00000000-0000-0000-0000-000000000001', 'Liam Gallagher', 'liam@britisheats.demo', ARRAY['retail'], 'direct', 'lead', NOW() - INTERVAL '8 days'),
    ('00000000-0000-0000-0000-000000000001', 'Amara Okafor', 'amara@luxboutique.demo', ARRAY['retail'], 'inbound_page', 'customer', NOW() - INTERVAL '8 days'),
    ('00000000-0000-0000-0000-000000000001', 'Kenji Sato', 'kenji@tokyoretail.demo', ARRAY['retail', 'enterprise'], 'partner', 'qualified', NOW() - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000001', 'Maria Hernandez', 'maria@solmarket.demo', ARRAY['retail'], 'webinar', 'lead', NOW() - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000001', 'Julian Thorne', 'jthorne@cornerstone.demo', ARRAY['retail'], 'campaign', 'lead', NOW() - INTERVAL '6 days'),
    ('00000000-0000-0000-0000-000000000001', 'Priya Sharma', 'priya@freshmart.demo', ARRAY['retail'], 'inbound_page', 'customer', NOW() - INTERVAL '6 days'),
    ('00000000-0000-0000-0000-000000000001', 'David Kim', 'david@urbanshoes.demo', ARRAY['retail'], 'direct', 'qualified', NOW() - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000001', 'Sofia Rossi', 'sofia@milanoapparel.demo', ARRAY['retail'], 'webinar', 'lead', NOW() - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000001', 'Arthur Pendelton', 'arthur@grocerplus.demo', ARRAY['retail'], 'inbound_page', 'lead', NOW() - INTERVAL '4 days'),
    ('00000000-0000-0000-0000-000000000001', 'Nadia Chen', 'nadia@zenithretail.demo', ARRAY['retail', 'vip'], 'referral', 'qualified', NOW() - INTERVAL '4 days'),
    ('00000000-0000-0000-0000-000000000001', 'Lucas Silva', 'lucas@brasiltrade.demo', ARRAY['retail'], 'direct', 'lead', NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000001', 'Hannah Schmidt', 'hannah@berlinhaus.demo', ARRAY['retail'], 'webinar', 'customer', NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000001', 'Tariq Mansour', 'tariq@dubaimarket.demo', ARRAY['retail'], 'campaign', 'lead', NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', 'Jessica Walsh', 'jess@candygarden.demo', ARRAY['retail'], 'inbound_page', 'lead', NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', 'Aaron Patel', 'aaron@metrobrands.demo', ARRAY['retail'], 'partner', 'qualified', NOW() - INTERVAL '1 days'),
    ('00000000-0000-0000-0000-000000000001', 'Zoe Kravitz', 'zoe@ecostyle.demo', ARRAY['retail'], 'inbound_page', 'lead', NOW() - INTERVAL '1 days'),
    ('00000000-0000-0000-0000-000000000001', 'Oliver Queen', 'oliver@starlingstore.demo', ARRAY['retail'], 'direct', 'lost', NOW() - INTERVAL '10 days'),
    
    -- SaaS Contacts (16)
    ('00000000-0000-0000-0000-000000000001', 'Alex Mercer', 'alex@cloudflow.demo', ARRAY['saas', 'growth'], 'product_hunt', 'customer', NOW() - INTERVAL '13 days'),
    ('00000000-0000-0000-0000-000000000001', 'Bianca Costa', 'bianca@metricpulse.demo', ARRAY['saas'], 'inbound_page', 'qualified', NOW() - INTERVAL '12 days'),
    ('00000000-0000-0000-0000-000000000001', 'Carlos Mendoza', 'carlos@stackops.demo', ARRAY['saas'], 'direct', 'lead', NOW() - INTERVAL '11 days'),
    ('00000000-0000-0000-0000-000000000001', 'Dana Scully', 'dana@trustsec.demo', ARRAY['saas', 'security'], 'webinar', 'lead', NOW() - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000001', 'Ethan Hunt', 'ethan@syndicateai.demo', ARRAY['saas'], 'campaign', 'customer', NOW() - INTERVAL '9 days'),
    ('00000000-0000-0000-0000-000000000001', 'Fatima Zahra', 'fatima@pipelineio.demo', ARRAY['saas'], 'inbound_page', 'qualified', NOW() - INTERVAL '8 days'),
    ('00000000-0000-0000-0000-000000000001', 'Gordon Freeman', 'gordon@blackmesa-soft.demo', ARRAY['saas'], 'referral', 'lead', NOW() - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000001', 'Huy Nguyen', 'huy@vietscale.demo', ARRAY['saas'], 'direct', 'customer', NOW() - INTERVAL '6 days'),
    ('00000000-0000-0000-0000-000000000001', 'Iris West', 'iris@centrallogic.demo', ARRAY['saas'], 'inbound_page', 'lead', NOW() - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000001', 'Jack Ryan', 'jack@analytico.demo', ARRAY['saas'], 'partner', 'qualified', NOW() - INTERVAL '4 days'),
    ('00000000-0000-0000-0000-000000000001', 'Kavita Rao', 'kavita@databridge.demo', ARRAY['saas'], 'webinar', 'customer', NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000001', 'Leo Sterling', 'leo@convertquick.demo', ARRAY['saas'], 'campaign', 'lead', NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000001', 'Mina Tanaka', 'mina@saasloop.demo', ARRAY['saas'], 'inbound_page', 'lead', NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', 'Noah Bennett', 'noah@clouddot.demo', ARRAY['saas'], 'direct', 'qualified', NOW() - INTERVAL '1 days'),
    ('00000000-0000-0000-0000-000000000001', 'Olivia Pope', 'olivia@crisishq.demo', ARRAY['saas'], 'referral', 'lost', NOW() - INTERVAL '8 days'),
    ('00000000-0000-0000-0000-000000000001', 'Peter Parker', 'peter@websling.demo', ARRAY['saas'], 'inbound_page', 'lead', NOW() - INTERVAL '1 days'),

    -- Edu Contacts (12)
    ('00000000-0000-0000-0000-000000000001', 'Dr. Alistair Finch', 'afinch@oxford-research.demo', ARRAY['edu', 'academia'], 'direct', 'qualified', NOW() - INTERVAL '12 days'),
    ('00000000-0000-0000-0000-000000000001', 'Beth Harmon', 'bharmon@kentucky-edu.demo', ARRAY['edu'], 'webinar', 'customer', NOW() - INTERVAL '11 days'),
    ('00000000-0000-0000-0000-000000000001', 'Cedric Diggory', 'cedric@hallowacademy.demo', ARRAY['edu'], 'inbound_page', 'lead', NOW() - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000001', 'Dr. Donna Noble', 'dnoble@londonuni.demo', ARRAY['edu'], 'referral', 'qualified', NOW() - INTERVAL '9 days'),
    ('00000000-0000-0000-0000-000000000001', 'Elijah Vance', 'evance@edutechlab.demo', ARRAY['edu'], 'campaign', 'lead', NOW() - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000001', 'Fiona Gallagher', 'fiona@midwestcollege.demo', ARRAY['edu'], 'direct', 'customer', NOW() - INTERVAL '6 days'),
    ('00000000-0000-0000-0000-000000000001', 'George Weasley', 'george@studiotech.demo', ARRAY['edu'], 'inbound_page', 'lead', NOW() - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000001', 'Hermione Granger', 'hermione@libraryforward.demo', ARRAY['edu', 'vip'], 'partner', 'qualified', NOW() - INTERVAL '4 days'),
    ('00000000-0000-0000-0000-000000000001', 'Ian Malcolm', 'ian@chaosmath.demo', ARRAY['edu'], 'webinar', 'lead', NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000001', 'Julia Roberts', 'jroberts@coastalcampus.demo', ARRAY['edu'], 'inbound_page', 'lead', NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', 'Karl Popper', 'karl@epistemics.demo', ARRAY['edu'], 'direct', 'lost', NOW() - INTERVAL '6 days'),
    ('00000000-0000-0000-0000-000000000001', 'Luna Lovegood', 'luna@quibbleracademy.demo', ARRAY['edu'], 'inbound_page', 'lead', NOW() - INTERVAL '1 days')
ON CONFLICT DO NOTHING;

-- Seed Sample Landing Page
INSERT INTO pages (id, workspace_id, title, slug, content, html, is_published)
VALUES (
    '33333333-3333-3333-3333-333333333301',
    '00000000-0000-0000-0000-000000000001',
    'AI in Retail 2026 Summit',
    'ai-retail-summit',
    'Learn how modern brick-and-mortar and ecommerce brands leverage autonomous agent workflows to boost inventory turn and lift conversions by 38%.',
    '<div class="hero"><h1 class="text-4xl font-bold">Autonomous AI for Modern Retailers</h1><p class="mt-4 text-slate-300">Join top retail executives as we unveil practical agents that forecast demand and personalize customer campaigns.</p></div>',
    true
)
ON CONFLICT DO NOTHING;

-- Seed Sample Webinar
INSERT INTO webinars (id, workspace_id, title, scheduled_at, jitsi_room, landing_page_id, plan_id)
VALUES (
    '44444444-4444-4444-4444-444444444401',
    '00000000-0000-0000-0000-000000000001',
    'AI in Retail: Next-Gen Store Intelligence',
    NOW() + INTERVAL '7 days',
    'nexus-retail-ai-summit-2026',
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111102'
)
ON CONFLICT DO NOTHING;

-- Seed Registrations
INSERT INTO registrations (workspace_id, webinar_id, contact_id, attended)
SELECT '00000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444401', id, (random() > 0.5)
FROM contacts
WHERE workspace_id = '00000000-0000-0000-0000-000000000001' AND 'retail' = ANY(tags)
LIMIT 12
ON CONFLICT DO NOTHING;

-- Seed Subscriptions
INSERT INTO subscriptions (workspace_id, contact_id, plan_id, status, mrr_cents)
SELECT '00000000-0000-0000-0000-000000000001', id, '11111111-1111-1111-1111-111111111101', 'active', 4900
FROM contacts
WHERE workspace_id = '00000000-0000-0000-0000-000000000001' AND status = 'customer'
LIMIT 5
ON CONFLICT DO NOTHING;

-- Seed Campaigns
INSERT INTO campaigns (id, workspace_id, segment_id, subject, body, status, sent_count)
VALUES (
    '55555555-5555-5555-5555-555555555501',
    '00000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222201',
    'Invitation: AI in Retail Executive Masterclass',
    'Hi {{name}},\n\nJoin us next Friday to discover how AI is automating inventory planning and marketing in retail. Reserve your seat here.\n\nBest,\nThe Nexus Team',
    'sent',
    21
)
ON CONFLICT DO NOTHING;

-- Seed 120 Analytics Events across the past 14 days
INSERT INTO events (workspace_id, event_type, payload, created_at)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    CASE (i % 5)
        WHEN 0 THEN 'page_view'
        WHEN 1 THEN 'page_view'
        WHEN 2 THEN 'lead_created'
        WHEN 3 THEN 'webinar_registered'
        ELSE 'email_sent'
    END,
    jsonb_build_object(
        'source', CASE (i % 3) WHEN 0 THEN 'google' WHEN 1 THEN 'email' ELSE 'direct' END,
        'index', i
    ),
    NOW() - ((14 - (i % 14)) || ' days')::INTERVAL + ((i * 11 % 1440) || ' minutes')::INTERVAL
FROM generate_series(1, 120) AS s(i);

-- Seed Seed Audit Logs
INSERT INTO audit_logs (workspace_id, role, tool, risk, status, args, result, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'create_segment', 'low', 'executed', '{"name": "Retail Decision Makers", "filter_tag": "retail"}'::jsonb, '{"segment_id": "22222222-2222-2222-2222-222222222201", "matched": 22}'::jsonb, NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', 'admin', 'create_plan', 'medium', 'executed', '{"name": "Retail Growth Pass", "price_cents": 4900, "interval": "monthly"}'::jsonb, '{"plan_id": "11111111-1111-1111-1111-111111111101"}'::jsonb, NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', 'admin', 'create_webinar', 'medium', 'executed', '{"title": "AI in Retail: Next-Gen Store Intelligence"}'::jsonb, '{"webinar_id": "44444444-4444-4444-4444-444444444401"}'::jsonb, NOW() - INTERVAL '1 days'),
    ('00000000-0000-0000-0000-000000000001', 'admin', 'send_campaign', 'high', 'executed', '{"campaign_id": "55555555-5555-5555-5555-555555555501"}'::jsonb, '{"sent_count": 21, "mode": "mailtrap_sandbox"}'::jsonb, NOW() - INTERVAL '1 days');
