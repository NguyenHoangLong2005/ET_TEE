"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useMemo } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";
import SearchInput from "@/components/shared/SearchInput";
import { 
  X, Check, AlertTriangle, ShieldCheck, FileText, PackagePlus, 
  RefreshCw, CheckCircle2, Eye, Edit3, Ban, Phone, MapPin, 
  User, CreditCard, Clock, Calendar, ShoppingBag, Plus, Trash2
} from "lucide-react";
import { toast } from "sonner";
import PermissionGuard from "@/components/auth/PermissionGuard";
import { usePermissions } from "@/contexts/AuthContext";
import { DataTable, Column } from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

type OrderItem = {
  id?: number;
  productName: string;
  variantInfo?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
};

type OrderNote = { 
  id: number; 
  content: string; 
  createdAt?: string; 
  createdBy?: string;
};

type Order = {
  id: number;
  orderCode: string;
  customerName: string;
  customerEmail?: string;
  phone: string;
  shippingAddress: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  total: number;
  createdAt?: string;
  slaDeadline?: string;
  items?: OrderItem[];
  notes?: OrderNote[];
};

const getId = (order: Order) => order.id;

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PENDING_CONFIRMATION: { label: "Chờ xác nhận", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  PENDING_PAYMENT: { label: "Chờ thanh toán", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  CONFIRMED: { label: "Đã xác nhận", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  PROCESSING: { label: "Đang đóng gói", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  SHIPPED: { label: "Đang giao hàng", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  DELIVERED: { label: "Đã giao thành công", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CANCELLED: { label: "Đã hủy", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  REFUNDED: { label: "Đã hoàn tiền", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
};


export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "sla">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { hasPermission } = usePermissions();
  // Ensure staff can perform actions seamlessly
  const canVerifyOrder = hasPermission ? hasPermission("VERIFY_ORDER") : true;
  const canProcessNote = hasPermission ? hasPermission("PROCESS_ORDER_NOTE") : true;
  const canHoldStock = hasPermission ? hasPermission("REQUEST_STOCK_HOLD") : true;

  // Modals
  const [activeModal, setActiveModal] = useState<"view" | "create" | "verify" | "status" | "cancel" | "reserve" | "note" | null>(null);
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);

  // Form Fields
  const [verifyData, setVerifyData] = useState({ customerName: "", phone: "", shippingAddress: "" });
  const [statusNew, setStatusNew] = useState("");
  const [cancelReasonPreset, setCancelReasonPreset] = useState("Khách yêu cầu hủy");
  const [cancelReason, setCancelReason] = useState("");
  const [reserveData, setReserveData] = useState({ productId: "", quantity: "1" });
  const [noteContent, setNoteContent] = useState("");

  // Create Order Form State
  const [createOrderData, setCreateOrderData] = useState({
    customerName: "",
    phone: "",
    customerEmail: "",
    shippingAddress: "",
    paymentMethod: "COD (Thanh toán khi nhận hàng)",
    note: "",
  });

  const [createItems, setCreateItems] = useState<OrderItem[]>([
    { id: 1, productName: "Áo Thun Cotton Premium ET.TEE", variantInfo: "Size L / Đen", quantity: 1, price: 250000 }
  ]);

  const calculatedCreateTotal = useMemo(() => {
    return createItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  }, [createItems]);

  const openCreateModal = () => {
    setCreateOrderData({
      customerName: "",
      phone: "",
      customerEmail: "",
      shippingAddress: "",
      paymentMethod: "COD (Thanh toán khi nhận hàng)",
      note: "",
    });
    setCreateItems([
      { id: Date.now(), productName: "Áo Thun Cotton Premium ET.TEE", variantInfo: "Size L / Đen", quantity: 1, price: 250000 }
    ]);
    setActiveModal("create");
  };

  const handleAddCreateItem = () => {
    setCreateItems(prev => [
      ...prev,
      { id: Date.now(), productName: "Quần Khaki Slimfit ET.TEE", variantInfo: "Size M / Be", quantity: 1, price: 350000 }
    ]);
  };

  const handleRemoveCreateItem = (index: number) => {
    setCreateItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCreateItem = (index: number, field: keyof OrderItem, value: any) => {
    setCreateItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrderData.customerName.trim() || !createOrderData.phone.trim()) {
      setError("Vui lòng nhập tên khách hàng và số điện thoại.");
      return;
    }
    if (createItems.length === 0) {
      setError("Đơn hàng phải có ít nhất 1 sản phẩm.");
      return;
    }

    const payload = {
      customerName: createOrderData.customerName.trim(),
      customerEmail: createOrderData.customerEmail.trim() || undefined,
      phone: createOrderData.phone.trim(),
      shippingAddress: createOrderData.shippingAddress.trim() || "Thanh toán & nhận tại cửa hàng (POS)",
      paymentMethod: createOrderData.paymentMethod,
      total: calculatedCreateTotal,
      note: createOrderData.note.trim() || undefined,
    };

    try {
      const saved: any = await staffAction("/api/staff/sales/orders", "POST", payload);
      const createdOrder: Order = {
        id: saved?.id ?? Date.now(),
        orderCode: saved?.orderCode ?? "ORD-POS",
        customerName: saved?.customerName ?? payload.customerName,
        customerEmail: saved?.customerEmail ?? payload.customerEmail,
        phone: saved?.customerPhone ?? payload.phone,
        shippingAddress: saved?.shippingAddressSnapshot ?? payload.shippingAddress,
        status: (saved?.status as any) ?? "CONFIRMED",
        paymentStatus: saved?.paymentStatus ?? "Đã thanh toán",
        paymentMethod: saved?.paymentMethod ?? payload.paymentMethod,
        total: saved?.totalAmount ?? calculatedCreateTotal,
        createdAt: saved?.createdAt ?? new Date().toISOString(),
        items: createItems,
        notes: createOrderData.note.trim() ? [
          { id: Date.now(), content: createOrderData.note.trim(), createdAt: new Date().toISOString(), createdBy: "NV Sales (Tạo mới)" }
        ] : []
      };
      setOrders(prev => [createdOrder, ...prev]);
      toast.success(`Đã tạo đơn hàng mới ${createdOrder.orderCode} thành công!`);
      setActiveModal(null);
    } catch (err: any) {
      const msg = errorMessage(err) || "Tạo đơn hàng thất bại";
      setError(msg);
      toast.error(msg);
    }
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (filter === "new") {
      list = list.filter(o => o.status === "PENDING_CONFIRMATION" || o.status === "PENDING_PAYMENT");
    } else if (filter === "sla") {
      list = list.filter(o => Boolean(o.slaDeadline));
    }

    if (!searchQuery.trim()) return list;
    const lowerQ = searchQuery.toLowerCase();
    return list.filter(o => 
      (o.orderCode || "").toLowerCase().includes(lowerQ) ||
      (o.customerName || "").toLowerCase().includes(lowerQ) ||
      (o.phone || "").includes(lowerQ) ||
      (o.id.toString()).includes(lowerQ)
    );
  }, [orders, filter, searchQuery]);

  const load = useCallback(async (mode: "all" | "new" | "sla" = filter, signal?: AbortSignal) => {
    setLoading(true); 
    setError("");
    const endpoint = mode === "sla" ? "/api/staff/sales/sla" : mode === "new" ? "/api/staff/sales/orders/new" : "/api/staff/sales/orders";
    try { 
      const res = await staffList<Order>(endpoint, signal); 
      if (Array.isArray(res)) {
        setOrders(res);
      } else {
        setOrders([]);
      }
    }
    catch (cause) { 
      if (!signal?.aborted) setOrders([]); 
    }
    finally { 
      if (!signal?.aborted) setLoading(false); 
    }
  }, [filter]);

  useEffect(() => {
    const controller = new AbortController(); 
    void load(filter, controller.signal);
    return () => controller.abort();
  }, [filter, load]);

  const updateLocalOrder = (orderId: number, updater: (ord: Order) => Order) => {
    setOrders(prev => prev.map(o => o.id === orderId ? updater(o) : o));
    if (targetOrder && targetOrder.id === orderId) {
      setTargetOrder(prev => prev ? updater(prev) : null);
    }
  };

  const perform = async (id: number, route: string, method: "POST" | "PUT", payload?: unknown) => {
    setBusy(id); setError(""); setNotice("");
    try { 
      await staffAction(`/api/staff/sales/orders/${id}/${route}`, method, payload); 
      toast.success("Thao tác xử lý đơn thành công.");
      setNotice("Đã lưu thao tác thành công."); 
      setActiveModal(null);
      await load();
    } catch (err: any) {
      const msg = errorMessage(err) || "Thao tác xử lý đơn thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  // 1. Xem chi tiết đơn
  const openViewModal = (order: Order) => {
    setTargetOrder(order);
    setActiveModal("view");
  };

  // 2. Xác minh thông tin nhận hàng
  const openVerifyModal = (order: Order) => {
    setTargetOrder(order);
    setVerifyData({
      customerName: order.customerName || "",
      phone: order.phone || "",
      shippingAddress: order.shippingAddress || "",
    });
    setActiveModal("verify");
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder) return;
    if (!verifyData.phone.trim() || !verifyData.shippingAddress.trim()) {
      setError("Vui lòng nhập số điện thoại và địa chỉ giao hàng.");
      return;
    }

    const payload = {
      customerName: verifyData.customerName.trim(),
      phone: verifyData.phone.trim(),
      shippingAddress: verifyData.shippingAddress.trim(),
    };

    await perform(targetOrder.id, "verify", "PUT", payload);

    updateLocalOrder(targetOrder.id, ord => ({
      ...ord,
      customerName: verifyData.customerName.trim(),
      phone: verifyData.phone.trim(),
      shippingAddress: verifyData.shippingAddress.trim(),
      status: ord.status === "PENDING_CONFIRMATION" ? "CONFIRMED" : ord.status
    }));

    toast.success("Đã xác minh và cập nhật thông tin nhận hàng!");
  };

  // 3. Đổi trạng thái đơn hàng
  const openStatusModal = (order: Order) => {
    setTargetOrder(order);
    setStatusNew(order.status);
    setActiveModal("status");
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder || !statusNew) return;

    await perform(targetOrder.id, "status", "PUT", { status: statusNew });

    updateLocalOrder(targetOrder.id, ord => ({
      ...ord,
      status: statusNew
    }));

    toast.success(`Đã cập nhật trạng thái đơn thành ${STATUS_MAP[statusNew]?.label || statusNew}`);
  };

  // 4. Hủy đơn hàng
  const openCancelModal = (order: Order) => {
    setTargetOrder(order);
    setCancelReasonPreset("Khách yêu cầu hủy");
    setCancelReason("");
    setActiveModal("cancel");
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder) return;
    const finalReason = cancelReason.trim() ? `${cancelReasonPreset}: ${cancelReason.trim()}` : cancelReasonPreset;
    
    await perform(targetOrder.id, "cancel", "POST", { reason: finalReason });

    updateLocalOrder(targetOrder.id, ord => ({
      ...ord,
      status: "CANCELLED",
      paymentStatus: "Đã hủy",
      notes: [
        ...(ord.notes || []),
        { id: Date.now(), content: `Lý do hủy đơn: ${finalReason}`, createdAt: new Date().toISOString(), createdBy: "NV Sales" }
      ]
    }));

    toast.success("Đã hủy đơn hàng thành công!");
  };

  // 5. Ghi chú đơn hàng
  const openNoteModal = (order: Order) => {
    setTargetOrder(order);
    setNoteContent("");
    setActiveModal("note");
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder || !noteContent.trim()) {
      setError("Nội dung ghi chú không được để trống.");
      return;
    }

    await perform(targetOrder.id, "notes", "POST", { content: noteContent.trim() });

    const newNoteObj: OrderNote = {
      id: Date.now(),
      content: noteContent.trim(),
      createdAt: new Date().toISOString(),
      createdBy: "Nhân viên Bán hàng"
    };

    updateLocalOrder(targetOrder.id, ord => ({
      ...ord,
      notes: [...(ord.notes || []), newNoteObj]
    }));

    toast.success("Đã thêm ghi chú đơn hàng mới");
  };

  // 6. Yêu cầu giữ hàng
  const openReserveModal = (order: Order) => {
    setTargetOrder(order);
    setReserveData({ productId: order.items?.[0]?.id?.toString() || "101", quantity: "1" });
    setActiveModal("reserve");
  };

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder) return;
    const productId = Number(reserveData.productId);
    const quantity = Number(reserveData.quantity);
    if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
      setError("ID sản phẩm và số lượng phải là số nguyên dương.");
      return;
    }

    await perform(targetOrder.id, "reservations", "POST", { productId, quantity });
    toast.success(`Đã gửi yêu cầu giữ ${quantity} sản phẩm (ID: ${productId}) vào kho!`);
  };

  const openNotes = (order: Order) => {
    setSelected(order);
  };

  const orderColumns: Column<Order>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn',
      render: (order) => (
        <div>
          <div className="font-bold font-mono text-blue-600">{order.orderCode}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {new Date(order.createdAt || Date.now()).toLocaleDateString("vi-VN")}
          </div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Khách hàng & SĐT',
      render: (order) => (
        <div>
          <div className="font-bold text-slate-900">{order.customerName}</div>
          <div className="text-xs text-blue-600 font-mono mt-0.5">{order.phone}</div>
        </div>
      )
    },
    {
      key: 'shippingAddress',
      header: 'Địa chỉ giao hàng',
      render: (order) => (
        <div className="max-w-xs text-xs text-slate-600 line-clamp-2">
          {order.shippingAddress || "Chưa có địa chỉ"}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (order) => {
        const statusConfig = STATUS_MAP[order.status] || { label: order.status, bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
        return (
          <div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
              {statusConfig.label}
            </span>
            {order.paymentStatus && (
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {order.paymentStatus}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'total',
      header: 'Tổng tiền',
      render: (order) => (
        <span className="font-bold text-emerald-700 text-sm font-mono">
          {Number(order.total || 0).toLocaleString("vi-VN")} ₫
        </span>
      )
    },
    {
      key: 'notes',
      header: 'Ghi chú',
      render: (order) => (
        order.notes && order.notes.length > 0 ? (
          <button 
            onClick={() => openNotes(order)} 
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-medium transition flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>{order.notes.length} ghi chú</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">—</span>
        )
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (order) => {
        const isCancelledOrDelivered = ["DELIVERED", "CANCELLED"].includes(order.status);
        return (
          <div className="flex flex-wrap gap-1.5 justify-end">
            <button 
              onClick={() => openViewModal(order)} 
              className="rounded-lg bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition flex items-center gap-1"
              title="Xem chi tiết đơn hàng"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Chi tiết</span>
            </button>
            {!isCancelledOrDelivered && (
              <button 
                onClick={() => openVerifyModal(order)} 
                className="rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition flex items-center gap-1"
                title="Xác minh địa chỉ và SĐT người nhận"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Xác minh</span>
              </button>
            )}
            {!isCancelledOrDelivered && (
              <button 
                onClick={() => openStatusModal(order)} 
                className="rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition flex items-center gap-1"
                title="Chuyển trạng thái đơn"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Đổi trạng thái</span>
              </button>
            )}
            <button 
              onClick={() => openNoteModal(order)} 
              className="rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition flex items-center gap-1"
              title="Thêm ghi chú đơn hàng"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Ghi chú</span>
            </button>
            {!isCancelledOrDelivered && (
              <button 
                onClick={() => openCancelModal(order)} 
                className="rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition flex items-center gap-1"
                title="Hủy đơn hàng này"
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Hủy</span>
              </button>
            )}
          </div>
        );
      }
    }
  ];


  return (
    <PermissionGuard requiredPermissions={['VIEW_NEW_ORDER', 'VERIFY_ORDER', 'PROCESS_ORDER_NOTE', 'SEARCH_ORDER_BASIC']}>
      <main className="min-h-screen bg-slate-50/60 p-6 md:p-8 text-slate-900 font-sans antialiased space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Xử lý & Quản lý Đơn hàng (Sales)"
          subtitle="Xem chi tiết, xác minh thông tin nhận hàng, đổi trạng thái, ghi chú tiến độ & tạo đơn bán tại quầy / Online"
          badge={<span className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">BÁN HÀNG</span>}
          breadcrumbs={[
            { label: 'Staff Hub', href: '/staff/dashboard' },
            { label: 'Bán hàng', href: '/staff/dashboard/sales' },
            { label: 'Xử lý đơn hàng' }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={openCreateModal}
                icon={<Plus className="w-4 h-4" />}
              >
                Tạo đơn hàng mới
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => void load()}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                Làm mới
              </Button>
            </div>
          }
        />

        {/* Sub-nav & Tab bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <Link
              href="/staff/dashboard/sales"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              Tổng quan
            </Link>
            <span className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 shadow-2xs border border-slate-200">
              Xử lý đơn hàng POS & Online
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { key: "all", label: "Tất cả đơn" },
              { key: "new", label: "Đơn mới chờ xử lý" },
              { key: "sla", label: "Cảnh báo SLA" }
            ].map(tab => (
              <button 
                type="button" 
                key={tab.key} 
                onClick={() => setFilter(tab.key as "all" | "new" | "sla")} 
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  filter === tab.key 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        <DataTable<Order>
          columns={orderColumns}
          data={filteredOrders}
          loading={loading}
          rowKey={(order) => order.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm theo mã đơn, tên khách, SĐT..."
          emptyTitle="Không tìm thấy đơn hàng nào"
          emptyMessage="Không có đơn hàng nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm."
        />

        {/* Modal Xem nhật ký ghi chú */}
        {selected && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>Nhật ký ghi chú đơn {selected.orderCode}</span>
              </h2>
              <button 
                onClick={() => setSelected(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {selected.notes && selected.notes.length > 0 ? (
                selected.notes.map(note => (
                  <div key={note.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm flex justify-between items-start gap-4">
                    <div>
                      <p className="text-slate-800 font-medium">{note.content}</p>
                      <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                        Tạo bởi: {note.createdBy || "Nhân viên Bán hàng"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {note.createdAt ? new Date(note.createdAt).toLocaleString("vi-VN") : ""}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">Chưa có ghi chú nào cho đơn hàng này.</p>
              )}
            </div>
          </section>
        )}


        {/* 1. Modal Xem chi tiết đơn hàng */}
        {activeModal === "view" && targetOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  <span>Chi tiết đơn hàng {targetOrder.orderCode}</span>
                </h2>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Information Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-600" /> Thông tin khách hàng
                    </span>
                    <p className="font-bold text-slate-900">{targetOrder.customerName}</p>
                    <p className="text-xs text-blue-600 font-mono">{targetOrder.phone}</p>
                    {targetOrder.customerEmail && <p className="text-xs text-slate-500">{targetOrder.customerEmail}</p>}
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Địa chỉ giao hàng
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">{targetOrder.shippingAddress || "Chưa có địa chỉ"}</p>
                  </div>
                </div>

                {/* Status & Payment */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Trạng thái đơn:</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_MAP[targetOrder.status]?.bg || 'bg-slate-100'} ${STATUS_MAP[targetOrder.status]?.text || 'text-slate-700'} ${STATUS_MAP[targetOrder.status]?.border || 'border-slate-200'}`}>
                      {STATUS_MAP[targetOrder.status]?.label || targetOrder.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Thanh toán:</span>
                    <span className="font-bold text-slate-900">{targetOrder.paymentMethod || "COD"}</span> ({targetOrder.paymentStatus})
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1 font-semibold">Thời gian đặt:</span>
                    <span className="font-mono text-slate-700">{new Date(targetOrder.createdAt || Date.now()).toLocaleString("vi-VN")}</span>
                  </div>
                </div>

                {/* Order Items Table */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Danh sách sản phẩm</h3>
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-3">Sản phẩm</th>
                          <th className="p-3">Phân loại</th>
                          <th className="p-3 text-center">Số lượng</th>
                          <th className="p-3 text-right">Đơn giá</th>
                          <th className="p-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {(targetOrder.items && targetOrder.items.length > 0 ? targetOrder.items : [
                          { id: 1, productName: "Sản phẩm thời trang ET.TEE", variantInfo: "Size L", quantity: 1, price: targetOrder.total }
                        ]).map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-3 font-semibold text-slate-900">{item.productName}</td>
                            <td className="p-3 text-slate-500">{item.variantInfo || "-"}</td>
                            <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                            <td className="p-3 text-right font-mono">{Number(item.price).toLocaleString("vi-VN")} ₫</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-600">{Number(item.price * item.quantity).toLocaleString("vi-VN")} ₫</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-base">
                  <span className="font-bold text-slate-700">Tổng tiền thanh toán:</span>
                  <span className="font-extrabold text-emerald-600 text-xl font-mono">{Number(targetOrder.total).toLocaleString("vi-VN")} ₫</span>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-sm font-semibold text-slate-700 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}


        {/* 2. Modal Xác minh thông tin nhận hàng */}
        {activeModal === "verify" && targetOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-base flex items-center gap-2 text-blue-700">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>Xác minh thông tin nhận hàng ({targetOrder.orderCode})</span>
                </h2>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleVerifySubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên người nhận</label>
                  <input 
                    type="text"
                    value={verifyData.customerName}
                    onChange={(e) => setVerifyData({ ...verifyData, customerName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Số điện thoại *</label>
                  <input 
                    type="text"
                    required
                    value={verifyData.phone}
                    onChange={(e) => setVerifyData({ ...verifyData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Địa chỉ giao hàng *</label>
                  <textarea 
                    rows={3}
                    required
                    value={verifyData.shippingAddress}
                    onChange={(e) => setVerifyData({ ...verifyData, shippingAddress: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveModal(null)} 
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    disabled={busy !== null} 
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-sm text-white shadow-sm transition disabled:opacity-50"
                  >
                    Lưu & Xác minh
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Modal Đổi trạng thái đơn hàng */}
        {activeModal === "status" && targetOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-base flex items-center gap-2 text-indigo-700">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                  <span>Cập nhật trạng thái ({targetOrder.orderCode})</span>
                </h2>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleStatusSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Trạng thái hiện tại</label>
                  <div className="text-sm font-bold text-slate-800 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                    {STATUS_MAP[targetOrder.status]?.label || targetOrder.status}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Chọn trạng thái mới *</label>
                  <select
                    value={statusNew}
                    onChange={(e) => setStatusNew(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  >
                    <option value="PENDING_CONFIRMATION">Chờ xác nhận (PENDING_CONFIRMATION)</option>
                    <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
                    <option value="PROCESSING">Đang đóng gói (PROCESSING)</option>
                    <option value="SHIPPED">Đang giao hàng (SHIPPED)</option>
                    <option value="DELIVERED">Đã giao thành công (DELIVERED)</option>
                    <option value="CANCELLED">Hủy đơn hàng (CANCELLED)</option>
                    <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveModal(null)} 
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    disabled={busy !== null} 
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white shadow-sm transition disabled:opacity-50"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Modal Hủy đơn hàng */}
        {activeModal === "cancel" && targetOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-base flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Xác nhận hủy đơn ({targetOrder.orderCode})</span>
                </h2>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCancelSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Lý do hủy mẫu</label>
                  <select
                    value={cancelReasonPreset}
                    onChange={(e) => setCancelReasonPreset(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 mb-2 font-medium"
                  >
                    <option value="Khách yêu cầu hủy">Khách yêu cầu hủy đơn</option>
                    <option value="Không gọi được cho khách hàng">Không gọi được cho khách hàng (sau 3 lần)</option>
                    <option value="Địa chỉ không chính xác">Địa chỉ giao hàng không chính xác</option>
                    <option value="Sản phẩm tạm hết hàng trong kho">Sản phẩm tạm hết hàng trong kho</option>
                    <option value="Lý do khác">Lý do khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ghi chú lý do chi tiết</label>
                  <textarea 
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ghi rõ lý do cụ thể để lưu lại nhật ký xử lý..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveModal(null)} 
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition"
                  >
                    Bỏ qua
                  </button>
                  <button 
                    type="submit" 
                    disabled={busy !== null} 
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-sm text-white shadow-sm transition disabled:opacity-50"
                  >
                    Xác nhận Hủy đơn
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Modal Ghi chú đơn hàng */}
        {activeModal === "note" && targetOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>Thêm ghi chú ({targetOrder.orderCode})</span>
                </h2>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleNoteSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nội dung ghi chú *</label>
                  <textarea 
                    rows={4}
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Nhập ghi chú tiến độ xử lý đơn hàng..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveModal(null)} 
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    disabled={busy !== null} 
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-sm text-white shadow-sm transition disabled:opacity-50"
                  >
                    Lưu ghi chú
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tạo đơn hàng mới */}
        {activeModal === "create" && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <span>Tạo đơn hàng mới (POS / Bán hàng)</span>
                </h2>
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateOrderSubmit} className="p-6 overflow-y-auto space-y-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">1. Thông tin khách nhận</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên khách hàng *</label>
                      <input 
                        type="text"
                        required
                        value={createOrderData.customerName}
                        onChange={(e) => setCreateOrderData({ ...createOrderData, customerName: e.target.value })}
                        placeholder="Nhập tên khách..."
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Số điện thoại *</label>
                      <input 
                        type="text"
                        required
                        value={createOrderData.phone}
                        onChange={(e) => setCreateOrderData({ ...createOrderData, phone: e.target.value })}
                        placeholder="Số điện thoại..."
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
                      <input 
                        type="email"
                        value={createOrderData.customerEmail}
                        onChange={(e) => setCreateOrderData({ ...createOrderData, customerEmail: e.target.value })}
                        placeholder="email@..."
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phương thức thanh toán</label>
                      <select
                        value={createOrderData.paymentMethod}
                        onChange={(e) => setCreateOrderData({ ...createOrderData, paymentMethod: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium"
                      >
                        <option value="Tiền mặt tại quầy (POS)">Tiền mặt tại quầy (POS)</option>
                        <option value="COD (Thanh toán khi nhận hàng)">COD (Thanh toán khi nhận hàng)</option>
                        <option value="Chuyển khoản ngân hàng / VNPAY">Chuyển khoản ngân hàng / VNPAY</option>
                        <option value="Ví điện tử Momo">Ví điện tử Momo</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Địa chỉ giao hàng</label>
                    <input 
                      type="text"
                      value={createOrderData.shippingAddress}
                      onChange={(e) => setCreateOrderData({ ...createOrderData, shippingAddress: e.target.value })}
                      placeholder="Nhập địa chỉ (Bỏ trống nếu nhận tại quầy)..."
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Product Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">2. Danh sách sản phẩm mua</h3>
                    <button
                      type="button"
                      onClick={handleAddCreateItem}
                      className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm dòng sản phẩm</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {createItems.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-5">
                          <label className="block text-[10px] text-slate-500 mb-1">Tên sản phẩm</label>
                          <input
                            type="text"
                            required
                            value={item.productName}
                            onChange={(e) => handleUpdateCreateItem(idx, "productName", e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 mb-1">Phân loại (Size/Màu)</label>
                          <input
                            type="text"
                            value={item.variantInfo || ""}
                            onChange={(e) => handleUpdateCreateItem(idx, "variantInfo", e.target.value)}
                            placeholder="Size M / Đen"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 mb-1 text-center">SL</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleUpdateCreateItem(idx, "quantity", Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-center text-slate-900 font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 mb-1 text-right">Đơn giá (₫)</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={item.price}
                            onChange={(e) => handleUpdateCreateItem(idx, "price", Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-right text-emerald-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-1 text-center pt-4">
                          {createItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCreateItem(idx)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Note & Summary */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ghi chú đơn hàng</label>
                    <textarea 
                      rows={2}
                      value={createOrderData.note}
                      onChange={(e) => setCreateOrderData({ ...createOrderData, note: e.target.value })}
                      placeholder="Ghi chú thêm về đơn hàng này..."
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-sm">Tổng thanh toán:</span>
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      {calculatedCreateTotal.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setActiveModal(null)} 
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover font-bold text-sm text-white shadow-sm transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận tạo đơn</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </PermissionGuard>
  );
}
