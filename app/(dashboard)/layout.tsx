import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import { getIdentity, isUnauthenticatedError } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let identity;
  try {
    identity = await getIdentity();
  } catch (error) {
    if (isUnauthenticatedError(error)) redirect("/login");
    throw error;
  }
  const role = identity.role;

  return (
    <div className="flex min-h-screen bg-[#FAF8F5]">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0 border-l border-stone-200">
        <Topbar initialIdentity={{
          email: identity.email,
          fullName: identity.fullName,
          avatarUrl: identity.avatarUrl,
          role: identity.role
        }} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
