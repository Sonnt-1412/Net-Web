import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, orders } from "@/db/schema";
import type { Customer } from "@/lib/order-types";

type CustomerRow = typeof customers.$inferSelect;

function toCustomer(row: CustomerRow): Customer {
  return { phone: row.phone, name: row.name, address: row.address };
}

// Đơn hàng tạo trước khi có bảng customers chưa có hồ sơ khách hàng gốc — bù
// đắp bằng cách lấy thông tin từ đơn hàng đầu tiên (id nhỏ nhất) của mỗi số
// điện thoại. Idempotent nhờ onConflictDoNothing, có thể gọi lại an toàn.
async function backfillFromOrders(userId: string) {
  const db = getDb();
  const rows = await db
    .select({ phone: orders.phone, customer: orders.customer, address: orders.address })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(asc(orders.id));

  const earliestByPhone = new Map<string, { customer: string; address: string }>();
  for (const row of rows) {
    if (!earliestByPhone.has(row.phone)) earliestByPhone.set(row.phone, row);
  }
  if (!earliestByPhone.size) return;

  for (const [phone, info] of earliestByPhone) {
    await db
      .insert(customers)
      .values({ userId, phone, name: info.customer, address: info.address })
      .onConflictDoNothing({ target: [customers.userId, customers.phone] });
  }
}

export async function listCustomers(userId: string): Promise<Customer[]> {
  await backfillFromOrders(userId);
  const db = getDb();
  const rows = await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.id));
  return rows.map(toCustomer);
}

export async function getCustomer(userId: string, phone: string): Promise<Customer | null> {
  await backfillFromOrders(userId);
  const db = getDb();
  const [row] = await db.select().from(customers).where(and(eq(customers.userId, userId), eq(customers.phone, phone))).limit(1);
  return row ? toCustomer(row) : null;
}

// Chỉ tạo khách hàng mới nếu số điện thoại này chưa từng xuất hiện — thông tin
// khách hàng luôn lấy từ đơn hàng đầu tiên, các đơn sau không được ghi đè.
export async function ensureCustomerFromOrder(userId: string, phone: string, name: string, address: string): Promise<Customer> {
  const db = getDb();
  const [inserted] = await db
    .insert(customers)
    .values({ userId, phone, name, address })
    .onConflictDoNothing({ target: [customers.userId, customers.phone] })
    .returning();
  if (inserted) return toCustomer(inserted);
  const existing = await getCustomer(userId, phone);
  return existing ?? { phone, name, address };
}

export async function updateCustomer(userId: string, phone: string, fields: { name?: string; address?: string }): Promise<Customer | null> {
  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.address !== undefined) updates.address = fields.address;
  const [row] = await db
    .update(customers)
    .set(updates)
    .where(and(eq(customers.userId, userId), eq(customers.phone, phone)))
    .returning();
  return row ? toCustomer(row) : null;
}
