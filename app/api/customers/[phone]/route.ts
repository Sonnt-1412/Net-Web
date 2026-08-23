import { getCurrentUser } from "@/lib/auth/session";
import { getCustomer, updateCustomer } from "@/lib/customers";

export async function GET(_request: Request, { params }: { params: Promise<{ phone: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { phone } = await params;
  const customer = await getCustomer(user.id, decodeURIComponent(phone));
  if (!customer) return Response.json({ error: "Không tìm thấy khách hàng." }, { status: 404 });
  return Response.json({ customer });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ phone: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { phone } = await params;
  try {
    const body = (await request.json()) as { name?: string; address?: string };
    if (body.name !== undefined && !body.name.trim()) {
      return Response.json({ error: "Tên khách hàng không được để trống." }, { status: 400 });
    }
    const updated = await updateCustomer(user.id, decodeURIComponent(phone), body);
    if (!updated) return Response.json({ error: "Không tìm thấy khách hàng." }, { status: 404 });
    return Response.json({ customer: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cập nhật khách hàng thất bại.";
    return Response.json({ error: message }, { status: 500 });
  }
}
