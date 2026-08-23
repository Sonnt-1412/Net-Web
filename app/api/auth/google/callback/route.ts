import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { exchangeGoogleCode } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = /(?:^|;\s*)oauth_state=([^;]+)/.exec(request.headers.get("cookie") ?? "")?.[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return new Response("Đăng nhập Google thất bại: state không hợp lệ hoặc đã hết hạn.", { status: 400 });
  }

  try {
    const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
    const profile = await exchangeGoogleCode(code, redirectUri);

    const db = getDb();
    let userId: string;
    const [byGoogle] = await db.select({ id: users.id }).from(users).where(eq(users.googleId, profile.sub)).limit(1);
    if (byGoogle) {
      userId = byGoogle.id;
    } else {
      const [byEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, profile.email)).limit(1);
      if (byEmail) {
        await db.update(users).set({ googleId: profile.sub }).where(eq(users.id, byEmail.id));
        userId = byEmail.id;
      } else {
        userId = crypto.randomUUID();
        await db.insert(users).values({ id: userId, email: profile.email, name: profile.name ?? null, googleId: profile.sub });
      }
    }

    await createSession(userId);
    return new Response(null, {
      status: 302,
      headers: { Location: "/", "Set-Cookie": "oauth_state=; Path=/; Max-Age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Đăng nhập Google thất bại.";
    return new Response(message, { status: 500 });
  }
}
