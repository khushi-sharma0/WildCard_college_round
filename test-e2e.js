const fs = require('fs');

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .map((l) => {
      const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
      return m ? [m[1], m[2].trim()] : null;
    })
    .filter(Boolean)
);

const BASE = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('NEXUS END-TO-END VERIFICATION & ACCEPTANCE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST GROUP A: INTEGRATED ANALYTICS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP A: INTEGRATED ANALYTICS ---');

  // A1: /analytics page renders
  const resAnalytics = await fetch(`${BASE}/analytics`);
  assert(resAnalytics.status === 200, '1. GET /analytics returns HTTP 200 OK');
  const htmlAnalytics = await resAnalytics.text();
  assert(htmlAnalytics.includes('Integrated Analytics'), '2. /analytics contains "Integrated Analytics" heading');
  assert(htmlAnalytics.includes('Total contacts') && htmlAnalytics.includes('Page traffic'), '3. /analytics contains KPI cards');
  assert(htmlAnalytics.includes('Conversion and activity trends'), '4. /analytics preserves conversion and activity trends chart section');

  // A2: Viewer cannot edit analytics metrics (HTTP 403)
  const resViewerSave = await fetch(`${BASE}/api/analytics-overrides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=viewer',
    },
    body: JSON.stringify({ metricKey: 'totalContacts', metricValue: 99 }),
  });
  assert(resViewerSave.status === 403, '5. POST /api/analytics-overrides as Viewer returns HTTP 403 Forbidden');
  const viewerData = await resViewerSave.json();
  assert(viewerData.error && viewerData.error.includes('Read-only'), '6. Viewer rejection returns explicit read-only diagnostic');

  // A3: Invalid metric values are rejected (HTTP 400)
  const resBadValue = await fetch(`${BASE}/api/analytics-overrides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=admin',
    },
    body: JSON.stringify({ metricKey: 'totalContacts', metricValue: -50 }),
  });
  assert(resBadValue.status === 400, '7. POST /api/analytics-overrides with negative value returns HTTP 400 Bad Request');

  const resBadKey = await fetch(`${BASE}/api/analytics-overrides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=admin',
    },
    body: JSON.stringify({ metricKey: 'unauthorized_metric', metricValue: 100 }),
  });
  assert(resBadKey.status === 400, '8. POST /api/analytics-overrides with unauthorized key returns HTTP 400 Bad Request');

  // A4: Authorized save as Admin (Single metric)
  const testValContacts = 125;
  const resAdminSave = await fetch(`${BASE}/api/analytics-overrides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=admin',
    },
    body: JSON.stringify({ metricKey: 'totalContacts', metricValue: testValContacts }),
  });
  assert(resAdminSave.status === 200, '9. POST /api/analytics-overrides as Admin saves single metric totalContacts');

  // A5: Authorized batch save (All 8 metrics)
  const batchOverrides = {
    totalContacts: 120,
    pageViews: 45000,
    totalRegistrations: 25,
    emailsSent: 350,
    mrrCents: 450000,
    executedAgentActions: 42,
    pendingApprovals: 3,
    rejectedErrorEvents: 1,
  };
  const resBatchSave = await fetch(`${BASE}/api/analytics-overrides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=admin',
    },
    body: JSON.stringify({ overrides: batchOverrides }),
  });
  assert(resBatchSave.status === 200, '10. POST /api/analytics-overrides saves all 8 KPI metrics in batch');

  // A6: GET /api/analytics-overrides reflects saved values
  const resGetOverrides = await fetch(`${BASE}/api/analytics-overrides`);
  const dataGetOverrides = await resGetOverrides.json();
  assert(dataGetOverrides.overrides?.mrrCents === 450000, '11. GET /api/analytics-overrides returns persisted mrrCents=450000');
  assert(dataGetOverrides.overrides?.totalContacts === 120, '12. GET /api/analytics-overrides returns persisted totalContacts=120');

  // A7: Supabase persistence verification
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: dbOverrides, error: dbErr } = await supabase
    .from('analytics_overrides')
    .select('*')
    .eq('business_id', env.ANALYTICS_BUSINESS_ID);
  assert(!dbErr && dbOverrides && dbOverrides.length >= 7, '13. Stored rows exist in Supabase public.analytics_overrides');

  // A8: Revenue formatting test on page
  const resAnalyticsReload = await fetch(`${BASE}/analytics`);
  const htmlReload = await resAnalyticsReload.text();
  assert(htmlReload.includes('$4,500.00'), '14. Monthly recurring revenue is formatted correctly ($4,500.00 for 450000 cents)');
  assert(htmlReload.includes('OVERRIDE'), '15. KPI card displays OVERRIDE badge for manually overridden metric');

  // -------------------------------------------------------------------------
  // TEST GROUP B: WORKFLOW SECURITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP B: WORKFLOW SECURITY ---');

  // B1: /security page renders
  const resSecurity = await fetch(`${BASE}/security`);
  assert(resSecurity.status === 200, '16. GET /security returns HTTP 200 OK');
  const htmlSecurity = await resSecurity.text();
  assert(htmlSecurity.includes('Workflow Security'), '17. /security contains "Workflow Security" title');
  assert(htmlSecurity.includes('Agent approval queue'), '18. /security contains Agent approval queue');
  assert(htmlSecurity.includes('Workflow history'), '19. /security contains Workflow history');
  assert(htmlSecurity.includes('Recent security events'), '20. /security contains Recent security events');

  // B2: Viewer cannot create approval request (HTTP 403)
  const resViewerCreateReq = await fetch(`${BASE}/api/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=viewer',
    },
    body: JSON.stringify({
      type: 'approval_request',
      actionName: 'Viewer illegal action',
      description: 'Viewer attempting write',
      risk: 'high',
    }),
  });
  assert(resViewerCreateReq.status === 403, '21. POST /api/agent as Viewer is blocked with HTTP 403');

  // B3: Create valid approval request #1 (to be approved)
  const req1Name = `Automated customer export ${Date.now()}`;
  const resCreateReq1 = await fetch(`${BASE}/api/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=admin',
    },
    body: JSON.stringify({
      type: 'approval_request',
      actionName: req1Name,
      description: 'Export all qualified CRM leads to secure compliance bucket',
      risk: 'high',
    }),
  });
  assert(resCreateReq1.status === 201, '22. POST /api/agent creates approval request #1 (HTTP 201 Created)');
  const dataReq1 = await resCreateReq1.json();
  const run1Id = dataReq1.run?.id;
  assert(Boolean(run1Id), '23. Created request returned valid runId');

  // B4: Verify request #1 is persisted in Supabase workflow_approvals
  const { data: dbReq1 } = await supabase
    .from('workflow_approvals')
    .select('*')
    .eq('id', run1Id)
    .single();
  assert(dbReq1 && dbReq1.status === 'pending', '24. Request #1 is persisted in Supabase with status="pending"');

  // B5: Approve request #1 as Marketer
  const resApprove = await fetch(`${BASE}/api/agent/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=marketer',
    },
    body: JSON.stringify({
      runId: run1Id,
      approved: true,
    }),
  });
  assert(resApprove.status === 200, '25. POST /api/agent/decision approved request #1 as Marketer');
  const dataApprove = await resApprove.json();
  assert(dataApprove.run?.status === 'approved', '26. Request #1 status updated to "approved"');

  // B6: Duplicate decision prevention (HTTP 409 Conflict)
  const resDuplicate = await fetch(`${BASE}/api/agent/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=marketer',
    },
    body: JSON.stringify({
      runId: run1Id,
      approved: false,
    }),
  });
  assert(resDuplicate.status === 409, '27. Duplicate decision on already decided request returns HTTP 409 Conflict');

  // B7: Create valid approval request #2 (to be rejected)
  const req2Name = `Batch delete segment contacts ${Date.now()}`;
  const resCreateReq2 = await fetch(`${BASE}/api/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=admin',
    },
    body: JSON.stringify({
      type: 'approval_request',
      actionName: req2Name,
      description: 'Permanent deletion of inactive retail leads',
      risk: 'high',
    }),
  });
  assert(resCreateReq2.status === 201, '28. POST /api/agent creates approval request #2');
  const dataReq2 = await resCreateReq2.json();
  const run2Id = dataReq2.run?.id;

  // B8: Reject request #2 as Admin
  const resReject = await fetch(`${BASE}/api/agent/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=admin',
    },
    body: JSON.stringify({
      runId: run2Id,
      approved: false,
    }),
  });
  assert(resReject.status === 200, '29. POST /api/agent/decision rejected request #2 as Admin');
  const dataReject = await resReject.json();
  assert(dataReject.run?.status === 'rejected', '30. Request #2 status updated to "rejected"');

  // B9: Viewer cannot decide approvals (HTTP 403)
  const resViewerDecide = await fetch(`${BASE}/api/agent/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'role=viewer',
    },
    body: JSON.stringify({
      runId: run2Id,
      approved: true,
    }),
  });
  assert(resViewerDecide.status === 403, '31. Viewer attempting decision returns HTTP 403 Forbidden');

  // B10: Audit Log persistence verification in Supabase
  const { data: dbEvents } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('business_id', env.ANALYTICS_BUSINESS_ID)
    .eq('event_type', 'audit_log');
  assert(dbEvents && dbEvents.length > 0, '32. Audit events exist in Supabase public.analytics_events');
  const hasApprovedLog = dbEvents.some((e) => e.event_data?.status === 'approved');
  const hasRejectedLog = dbEvents.some((e) => e.event_data?.status === 'rejected');
  const hasBlockedLog = dbEvents.some((e) => e.event_data?.status === 'blocked');
  assert(hasApprovedLog, '33. Audit events contain approved decision record');
  assert(hasRejectedLog, '34. Audit events contain rejected decision record');
  assert(hasBlockedLog, '35. Audit events contain blocked authorization check record');

  // B11: Audit page consistency
  const resAudit = await fetch(`${BASE}/audit`);
  assert(resAudit.status === 200, '36. GET /audit returns HTTP 200 OK');
  const htmlAudit = await resAudit.text();
  assert(htmlAudit.includes('Audit') || htmlAudit.includes('audit'), '37. /audit page renders audit logs');

  // -------------------------------------------------------------------------
  // TEST GROUP C: UNRELATED MODULE REGRESSION CHECK
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP C: REGRESSION CHECKS ---');

  const routes = ['/', '/crm', '/marketing', '/billing', '/webinars', '/sites'];
  for (const route of routes) {
    const res = await fetch(`${BASE}${route}`);
    assert(res.status === 200, `38-${route}. GET ${route} returns HTTP 200 OK`);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test script error:', e);
  process.exit(1);
});
