import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = body.token ?? "";
    const password = body.password ?? "";

    if (!token) return Response.json({ error: "Thiếu mã đặt lại mật khẩu." }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Mật khẩu cần ít nhất 8 ký tự." }, { status: 400 });

    const db = getDb();
    const [row] = await db
      .select({ userId: passwordResetTokens.userId, expiresAt: passwordResetTokens.expiresAt })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.id, token))
      .limit(1);

    if (!row || row.expiresAt < Date.now()) {
      return Response.json({ error: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));

    // Dùng 1 lần: xoá token này, và đăng xuất khỏi mọi thiết bị khác cho an toàn.
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token));
    await db.delete(sessions).where(eq(sessions.userId, row.userId));

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Đặt lại mật khẩu thất bại.";
    return Response.json({ error: message }, { status: 500 });
  }
}
