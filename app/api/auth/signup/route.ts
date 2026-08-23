import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; name?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const name = body.name?.trim() || null;

    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: "Email không hợp lệ." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Mật khẩu cần ít nhất 8 ký tự." }, { status: 400 });
    }

    const db = getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return Response.json({ error: "Email này đã được đăng ký." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();
    await db.insert(users).values({ id, email, name, passwordHash });
    await createSession(id);

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Đăng ký thất bại.";
    return Response.json({ error: message }, { status: 500 });
  }
}
