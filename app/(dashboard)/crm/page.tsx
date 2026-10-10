import { listContacts, listSegments } from "@/lib/services";
import CRMView from "@/components/crm/crm-view";

export const revalidate = 0;

export default async function CRMPage() {
  const [contacts, segments] = await Promise.all([
    listContacts(),
    listSegments(),
  ]);

  return <CRMView initialContacts={contacts} segments={segments} />;
}
