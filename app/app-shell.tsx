"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth/session";
import type { Customer, Order, OrderFormFields, Stage } from "@/lib/order-types";

type Tab = "orders" | "production" | "delivery" | "payment" | "canceled";
type Section = "sales" | "customers" | "finance";

async function callApi(url: string, method: string, body?: unknown): Promise<Order> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json()) as { order?: Order; error?: string };
  if (!res.ok || !data.order) throw new Error(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
  return data.order;
}

const tabs: { key: Tab; label: string; short: string }[] = [
  { key: "orders", label: "Đơn Hàng", short: "ĐH" },
  { key: "production", label: "Sản Xuất", short: "SX" },
  { key: "delivery", label: "Đang Giao Hàng", short: "GH" },
  { key: "payment", label: "Nhận Tiền", short: "NT" },
  { key: "canceled", label: "Đơn Hủy", short: "HỦY" },
];

const money = (value: number | null) =>
  value === null ? "Chưa nhập" : new Intl.NumberFormat("vi-VN").format(value) + " đ";

// Dùng cho các ô nhập tiền: chỉ giữ số, không cho ký tự khác.
const digitsOnly = (value: string) => value.replace(/[^\d]/g, "");
// Hiển thị số đã nhập với dấu . ngăn cách hàng nghìn cho dễ đọc (vẫn lưu giá trị gốc không dấu chấm).
const formatMoneyInput = (value: string) => (value ? new Intl.NumberFormat("vi-VN").format(Number(value)) : "");

const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
}).format(new Date(value));

// Gộp loại lưới #1 (netInfo/quantity/unitPrice trên order) với các loại lưới phụ (extraItems)
// thành 1 danh sách để hiển thị/in — mọi nơi cần liệt kê "tất cả loại lưới của đơn" dùng hàm này.
function allNetItems(order: Order) {
  return [{ netInfo: order.netInfo, quantity: order.quantity, unitPrice: order.unitPrice }, ...order.extraItems];
}

const splitNet = (value: string) => {
  const parts = value.split(",").map((part) => part.trim());
  return [parts[0] || "—", parts[1] || "—", parts[2] || "—", parts.slice(3).join(", ") || "—"];
};

