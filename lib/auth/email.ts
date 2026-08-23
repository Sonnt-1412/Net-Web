// Gửi email qua Resend (https://resend.com) bằng fetch thuần — không cần SDK.
// Cần RESEND_API_KEY + RESEND_FROM_EMAIL.

function getConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function isEmailConfigured(): boolean {
  return getConfig() !== null;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const config = getConfig();
  if (!config) throw new Error("Chưa cấu hình gửi email (thiếu RESEND_API_KEY/RESEND_FROM_EMAIL).");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to,
      subject: "Đặt lại mật khẩu LướiFlow",
      html: `
        <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản LướiFlow.</p>
        <p><a href="${resetUrl}">Bấm vào đây để đặt lại mật khẩu</a> (link có hiệu lực trong 30 phút).</p>
        <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
      `,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gửi email thất bại: ${detail}`);
  }
}
