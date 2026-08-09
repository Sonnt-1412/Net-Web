"use client";

import { FormEvent, useMemo, useState } from "react";

type Tab = "orders" | "production" | "delivery" | "payment";
type Section = "sales" | "customers";
type Stage = "production" | "delivery" | "payment";
type Order = {
  id: number;
  code: string;
  receivedAt: string;
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
  workers: { gather: string; lead: string; float: string };
};

const initialOrders: Order[] = [
  {
    id: 119,
    code: "119-218",
    receivedAt: "28/07/2026",
    customer: "Nguyễn Văn Hữu",
    phone: "0908 451 218",
    address: "Châu Thành, Tiền Giang",
    netInfo: "Lưới 5 phân cước 15 cao 3m, màn 2 tấc, phao nhựa, chì nặng 2kg",
    quantity: 1,
    unitPrice: 1680000,
    total: 1680000,
    actual: 1580000,
    note: "Đơn cũ đã đối soát",
    stage: "payment",
    deliveryStatus: "Đã giao",
    paymentStatus: "Đã nhận tiền",
    paymentDate: "03/08/2026",
    workers: { gather: "Út", lead: "Minh", float: "Sáu" },
  },
  {
    id: 126,
    code: "126-218",
    receivedAt: "08/08/2026",
    customer: "Nguyễn Văn Hữu",
    phone: "0908 451 218",
    address: "Châu Thành, Tiền Giang",
    netInfo: "Lưới 4 phân cước 12 cao 3m2, màn 2 tấc cước 35, phao nhựa đầu 90, chì nặng 2kg",
    quantity: 2,
    unitPrice: 1250000,
    total: 2500000,
    actual: 2350000,
    note: "Giao về bến xe Tiền Giang",
    stage: "payment",
    deliveryStatus: "Đã giao",
    paymentStatus: "Chưa nhận tiền",
    workers: { gather: "Út, Thành", lead: "Minh", float: "Sáu" },
  },
  {
    id: 127,
    code: "127-804",
    receivedAt: "08/08/2026",
    customer: "Lê Minh Tâm",
    phone: "0937 225 804",
    address: "Cái Bè, Tiền Giang",
    netInfo: "Lưới 5 phân cước 15, màn 3 tấc, phao xốp, chì 2.5kg",
    quantity: 4,
    unitPrice: 780000,
    total: 3120000,
    actual: 3000000,
    note: "Gọi khách trước khi gửi",
    stage: "delivery",
    deliveryStatus: "Chưa giao",
    paymentStatus: "Chưa nhận tiền",
    workers: { gather: "Thành", lead: "Minh, Út", float: "Sáu" },
  },
  {
    id: 128,
    code: "128-511",
    receivedAt: "09/08/2026",
    customer: "Trần Thị Lan",
    phone: "0913 770 511",
    address: "Cao Lãnh, Đồng Tháp",
    netInfo: "Lưới 3 phân cước 9, màn 2 tấc, phao nhựa, chì 1.8kg",
    quantity: 1,
    unitPrice: 1850000,
    total: 1850000,
    actual: null,
    note: "Đơn cần gấp",
    stage: "production",
    deliveryStatus: "Chưa giao",
    paymentStatus: "Chưa nhận tiền",
    workers: { gather: "Út", lead: "", float: "" },
  },
  {
    id: 129,
    code: "129-322",
    receivedAt: "09/08/2026",
    customer: "Phạm Hoàng Nam",
    phone: "0986 114 322",
    address: "Bến Tre",
    netInfo: "Lưới 6 phân cước 18, màn 3 tấc, phao xốp lớn, chì 3kg",
    quantity: 3,
    unitPrice: 960000,
    total: 2880000,
    actual: null,
    note: "Khách tự nhận",
    stage: "production",
    deliveryStatus: "Chưa giao",
    paymentStatus: "Chưa nhận tiền",
    workers: { gather: "Tám", lead: "Năm", float: "" },
  },
];

