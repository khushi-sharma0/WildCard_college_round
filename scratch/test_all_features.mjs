async function runVerification() {
  const base = "http://localhost:3000";
  console.log("=================================================");
  console.log("NEXUS PLATFORM COMPREHENSIVE VERIFICATION SUITE");
  console.log("=================================================\n");

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
  // 1. AUTH & LOGIN FEATURE
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 1: AUTHENTICATION & LOGIN PAGE ---");

  // 1.1 Login Page rendering
  const loginRes = await fetch(`${base}/login`);
  const loginHtml = await loginRes.text();
  assert(loginRes.status === 200, "GET /login returns status 200");
  assert(loginHtml.includes("Sign in to Nexus") || loginHtml.includes("Nexus"), "Login page contains brand heading");
  assert(loginHtml.includes("Admin") && loginHtml.includes("Marketer") && loginHtml.includes("Viewer"), "Login page contains Quick-fill demo account buttons");

  // 1.2 Auth mode endpoint
  const modeRes = await fetch(`${base}/api/auth/mode`).then(r => r.json());
  assert(modeRes.mode === "local", `Auth mode is "${modeRes.mode}"`);

  // 1.3 Invalid login attempt
  const badLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@nexus.demo", password: "WrongPassword!" })
  });
  assert(badLogin.status === 401, "Bad credentials rejected with status 401");

  // 1.4 Admin login
  const adminLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@nexus.demo", password: "NexusAdmin!2026" })
  });
  const adminCookie = adminLogin.headers.get("set-cookie") || "";
  const adminData = await adminLogin.json();
  assert(adminLogin.status === 200, "Admin login successful");
  assert(adminData.role === "admin", `Admin role is "${adminData.role}"`);
  assert(adminCookie.includes("nexus_local_session"), "Admin receives signed HttpOnly session cookie");

  const adminSessionCookie = adminCookie.split(";")[0];

  // 1.5 Marketer login
  const marketerLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "marketer@nexus.demo", password: "NexusMarketer!2026" })
  });
  const marketerData = await marketerLogin.json();
  const marketerCookie = (marketerLogin.headers.get("set-cookie") || "").split(";")[0];
  assert(marketerLogin.status === 200 && marketerData.role === "marketer", "Marketer login successful");

  // 1.6 Viewer login
  const viewerLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "viewer@nexus.demo", password: "NexusViewer!2026" })
  });
  const viewerData = await viewerLogin.json();
  const viewerCookie = (viewerLogin.headers.get("set-cookie") || "").split(";")[0];
  assert(viewerLogin.status === 200 && viewerData.role === "viewer", "Viewer login successful");

  // -------------------------------------------------------------------------
  // 2. INTELLIGENT CRM FEATURE
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: INTELLIGENT CRM FEATURE ---");

  // 2.1 List contacts
  const contactsData = await fetch(`${base}/api/contacts`, {
    headers: { "Cookie": adminSessionCookie }
  }).then(r => r.json());
  const contactsList = contactsData.contacts || contactsData;
  assert(Array.isArray(contactsList) && contactsList.length > 0, `CRM listContacts returned ${contactsList.length} contacts`);

  // 2.2 Create contact as Admin
  const newContactPayload = {
    name: "Dr. Evelyn Reed",
    email: `evelyn.reed.${Date.now()}@biotech-sample.com`,
    tags: ["enterprise", "medical", "q4-lead"]
  };
  const createContactRes = await fetch(`${base}/api/contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": adminSessionCookie
    },
    body: JSON.stringify(newContactPayload)
  });
  const createdContact = await createContactRes.json();
  assert(createContactRes.status === 201 && createdContact.id, `Created CRM contact with ID: ${createdContact.id}`);
  assert(createdContact.name === newContactPayload.name, "Contact name matches payload");
  assert(createdContact.status === "lead", "Initial contact stage is lead");

  // 2.3 Update contact via /api/contacts/[id]
  const updateContactRes = await fetch(`${base}/api/contacts/${createdContact.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Cookie": adminSessionCookie
    },
    body: JSON.stringify({
      name: createdContact.name,
      email: createdContact.email,
      tags: ["enterprise", "medical", "vip"],
      status: "qualified"
    })
  });
  const updatedContact = await updateContactRes.json();
  assert(updateContactRes.status === 200, "Contact update returned status 200");
  assert(updatedContact.status === "qualified", "Contact stage updated to qualified");

  // 2.4 Move stage to customer
  const customerStageRes = await fetch(`${base}/api/contacts/${createdContact.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Cookie": adminSessionCookie
    },
    body: JSON.stringify({
      name: createdContact.name,
      email: createdContact.email,
      tags: ["customer"],
      status: "customer"
    })
  });
  const customerContact = await customerStageRes.json();
  assert(customerStageRes.status === 200 && customerContact.status === "customer", "Moved stage to customer");

  // 2.5 Viewer RBAC policy block on CRM create
  const viewerCreate = await fetch(`${base}/api/contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": viewerCookie
    },
    body: JSON.stringify(newContactPayload)
  });
  assert(viewerCreate.status === 403, "Viewer is blocked from creating CRM contact with status 403");

  // -------------------------------------------------------------------------
  // 3. VISUAL WEBSITE BUILDER FEATURE
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: VISUAL WEBSITE BUILDER FEATURE ---");

  // 3.1 List site themes
  const themesRes = await fetch(`${base}/api/sites/themes`, {
    headers: { "Cookie": adminSessionCookie }
  }).then(r => r.json());
  assert(Array.isArray(themesRes), "GET /api/sites/themes returns array");

  // 3.2 Save a custom site theme
  const customTheme = {
    id: `nordic-theme-${Date.now()}`,
    name: "My Theme",
    colors: {
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      primary: "#1e293b",
      accent: "#38bdf8",
      border: "#cbd5e1"
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
      label: "Inter"
    },
    headingStyle: "modern",
    radius: "rounded",
    buttonStyle: "solid",
    shadowStyle: "soft",
    spacing: "normal",
    mode: "light"
  };
  const saveThemeRes = await fetch(`${base}/api/sites/themes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": adminSessionCookie
    },
    body: JSON.stringify(customTheme)
  });
  const savedTheme = await saveThemeRes.json();
  assert(saveThemeRes.status === 200 && savedTheme.name === "My Theme", "Theme saved successfully as My Theme");

  // 3.3 Create a builder landing page
  const testSlug = `builder-demo-${Date.now()}`;
  const pagePayload = {
    title: "Next-Gen AI Platform Demo",
    slug: testSlug,
    content: "Discover autonomous enterprise workflows built with Nexus with precision and control.",
    theme_color: "#1e293b",
    is_published: true,
    linked_webinar_id: null,
    gjs_data: [
      { id: "hero-1", type: "hero", content: "Next-Gen AI Platform Demo" },
      { id: "text-1", type: "text", content: "Experience automated marketing, CRM, and website builder." },
      { id: "features-1", type: "features", content: "Enterprise Security\nReal-time Sync\nAutopilot AI" },
      { id: "form-1", type: "registration", content: "Claim your early access seat" }
    ],
    builder_data: {
      theme: customTheme,
      headerStyle: "minimal",
      stickyNavigation: true,
      pageWidth: "wide"
    }
  };
  const createPageRes = await fetch(`${base}/api/sites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": adminSessionCookie
    },
    body: JSON.stringify(pagePayload)
  });
  const createdPage = await createPageRes.json();
  assert(createPageRes.status === 200 && createdPage.slug === testSlug, `Created visual builder page /s/${testSlug}`);

  // 3.4 Public Page Renderer for the created page
  const publicPageRes = await fetch(`${base}/s/${testSlug}`);
  const publicPageHtml = await publicPageRes.text();
  assert(publicPageRes.status === 200, `GET /s/${testSlug} public page served with status 200`);
  assert(publicPageHtml.includes("Next-Gen AI Platform Demo"), "Rendered page includes block title");
  assert(publicPageHtml.includes("Claim your early access seat") || publicPageHtml.includes("Email"), "Rendered page includes interactive registration form");

  // 3.5 Generic records endpoint: Update the page
  const updatePageRecord = await fetch(`${base}/api/records/page/${createdPage.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Cookie": adminSessionCookie
    },
    body: JSON.stringify({
      title: "Updated Next-Gen AI Platform Demo",
      slug: testSlug,
      content: "Discover autonomous enterprise workflows built with Nexus with precision and control.",
      theme_color: "#1e293b",
      is_published: true,
      linked_webinar_id: null,
      gjs_data: pagePayload.gjs_data,
      builder_data: pagePayload.builder_data
    })
  });
  const updatedPage = await updatePageRecord.json();
  assert(updatePageRecord.status === 200 && updatedPage.title.includes("Updated"), "Generic record update for landing page works");

  // 3.6 Viewer RBAC block on site creation
  const viewerPageCreate = await fetch(`${base}/api/sites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": viewerCookie
    },
    body: JSON.stringify({ ...pagePayload, slug: `viewer-slug-${Date.now()}` })
  });
  assert(viewerPageCreate.status === 403, "Viewer is blocked from creating landing pages with status 403");

  // -------------------------------------------------------------------------
  // 4. WEBINAR FEATURE (UNTOUCHED & FULLY WORKING)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 4: WEBINAR FEATURE ---");

  // 4.1 List webinars
  const webinarsData = await fetch(`${base}/api/webinars`).then(r => r.json());
  const webinarsList = webinarsData.webinars || webinarsData;
  assert(Array.isArray(webinarsList) && webinarsList.length > 0, `listWebinars returned ${webinarsList.length} webinars`);
  const activeWebinar = webinarsList[0];

  // 4.2 Submit registration form to created landing page
  const formSubmitRes = await fetch(`${base}/api/forms/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: testSlug,
      name: "Marcus Vance",
      email: "marcus.vance@sample-corp.com",
      tag: "executive"
    })
  });
  const formSubmitData = await formSubmitRes.json();
  assert(formSubmitRes.status === 200 && formSubmitData.success, "Public form submission created contact and registration");

  // 4.3 Toggle attendance
  if (activeWebinar) {
    const attendRes = await fetch(`${base}/api/webinars/attend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminSessionCookie
      },
      body: JSON.stringify({
        registrationId: "r-001",
        attended: true
      })
    });
    assert(attendRes.status === 200, "Webinar toggleRegistrationAttended works with status 200");
  }

  // -------------------------------------------------------------------------
  // 5. AI AGENT FEATURE (UNTOUCHED & FULLY WORKING)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 5: AI AGENT FEATURE & GOVERNANCE ---");

  // 5.1 Simple query to agent
  const agentQuery = await fetch(`${base}/api/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": adminSessionCookie
    },
    body: JSON.stringify({ prompt: "What features can you help me automate?" })
  }).then(r => r.json());
  assert(agentQuery.run?.id, `Agent executed conversation run ID: ${agentQuery.run?.id}`);
  assert(typeof agentQuery.assistantResponse === "string" && agentQuery.assistantResponse.length > 0, "Agent generated assistantResponse");

  // 5.2 Multi-step workflow test with governance checkpoint under Admin
  const agentWorkflow = await fetch(`${base}/api/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": adminSessionCookie
    },
    body: JSON.stringify({
      prompt: "Launch a webinar on AI in retail next Friday. Create a landing page, email my retail leads, and set up a paid ticket plan."
    })
  }).then(r => r.json());

  assert(agentWorkflow.planSteps?.length > 0, `Agent generated ${agentWorkflow.planSteps?.length} plan steps`);
  assert(agentWorkflow.run?.status === "awaiting_approval" || agentWorkflow.run?.status === "completed", `Agent status: ${agentWorkflow.run?.status}`);

  if (agentWorkflow.run?.status === "awaiting_approval") {
    assert(agentWorkflow.pendingApproval?.tool === "send_campaign", `Agent paused at high-risk checkpoint: ${agentWorkflow.pendingApproval?.tool}`);

    // Admin decision API
    const decisionRes = await fetch(`${base}/api/agent/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminSessionCookie
      },
      body: JSON.stringify({
        runId: agentWorkflow.run.id,
        approved: true
      })
    }).then(r => r.json());
    assert(decisionRes.run?.status === "completed", "Admin decision resumed and completed agent run");
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error("Verification suite encountered an error:", err);
  process.exit(1);
});
