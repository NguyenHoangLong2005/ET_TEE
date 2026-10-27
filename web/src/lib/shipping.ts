// Dữ liệu dùng chung cho các trang bộ phận vận chuyển.
// API trả entity Shipment / ShippingException với đơn hàng lồng trong `order`
// (và `shipment.order`); các trang trước đây đọc trường phẳng nên mã đơn, khách hàng,
// mã vận đơn của sự cố luôn trống.

// Khớp ShipmentStatus của backend: PENDING -> HANDED_OVER -> IN_TRANSIT -> DELIVERED,
// nhánh phụ EXCEPTION (đang có sự cố) và RETURNED (hoàn về kho).
export type ShipmentStatus = 'PENDING' | 'HANDED_OVER' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'RETURNED';

export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = ['PENDING', 'HANDED_OVER', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'RETURNED'];

export const SHIPMENT_STATUS_CFG: Record<ShipmentStatus, { label: string; cls: string }> = {
  PENDING:     { label: 'Chờ bàn giao ĐVVC', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  HANDED_OVER: { label: 'Đã bàn giao ĐVVC',  cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  IN_TRANSIT:  { label: 'Đang giao hàng',    cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  DELIVERED:   { label: 'Đã giao',           cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  EXCEPTION:   { label: 'Có sự cố',          cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  RETURNED:    { label: 'Hoàn về kho',       cls: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export function shipmentStatusCfg(status: string) {
  return SHIPMENT_STATUS_CFG[status as ShipmentStatus] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

export type Shipment = {
  id: number;
  status: string;
  trackingCode?: string;
  carrierName?: string;
  codAmount: number;
  codReconciled: boolean;
  handoverAt?: string;
  deliveredAt?: string;
  deliveryProofUrl?: string;
  orderId?: number;
  orderCode?: string;
  orderStatus?: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  total?: number;
  createdAt?: string;
};

export function toShipment(raw: any): Shipment {
  const o = raw?.order ?? {};
  return {
    id: raw?.id,
    status: raw?.status ?? 'PENDING',
    trackingCode: raw?.trackingCode ?? undefined,
    carrierName: raw?.carrierName ?? undefined,
    codAmount: Number(raw?.codAmount ?? 0) || 0,
    codReconciled: Boolean(raw?.codReconciled),
    handoverAt: raw?.handoverAt ?? undefined,
    deliveredAt: raw?.deliveredAt ?? undefined,
    deliveryProofUrl: raw?.deliveryProofUrl ?? undefined,
    orderId: o.id,
    orderCode: o.orderCode,
    orderStatus: o.status,
    customerName: o.customerName,
    customerPhone: o.customerPhone ?? o.phone,
    shippingAddress: o.shippingAddress ?? o.shippingAddressSnapshot,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    total: o.totalAmount ?? o.total,
    createdAt: o.createdAt,
  };
}

/** Kiện còn có thể báo sự cố: chưa giao, chưa hoàn, chưa có sự cố đang mở. */
export function canReportException(s: Pick<Shipment, 'status'>) {
  return s.status === 'PENDING' || s.status === 'HANDED_OVER' || s.status === 'IN_TRANSIT';
}

/** COD đã thu nhưng chưa đối soát với hãng. */
export function isCodPending(s: Shipment) {
  return s.status === 'DELIVERED' && s.codAmount > 0 && !s.codReconciled;
}

export type ExceptionStatus = 'OPEN' | 'RESOLVED' | 'RETURNED';

export type ShippingExceptionItem = {
  id: number;
  status: ExceptionStatus | string;
  exceptionType: string;
  description?: string;
  resolution?: string;
  createdAt?: string;
  shipmentId?: number;
  shipmentStatus?: string;
  trackingCode?: string;
  carrierName?: string;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
};

export function toShippingException(raw: any): ShippingExceptionItem {
  const s = raw?.shipment ? toShipment(raw.shipment) : undefined;
  return {
    id: raw?.id,
    status: raw?.status ?? 'OPEN',
    exceptionType: raw?.exceptionType ?? 'OTHER',
    description: raw?.description ?? undefined,
    resolution: raw?.resolutionNote ?? undefined,
    createdAt: raw?.createdAt ?? undefined,
    shipmentId: s?.id,
    shipmentStatus: s?.status,
    trackingCode: s?.trackingCode,
    carrierName: s?.carrierName,
    orderCode: s?.orderCode,
    customerName: s?.customerName,
    customerPhone: s?.customerPhone,
    shippingAddress: s?.shippingAddress,
  };
}

export function asList(data: any): any[] {
  return Array.isArray(data) ? data : data?.content ?? data?.items ?? data?.data ?? [];
}

export const fmtVnd = (v?: number | null) =>
  v == null ? '—' : `${Number(v).toLocaleString('vi-VN')} ₫`;

export const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export const EXCEPTION_TYPES: Record<string, { label: string; icon: string; cls: string }> = {
  WRONG_ADDRESS: { label: 'Sai địa chỉ',         icon: '📍', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  NOT_AT_HOME:   { label: 'Vắng nhà',            icon: '🏠', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  REFUSED:       { label: 'Từ chối nhận',        icon: '🚫', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  DAMAGED:       { label: 'Hàng hỏng',           icon: '📦', cls: 'bg-red-100 text-red-700 border-red-200' },
  LOST:          { label: 'Thất lạc',            icon: '❓', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  WRONG_ITEM:    { label: 'Sai hàng',            icon: '⚠️', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  PHONE_OFF:     { label: 'Không liên lạc được', icon: '📵', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  CARRIER_DELAY: { label: 'Hãng trễ',            icon: '🕐', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  // Mã cũ đã có trong dữ liệu, giữ để hiển thị nhãn tiếng Việt thay vì mã thô.
  ADDRESS_NOT_FOUND: { label: 'Không tìm thấy địa chỉ', icon: '📍', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  DELAY:             { label: 'Giao trễ',               icon: '🕐', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  FAILED_DELIVERY:   { label: 'Giao thất bại',          icon: '🚫', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  OTHER:         { label: 'Khác',                icon: '🔹', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

// Tên hãng vận chuyển được nhập tay nên có cả "GHN" lẫn "GIAO_HANG_NHANH" cho cùng một hãng;
// hiển thị một tên thống nhất, giá trị gốc vẫn giữ nguyên trong dữ liệu.
const CARRIER_LABELS: Record<string, string> = {
  GHN: 'GHN', GIAO_HANG_NHANH: 'GHN', 'GIAO HANG NHANH': 'GHN',
  GHTK: 'GHTK', GIAO_HANG_TIET_KIEM: 'GHTK', 'GIAO HANG TIET KIEM': 'GHTK',
  VIETTEL_POST: 'Viettel Post', VIETTELPOST: 'Viettel Post', VTP: 'Viettel Post',
  VNPOST: 'VNPost', VN_POST: 'VNPost', JNT: 'J&T Express', 'J&T': 'J&T Express', JT_EXPRESS: 'J&T Express',
  NINJAVAN: 'Ninja Van', NINJA_VAN: 'Ninja Van', BEST: 'BEST Express', BEST_EXPRESS: 'BEST Express',
};

export function carrierLabel(name?: string | null): string | undefined {
  if (!name) return undefined;
  return CARRIER_LABELS[name.trim().toUpperCase()] ?? name;
}
