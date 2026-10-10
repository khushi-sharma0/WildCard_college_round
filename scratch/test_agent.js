async function runTests() {
  const base = "http://localhost:3002/api/agent";

  console.log("\n==========================================");
  console.log("TEST A: General Conversation (What can you do?)");
  console.log("==========================================");
  const t0 = Date.now();
  const resA = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "What can you help me with?" })
  }).then(r => r.json());
  const durA = Date.now() - t0;
  console.log(`Latency: ${durA}ms`);
  console.log(`Mode: ${resA.intentMode}`);
  console.log(`Plan steps: ${resA.planSteps?.length || 0}`);
  console.log(`Timeline tools: ${resA.timeline?.map(t => t.tool).join(", ") || "none"}`);
  console.log("Assistant Response:\n" + resA.assistantResponse);

  console.log("\n==========================================");
  console.log("TEST C: Simple Information Retrieval (How many leads are in CRM?)");
  console.log("==========================================");
  const t1 = Date.now();
  const resC = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "How many leads are currently in the CRM?" })
  }).then(r => r.json());
  const durC = Date.now() - t1;
  console.log(`Latency: ${durC}ms`);
  console.log(`Mode: ${resC.intentMode}`);
  console.log(`Timeline tools: ${resC.timeline?.map(t => t.tool).join(", ")}`);
  console.log("Assistant Response:\n" + resC.assistantResponse);

  console.log("\n==========================================");
  console.log("TEST B: Business Analysis (Analyze the CRM and leads)");
  console.log("==========================================");
  const t2 = Date.now();
  const resB = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Analyze the CRM and leads." })
  }).then(r => r.json());
  const durB = Date.now() - t2;
  console.log(`Latency: ${durB}ms`);
  console.log(`Mode: ${resB.intentMode}`);
  console.log(`Timeline tools: ${resB.timeline?.map(t => t.tool).join(", ")}`);
  console.log("Assistant Response:\n" + resB.assistantResponse);

  console.log("\n==========================================");
  console.log("TEST F: Follow-up Conversation (Summarize leads and recommend next step)");
  console.log("==========================================");
  const history = [
    { role: "user", text: "Analyze the CRM and leads." },
    { role: "assistant", text: resB.assistantResponse }
  ];
  const t3 = Date.now();
  const resF = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Now summarize the leads you found and recommend the best next step.",
      history
    })
  }).then(r => r.json());
  const durF = Date.now() - t3;
  console.log(`Latency: ${durF}ms`);
  console.log(`Mode: ${resF.intentMode}`);
  console.log("Assistant Response:\n" + resF.assistantResponse);

  console.log("\n==========================================");
  console.log("TEST D & E: Workflow under Viewer (Policy Block Check)");
  console.log("==========================================");
  // Default cookie is viewer
  const t4 = Date.now();
  const resViewer = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Create a webinar for our new product, identify interested leads in the CRM, prepare an email marketing campaign, and track registrations."
    })
  }).then(r => r.json());
  const durViewer = Date.now() - t4;
  console.log(`Latency: ${durViewer}ms`);
  console.log(`Mode: ${resViewer.intentMode}`);
  console.log(`Plan steps: ${resViewer.planSteps?.length || 0}`);
  console.log(`Timeline statuses: ${resViewer.timeline?.map(t => `${t.tool}:${t.status}`).join(", ")}`);
  console.log("Assistant Response:\n" + resViewer.assistantResponse);

  console.log("\n==========================================");
  console.log("TEST D: Workflow under Admin (Approval Checkpoint & Cross-Module)");
  console.log("==========================================");
  const t5 = Date.now();
  const resAdmin = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": "role=admin"
    },
    body: JSON.stringify({
      prompt: "Create a webinar for our new product, identify interested leads in the CRM, prepare an email marketing campaign, and track registrations."
    })
  }).then(r => r.json());
  const durAdmin = Date.now() - t5;
  console.log(`Latency: ${durAdmin}ms`);
  console.log(`Run status: ${resAdmin.run?.status}`);
  console.log(`Pending tool: ${resAdmin.pendingApproval?.tool} (${resAdmin.pendingApproval?.risk})`);
  console.log(`Timeline statuses: ${resAdmin.timeline?.map(t => `${t.tool}:${t.status}`).join(", ")}`);
  console.log("Assistant Response:\n" + resAdmin.assistantResponse);

  if (resAdmin.run?.status === "awaiting_approval") {
    console.log("\nAuthorizing outbound campaign via decision API...");
    const decRes = await fetch("http://localhost:3002/api/agent/decision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "role=admin"
      },
      body: JSON.stringify({
        runId: resAdmin.run.id,
        approved: true
      })
    }).then(r => r.json());
    console.log(`Final Run status: ${decRes.run?.status}`);
    console.log("Created entities:", decRes.reportSummary?.createdEntities);
    console.log("Decision Final Text:\n" + decRes.assistantResponse);
  }
}

runTests().catch(console.error);
