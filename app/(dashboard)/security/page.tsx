import { listAgentRuns, listAuditLogs, listApprovals, WS } from "@/lib/services";
import { getRole } from "@/lib/auth";
import SecurityView from "@/components/security/security-view";

export const revalidate = 0;

export default async function WorkflowSecurityPage() {
  const [runs, logs, approvals, role] = await Promise.all([
    listAgentRuns(WS),
    listAuditLogs(WS),
    listApprovals(WS),
    getRole(),
  ]);

  return <SecurityView initialRuns={runs} initialLogs={logs} initialApprovals={approvals} role={role} />;
}
