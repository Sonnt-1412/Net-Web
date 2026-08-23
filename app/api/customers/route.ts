import { getCurrentUser } from "@/lib/auth/session";
import { listCustomers } from "@/lib/customers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const rows = await listCustomers(user.id);
  return Response.json({ customers: rows });
}