function initials(user: AuthUser) {
  const source = user.name || user.email;
  return source.split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

export default function AppShell({ user, initialOrders, initialCustomers }: { user: AuthUser; initialOrders: Order[]; initialCustomers: Customer[] }) {
  const [activeSection, setActiveSection] = useState<Section>("sales");
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [customerRecords, setCustomerRecords] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modal, setModal] = useState<"order" | "detail" | "workers" | "customer" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const currentOrder = orders.find((order) => order.id === editingId);
  const counts = {
    orders: orders.length,
    production: orders.filter((order) => order.stage === "production").length,
    delivery: orders.filter((order) => order.stage === "delivery" || order.stage === "payment").length,
    payment: orders.filter((order) => order.stage === "payment").length,
    canceled: orders.filter((order) => order.stage === "canceled").length,
  };

  const visibleOrders = useMemo(() => {
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    const keyword = search.toLowerCase().trim();
    const filtered = orders.filter((order) => {
      const inTab =
        (activeTab === "orders" && order.stage !== "canceled") ||
        (activeTab === "production" && order.stage === "production") ||
        (activeTab === "delivery" && (order.stage === "delivery" || order.stage === "payment")) ||
        (activeTab === "payment" && order.stage === "payment") ||
        (activeTab === "canceled" && order.stage === "canceled");
      if (!inTab) return false;
      const createdTime = new Date(order.createdAt).getTime();
      if (fromTime !== null && createdTime < fromTime) return false;
      if (toTime !== null && createdTime > toTime) return false;
      return !keyword || `${order.code} ${order.customer} ${order.phone} ${order.note}`.toLowerCase().includes(keyword);
    });
    return filtered.sort((a, b) => {
      if (activeTab === "orders") {
        const position = { production: 0, delivery: 1, payment: 2, canceled: 3 } as const;
        const rank = position[a.stage] - position[b.stage];
        return rank || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (activeTab === "production") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (activeTab === "delivery") {
        if (a.deliveryStatus !== b.deliveryStatus) return a.deliveryStatus === "Chưa giao" ? -1 : 1;
        return b.id - a.id;
      }
      if (activeTab === "canceled") return new Date(b.canceledAt || b.createdAt).getTime() - new Date(a.canceledAt || a.createdAt).getTime();
      if (a.paymentStatus !== b.paymentStatus) return a.paymentStatus === "Chưa nhận tiền" ? -1 : 1;
      if (activeTab === "payment") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });
  }, [activeTab, orders, search, dateFrom, dateTo]);

  const rangeTotal = useMemo(() => visibleOrders.reduce((sum, order) => sum + order.total, 0), [visibleOrders]);

  // Hồ sơ khách hàng "gốc" (tên + địa chỉ theo đơn đầu tiên, có thể sửa sau) —
  // ghép với lịch sử đơn hàng theo số điện thoại để hiển thị ở tab Khách Hàng.
  const customerMap = useMemo(() => new Map(customerRecords.map((c) => [c.phone, c])), [customerRecords]);

  const customers = useMemo(() => {
    const byPhone = new Map<string, { phone: string; name: string; address: string; orders: Order[] }>();
    [...orders].sort((a, b) => b.id - a.id).forEach((order) => {
      const current = byPhone.get(order.phone);
      if (current) {
        current.orders.push(order);
        return;
      }
      const canonical = customerMap.get(order.phone);
      byPhone.set(order.phone, {
        phone: order.phone,
        name: canonical?.name || order.customer,
        address: canonical?.address || order.address,
        orders: [order],
      });
    });
    return [...byPhone.values()].sort((a, b) => b.orders[0].id - a.orders[0].id);
  }, [orders, customerMap]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const applyUpdate = (id: number, updated: Order) => {
    setOrders((items) => items.map((item) => (item.id === id ? updated : item)));
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setSelectedOrderIds(new Set());
  };

  const toggleSelectOrder = (id: number) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOrders = (ids: number[]) => {
    setSelectedOrderIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  };

  const moveToDelivery = async (id: number) => {
    try {
      const updated = await callApi(`/api/orders/${id}`, "PATCH", { stage: "delivery" });
      applyUpdate(id, updated);
      notify("Đã chuyển đơn sang Đang Giao Hàng");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Có lỗi xảy ra");
    }
  };

  const toggleDelivered = async (id: number) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    const delivered = order.deliveryStatus === "Đã giao";
    try {
      const updated = await callApi(`/api/orders/${id}`, "PATCH", {
        stage: delivered ? "delivery" : "payment",
        deliveryStatus: delivered ? "Chưa giao" : "Đã giao",
      });
      applyUpdate(id, updated);
      notify(delivered ? "Đã chuyển đơn về trạng thái Chưa giao" : "Đã giao hàng — đơn đã xuất hiện ở Nhận Tiền");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Có lỗi xảy ra");
    }
  };

  const togglePaid = async (id: number) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    const paid = order.paymentStatus === "Đã nhận tiền";
    try {
      const updated = await callApi(`/api/orders/${id}`, "PATCH", {
        paymentStatus: paid ? "Chưa nhận tiền" : "Đã nhận tiền",
        paymentDate: paid ? null : new Date().toISOString(),
        // Không có thực thu thì mặc định 0đ, vẫn cho phép đánh dấu đã nhận tiền.
        ...(!paid && order.actual === null ? { actual: 0 } : {}),
      });
      applyUpdate(id, updated);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Có lỗi xảy ra");
    }
  };

  const openEdit = (id: number) => {
    setEditingId(id);
    setModal("order");
  };

  const openDetail = (id: number) => {
    setEditingId(id);
    setModal("detail");
  };

  const cancelOrder = async (id: number) => {
    const order = orders.find((item) => item.id === id);
    if (!order || !window.confirm(`Hủy đơn ${order.code}? Đơn sẽ bị loại khỏi Sản Xuất, Giao Hàng và Nhận Tiền.`)) return;
    const reason = window.prompt("Nhập lý do hủy đơn:", "Khách yêu cầu hủy")?.trim();
    if (!reason) return;
    try {
      const updated = await callApi(`/api/orders/${id}`, "PATCH", {
        stage: "canceled",
        canceledAt: new Date().toISOString(),
        cancelReason: reason,
      });
      applyUpdate(id, updated);
      notify("Đã chuyển đơn sang Đơn Hủy");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Có lỗi xảy ra");
    }
  };

  const bulkCancelOrders = async (ids: number[]) => {
    if (!ids.length) return;
    if (!window.confirm(`Hủy ${ids.length} đơn đã chọn? Các đơn sẽ bị loại khỏi Sản Xuất, Giao Hàng và Nhận Tiền.`)) return;
    const reason = window.prompt("Nhập lý do hủy cho các đơn đã chọn:", "Khách yêu cầu hủy")?.trim();
    if (!reason) return;
    let done = 0;
    for (const id of ids) {
      try {
        const updated = await callApi(`/api/orders/${id}`, "PATCH", {
          stage: "canceled",
          canceledAt: new Date().toISOString(),
          cancelReason: reason,
        });
        applyUpdate(id, updated);
        done += 1;
      } catch {
        // bỏ qua đơn lỗi, tiếp tục xử lý các đơn còn lại
      }
    }
    setSelectedOrderIds(new Set());
    notify(`Đã hủy ${done}/${ids.length} đơn đã chọn`);
  };

  const bulkPrintOrders = (ids: number[]) => {
    const selected = orders.filter((order) => ids.includes(order.id));
    if (selected.length) exportOrdersPdf(selected);
  };

  const bulkExportHandover = (ids: number[]) => {
    const selected = orders.filter((order) => ids.includes(order.id));
    if (selected.length) exportHandoverSheet(selected);
  };

  const logout = async () => {
    if (!window.confirm("Đăng xuất khỏi LướiFlow?")) return;
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
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
          <button className={activeSection === "finance" ? "parent-tab active" : "parent-tab"} onClick={() => { setActiveSection("finance"); setSearch(""); }}><span>₫</span> Thu Chi</button>
        </nav>
        <div className="user-chip">
          <span>{initials(user)}</span>
          <div><strong>{user.name || user.email}</strong><small>{user.email}</small></div>
          <button type="button" className="link-btn logout-btn" onClick={logout} disabled={loggingOut}>{loggingOut ? "..." : "Đăng xuất"}</button>
        </div>
      </header>

      {activeSection === "sales" && <nav className="sales-tabs" aria-label="Các tab quản lý bán hàng">
        <div>{tabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? "tab active" : "tab"} onClick={() => switchTab(tab.key)}>
            <span className="tab-short">{tab.short}</span><span>{tab.label}</span><em>{counts[tab.key]}</em>
          </button>
        ))}</div>
      </nav>}

      <section className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{activeSection === "sales" ? "QUẢN LÝ BÁN HÀNG" : activeSection === "customers" ? "QUẢN LÝ KHÁCH HÀNG" : "THỐNG KÊ TÀI CHÍNH"}</p>
            <h1>{activeSection === "sales" ? tabs.find((tab) => tab.key === activeTab)?.label : activeSection === "customers" ? "Khách Hàng" : "Thu Chi"}</h1>
            <p>{activeSection === "sales" ? subtitle(activeTab) : activeSection === "customers" ? "Mỗi số điện thoại là một khách hàng; xem đầy đủ đơn hiện tại và quá khứ." : "Theo dõi thực thu và hiệu quả thu tiền theo khoảng thời gian."}</p>
          </div>
          {activeSection === "sales" && activeTab === "orders" && (
            <button className="primary" onClick={() => { setEditingId(null); setModal("order"); }}>
              <span>＋</span> Tạo đơn hàng
            </button>
          )}
          {activeSection === "sales" && activeTab === "production" && (
            <button className="secondary" onClick={() => exportOrdersExcel(visibleOrders)}>Xuất Excel</button>
          )}
        </div>

        {activeSection === "finance" ? <FinanceView orders={orders} /> : <>{activeSection === "sales" ? <div className="summary-row">
          <Summary label="Tổng đơn" value={orders.length} tone="ink" />
          <Summary label="Đang sản xuất" value={counts.production} tone="amber" />
          <Summary label="Chưa giao" value={orders.filter((o) => (o.stage === "delivery" || o.stage === "payment") && o.deliveryStatus === "Chưa giao").length} tone="blue" />
          <Summary label="Chờ nhận tiền" value={orders.filter((o) => o.stage === "payment" && o.paymentStatus === "Chưa nhận tiền").length} tone="green" />
        </div> : <div className="customer-summary"><div><span>Khách hàng</span><strong>{customers.length}</strong></div><p>Nhận diện bằng số điện thoại · Lịch sử đơn được giữ xuyên suốt</p></div>}

        <section className="data-card">
          <div className="table-tools">
            <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn, khách hàng, số điện thoại..." /></div>
            <div className="sync-note"><span>●</span> {activeSection === "sales" ? "Dữ liệu đồng bộ từ Đơn Hàng" : "Khách hàng được nhóm theo số điện thoại"}</div>
          </div>

          {activeSection === "sales" && (
            <div className="range-bar">
              <div className="range-filter">
                <label>Từ ngày tạo<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
                <label>Đến ngày tạo<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
                {(dateFrom || dateTo) && <button type="button" className="link-btn" onClick={() => { setDateFrom(""); setDateTo(""); }}>Bỏ lọc ngày</button>}
              </div>
              <div className="range-total"><span>{visibleOrders.length} đơn</span><strong>{money(rangeTotal)}</strong></div>
            </div>
          )}

          {activeSection === "sales" && activeTab === "orders" && selectedOrderIds.size > 0 && (
            <div className="bulk-bar">
              <span>{selectedOrderIds.size} đơn được chọn</span>
              <div>
                <button className="danger-link" onClick={() => bulkCancelOrders([...selectedOrderIds])}>Hủy các đơn đã chọn</button>
                <button className="link-btn" onClick={() => setSelectedOrderIds(new Set())}>Bỏ chọn</button>
              </div>
            </div>
          )}

          {activeSection === "sales" && activeTab === "production" && selectedOrderIds.size > 0 && (
            <div className="bulk-bar">
              <span>{selectedOrderIds.size} đơn được chọn</span>
              <div>
                <button className="secondary compact" onClick={() => bulkPrintOrders([...selectedOrderIds])}>In các phiếu đã chọn</button>
                <button className="compact-primary" onClick={() => bulkExportHandover([...selectedOrderIds])}>Xuất phiếu bàn giao</button>
                <button className="link-btn" onClick={() => setSelectedOrderIds(new Set())}>Bỏ chọn</button>
              </div>
            </div>
          )}

          {activeSection === "customers" ? <CustomersView customers={customers.filter((customer) => !search.trim() || `${customer.name} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()))} selectedPhone={selectedCustomerPhone} onSelect={setSelectedCustomerPhone} onEditOrder={openEdit} onEditCustomer={(phone) => { setSelectedCustomerPhone(phone); setModal("customer"); }} /> : <>
            {activeTab === "orders" && <OrdersTable orders={visibleOrders} onEdit={openEdit} onCancel={cancelOrder} onView={openDetail} selectedIds={selectedOrderIds} onToggle={toggleSelectOrder} onToggleAll={toggleSelectAllOrders} />}
            {activeTab === "production" && <ProductionTable orders={visibleOrders} onEditWorkers={(id) => { setEditingId(id); setModal("workers"); }} onMove={moveToDelivery} onView={openDetail} selectedIds={selectedOrderIds} onToggle={toggleSelectOrder} onToggleAll={toggleSelectAllOrders} />}
            {activeTab === "delivery" && <DeliveryTable orders={visibleOrders} onToggle={toggleDelivered} onView={openDetail} />}
            {activeTab === "payment" && <PaymentTable orders={visibleOrders} onPaid={togglePaid} onEdit={openEdit} onView={openDetail} />}
            {activeTab === "canceled" && <CanceledTable orders={visibleOrders} onView={openDetail} />}
          </>}
        </section>
        </>}
      </section>

      {modal === "detail" && currentOrder && (
        <OrderDetailModal order={currentOrder} onClose={() => setModal(null)} />
      )}
      {modal === "order" && (
        <OrderModal
          order={currentOrder}
          onLookupCustomer={async (phone) => {
            try {
              const res = await fetch(`/api/customers/${encodeURIComponent(phone)}`);
              if (!res.ok) return null;
              const data = (await res.json()) as { customer?: Customer };
              return data.customer ?? null;
            } catch {
              return null;
            }
          }}
          onClose={() => setModal(null)}
          onSave={async (fields) => {
            try {
              if (currentOrder) {
                const updated = await callApi(`/api/orders/${currentOrder.id}`, "PATCH", fields);
                applyUpdate(currentOrder.id, updated);
                notify("Đã cập nhật đơn và đồng bộ các tab");
              } else {
                const res = await fetch("/api/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(fields),
                });
                const data = (await res.json()) as { order?: Order; customer?: Customer; error?: string };
                if (!res.ok || !data.order) throw new Error(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
                setOrders((items) => [data.order as Order, ...items]);
                if (data.customer) {
                  setCustomerRecords((items) => (items.some((c) => c.phone === data.customer!.phone) ? items : [data.customer as Customer, ...items]));
                }
                notify("Đã tạo đơn và chuyển vào Sản Xuất");
              }
              setModal(null);
            } catch (error) {
              notify(error instanceof Error ? error.message : "Có lỗi xảy ra");
            }
          }}
        />
      )}
      {modal === "workers" && currentOrder && (
        <WorkersModal
          order={currentOrder}
          onClose={() => setModal(null)}
          onSave={async (workers) => {
            try {
              const updated = await callApi(`/api/orders/${currentOrder.id}`, "PATCH", { workers });
              applyUpdate(currentOrder.id, updated);
              setModal(null);
              notify("Đã cập nhật người tham gia");
            } catch (error) {
              notify(error instanceof Error ? error.message : "Có lỗi xảy ra");
            }
          }}
        />
      )}
      {modal === "customer" && selectedCustomerPhone && (
        <CustomerEditModal
          customer={customerMap.get(selectedCustomerPhone) || { phone: selectedCustomerPhone, name: "", address: "" }}
          onClose={() => setModal(null)}
          onSave={async (fields) => {
            try {
              const res = await fetch(`/api/customers/${encodeURIComponent(selectedCustomerPhone)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fields),
              });
              const data = (await res.json()) as { customer?: Customer; error?: string };
              if (!res.ok || !data.customer) throw new Error(data.error || "Có lỗi xảy ra");
              const saved = data.customer;
              setCustomerRecords((items) => [saved, ...items.filter((c) => c.phone !== saved.phone)]);
              setModal(null);
              notify("Đã cập nhật thông tin khách hàng");
            } catch (error) {
              notify(error instanceof Error ? error.message : "Có lỗi xảy ra");
            }
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
  if (tab === "payment") return "Đối soát Thành tiền và Thực thu được đồng bộ từ đơn hàng gốc.";
  return "Các đơn đã hủy và lý do hủy trong toàn bộ quy trình.";
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`summary ${tone}`}><span>{label}</span><strong>{String(value).padStart(2, "0")}</strong></div>;
}

