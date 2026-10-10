import SetupIncomplete from "@/components/auth/setup-incomplete";
import { getMissingSupabaseAuthVariables } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export default function SetupIncompletePage() {
  return <SetupIncomplete missingVariables={getMissingSupabaseAuthVariables()} />;
}
