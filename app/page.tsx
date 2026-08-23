import { getCurrentUser } from "@/lib/auth/session";
import { isGoogleSignInConfigured } from "@/lib/auth/google";
import AppShell from "./app-shell";
import AuthScreen from "./auth-screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <AuthScreen googleEnabled={isGoogleSignInConfigured()} />;
  return <AppShell user={user} />;
}
