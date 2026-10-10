import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { listApprovalRequests } from "@/lib/services";
import ApprovalsView from "@/components/approvals/approvals-view";

export const revalidate = 0;

export default async function ApprovalsPage() {
  const role = await getRole();
  if (role !== "admin") redirect("/");
  const approvals = await listApprovalRequests();
  return <ApprovalsView initialApprovals={approvals} />;
}
