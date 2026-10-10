async function testGovernanceCheckpoint() {
  const base = "http://localhost:3002/api/agent";

  console.log("\n==========================================");
  console.log("TESTING HIGH-RISK OUTBOUND GOVERNANCE CHECKPOINT");
  console.log("Prompt: 'Launch a webinar on AI in retail next Friday. Create a landing page, email my retail leads, and set up a paid ticket plan.'");
  console.log("==========================================");

  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": "role=admin"
    },
    body: JSON.stringify({
      prompt: "Launch a webinar on AI in retail next Friday. Create a landing page, email my retail leads, and set up a paid ticket plan."
    })
  }).then(r => r.json());

  console.log(`Run status: ${res.run?.status}`);
  console.log(`Pending tool: ${res.pendingApproval?.tool} (${res.pendingApproval?.risk})`);
  console.log(`Summary: ${res.pendingApproval?.summary}`);
  console.log(`Recipients: ${res.pendingApproval?.recipientCount}`);
  console.log("\nAssistant Response (Paused state):\n" + res.assistantResponse);

  if (res.run?.status === "awaiting_approval") {
    console.log("\nSimulating Admin approving the high-risk send...");
    const decRes = await fetch("http://localhost:3002/api/agent/decision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "role=admin"
      },
      body: JSON.stringify({
        runId: res.run.id,
        approved: true
      })
    }).then(r => r.json());

    console.log("Raw decision response:", JSON.stringify(decRes, null, 2));
    console.log(`Final status after approval: ${decRes.run?.status}`);
    console.log("\nAssistant Response after Admin decision:\n" + decRes.assistantResponse);
  }
}

testGovernanceCheckpoint().catch(console.error);
