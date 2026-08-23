import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db.insert(sessions).values({ id, userId, expiresAt });

  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row || row.expiresAt < Date.now()) return null;
  return { id: row.id, email: row.email, name: row.name };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  store.delete(SESSION_COOKIE);
}
