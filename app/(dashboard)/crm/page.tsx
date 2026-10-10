import { listContacts, listSegments } from "@/lib/services";
import CRMView from "@/components/crm/crm-view";
import { getRole } from "@/lib/auth";

export const revalidate = 0;

export default async function CRMPage() {
  const [contacts, segments, role] = await Promise.all([
    listContacts(),
    listSegments(),
    getRole()
  ]);

  return <CRMView initialContacts={contacts} segments={segments} role={role} />;
}