const tabs: { key: Tab; label: string; short: string }[] = [
  { key: "orders", label: "Đơn Hàng", short: "ĐH" },
  { key: "production", label: "Sản Xuất", short: "SX" },
  { key: "delivery", label: "Đang Giao Hàng", short: "GH" },
  { key: "payment", label: "Nhận Tiền", short: "NT" },
];

const money = (value: number | null) =>
  value === null ? "Chưa nhập" : new Intl.NumberFormat("vi-VN").format(value) + " đ";

const splitNet = (value: string) => {
  const parts = value.split(",").map((part) => part.trim());
  return [parts[0] || "—", parts[1] || "—", parts[2] || "—", parts.slice(3).join(", ") || "—"];
};

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>("sales");
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"order" | "workers" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const currentOrder = orders.find((order) => order.id === editingId);
  const counts = {
    orders: orders.length,
    production: orders.filter((order) => order.stage === "production").length,
    delivery: orders.filter((order) => order.stage !== "production").length,
    payment: orders.filter((order) => order.stage === "payment").length,
  };

  const visibleOrders = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    const filtered = orders.filter((order) => {
      const inTab =
        activeTab === "orders" ||
        (activeTab === "production" && order.stage === "production") ||
        (activeTab === "delivery" && order.stage !== "production") ||
        (activeTab === "payment" && order.stage === "payment");
      return inTab && (!keyword || `${order.code} ${order.customer} ${order.phone} ${order.note}`.toLowerCase().includes(keyword));
    });
    return filtered.sort((a, b) => {
      if (activeTab === "orders" || activeTab === "production") return b.id - a.id;
      if (activeTab === "delivery") {
        if (a.deliveryStatus !== b.deliveryStatus) return a.deliveryStatus === "Chưa giao" ? -1 : 1;
        return b.id - a.id;
      }
      if (a.paymentStatus !== b.paymentStatus) return a.paymentStatus === "Chưa nhận tiền" ? -1 : 1;
      return a.id - b.id;
    });
  }, [activeTab, orders, search]);

  const customers = useMemo(() => {
    const byPhone = new Map<string, { phone: string; name: string; address: string; orders: Order[] }>();
    [...orders].sort((a, b) => b.id - a.id).forEach((order) => {
      const current = byPhone.get(order.phone);
      if (current) current.orders.push(order);
      else byPhone.set(order.phone, { phone: order.phone, name: order.customer, address: order.address, orders: [order] });
    });
    return [...byPhone.values()].sort((a, b) => b.orders[0].id - a.orders[0].id);
  }, [orders]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const moveToDelivery = (id: number) => {
    setOrders((items) => items.map((item) => (item.id === id ? { ...item, stage: "delivery" } : item)));
    notify("Đã chuyển đơn sang Đang Giao Hàng");
  };

  const toggleDelivered = (id: number) => {
    setOrders((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const delivered = item.deliveryStatus === "Đã giao";
        return { ...item, stage: delivered ? "delivery" : "payment", deliveryStatus: delivered ? "Chưa giao" : "Đã giao" };
      }),
    );
    const wasDelivered = orders.find((item) => item.id === id)?.deliveryStatus === "Đã giao";
    notify(wasDelivered ? "Đã chuyển đơn về trạng thái Chưa giao" : "Đã giao hàng — đơn đã xuất hiện ở Nhận Tiền");
  };

  const togglePaid = (id: number) => {
    setOrders((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        if (item.actual === null) {
          notify("Hãy nhập Thực thu ở tab Đơn Hàng trước");
          return item;
        }
        const paid = item.paymentStatus === "Đã nhận tiền";
        return {
          ...item,
          paymentStatus: paid ? "Chưa nhận tiền" : "Đã nhận tiền",
          paymentDate: paid ? undefined : "09/08/2026",
        };
      }),
    );
  };

  const openEdit = (id: number) => {
    setEditingId(id);
    setModal("order");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <div><strong>LướiFlow</strong><small>Quản lý sản xuất</small></div>
        </div>
        <nav className="parent-tabs" aria-label="Nhóm chức năng chính">
          <button className={activeSection === "sales" ? "parent-tab active" : "parent-tab"} onClick={() => setActiveSection("sales")}><span>▦</span> Quản lý bán hàng</button>
          <button className={activeSection === "customers" ? "parent-tab active" : "parent-tab"} onClick={() => { setActiveSection("customers"); setSearch(""); }}><span>◎</span> Quản lý khách hàng</button>
        </nav>
        <div className="user-chip"><span>NG</span><div><strong>Nguyễn Giang</strong><small>Quản lý</small></div></div>
      </header>

      {activeSection === "sales" && <nav className="sales-tabs" aria-label="Các tab quản lý bán hàng">
        <div>{tabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? "tab active" : "tab"} onClick={() => { setActiveTab(tab.key); setSearch(""); }}>
            <span className="tab-short">{tab.short}</span><span>{tab.label}</span><em>{counts[tab.key]}</em>
          </button>
        ))}</div>
      </nav>}

      <section className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{activeSection === "sales" ? "QUẢN LÝ BÁN HÀNG" : "QUẢN LÝ KHÁCH HÀNG"}</p>
            <h1>{activeSection === "sales" ? tabs.find((tab) => tab.key === activeTab)?.label : "Khách Hàng"}</h1>
            <p>{activeSection === "sales" ? subtitle(activeTab) : "Mỗi số điện thoại là một khách hàng; xem đầy đủ đơn hiện tại và quá khứ."}</p>
          </div>
          {activeSection === "sales" && activeTab === "orders" && (
            <button className="primary" onClick={() => { setEditingId(null); setModal("order"); }}>
              <span>＋</span> Tạo đơn hàng
            </button>
          )}
        </div>

        {activeSection === "sales" ? <div className="summary-row">
          <Summary label="Tổng đơn" value={orders.length} tone="ink" />
          <Summary label="Đang sản xuất" value={counts.production} tone="amber" />
          <Summary label="Chưa giao" value={orders.filter((o) => o.stage !== "production" && o.deliveryStatus === "Chưa giao").length} tone="blue" />
          <Summary label="Chờ nhận tiền" value={orders.filter((o) => o.stage === "payment" && o.paymentStatus === "Chưa nhận tiền").length} tone="green" />
        </div> : <div className="customer-summary"><div><span>Khách hàng</span><strong>{customers.length}</strong></div><p>Nhận diện bằng số điện thoại · Lịch sử đơn được giữ xuyên suốt</p></div>}

        <section className="data-card">
          <div className="table-tools">
            <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn, khách hàng, số điện thoại..." /></div>
            <div className="sync-note"><span>●</span> {activeSection === "sales" ? "Dữ liệu đồng bộ từ Đơn Hàng" : "Khách hàng được nhóm theo số điện thoại"}</div>
          </div>

          {activeSection === "customers" ? <CustomersView customers={customers.filter((customer) => !search.trim() || `${customer.name} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()))} selectedPhone={selectedCustomerPhone} onSelect={setSelectedCustomerPhone} onEditOrder={openEdit} /> : <>
            {activeTab === "orders" && <OrdersTable orders={visibleOrders} onEdit={openEdit} />}
            {activeTab === "production" && <ProductionTable orders={visibleOrders} onEditWorkers={(id) => { setEditingId(id); setModal("workers"); }} onMove={moveToDelivery} />}
            {activeTab === "delivery" && <DeliveryTable orders={visibleOrders} onToggle={toggleDelivered} />}
            {activeTab === "payment" && <PaymentTable orders={visibleOrders} onPaid={togglePaid} onEdit={openEdit} />}
          </>}
        </section>
      </section>

      {modal === "order" && (
        <OrderModal
          order={currentOrder}
          nextId={Math.max(...orders.map((o) => o.id)) + 1}
          onClose={() => setModal(null)}
          onSave={(saved) => {
            setOrders((items) => currentOrder ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]);
            setModal(null);
            notify(currentOrder ? "Đã cập nhật đơn và đồng bộ các tab" : "Đã tạo đơn và chuyển vào Sản Xuất");
          }}
        />
      )}
      {modal === "workers" && currentOrder && (
        <WorkersModal
          order={currentOrder}
          onClose={() => setModal(null)}
          onSave={(workers) => {
            setOrders((items) => items.map((item) => item.id === currentOrder.id ? { ...item, workers } : item));
            setModal(null);
            notify("Đã cập nhật người tham gia");
          }}
        />
      )}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function subtitle(tab: Tab) {
  if (tab === "orders") return "Tạo đơn và quản lý dữ liệu gốc của toàn bộ quy trình.";
  if (tab === "production") return "Theo dõi đơn đang làm và người tham gia từng công đoạn.";
  if (tab === "delivery") return "Các đơn đã sản xuất xong và đang chờ xác nhận giao hàng.";
  return "Đối soát Thành tiền và Thực thu được đồng bộ từ đơn hàng gốc.";
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`summary ${tone}`}><span>{label}</span><strong>{String(value).padStart(2, "0")}</strong></div>;
}

function Empty() {
  return <div className="empty"><span>✓</span><strong>Không có đơn phù hợp</strong><p>Danh sách sẽ tự cập nhật khi trạng thái đơn thay đổi.</p></div>;
}

function OrdersTable({ orders, onEdit }: { orders: Order[]; onEdit: (id: number) => void }) {
  if (!orders.length) return <Empty />;
  return <div className="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Thông tin lưới</th><th>Ghi chú</th><th className="num">Số lượng</th><th className="num">Thành tiền</th><th className="num">Thực thu</th><th>Vị trí</th><th></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}>
      <td><strong>{order.code}</strong><small>{order.receivedAt}</small></td>
      <td><strong>{order.customer}</strong><small>{order.phone}</small></td>
      <td className="net-cell">{order.netInfo}</td><td className="note-cell">{order.note || "—"}</td><td className="num quantity">{order.quantity}</td>
      <td className="num money">{money(order.total)}</td><td className={`num money ${order.actual === null ? "muted" : "actual"}`}>{money(order.actual)}</td>
      <td><StageBadge stage={order.stage} /></td><td><button className="link-btn" onClick={() => onEdit(order.id)}>Sửa</button></td>
    </tr>)}
  </tbody></table></div>;
}

function ProductionTable({ orders, onEditWorkers, onMove }: { orders: Order[]; onEditWorkers: (id: number) => void; onMove: (id: number) => void }) {
  if (!orders.length) return <Empty />;
  return <div className="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Thông tin lưới</th><th className="num">SL</th><th>Lượm lưới</th><th>Dập chì</th><th>Cột phao</th><th></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}>
      <td><strong>{order.code}</strong><small>{order.phone}</small></td><td className="net-cell">{order.netInfo}</td><td className="num quantity">{order.quantity}</td>
      <td><Worker value={order.workers.gather} /></td><td><Worker value={order.workers.lead} /></td><td><Worker value={order.workers.float} /></td>
      <td><div className="row-actions"><button className="link-btn" onClick={() => onEditWorkers(order.id)}>Cập nhật</button><button className="compact-primary" onClick={() => onMove(order.id)}>Chuyển giao →</button></div></td>
    </tr>)}
  </tbody></table></div>;
}

function DeliveryTable({ orders, onToggle }: { orders: Order[]; onToggle: (id: number) => void }) {
  if (!orders.length) return <Empty />;
  return <div className="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Địa chỉ</th><th className="num">Số lượng</th><th className="num">Thành tiền</th><th>Trạng thái</th><th></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}><td><strong>{order.code}</strong><small>{order.receivedAt}</small></td><td><strong>{order.customer}</strong><small>{order.phone}</small></td><td>{order.address}</td><td className="num quantity">{order.quantity}</td><td className="num money">{money(order.total)}</td><td><span className={order.deliveryStatus === "Đã giao" ? "badge delivered" : "badge waiting"}>{order.deliveryStatus}</span></td><td><button className={order.deliveryStatus === "Đã giao" ? "secondary compact" : "compact-primary"} onClick={() => onToggle(order.id)}>{order.deliveryStatus === "Đã giao" ? "Chuyển về Chưa giao" : "Đánh dấu đã giao"}</button></td></tr>)}
  </tbody></table></div>;
}

function PaymentTable({ orders, onPaid, onEdit }: { orders: Order[]; onPaid: (id: number) => void; onEdit: (id: number) => void }) {
  if (!orders.length) return <Empty />;
  return <div className="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th className="num">Thành tiền</th><th className="num">Thực thu</th><th>Chênh lệch</th><th>Nhận tiền</th><th></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}><td><strong>{order.code}</strong><small>Đã giao</small></td><td><strong>{order.customer}</strong><small>{order.phone}</small></td><td className="num money total-highlight">{money(order.total)}</td><td className={`num money ${order.actual === null ? "muted" : "actual-highlight"}`}>{money(order.actual)}</td><td className="money difference">{order.actual === null ? "—" : money(order.total - order.actual)}</td><td><span className={order.paymentStatus === "Đã nhận tiền" ? "badge paid" : "badge unpaid"}>{order.paymentStatus}</span>{order.paymentDate && <small>{order.paymentDate}</small>}</td><td><div className="row-actions">{order.actual === null && <button className="link-btn" onClick={() => onEdit(order.id)}>Nhập thực thu</button>}<button className="compact-primary" disabled={order.actual === null} onClick={() => onPaid(order.id)}>{order.paymentStatus === "Đã nhận tiền" ? "Hoàn tác" : "Đã nhận tiền"}</button></div></td></tr>)}
  </tbody></table></div>;
}

function CustomersView({ customers, selectedPhone, onSelect, onEditOrder }: { customers: { phone: string; name: string; address: string; orders: Order[] }[]; selectedPhone: string | null; onSelect: (phone: string) => void; onEditOrder: (id: number) => void }) {
  if (!customers.length) return <Empty />;
  const selected = customers.find((customer) => customer.phone === selectedPhone) || customers[0];
  const historicalOrders = [...selected.orders].sort((a, b) => b.id - a.id);
  return <div className="customer-layout">
    <aside className="customer-list">
      {customers.map((customer) => <button key={customer.phone} className={customer.phone === selected.phone ? "customer-item active" : "customer-item"} onClick={() => onSelect(customer.phone)}>
        <span className="customer-avatar">{customer.name.split(" ").slice(-2).map((part) => part[0]).join("")}</span>
        <span><strong>{customer.name}</strong><small>{customer.phone}</small></span><em>{customer.orders.length} đơn</em>
      </button>)}
    </aside>
    <section className="customer-detail">
      <div className="customer-detail-head"><div><p className="eyebrow">LỊCH SỬ KHÁCH HÀNG</p><h2>{selected.name}</h2><p>{selected.phone} · {selected.address}</p></div><div><span>Tổng số đơn</span><strong>{selected.orders.length}</strong></div></div>
      <div className="history-list">{historicalOrders.map((order) => <article key={order.id} className="history-order">
        <div><strong>{order.code}</strong><small>{order.receivedAt}</small></div>
        <p>{order.netInfo}</p><span className="history-quantity">{order.quantity} lưới</span><strong className="history-money">{money(order.total)}</strong><StageBadge stage={order.stage} /><button className="link-btn" onClick={() => onEditOrder(order.id)}>Xem đơn</button>
      </article>)}</div>
    </section>
  </div>;
}

function StageBadge({ stage }: { stage: Stage }) {
  const value = stage === "production" ? "Sản xuất" : stage === "delivery" ? "Đang giao" : "Nhận tiền";
  return <span className={`badge ${stage}`}>{value}</span>;
}

function Worker({ value }: { value: string }) {
  return value ? <span className="worker">{value}</span> : <span className="worker empty-worker">Chưa có</span>;
}

function OrderModal({ order, nextId, onClose, onSave }: { order?: Order; nextId: number; onClose: () => void; onSave: (order: Order) => void }) {
  const [form, setForm] = useState({
    customer: order?.customer || "",
    phone: order?.phone || "",
    address: order?.address || "",
    netInfo: order?.netInfo || "",
    quantity: String(order?.quantity || 1),
    unitPrice: String(order?.unitPrice || ""),
    total: String(order?.total || ""),
    actual: order?.actual === null || order?.actual === undefined ? "" : String(order.actual),
    note: order?.note || "",
  });
  const [manualTotal, setManualTotal] = useState(Boolean(order));
  const parsed = splitNet(form.netInfo);
  const update = (key: keyof typeof form, value: string) => {
    const next = { ...form, [key]: value };
    if (!manualTotal && (key === "quantity" || key === "unitPrice")) next.total = String(Number(next.quantity) * Number(next.unitPrice) || "");
    setForm(next);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = order?.id || nextId;
    const digits = form.phone.replace(/\D/g, "");
    onSave({
      ...(order || { stage: "production", deliveryStatus: "Chưa giao", paymentStatus: "Chưa nhận tiền", workers: { gather: "", lead: "", float: "" } }),
      id,
      code: order?.code || `${id}-${digits.slice(-3) || "000"}`,
      receivedAt: order?.receivedAt || "09/08/2026",
      customer: form.customer,
      phone: form.phone,
      address: form.address,
      netInfo: form.netInfo,
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      total: Number(form.total),
      actual: form.actual ? Number(form.actual) : null,
      note: form.note,
    });
  };
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">ĐƠN HÀNG GỐC</p><h2>{order ? `Sửa đơn ${order.code}` : "Tạo đơn hàng mới"}</h2></div><button type="button" className="close" onClick={onClose}>×</button></div>
    <div className="form-grid"><label>Khách hàng<input required value={form.customer} onChange={(e) => update("customer", e.target.value)} /></label><label>Số điện thoại<input required value={form.phone} onChange={(e) => update("phone", e.target.value)} /></label><label className="wide">Địa chỉ<input value={form.address} onChange={(e) => update("address", e.target.value)} /></label><label className="wide">Thông tin lưới chung<textarea required value={form.netInfo} onChange={(e) => update("netInfo", e.target.value)} placeholder="Ruột lưới, màn, phao, chì" /></label></div>
    <div className="parsed-grid">{["Ruột lưới", "Màn", "Phao", "Chì"].map((label, i) => <div key={label}><span>{label}</span><strong>{parsed[i]}</strong></div>)}</div>
    <div className="form-grid money-grid"><label>Số lượng<input type="number" min="1" required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></label><label>Đơn giá<input type="number" min="0" required value={form.unitPrice} onChange={(e) => update("unitPrice", e.target.value)} /></label><label>Thành tiền<input type="number" min="0" required value={form.total} onChange={(e) => { setManualTotal(true); update("total", e.target.value); }} /></label><label>Thực thu<input type="number" min="0" value={form.actual} onChange={(e) => update("actual", e.target.value)} placeholder="Có thể nhập sau" /></label><label className="wide">Ghi chú<input value={form.note} onChange={(e) => update("note", e.target.value)} /></label></div>
    <div className="modal-footer"><p><span>●</span> Thành tiền và Thực thu sẽ đồng bộ sang Nhận Tiền</p><div><button type="button" className="secondary" onClick={onClose}>Hủy</button><button className="primary">{order ? "Lưu thay đổi" : "Tạo đơn"}</button></div></div>
  </form></div>;
}

function WorkersModal({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (workers: Order["workers"]) => void }) {
  const [workers, setWorkers] = useState(order.workers);
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal small-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">SẢN XUẤT · {order.code}</p><h2>Người tham gia công đoạn</h2></div><button className="close" onClick={onClose}>×</button></div><div className="worker-form"><label>Lượm lưới<input value={workers.gather} onChange={(e) => setWorkers({ ...workers, gather: e.target.value })} placeholder="Nhập tên, ngăn cách bằng dấu phẩy" /></label><label>Dập chì<input value={workers.lead} onChange={(e) => setWorkers({ ...workers, lead: e.target.value })} /></label><label>Cột phao<input value={workers.float} onChange={(e) => setWorkers({ ...workers, float: e.target.value })} /></label></div><div className="modal-footer"><p>Mỗi công đoạn chỉ lưu người tham gia.</p><div><button className="secondary" onClick={onClose}>Hủy</button><button className="primary" onClick={() => onSave(workers)}>Lưu người tham gia</button></div></div></div></div>;
}
