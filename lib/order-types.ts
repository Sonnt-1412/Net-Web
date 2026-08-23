export type Stage = "production" | "delivery" | "payment" | "canceled";

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
};
