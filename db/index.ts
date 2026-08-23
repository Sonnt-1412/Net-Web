import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Thiếu biến môi trường DATABASE_URL (connection string Supabase). Khai báo trong .env.local khi chạy local, và trong Vercel > Project Settings > Environment Variables khi deploy.",
    );
  }

  // `prepare: false` bắt buộc khi dùng Supabase connection pooler (transaction mode)
  // vì pgbouncer không hỗ trợ prepared statements.
  if (!client) client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}
