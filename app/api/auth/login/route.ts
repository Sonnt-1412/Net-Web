import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    }

    await createSession(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Đăng nhập thất bại.";
    return Response.json({ error: message }, { status: 500 });
  }
}
