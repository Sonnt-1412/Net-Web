import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureCustomerFromOrder } from "@/lib/customers";
import { listOrders, toOrder } from "@/lib/orders";
import type { NetItem, OrderFormFields } from "@/lib/order-types";
import { count, eq } from "drizzle-orm";

// Loại bỏ dòng thiếu netInfo, ép SL/đơn giá về số hợp lệ.
function sanitizeExtraItems(value: unknown): NetItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (item && typeof item === "object" ? (item as Partial<NetItem>) : {}))
    .filter((item) => typeof item.netInfo === "string" && item.netInfo.trim())
    .map((item) => ({
      netInfo: String(item.netInfo).trim(),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
    }));
}

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
        extraItems: sanitizeExtraItems(body.extraItems),
      })
      .returning();

    // Mã đơn phụ thuộc vào id được DB cấp nên phải cập nhật sau khi insert.
    // Số thứ tự lấy theo tổng số đơn CỦA RIÊNG user này (không dùng id toàn cục
    // của bảng orders — id đó cộng dồn qua mọi user, gây hiển thị sai).
    const [{ value: userOrderCount }] = await db
      .select({ value: count() })
      .from(orders)
      .where(eq(orders.userId, user.id));
    const digits = body.phone.replace(/\D/g, "");
    const code = `${userOrderCount}-${digits.slice(-4) || "0000"}`;
    const [order] = await db.update(orders).set({ code }).where(eq(orders.id, inserted.id)).returning();

    // Chỉ tạo hồ sơ khách hàng nếu số điện thoại này chưa từng đặt hàng — thông
    // tin khách hàng luôn giữ theo đơn đầu tiên, không bị đơn sau ghi đè.
    const customer = await ensureCustomerFromOrder(user.id, body.phone, body.customer, body.address ?? "");

    return Response.json({ order: toOrder(order), customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tạo đơn hàng thất bại.";
    return Response.json({ error: message }, { status: 500 });
  }
}
