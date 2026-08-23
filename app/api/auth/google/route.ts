import { buildGoogleAuthUrl, isGoogleSignInConfigured } from "@/lib/auth/google";

export async function GET(request: Request) {
  if (!isGoogleSignInConfigured()) {
    return Response.json(
      { error: "Đăng nhập Google chưa được cấu hình trên server (thiếu GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)." },
      { status: 501 },
    );
  }

  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
  const state = crypto.randomUUID();
  const authUrl = buildGoogleAuthUrl(redirectUri, state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Set-Cookie": `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
