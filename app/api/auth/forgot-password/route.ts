import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/auth/email";

const RESET_TTL_MS = 30 * 60 * 1000; // 30 phút
const GENERIC_MESSAGE = "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email) return Response.json({ error: "Vui lòng nhập email." }, { status: 400 });

    const db = getDb();
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

    // Luôn trả thông báo chung chung, không tiết lộ email có tồn tại hay không.
    if (!user) return Response.json({ ok: true, message: GENERIC_MESSAGE });

    const token = crypto.randomUUID();
    await db.insert(passwordResetTokens).values({
      id: token,
      userId: user.id,
      expiresAt: Date.now() + RESET_TTL_MS,
    });

    const resetUrl = new URL(`/reset-password?token=${token}`, request.url).toString();

    if (!isEmailConfigured()) {
      // Chưa cấu hình dịch vụ email (RESEND_API_KEY) — trả thẳng link để test local.
      // Trên production PHẢI cấu hình email thật, không được để nhánh này chạy.
      return Response.json({ ok: true, message: GENERIC_MESSAGE, devResetUrl: resetUrl });
    }

    await sendPasswordResetEmail(email, resetUrl);
    return Response.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra.";
    return Response.json({ error: message }, { status: 500 });
  }
}