function Empty() {
  return <div className="empty"><span>✓</span><strong>Không có đơn phù hợp</strong><p>Danh sách sẽ tự cập nhật khi trạng thái đơn thay đổi.</p></div>;
}

// Đơn có nhiều loại lưới → mỗi loại in trên 1 trang riêng, trang nào cũng giữ
// nguyên thông tin chung của đơn (mã đơn, ghi chú) — không gộp chung 1 trang nữa.
function orderSheetHtml(order: Order) {
  const items = allNetItems(order);
  return items
    .map((item) => {
      const parsed = splitNet(item.netInfo);
      return `<section class="sheet">
    <h1>PHIẾU ĐƠN HÀNG</h1>
    <p class="printed-at">Ngày in: ${formatDateTime(new Date().toISOString())}</p>
    <table>
      <tr><th>Mã đơn</th><td>${order.code}</td></tr>
      <tr><th>Ruột lưới</th><td>${parsed[0]}</td></tr>
      <tr><th>Màn</th><td>${parsed[1]}</td></tr>
      <tr><th>Phao</th><td>${parsed[2]}</td></tr>
      <tr><th>Chì</th><td>${parsed[3]}</td></tr>
      <tr><th>Số lượng</th><td>${item.quantity}</td></tr>
      <tr><th>Ghi chú</th><td>${order.note || "—"}</td></tr>
    </table>
  </section>`;
    })
    .join("");
}

