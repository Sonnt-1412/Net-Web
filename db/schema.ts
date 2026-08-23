import { bigint, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Null when the account was created via Google sign-in only.
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Mỗi đơn hàng gắn với đúng 1 user (userId) — mỗi tài khoản chỉ thấy và
// quản lý đơn hàng của chính mình, tách biệt hoàn toàn với tài khoản khác.
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  receivedAt: text("received_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  customer: text("customer").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull().default(""),
  netInfo: text("net_info").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  total: integer("total").notNull(),
  actual: integer("actual"),
  note: text("note").notNull().default(""),
  stage: text("stage").notNull(), // production | delivery | payment | canceled
  deliveryStatus: text("delivery_status").notNull(), // "Chưa giao" | "Đã giao"
  paymentStatus: text("payment_status").notNull(), // "Chưa nhận tiền" | "Đã nhận tiền"
  paymentDate: timestamp("payment_date", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  workerGather: text("worker_gather").notNull().default(""),
  workerLead: text("worker_lead").notNull().default(""),
  workerFloat: text("worker_float").notNull().default(""),
});

// Thông tin khách hàng "gốc" — được tạo từ đơn hàng đầu tiên của một số điện
// thoại và không bị đơn hàng sau ghi đè; chỉ thay đổi khi người dùng chủ động sửa.
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("customers_user_phone_unique").on(table.userId, table.phone)],
);
