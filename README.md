# LướiFlow — Quản lý sản xuất lưới

Next.js app (App Router) quản lý Đơn Hàng → Sản Xuất → Giao Hàng → Nhận Tiền,
deploy trên Vercel, database Postgres trên Supabase.

## Yêu cầu

- Node.js `>=22.13.0`
- 1 project Supabase (lấy connection string Postgres)

## Chạy local

```bash
npm install
```

Tạo file `.env.local` (không commit) với nội dung:

```
DATABASE_URL=postgresql://postgres:<mật-khẩu>@<host>:5432/postgres
```

Áp migration vào database:

```bash
npm run db:migrate
```

Chạy dev server:

```bash
npm run dev
```

## Auth

Tài khoản đăng nhập bằng email/mật khẩu (hash PBKDF2) + tùy chọn Google Sign-In.
Cấu hình thêm (không bắt buộc để chạy được, chỉ cần khi muốn bật tính năng
tương ứng):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

- Thiếu `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` → nút "Đăng nhập bằng Google" tự ẩn.
- Thiếu `RESEND_API_KEY`/`RESEND_FROM_EMAIL` → API quên mật khẩu trả thẳng link
  reset trong response (chỉ để test local), không gửi email thật.

## Deploy lên Vercel

1. Push code lên GitHub, Import project đó trong Vercel.
2. Vào Project Settings → Environment Variables, thêm `DATABASE_URL` (và các
   biến auth ở trên nếu cần).
3. Vercel tự build bằng `npm run build` (Next.js chuẩn) mỗi khi có commit mới.

## Lệnh hữu ích

- `npm run dev`: chạy local dev server
- `npm run build` / `npm run start`: build và chạy bản production
- `npm run db:generate`: sinh migration Drizzle sau khi sửa `db/schema.ts`
- `npm run db:migrate`: áp migration vào database đang trỏ tới bởi `DATABASE_URL`