// Xuất một hoặc nhiều phiếu cùng lúc — mỗi phiếu là một trang in riêng, khổ A7.
function exportOrdersPdf(selectedOrders: Order[]) {
  if (!selectedOrders.length) return;
  const printWindow = window.open("", "_blank", "width=500,height=700");
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
    <title>Phiếu đơn hàng</title>
    <style>
      @page { size: 74mm 105mm; margin: 3mm; }
      body { font-family: Arial, sans-serif; padding: 4px; color: #1a1a1a; }
      .sheet { page-break-after: always; }
      .sheet:last-child { page-break-after: auto; }
      h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
      .printed-at { margin: 0 0 8px; color: #555; font-size: 10px; text-align: center; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #ccc; padding: 5px 7px; text-align: left; }
      th { width: 38%; background: #f5f5f5; font-size: 11px; }
      td { font-size: 17px; font-weight: 600; }
    </style>
  </head><body>${selectedOrders.map(orderSheetHtml).join("")}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function exportOrderPdf(order: Order) {
  exportOrdersPdf([order]);
}

// Phiếu bàn giao: 1 trang duy nhất tổng hợp tất cả đơn đã chọn — khác phiếu đơn hàng ở trên.
function exportHandoverSheet(selectedOrders: Order[]) {
  if (!selectedOrders.length) return;
  const printWindow = window.open("", "_blank", "width=1000,height=700");
  if (!printWindow) return;
  const totalQuantity = selectedOrders.reduce((sum, order) => sum + allNetItems(order).reduce((s, item) => s + item.quantity, 0), 0);
  const rows = selectedOrders
    .map((order, index) => {
      const netText = allNetItems(order).map((item) => `${item.netInfo} <em>(SL ${item.quantity})</em>`).join("<br/>");
      const quantity = allNetItems(order).reduce((sum, item) => sum + item.quantity, 0);
      return `<tr><td>${index + 1}</td><td>${order.code}</td><td><strong>${order.phone}</strong><br/><small>${order.customer}</small></td><td>${netText}</td><td>${quantity}</td><td>${order.note || "—"}</td></tr>`;
    })
    .join("");
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
    <title>Phiếu bàn giao</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; }
      h1 { margin: 0 0 4px; font-size: 22px; }
      .meta { margin: 0 0 18px; color: #555; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #ccc; padding: 8px 10px; text-align: left; font-size: 12px; }
      th { background: #f5f5f5; }
      em { color: #666; font-style: normal; font-size: 11px; }
    </style>
  </head><body>
    <h1>PHIẾU BÀN GIAO</h1>
    <p class="meta">Ngày in: ${formatDateTime(new Date().toISOString())} · Tổng số đơn: ${selectedOrders.length} · Tổng số lượng: ${totalQuantity}</p>
    <table><thead><tr><th>STT</th><th>Mã đơn</th><th>Khách hàng</th><th>Thông tin lưới</th><th>Số lượng</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function csvEscape(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Xuất CSV (mở trực tiếp bằng Excel) — không dùng thư viện xlsx vì bản trên npm
// đang dính lỗ hổng bảo mật chưa vá; CSV không cần thư viện ngoài mà vẫn mở tốt trong Excel.
function exportOrdersExcel(selectedOrders: Order[]) {
  if (!selectedOrders.length) return;
  const headers = ["Mã đơn", "Ngày tạo", "Khách hàng", "SĐT", "Địa chỉ", "Thông tin lưới", "Tổng SL", "Thành tiền", "Thực thu", "Trạng thái", "Trạng thái giao hàng", "Trạng thái thanh toán", "Ngày nhận tiền", "Lượm lưới", "Dập chì", "Cột phao", "Ghi chú", "Lý do hủy"];
  const rows = selectedOrders.map((order) => {
    const items = allNetItems(order);
    const netText = items.map((item) => `${item.netInfo} (SL ${item.quantity} × ${money(item.unitPrice)})`).join(" | ");
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return [
      order.code,
      formatDateTime(order.createdAt),
      order.customer,
      order.phone,
      order.address,
      netText,
      String(totalQuantity),
      String(order.total),
      order.actual === null ? "" : String(order.actual),
      stageLabel(order.stage),
      order.deliveryStatus,
      order.paymentStatus,
      order.paymentDate ? formatDateTime(order.paymentDate) : "",
      order.workers.gather,
      order.workers.lead,
      order.workers.float,
      order.note,
      order.cancelReason || "",
    ];
  });
  // BOM (﻿) để Excel nhận đúng bảng mã UTF-8, không lỗi font tiếng Việt.
  const csv = "﻿" + [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `don-hang-san-xuat-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Cột "Khách hàng" dùng chung — SĐT hiển thị to/đậm vì đó là thứ cần tra cứu nhanh, tên nhỏ bên dưới.
function CustomerCell({ name, phone }: { name: string; phone: string }) {
  return <td><strong className="phone-primary">{phone}</strong><small>{name}</small></td>;
}

// Ô "Thông tin lưới" dùng chung — gộp loại lưới #1 và các extraItems, mỗi loại 1 dòng khi có nhiều loại.
function NetCell({ order }: { order: Order }) {
  const items = allNetItems(order);
  if (items.length === 1) return <td className="net-cell">{items[0].netInfo}</td>;
  return <td className="net-cell net-cell-multi">{items.map((item, i) => <div key={i} className="net-line">{item.netInfo} <em>× {item.quantity}</em></div>)}</td>;
}

// Ô "Số lượng" dùng chung — tổng SL mọi loại lưới của đơn.
function QuantityCell({ order }: { order: Order }) {
  const total = allNetItems(order).reduce((sum, item) => sum + item.quantity, 0);
  return <td className="num quantity">{total}</td>;
}

// Ô "Đơn giá" dùng chung — mỗi loại lưới xếp 1 dòng khớp với NetCell khi đơn có nhiều loại.
function UnitPriceCell({ order }: { order: Order }) {
  const items = allNetItems(order);
  if (items.length === 1) return <td className="num money">{money(items[0].unitPrice)}</td>;
  return <td className="num money"><div className="net-cell-multi">{items.map((item, i) => <div key={i}>{money(item.unitPrice)}</div>)}</div></td>;
}

// Mã đơn bấm được ở mọi tab — mở modal xem đầy đủ thông tin đơn.
function OrderCodeCell({ order, onView, extra }: { order: Order; onView: (id: number) => void; extra?: ReactNode }) {
  return <td><button type="button" className="code-link" onClick={() => onView(order.id)}>{order.code}</button><small>{formatDateTime(order.createdAt)}</small>{extra}</td>;
}

function OrdersTable({ orders, onEdit, onCancel, onView, selectedIds, onToggle, onToggleAll }: { orders: Order[]; onEdit: (id: number) => void; onCancel: (id: number) => void; onView: (id: number) => void; selectedIds: Set<number>; onToggle: (id: number) => void; onToggleAll: (ids: number[]) => void }) {
  if (!orders.length) return <Empty />;
  const ids = orders.map((order) => order.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  return <div className="table-wrap"><table><thead><tr><th className="select-col"><input type="checkbox" checked={allSelected} onChange={() => onToggleAll(ids)} aria-label="Chọn tất cả" /></th><th>Mã đơn</th><th>Khách hàng</th><th>Thông tin lưới</th><th className="num">Đơn giá</th><th>Ghi chú</th><th className="num">Số lượng</th><th className="num">Thành tiền</th><th className="num">Thực thu</th><th>Vị trí</th><th></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id} className={selectedIds.has(order.id) ? "row-selected" : undefined}>
      <td className="select-col"><input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => onToggle(order.id)} aria-label={`Chọn đơn ${order.code}`} /></td>
      <OrderCodeCell order={order} onView={onView} />
      <CustomerCell name={order.customer} phone={order.phone} />
      <NetCell order={order} /><UnitPriceCell order={order} /><td className="note-cell">{order.note || "—"}</td><QuantityCell order={order} />
      <td className="num money">{money(order.total)}</td><td className={`num money ${order.actual === null ? "muted" : "actual"}`}>{money(order.actual)}</td>
      <td><StageBadge stage={order.stage} /></td><td><div className="row-actions"><button className="link-btn" onClick={() => onEdit(order.id)}>Sửa</button><button className="danger-link" onClick={() => onCancel(order.id)}>Hủy</button></div></td>
    </tr>)}
  </tbody></table></div>;
}

function ProductionTable({ orders, onEditWorkers, onMove, onView, selectedIds, onToggle, onToggleAll }: { orders: Order[]; onEditWorkers: (id: number) => void; onMove: (id: number) => void; onView: (id: number) => void; selectedIds: Set<number>; onToggle: (id: number) => void; onToggleAll: (ids: number[]) => void }) {
  if (!orders.length) return <Empty />;
  const ids = orders.map((order) => order.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  return <div className="table-wrap"><table><thead><tr><th className="select-col"><input type="checkbox" checked={allSelected} onChange={() => onToggleAll(ids)} aria-label="Chọn tất cả" /></th><th>Mã đơn</th><th>Thông tin lưới</th><th className="num">SL</th><th>Lượm lưới</th><th>Dập chì</th><th>Cột phao</th><th></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id} className={selectedIds.has(order.id) ? "row-selected" : undefined}>
      <td className="select-col"><input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => onToggle(order.id)} aria-label={`Chọn đơn ${order.code}`} /></td>
      <OrderCodeCell order={order} onView={onView} extra={<small>{order.phone}</small>} /><NetCell order={order} /><QuantityCell order={order} />
      <td><Worker value={order.workers.gather} /></td><td><Worker value={order.workers.lead} /></td><td><Worker value={order.workers.float} /></td>
      <td><div className="row-actions"><button className="link-btn" onClick={() => onEditWorkers(order.id)}>Cập nhật</button><button className="link-btn" onClick={() => exportOrderPdf(order)}>Xuất phiếu</button><button className="compact-primary" onClick={() => onMove(order.id)}>Chuyển giao →</button></div></td>
    </tr>)}
  </tbody></table></div>;
}

function DeliveryTable({ orders, onToggle, onView }: { orders: Order[]; onToggle: (id: number) => void; onView: (id: number) => void }) {
  if (!orders.length) return <Empty />;
  return <div className="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Địa chỉ</th><th className="num">Số lượng</th><th className="num">Thành tiền</th><th>Trạng thái</th><th></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}><OrderCodeCell order={order} onView={onView} /><CustomerCell name={order.customer} phone={order.phone} /><td>{order.address}</td><QuantityCell order={order} /><td className="num money">{money(order.total)}</td><td><span className={order.deliveryStatus === "Đã giao" ? "badge delivered" : "badge waiting"}>{order.deliveryStatus}</span></td><td><button className={order.deliveryStatus === "Đã giao" ? "secondary compact" : "compact-primary"} onClick={() => onToggle(order.id)}>{order.deliveryStatus === "Đã giao" ? "Chuyển về Chưa giao" : "Đánh dấu đã giao"}</button></td></tr>)}
  </tbody></table></div>;
}

function PaymentTable({ orders, onPaid, onEdit, onView }: { orders: Order[]; onPaid: (id: number) => void; onEdit: (id: number) => void; onView: (id: number) => void }) {
  if (!orders.length) return <Empty />;
  return <div className="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th className="num">Thành tiền</th><th className="num">Thực thu</th><th>Chênh lệch</th><th>Nhận tiền</th><th></th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}><OrderCodeCell order={order} onView={onView} /><CustomerCell name={order.customer} phone={order.phone} /><td className="num money total-highlight">{money(order.total)}</td><td className={`num money ${order.actual === null ? "muted" : "actual-highlight"}`}>{money(order.actual)}</td><td className="money difference">{order.actual === null ? "—" : money(order.total - order.actual)}</td><td><span className={order.paymentStatus === "Đã nhận tiền" ? "badge paid" : "badge unpaid"}>{order.paymentStatus}</span>{order.paymentDate && <small>{formatDateTime(order.paymentDate)}</small>}</td><td><div className="row-actions">{order.actual === null && <button className="link-btn" onClick={() => onEdit(order.id)}>Nhập thực thu</button>}<button className="compact-primary" onClick={() => onPaid(order.id)}>{order.paymentStatus === "Đã nhận tiền" ? "Hoàn tác" : "Đã nhận tiền"}</button></div></td></tr>)}
  </tbody></table></div>;
}

function CanceledTable({ orders, onView }: { orders: Order[]; onView: (id: number) => void }) {
  if (!orders.length) return <Empty />;
  return <div className="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Thông tin lưới</th><th className="num">Số lượng</th><th className="num">Thành tiền</th><th>Lý do hủy</th><th>Thời gian hủy</th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}><OrderCodeCell order={order} onView={onView} /><CustomerCell name={order.customer} phone={order.phone} /><NetCell order={order} /><QuantityCell order={order} /><td className="num money">{money(order.total)}</td><td className="cancel-reason">{order.cancelReason || "Không có lý do"}</td><td><span className="badge canceled">Đã hủy</span>{order.canceledAt && <small>{formatDateTime(order.canceledAt)}</small>}</td></tr>)}
  </tbody></table></div>;
}

function FinanceView({ orders }: { orders: Order[] }) {
  const [from, setFrom] = useState("2026-07-01");
  const [to, setTo] = useState("2026-08-09");
  const fromTime = new Date(`${from}T00:00:00`).getTime();
  const toTime = new Date(`${to}T23:59:59`).getTime();
  const paid = orders.filter((order) => order.stage !== "canceled" && order.paymentStatus === "Đã nhận tiền" && order.paymentDate && new Date(order.paymentDate).getTime() >= fromTime && new Date(order.paymentDate).getTime() <= toTime).sort((a, b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
  const unpaid = orders.filter((order) => order.stage === "payment" && order.paymentStatus === "Chưa nhận tiền");
  const billed = paid.reduce((sum, order) => sum + order.total, 0);
  const actual = paid.reduce((sum, order) => sum + (order.actual || 0), 0);
  const costs = billed - actual;
  const pending = unpaid.reduce((sum, order) => sum + order.total, 0);
  return <section className="finance-view">
    <div className="finance-filter"><div><label>Từ ngày<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><span>→</span><label>Đến ngày<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div><p>Thống kê theo ngày xác nhận `Đã nhận tiền`</p></div>
    <div className="finance-metrics">
      <div className="finance-card main"><span>Tổng thực thu</span><strong>{money(actual)}</strong><small>{paid.length} đơn đã thu tiền</small></div>
      <div className="finance-card"><span>Tổng thành tiền</span><strong>{money(billed)}</strong><small>Giá trị trước chi phí</small></div>
      <div className="finance-card"><span>Chi phí / chênh lệch</span><strong>{money(costs)}</strong><small>{billed ? `${((costs / billed) * 100).toFixed(1)}% tổng thành tiền` : "Chưa có dữ liệu"}</small></div>
      <div className="finance-card"><span>Trung bình thực thu</span><strong>{money(paid.length ? Math.round(actual / paid.length) : 0)}</strong><small>Trên mỗi đơn đã thu</small></div>
      <div className="finance-card pending"><span>Đang chờ thu</span><strong>{money(pending)}</strong><small>{unpaid.length} đơn chưa nhận tiền</small></div>
      <div className="finance-card"><span>Tỷ lệ thực thu</span><strong>{billed ? `${((actual / billed) * 100).toFixed(1)}%` : "0%"}</strong><small>Thực thu / thành tiền</small></div>
    </div>
    <div className="data-card finance-table"><div className="finance-table-head"><div><strong>Chi tiết khoản thu</strong><span>{formatShortDate(from)} – {formatShortDate(to)}</span></div><em>{paid.length} giao dịch</em></div>
      {paid.length ? <div className="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày nhận tiền</th><th className="num">Thành tiền</th><th className="num">Thực thu</th><th className="num">Chênh lệch</th></tr></thead><tbody>{paid.map((order) => <tr key={order.id}><td><strong>{order.code}</strong><small>{formatDateTime(order.createdAt)}</small></td><CustomerCell name={order.customer} phone={order.phone} /><td>{order.paymentDate ? formatDateTime(order.paymentDate) : "—"}</td><td className="num money">{money(order.total)}</td><td className="num money actual">{money(order.actual)}</td><td className="num money difference">{money(order.total - (order.actual || 0))}</td></tr>)}</tbody></table></div> : <Empty />}
    </div>
  </section>;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`));
}

function CustomersView({ customers, selectedPhone, onSelect, onEditOrder, onEditCustomer }: { customers: { phone: string; name: string; address: string; orders: Order[] }[]; selectedPhone: string | null; onSelect: (phone: string) => void; onEditOrder: (id: number) => void; onEditCustomer: (phone: string) => void }) {
  if (!customers.length) return <Empty />;
  const selected = customers.find((customer) => customer.phone === selectedPhone) || customers[0];
  const historicalOrders = [...selected.orders].sort((a, b) => b.id - a.id);
  return <div className="customer-layout">
    <aside className="customer-list">
      {customers.map((customer) => <button key={customer.phone} className={customer.phone === selected.phone ? "customer-item active" : "customer-item"} onClick={() => onSelect(customer.phone)}>
        <span className="customer-avatar">{customer.name.split(" ").slice(-2).map((part) => part[0]).join("")}</span>
        <span><strong className="phone-primary">{customer.phone}</strong><small>{customer.name}</small></span><em>{customer.orders.length} đơn</em>
      </button>)}
    </aside>
    <section className="customer-detail">
      <div className="customer-detail-head"><div><p className="eyebrow">LỊCH SỬ KHÁCH HÀNG</p><h2>{selected.phone}</h2><p>{selected.name} · {selected.address}</p><button type="button" className="link-btn customer-edit-btn" onClick={() => onEditCustomer(selected.phone)}>✎ Sửa thông tin khách hàng</button></div><div><span>Tổng số đơn</span><strong>{selected.orders.length}</strong></div></div>
      <div className="history-list">{historicalOrders.map((order) => <article key={order.id} className="history-order">
        <div><button type="button" className="code-link" onClick={() => onEditOrder(order.id)}>{order.code}</button><small>{formatDateTime(order.createdAt)}</small></div>
        <p>{allNetItems(order).map((item) => item.netInfo).join(" · ")}</p><span className="history-quantity">{allNetItems(order).reduce((sum, item) => sum + item.quantity, 0)} lưới</span><strong className="history-money">{money(order.total)}</strong><StageBadge stage={order.stage} /><button className="link-btn" onClick={() => onEditOrder(order.id)}>Xem đơn</button>
      </article>)}</div>
    </section>
  </div>;
}

function stageLabel(stage: Stage) {
  return stage === "production" ? "Sản xuất" : stage === "delivery" ? "Đang giao" : stage === "payment" ? "Nhận tiền" : "Đã hủy";
}

function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`badge ${stage}`}>{stageLabel(stage)}</span>;
}

function Worker({ value }: { value: string }) {
  return value ? <span className="worker">{value}</span> : <span className="worker empty-worker">Chưa có</span>;
}

function OrderModal({ order, onClose, onSave, onLookupCustomer }: { order?: Order; onClose: () => void; onSave: (fields: OrderFormFields) => Promise<void>; onLookupCustomer: (phone: string) => Promise<Customer | null> }) {
  const [submitting, setSubmitting] = useState(false);
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
  const [lookingUp, setLookingUp] = useState(false);
  // Các loại lưới #2, #3... của đơn — mỗi loại có SL + đơn giá riêng, thành tiền vẫn chung cho cả đơn.
  const [extraItems, setExtraItems] = useState(
    (order?.extraItems || []).map((item) => ({ netInfo: item.netInfo, quantity: String(item.quantity), unitPrice: String(item.unitPrice) })),
  );
  const parsed = splitNet(form.netInfo);

  const autoTotal = (quantity: string, unitPrice: string, items: typeof extraItems) =>
    String(
      Number(quantity) * Number(unitPrice) +
        items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0),
    ) || "";

  const update = (key: keyof typeof form, value: string) => {
    const next = { ...form, [key]: value };
    if (!manualTotal && (key === "quantity" || key === "unitPrice")) next.total = autoTotal(next.quantity, next.unitPrice, extraItems);
    setForm(next);
  };

  const addExtraItem = () => setExtraItems((items) => [...items, { netInfo: "", quantity: "1", unitPrice: "" }]);
  const removeExtraItem = (index: number) => setExtraItems((items) => {
    const next = items.filter((_, i) => i !== index);
    if (!manualTotal) setForm((prev) => ({ ...prev, total: autoTotal(prev.quantity, prev.unitPrice, next) }));
    return next;
  });
  const updateExtraItem = (index: number, key: "netInfo" | "quantity" | "unitPrice", value: string) => setExtraItems((items) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    if (!manualTotal) setForm((prev) => ({ ...prev, total: autoTotal(prev.quantity, prev.unitPrice, next) }));
    return next;
  });

  // Tạo đơn mới: nhập số điện thoại trước, tự động điền tên + địa chỉ nếu đã
  // là khách quen — không đè lên nội dung người dùng đã tự gõ.
  useEffect(() => {
    if (order) return;
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 9) return;
    const phone = form.phone;
    const hintTimer = window.setTimeout(() => setLookingUp(true), 0);
    const timer = window.setTimeout(async () => {
      const found = await onLookupCustomer(phone);
      setLookingUp(false);
      if (!found) return;
      setForm((prev) => (prev.phone !== phone ? prev : {
        ...prev,
        customer: prev.customer || found.name,
        address: prev.address || found.address,
      }));
    }, 400);
    return () => { window.clearTimeout(hintTimer); window.clearTimeout(timer); setLookingUp(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone, order]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return; // tránh bấm nhiều lần tạo trùng đơn khi đang chờ lưu
    setSubmitting(true);
    try {
      await onSave({
        customer: form.customer,
        phone: form.phone,
        address: form.address,
        netInfo: form.netInfo,
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
        total: Number(form.total),
        actual: form.actual ? Number(form.actual) : null,
        note: form.note,
        extraItems: extraItems
          .filter((item) => item.netInfo.trim())
          .map((item) => ({ netInfo: item.netInfo.trim(), quantity: Number(item.quantity) || 1, unitPrice: Number(item.unitPrice) || 0 })),
      });
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">ĐƠN HÀNG GỐC</p><h2>{order ? `Sửa đơn ${order.code}` : "Tạo đơn hàng mới"}</h2></div><button type="button" className="close" onClick={onClose}>×</button></div>
    <div className="form-grid">
      <label>Số điện thoại<input required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Nhập số điện thoại trước để tự điền khách quen" /></label>
      <label>Khách hàng{lookingUp && <em className="lookup-hint"> đang tìm khách hàng…</em>}<input required value={form.customer} onChange={(e) => update("customer", e.target.value)} /></label>
      <label className="wide">Địa chỉ<input value={form.address} onChange={(e) => update("address", e.target.value)} /></label>
    </div>
    {/* Mỗi loại lưới là 1 khối giống hệt nhau về bố cục (thông tin lưới + phân tách + SL/đơn giá),
        xếp song song/nối tiếp nhau theo chiều dọc — loại lưới #1 bắt buộc, các loại sau tuỳ chọn. */}
    <div className="net-items">
      <div className="net-item-block">
        <p className="eyebrow">LOẠI LƯỚI 1</p>
        <label className="wide">Thông tin lưới<textarea required value={form.netInfo} onChange={(e) => update("netInfo", e.target.value)} placeholder="Ruột lưới, màn, phao, chì" /></label>
        <div className="parsed-grid">{["Ruột lưới", "Màn", "Phao", "Chì"].map((label, i) => <div key={label}><span>{label}</span><strong>{parsed[i]}</strong></div>)}</div>
        <div className="net-item-money">
          <label>Số lượng<input type="number" min="1" required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></label>
          <label>Đơn giá<input inputMode="numeric" required value={formatMoneyInput(form.unitPrice)} onChange={(e) => update("unitPrice", digitsOnly(e.target.value))} /></label>
        </div>
      </div>
      {extraItems.map((item, index) => {
        const itemParsed = splitNet(item.netInfo);
        return <div key={index} className="net-item-block">
          <p className="eyebrow">LOẠI LƯỚI {index + 2}<button type="button" className="danger-link" onClick={() => removeExtraItem(index)}>Xoá</button></p>
          <label className="wide">Thông tin lưới<textarea value={item.netInfo} onChange={(e) => updateExtraItem(index, "netInfo", e.target.value)} placeholder="Ruột lưới, màn, phao, chì" /></label>
          <div className="parsed-grid">{["Ruột lưới", "Màn", "Phao", "Chì"].map((label, i) => <div key={label}><span>{label}</span><strong>{itemParsed[i]}</strong></div>)}</div>
          <div className="net-item-money">
            <label>Số lượng<input type="number" min="1" value={item.quantity} onChange={(e) => updateExtraItem(index, "quantity", e.target.value)} /></label>
            <label>Đơn giá<input inputMode="numeric" value={formatMoneyInput(item.unitPrice)} onChange={(e) => updateExtraItem(index, "unitPrice", digitsOnly(e.target.value))} /></label>
          </div>
        </div>;
      })}
      <button type="button" className="link-btn" onClick={addExtraItem}>+ Thêm loại lưới</button>
    </div>
    <div className="form-grid money-grid">
      <label>Thành tiền<input inputMode="numeric" required value={formatMoneyInput(form.total)} onChange={(e) => { setManualTotal(true); update("total", digitsOnly(e.target.value)); }} /></label>
      <label>Thực thu<input inputMode="numeric" value={formatMoneyInput(form.actual)} onChange={(e) => update("actual", digitsOnly(e.target.value))} placeholder="Bỏ trống = mặc định 0đ" /></label>
      <label className="wide">Ghi chú<input value={form.note} onChange={(e) => update("note", e.target.value)} /></label>
    </div>
    <div className="modal-footer"><p><span>●</span> Thành tiền và Thực thu sẽ đồng bộ sang Nhận Tiền</p><div><button type="button" className="secondary" onClick={onClose} disabled={submitting}>Hủy</button><button className="primary" disabled={submitting}>{submitting ? "Đang lưu…" : order ? "Lưu thay đổi" : "Tạo đơn"}</button></div></div>
  </form></div>;
}

function WorkersModal({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (workers: Order["workers"]) => void }) {
  const [workers, setWorkers] = useState(order.workers);
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal small-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">SẢN XUẤT · {order.code}</p><h2>Người tham gia công đoạn</h2></div><button className="close" onClick={onClose}>×</button></div><div className="worker-form"><label>Lượm lưới<input value={workers.gather} onChange={(e) => setWorkers({ ...workers, gather: e.target.value })} placeholder="Nhập tên, ngăn cách bằng dấu phẩy" /></label><label>Dập chì<input value={workers.lead} onChange={(e) => setWorkers({ ...workers, lead: e.target.value })} /></label><label>Cột phao<input value={workers.float} onChange={(e) => setWorkers({ ...workers, float: e.target.value })} /></label></div><div className="modal-footer"><p>Mỗi công đoạn chỉ lưu người tham gia.</p><div><button className="secondary" onClick={onClose}>Hủy</button><button className="primary" onClick={() => onSave(workers)}>Lưu người tham gia</button></div></div></div></div>;
}

function CustomerEditModal({ customer, onClose, onSave }: { customer: Customer; onClose: () => void; onSave: (fields: { name: string; address: string }) => void }) {
  const [name, setName] = useState(customer.name);
  const [address, setAddress] = useState(customer.address);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ name, address });
  };
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal small-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">KHÁCH HÀNG · {customer.phone}</p><h2>Sửa thông tin khách hàng</h2></div><button type="button" className="close" onClick={onClose}>×</button></div>
    <div className="form-grid"><label className="wide">Tên khách hàng<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label className="wide">Địa chỉ<input value={address} onChange={(e) => setAddress(e.target.value)} /></label></div>
    <div className="modal-footer"><p><span>●</span> Thông tin mới sẽ ghi đè hồ sơ khách hàng hiện tại</p><div><button type="button" className="secondary" onClick={onClose}>Hủy</button><button className="primary">Lưu thay đổi</button></div></div>
  </form></div>;
}

// Xem đầy đủ thông tin 1 đơn hàng (chỉ đọc) — mở khi bấm vào mã đơn ở bất kỳ tab nào.
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const items = allNetItems(order);
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">CHI TIẾT ĐƠN HÀNG</p><h2>{order.code}</h2></div><button type="button" className="close" onClick={onClose}>×</button></div>
    <div className="detail-grid">
      <div><span>Ngày tạo</span><strong>{formatDateTime(order.createdAt)}</strong></div>
      <div><span>Trạng thái</span><StageBadge stage={order.stage} /></div>
      <div><span>Khách hàng</span><strong className="phone-primary">{order.phone}</strong><small>{order.customer}</small></div>
      <div><span>Địa chỉ</span><strong>{order.address || "—"}</strong></div>
    </div>
    <div className="detail-items">
      {items.map((item, i) => {
        const parsed = splitNet(item.netInfo);
        return <div key={i} className="detail-item">
          <p className="eyebrow">{items.length > 1 ? `LOẠI LƯỚI ${i + 1}` : "THÔNG TIN LƯỚI"}</p>
          <div className="parsed-grid">{["Ruột lưới", "Màn", "Phao", "Chì"].map((label, j) => <div key={label}><span>{label}</span><strong>{parsed[j]}</strong></div>)}</div>
          <div className="detail-item-money"><span>Số lượng: <strong>{item.quantity}</strong></span><span>Đơn giá: <strong>{money(item.unitPrice)}</strong></span></div>
        </div>;
      })}
    </div>
    <div className="detail-grid">
      <div><span>Thành tiền</span><strong>{money(order.total)}</strong></div>
      <div><span>Thực thu</span><strong>{money(order.actual)}</strong></div>
      <div><span>Giao hàng</span><strong>{order.deliveryStatus}</strong></div>
      <div><span>Thanh toán</span><strong>{order.paymentStatus}</strong>{order.paymentDate && <small>{formatDateTime(order.paymentDate)}</small>}</div>
      <div><span>Lượm lưới</span><strong>{order.workers.gather || "—"}</strong></div>
      <div><span>Dập chì</span><strong>{order.workers.lead || "—"}</strong></div>
      <div><span>Cột phao</span><strong>{order.workers.float || "—"}</strong></div>
      <div><span>Ghi chú</span><strong>{order.note || "—"}</strong></div>
      {order.stage === "canceled" && <div><span>Lý do hủy</span><strong>{order.cancelReason || "—"}</strong>{order.canceledAt && <small>{formatDateTime(order.canceledAt)}</small>}</div>}
    </div>
    <div className="modal-footer"><p><span>●</span> Xem đầy đủ thông tin đơn — bấm &quot;Sửa&quot; ở bảng để chỉnh sửa</p><div><button type="button" className="secondary" onClick={onClose}>Đóng</button></div></div>
  </div></div>;
}
