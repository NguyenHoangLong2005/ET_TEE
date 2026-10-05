import { staffRequest } from "@/lib/staff-api";

export type WarehouseOrderItem = {
  productId: number | null;
  productName: string;
  color?: string | null;
  size?: string | null;
  image?: string | null;
  quantity: number;
  warehouseLocation?: string | null;
  /** Tồn khả dụng (chỉ có ở đơn chờ lấy hàng). */
  availableQuantity?: number | null;
};

/** Khớp WarehouseOrderDto phía backend. */
export type WarehouseOrder = {
  id: number;
  orderId: number;
  orderCode: string;
  status: string;
  customerName?: string | null;
  phone?: string | null;
  shippingAddress?: string | null;
  paymentMethod?: string | null;
  total?: number | null;
  paymentStatus?: string | null;
  /** Số tiền shipper thu hộ; 0 = đã thanh toán trước (chuyển khoản/quét mã). */
  codAmount?: number | null;
  createdAt?: string | null;
  itemCount: number;
  items: WarehouseOrderItem[];
};

type ShippingLabel = {
  orderCode: string;
  receiver?: string;
  phone?: string;
  address?: string;
  paymentMethod?: string;
  codAmount?: number;
  itemCount?: number;
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export const formatVnd = (n?: number | null) => `${Number(n ?? 0).toLocaleString("vi-VN")} ₫`;

/** Lấy tem từ backend (chỉ đơn PACKED) rồi mở cửa sổ in. Ném lỗi để trang hiển thị toast. */
export async function printShippingLabel(orderId: number): Promise<void> {
  const label = await staffRequest<ShippingLabel>(`/api/staff/warehouse/orders/${orderId}/label`);
  const win = window.open("", "_blank", "width=480,height=640");
  if (!win) throw new Error("Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup rồi thử lại.");
  const cod = Number(label.codAmount ?? 0) > 0;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Tem ${esc(label.orderCode)}</title>
<style>body{font-family:Arial,sans-serif;margin:16px}.box{border:2px solid #000;padding:14px;width:380px}
h1{font-size:20px;margin:0 0 8px}p{margin:4px 0;font-size:14px}.cod{font-size:20px;font-weight:bold;margin-top:10px}
</style></head><body><div class="box">
<h1>${esc(label.orderCode)}</h1>
<p><b>Người nhận:</b> ${esc(label.receiver)}</p>
<p><b>SĐT:</b> ${esc(label.phone)}</p>
<p><b>Địa chỉ:</b> ${esc(label.address)}</p>
<p><b>Số lượng:</b> ${esc(label.itemCount ?? "")} sản phẩm</p>
<p class="cod">${cod ? `THU HỘ (COD): ${esc(formatVnd(label.codAmount))}` : "ĐÃ THANH TOÁN - KHÔNG THU HỘ"}</p>
</div><script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
}
