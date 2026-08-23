import { getCurrentUser } from "@/lib/auth/session";
import { isGoogleSignInConfigured } from "@/lib/auth/google";
import { listOrders } from "@/lib/orders";
import AppShell from "./app-shell";
import AuthScreen from "./auth-screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <AuthScreen googleEnabled={isGoogleSignInConfigured()} />;

  const orders = await listOrders(user.id);
  return <AppShell user={user} initialOrders={orders} />;
}
