import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { listOrders, toOrder } from "@/lib/orders";
import type { OrderFormFields } from "@/lib/order-types";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const rows = await listOrders(user.id);
  return Response.json({ orders: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

  try {
    const body = (await request.json()) as Partial<OrderFormFields>;
    if (!body.customer || !body.phone || !body.netInfo) {
      return Response.json({ error: "Thiếu thông tin bắt buộc." }, { status: 400 });
    }

    const db = getDb();
    const [inserted] = await db
      .insert(orders)
      .values({
        userId: user.id,
        code: "",
        receivedAt: new Intl.DateTimeFormat("vi-VN").format(new Date()),
        customer: body.customer,
        phone: body.phone,
        address: body.address ?? "",
        netInfo: body.netInfo,
        quantity: Number(body.quantity) || 1,
        unitPrice: Number(body.unitPrice) || 0,
        total: Number(body.total) || 0,
        actual: body.actual === null || body.actual === undefined ? null : Number(body.actual),
        note: body.note ?? "",
        stage: "production",
        deliveryStatus: "Chưa giao",
        paymentStatus: "Chưa nhận tiền",
        workerGather: "",
        workerLead: "",
        workerFloat: "",
      })
      .returning();

    // Mã đơn phụ thuộc vào id được DB cấp, nên phải cập nhật sau khi insert.
    const digits = body.phone.replace(/\D/g, "");
    const code = `${inserted.id}-${digits.slice(-3) || "000"}`;
    const [order] = await db.update(orders).set({ code }).where(eq(orders.id, inserted.id)).returning();

    return Response.json({ order: toOrder(order) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tạo đơn hàng thất bại.";
    return Response.json({ error: message }, { status: 500 });
  }
}
