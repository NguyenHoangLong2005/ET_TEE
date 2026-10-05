"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { errorMessage, staffAction } from "@/lib/staff-api";
import SearchInput from "@/components/shared/SearchInput";
import { 
  X, Check, AlertTriangle, ShieldCheck, FileText, PackagePlus, 
  RefreshCw, CheckCircle2, Eye, Edit3, Ban, Phone, MapPin, 
  User, CreditCard, Clock, Calendar, ShoppingBag, Plus, Trash2, Banknote
} from "lucide-react";
import { toast } from "sonner";
import PermissionGuard from "@/components/auth/PermissionGuard";
import { usePermissions } from "@/contexts/AuthContext";
import { DataTable, Column } from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";

type OrderItem = {
  id?: number;
  variantId: number | "";
  productName?: string;
  variantInfo?: string;
  quantity: number;
  price?: number;
  imageUrl?: string;
  lineTotal?: number;
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
  noteCount?: number;
};

const getId = (order: Order) => order.id;

const PAYMENT_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  UNPAID: { label: "Chưa thanh toán", cls: "bg-slate-100 text-slate-600" },
  WAITING_TRANSFER: { label: "Chờ chuyển khoản", cls: "bg-orange-50 text-orange-700" },
  PENDING: { label: "Chờ thanh toán", cls: "bg-orange-50 text-orange-700" },
  PAID: { label: "Đã thanh toán", cls: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "Thanh toán lỗi", cls: "bg-rose-50 text-rose-700" },
  REFUNDED: { label: "Đã hoàn tiền", cls: "bg-pink-50 text-pink-700" },
  COD_PENDING: { label: "Thu hộ khi giao", cls: "bg-amber-50 text-amber-700" },
  REFUND_PENDING: { label: "Chờ hoàn tiền", cls: "bg-rose-50 text-rose-700" },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Tiền mặt",
  COD: "COD",
  BANK_TRANSFER: "Chuyển khoản",
  MOMO: "MoMo",
  VNPAY: "VNPay",
  CARD: "Thẻ",
};

