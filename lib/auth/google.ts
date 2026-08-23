const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
};

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isGoogleSignInConfigured(): boolean {
  return getCredentials() !== null;
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const credentials = getCredentials();
  if (!credentials) throw new Error("Google sign-in chưa được cấu hình (thiếu GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).");

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const credentials = getCredentials();
  if (!credentials) throw new Error("Google sign-in chưa được cấu hình.");

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) throw new Error("Không đổi được mã Google OAuth lấy access token.");
  const tokenData = (await tokenResponse.json()) as { access_token: string };

  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileResponse.ok) throw new Error("Không lấy được thông tin tài khoản Google.");
  return (await profileResponse.json()) as GoogleProfile;
}
