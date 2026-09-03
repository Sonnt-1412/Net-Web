import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import type { Order } from "@/lib/order-types";

type OrderRow = typeof orders.$inferSelect;

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    code: row.code,
    receivedAt: row.receivedAt,
    createdAt: row.createdAt.toISOString(),
    customer: row.customer,
    phone: row.phone,
    address: row.address,
    netInfo: row.netInfo,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    total: row.total,
    actual: row.actual,
    note: row.note,
    stage: row.stage as Order["stage"],
    deliveryStatus: row.deliveryStatus as Order["deliveryStatus"],
    paymentStatus: row.paymentStatus as Order["paymentStatus"],
    paymentDate: row.paymentDate ? row.paymentDate.toISOString() : undefined,
    canceledAt: row.canceledAt ? row.canceledAt.toISOString() : undefined,
    cancelReason: row.cancelReason ?? undefined,
    workers: { gather: row.workerGather, lead: row.workerLead, float: row.workerFloat },
    extraItems: row.extraItems ?? [],
  };
}

export async function listOrders(userId: string): Promise<Order[]> {
  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.id));
  return rows.map(toOrder);
}
