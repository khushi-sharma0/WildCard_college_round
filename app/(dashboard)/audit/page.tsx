import { listAuditLogs } from "@/lib/services";
import AuditView from "@/components/audit/audit-view";
import { getRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function AuditPage() {
  const role = await getRole();
  if (role !== "admin") redirect("/");
  const logs = await listAuditLogs();
  return <AuditView initialLogs={logs} />;
}
