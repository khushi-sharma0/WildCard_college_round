import { listAuditLogs } from "@/lib/services";
import AuditView from "@/components/audit/audit-view";

export const revalidate = 0;

export default async function AuditPage() {
  const logs = await listAuditLogs();
  return <AuditView initialLogs={logs} />;
}
