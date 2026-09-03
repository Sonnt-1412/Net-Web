export type Stage = "production" | "delivery" | "payment" | "canceled";

// Loại lưới #2, #3... của cùng 1 đơn — loại lưới #1 nằm trực tiếp trên Order
// (netInfo/quantity/unitPrice) để tương thích ngược với dữ liệu cũ.
export type NetItem = { netInfo: string; quantity: number; unitPrice: number };

export type Order = {
  id: number;
  code: string;
  receivedAt: string;
  createdAt: string;
  customer: string;
  phone: string;
  address: string;
  netInfo: string;
  quantity: number;
  unitPrice: number;
  total: number;
  actual: number | null;
  note: string;
  stage: Stage;
  deliveryStatus: "Chưa giao" | "Đã giao";
  paymentStatus: "Chưa nhận tiền" | "Đã nhận tiền";
  paymentDate?: string;
  canceledAt?: string;
  cancelReason?: string;
  workers: { gather: string; lead: string; float: string };
  extraItems: NetItem[];
};

export type Customer = {
  phone: string;
  name: string;
  address: string;
};

export type OrderFormFields = {
  customer: string;
  phone: string;
  address: string;
  netInfo: string;
  quantity: number;
  unitPrice: number;
  total: number;
  actual: number | null;
  note: string;
  extraItems: NetItem[];
};
