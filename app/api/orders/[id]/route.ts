import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { toOrder } from "@/lib/orders";

type PatchBody = {
  customer?: string;
  phone?: string;
  address?: string;
  netInfo?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  actual?: number | null;
  note?: string;
  stage?: string;
  deliveryStatus?: string;
  paymentStatus?: string;
  paymentDate?: string | null;
  canceledAt?: string | null;
  cancelReason?: string;
  workers?: { gather: string; lead: string; float: string };
};

function buildUpdate(body: PatchBody) {
  const updates: Record<string, unknown> = {};
  if (body.customer !== undefined) updates.customer = body.customer;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.address !== undefined) updates.address = body.address;
  if (body.netInfo !== undefined) updates.netInfo = body.netInfo;
  if (body.quantity !== undefined) updates.quantity = Number(body.quantity);
  if (body.unitPrice !== undefined) updates.unitPrice = Number(body.unitPrice);
  if (body.total !== undefined) updates.total = Number(body.total);
  if (body.actual !== undefined) updates.actual = body.actual === null ? null : Number(body.actual);
  if (body.note !== undefined) updates.note = body.note;
  if (body.stage !== undefined) updates.stage = body.stage;
  if (body.deliveryStatus !== undefined) updates.deliveryStatus = body.deliveryStatus;
  if (body.paymentStatus !== undefined) updates.paymentStatus = body.paymentStatus;
  if (body.paymentDate !== undefined) updates.paymentDate = body.paymentDate ? new Date(body.paymentDate) : null;
  if (body.canceledAt !== undefined) updates.canceledAt = body.canceledAt ? new Date(body.canceledAt) : null;
  if (body.cancelReason !== undefined) updates.cancelReason = body.cancelReason;
  if (body.workers !== undefined) {
    updates.workerGather = body.workers.gather ?? "";
    updates.workerLead = body.workers.lead ?? "";
    updates.workerFloat = body.workers.float ?? "";
  }
  return updates;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) return Response.json({ error: "Mã đơn không hợp lệ." }, { status: 400 });

  try {
    const body = (await request.json()) as PatchBody;
    const updates = buildUpdate(body);
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Không có gì để cập nhật." }, { status: 400 });
    }

    const db = getDb();
    // Luôn kèm điều kiện userId — chặn sửa đơn hàng của tài khoản khác.
    const [updated] = await db
      .update(orders)
      .set(updates)
      .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
      .returning();

    if (!updated) return Response.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
    return Response.json({ order: toOrder(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cập nhật đơn hàng thất bại.";
    return Response.json({ error: message }, { status: 500 });
  }
}