const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** Chuyen OrderItem entity cua backend (…Snapshot, unitPrice/salePrice) sang dang hien thi. */
const mapOrderItem = (raw: any): OrderItem => {
  const price = Number(raw?.salePrice ?? raw?.unitPrice ?? raw?.price ?? 0);
  const quantity = Number(raw?.quantity ?? 1);
  const variantInfo = [raw?.colorSnapshot, raw?.sizeSnapshot].filter(Boolean).join(" / ") || raw?.variantInfo || "";
  return {
    id: raw?.id,
    variantId: raw?.variantId ?? "",
    productName: raw?.productNameSnapshot || raw?.productName || "Sản phẩm",
    variantInfo,
    quantity,
    price,
    imageUrl: raw?.imageSnapshot || raw?.imageUrl || undefined,
    lineTotal: Number(raw?.totalPrice ?? price * quantity),
  };
};

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PENDING_CONFIRMATION: { label: "Chờ xác nhận", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  PENDING_PAYMENT: { label: "Chờ thanh toán", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  CONFIRMED: { label: "Đã xác nhận", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  PROCESSING: { label: "Đang đóng gói", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  PICKING: { label: "Đang lấy hàng", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  PACKED: { label: "Đã đóng gói", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  HANDED_TO_CARRIER: { label: "Đã bàn giao ĐVVC", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  SHIPPING: { label: "Đang giao hàng", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  RETURN_REQUESTED: { label: "Yêu cầu trả hàng", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  RETURNED: { label: "Đã trả hàng", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  SHIPPED: { label: "Đang giao hàng", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  DELIVERED: { label: "Đã giao thành công", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CANCELLED: { label: "Đã hủy", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  REFUNDED: { label: "Đã hoàn tiền", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
};


export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "sla">(() => {
    if (typeof window === "undefined") return "all";
    const f = new URLSearchParams(window.location.search).get("filter");
    return f === "new" || f === "sla" ? f : "all";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 15;

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
    paymentMethod: "CASH",
    note: "",
  });

  const [createItems, setCreateItems] = useState<OrderItem[]>([
    { id: 1, variantId: "", quantity: 1 }
  ]);

  const openCreateModal = () => {
    setCreateOrderData({
      customerName: "",
      phone: "",
      customerEmail: "",
      shippingAddress: "",
      paymentMethod: "CASH",
      note: "",
    });
    setCreateItems([
      { id: Date.now(), variantId: "", quantity: 1 }
    ]);
    setActiveModal("create");
  };

  const handleAddCreateItem = () => {
    setCreateItems(prev => [
      ...prev,
      { id: Date.now(), variantId: "", quantity: 1 }
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
    if (createItems.length === 0 || createItems.some(i => !i.variantId || Number(i.quantity) <= 0)) {
      setError("Mỗi dòng sản phẩm cần nhập Mã biến thể (Variant ID) hợp lệ và số lượng > 0.");
      return;
    }

    const payload = {
      customerName: createOrderData.customerName.trim(),
      customerEmail: createOrderData.customerEmail.trim() || undefined,
      phone: createOrderData.phone.trim(),
      shippingAddress: createOrderData.shippingAddress.trim() || "Thanh toán & nhận tại cửa hàng (POS)",
      paymentMethod: createOrderData.paymentMethod,
      items: createItems.map(i => ({ variantId: Number(i.variantId), quantity: Number(i.quantity) })),
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
        total: saved?.totalAmount ?? 0,
        createdAt: saved?.createdAt ?? new Date().toISOString(),
        items: saved?.items ?? [],
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

  // Debounce o tim kiem de khong goi API moi phim go
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Doi bo loc / tu khoa -> ve trang dau
  useEffect(() => { setPage(0); }, [filter, debouncedQuery]);

  // silent: lam moi ngam sau thao tac - giu nguyen bang, khong hien trang thai tai
  const load = useCallback(async (signal?: AbortSignal, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), filter });
      if (debouncedQuery) params.set("q", debouncedQuery);
      const res: any = await apiClient.get(`/api/staff/sales/orders/page?${params}`);
      if (signal?.aborted) return;
      setOrders(Array.isArray(res?.content) ? res.content : []);
      setTotalPages(Number(res?.totalPages ?? 0));
      setTotalItems(Number(res?.totalElements ?? 0));
    } catch (cause) {
      if (signal?.aborted || silent) return;
      setOrders([]);
      setError(errorMessage(cause) || "Không thể tải danh sách đơn hàng");
    } finally {
      if (!signal?.aborted && !silent) setLoading(false);
    }
  }, [page, filter, debouncedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const updateLocalOrder = (orderId: number, updater: (ord: Order) => Order) => {
    setOrders(prev => prev.map(o => o.id === orderId ? updater(o) : o));
    if (targetOrder && targetOrder.id === orderId) {
      setTargetOrder(prev => prev ? updater(prev) : null);
    }
  };

  const perform = async (id: number, route: string, method: "POST" | "PUT", payload?: unknown): Promise<boolean> => {
    setBusy(id); setError("");
    try {
      await staffAction(`/api/staff/sales/orders/${id}/${route}`, method, payload);
      setActiveModal(null);
      // Moi thao tac tu cap nhat dong cua no + bao toast rieng; chi dong bo ngam
      // de lay cac truong server tinh lai, khong lam nhay ca bang.
      void load(undefined, true);
      return true;
    } catch (err: any) {
      const msg = errorMessage(err) || "Thao tác xử lý đơn thất bại";
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setBusy(null);
    }
  };

  // 1. Xem chi tiết đơn
  const openViewModal = (order: Order) => {
    setTargetOrder(order);
    setActiveModal("view");
    // Danh sach chi tra thong tin tom tat; chi tiet san pham chi tai khi mo don.
    apiClient.get<any>(`/api/staff/sales/orders/${order.id}`)
      .then(detail => {
        if (detail?.items) {
          setTargetOrder(prev => (prev && prev.id === order.id ? { ...prev, items: (detail.items as any[]).map(mapOrderItem) } : prev));
        }
      })
      .catch(() => { /* giu ban tom tat */ });
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

    if (!(await perform(targetOrder.id, "verify", "PUT", payload))) return;

    updateLocalOrder(targetOrder.id, ord => ({
      ...ord,
      customerName: verifyData.customerName.trim(),
      phone: verifyData.phone.trim(),
      shippingAddress: verifyData.shippingAddress.trim(),
    }));

    toast.success("Đã xác minh và cập nhật thông tin nhận hàng!");
  };

  // 3. Đổi trạng thái đơn hàng
  // Sales confirms / cancels orders and handles customer return requests.
  const SALES_STATUS_SCOPE = ["CONFIRMED", "CANCELLED", "RETURNED", "REFUNDED"];
  // In the return flow the target statuses read better as actions.
  const RETURN_ACTION_LABEL: Record<string, string> = {
    RETURNED: "Chấp nhận trả hàng (hàng về kho, chờ hoàn tiền)",
    DELIVERED: "Từ chối yêu cầu trả hàng",
    REFUNDED: "Đã hoàn tiền cho khách",
  };
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([]);
  const [loadingTransitions, setLoadingTransitions] = useState(false);
  const [statusReason, setStatusReason] = useState("");

  const openStatusModal = (order: Order) => {
    setTargetOrder(order);
    setStatusNew("");
    setStatusReason("");
    setAllowedStatuses([]);
    setActiveModal("status");
    setLoadingTransitions(true);
    apiClient.get<string[]>(`/api/staff/sales/orders/${order.id}/transitions`)
      .then(list => {
        const allowed = (Array.isArray(list) ? list : []).filter(st =>
          SALES_STATUS_SCOPE.includes(st)
          // DELIVERED is only a sales action as "reject the return"; delivery itself belongs to shipping.
          || (st === "DELIVERED" && order.status === "RETURN_REQUESTED"));
        setAllowedStatuses(allowed);
        setStatusNew(allowed[0] ?? "");
      })
      .catch(() => setAllowedStatuses([]))
      .finally(() => setLoadingTransitions(false));
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder || !statusNew) return;
    if (statusNew === "DELIVERED" && !statusReason.trim()) {
      setError("Vui lòng nhập lý do từ chối trả hàng.");
      return;
    }

    if (!(await perform(targetOrder.id, "status", "PUT", { status: statusNew, reason: statusReason.trim() || undefined }))) return;

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
    
    if (!(await perform(targetOrder.id, "cancel", "POST", { reason: finalReason }))) return;

    updateLocalOrder(targetOrder.id, ord => ({
      ...ord,
      status: "CANCELLED",
      notes: [
        ...(ord.notes || []),
        { id: Date.now(), content: `Lý do hủy đơn: ${finalReason}`, createdAt: new Date().toISOString(), createdBy: "NV Sales" }
      ]
    }));

    toast.success("Đã hủy đơn hàng thành công!");
  };

  // Bank transfer arrived (staff checked the statement): PENDING_PAYMENT -> PENDING_CONFIRMATION, PAID.
  // The SePay webhook does the same automatically when it is configured.
  const handleConfirmPayment = async (order: Order) => {
    const amount = Number(order.total || 0).toLocaleString("vi-VN");
    if (!window.confirm(`Xác nhận đã nhận ${amount}₫ chuyển khoản cho đơn ${order.orderCode}?
Chỉ xác nhận sau khi đã đối chiếu sao kê ngân hàng.`)) return;
    if (await perform(order.id, "confirm-payment", "POST")) {
      toast.success(`Đã ghi nhận thanh toán cho đơn ${order.orderCode}`);
    }
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

    if (!(await perform(targetOrder.id, "notes", "POST", { content: noteContent.trim() }))) return;

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

    if (!(await perform(targetOrder.id, "reservations", "POST", { productId, quantity }))) return;
    toast.success(`Đã gửi yêu cầu giữ ${quantity} sản phẩm (ID: ${productId}) vào kho!`);
  };

  const openNotes = (order: Order) => {
    setSelected({ ...order, notes: [] });
    apiClient.get<OrderNote[]>(`/api/staff/sales/orders/${order.id}/notes`)
      .then(list => setSelected(prev => (prev && prev.id === order.id ? { ...prev, notes: Array.isArray(list) ? list : [] } : prev)))
      .catch(() => toast.error("Không thể tải ghi chú đơn hàng"));
  };

  const iconBtn = "inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:scale-95";

  const orderColumns: Column<Order>[] = [
    {
      key: 'orderCode',
      header: 'Đơn hàng',
      render: (order) => (
        <div>
          <div className="font-bold font-mono text-slate-900 text-[13px]">{order.orderCode}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {fmtDateTime(order.createdAt)}
          </div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (order) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
            {(order.customerName || "?").trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 text-sm truncate max-w-[160px]">{order.customerName}</div>
            <div className="text-xs text-slate-500 font-mono">{order.phone || "—"}</div>
          </div>
        </div>
      )
    },
    {
      key: 'shippingAddress',
      header: 'Địa chỉ giao hàng',
      render: (order) => (
        <div className="max-w-[220px] text-xs text-slate-600 line-clamp-2" title={order.shippingAddress}>
          {order.shippingAddress || <span className="italic text-slate-400">Chưa có địa chỉ</span>}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (order) => {
        const st = STATUS_MAP[order.status] || { label: order.status, bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
        const pay = PAYMENT_STATUS_LABEL[order.paymentStatus] || (order.paymentStatus ? { label: order.paymentStatus, cls: "bg-slate-100 text-slate-600" } : null);
        const method = PAYMENT_METHOD_LABEL[order.paymentMethod || ""];
        return (
          <div className="flex flex-col items-start gap-1.5">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${st.bg} ${st.text} ${st.border}`}>
              {st.label}
            </span>
            {pay && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${pay.cls}`}>
                <CreditCard className="w-3 h-3" />
                {method ? `${method} · ` : ""}{pay.label}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'total',
      header: 'Tổng tiền',
      align: 'right',
      render: (order) => (
        <span className="font-bold text-slate-900 text-sm font-mono whitespace-nowrap">
          {Number(order.total || 0).toLocaleString("vi-VN")} ₫
        </span>
      )
    },
    {
      key: 'notes',
      header: 'Ghi chú',
      render: (order) => (
        (order.noteCount ?? 0) > 0 ? (
          <button
            onClick={() => openNotes(order)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded-md border border-amber-200 transition"
          >
            <FileText className="w-3 h-3" />
            <span>{order.noteCount}</span>
          </button>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (order) => {
        // RETURNED still needs "mark refunded"; RETURN_REQUESTED needs approve / reject.
        const isFinal = ["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status);
        return (
          <div className="flex items-center justify-end gap-1.5">
            {!isFinal && (
              <button
                onClick={() => openStatusModal(order)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold transition active:scale-95 whitespace-nowrap"
                title="Xác nhận hoặc hủy đơn"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Xử lý
              </button>
            )}
            {canVerifyOrder && order.status === "PENDING_PAYMENT" && order.paymentMethod === "BANK_TRANSFER" && (
              <button
                onClick={() => void handleConfirmPayment(order)}
                disabled={busy === order.id}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition active:scale-95 whitespace-nowrap"
                title="Đã nhận tiền chuyển khoản"
              >
                <Banknote className="w-3.5 h-3.5" />
                Đã nhận tiền
              </button>
            )}
            <button onClick={() => openViewModal(order)} className={`${iconBtn} hover:text-blue-600 hover:border-blue-200`} title="Xem chi tiết">
              <Eye className="w-4 h-4" />
            </button>
            {["PENDING_PAYMENT", "PENDING_CONFIRMATION"].includes(order.status) && (
              <button onClick={() => openVerifyModal(order)} className={`${iconBtn} hover:text-indigo-600 hover:border-indigo-200`} title="Xác minh thông tin nhận hàng">
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => openNoteModal(order)} className={`${iconBtn} hover:text-amber-600 hover:border-amber-200`} title="Thêm ghi chú">
              <FileText className="w-4 h-4" />
            </button>
            {["PENDING_PAYMENT", "PENDING_CONFIRMATION", "CONFIRMED"].includes(order.status) && (
              <button onClick={() => openCancelModal(order)} className={`${iconBtn} hover:text-rose-600 hover:border-rose-200`} title="Hủy đơn">
                <Ban className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ];


  return (
    <PermissionGuard requiredPermissions={['VIEW_NEW_ORDER']}>
      <main className="min-h-screen bg-slate-50/60 p-6 md:p-8 text-slate-900 font-sans antialiased space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Đơn hàng"
          subtitle="Xác nhận, xác minh thông tin nhận hàng, ghi chú và hủy đơn của chi nhánh."
          actions={
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 transition"
              >
                <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Đang tải..." : "Làm mới"}</span>
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-sm font-semibold text-white shadow-sm shadow-red-200 hover:bg-red-700 active:scale-[0.98] transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo đơn hàng</span>
              </button>
            </div>
          }
        />

        {/* Bộ lọc nhanh */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { key: "all", label: "Tất cả đơn", icon: ShoppingBag },
              { key: "new", label: "Chờ xử lý", icon: Clock },
              { key: "sla", label: "Cảnh báo SLA", icon: AlertTriangle },
            ].map(tab => {
              const active = filter === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setFilter(tab.key as "all" | "new" | "sla")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${active ? (tab.key === "sla" ? "text-rose-500" : "text-primary") : ""}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">
            {loading ? "Đang tải..." : `${totalItems.toLocaleString("vi-VN")} đơn hàng`}
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        <DataTable<Order>
          columns={orderColumns}
          data={orders}
          loading={loading}
          rowKey={(order) => order.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm theo mã đơn, tên khách, SĐT..."
          emptyTitle="Không tìm thấy đơn hàng nào"
          emptyMessage="Không có đơn hàng nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm."
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            pageSize: PAGE_SIZE,
            onPageChange: setPage,
          }}
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
                        {(targetOrder.items ?? []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-xs text-slate-400">Đang tải danh sách sản phẩm...</td>
                          </tr>
                        )}
                        {(targetOrder.items ?? []).map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-2.5">
                                {item.imageUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                                )}
                                <span>{item.productName}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-500">{item.variantInfo || "-"}</td>
                            <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                            <td className="p-3 text-right font-mono">{Number(item.price || 0).toLocaleString("vi-VN")} ₫</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-600">{Number(item.lineTotal ?? (item.price || 0) * item.quantity).toLocaleString("vi-VN")} ₫</td>
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
                  {!loadingTransitions && allowedStatuses.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-2">
                      Đơn đang ở khâu kho / vận chuyển, nhân viên bán hàng không có thao tác chuyển trạng thái tại bước này.
                    </p>
                  )}
                  <select
                    value={statusNew}
                    disabled={loadingTransitions || allowedStatuses.length === 0}
                    onChange={(e) => setStatusNew(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  >
                    {allowedStatuses.map(st => (
                      <option key={st} value={st}>{RETURN_ACTION_LABEL[st] || STATUS_MAP[st]?.label || st}</option>
                    ))}
                  </select>
                </div>
                {["RETURNED", "DELIVERED", "REFUNDED"].includes(statusNew) && (
                  <div>
                    <label htmlFor="status-reason" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      {statusNew === "DELIVERED" ? "Lý do từ chối *" : "Ghi chú"}
                    </label>
                    <textarea
                      id="status-reason"
                      rows={2}
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
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
                    disabled={busy !== null || !statusNew} 
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
                        <option value="CASH">Tiền mặt tại quầy (POS)</option>
                        <option value="COD">COD (Thanh toán khi nhận hàng)</option>
                        <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                        <option value="MOMO">Ví điện tử MoMo</option>
                        <option value="CARD">Thẻ (quẹt tại quầy)</option>
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
                        <div className="col-span-8">
                          <label className="block text-[10px] text-slate-500 mb-1">Mã biến thể (Variant ID)</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.variantId}
                            onChange={(e) => handleUpdateCreateItem(idx, "variantId", e.target.value ? Number(e.target.value) : "")}
                            placeholder="Nhập variantId từ trang sản phẩm"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-3">
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

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600">
                    Tổng tiền và giá từng sản phẩm sẽ được hệ thống tính theo giá bán hiện tại của biến thể, sau khi tạo đơn thành công.
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
