"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, PackageCheck, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

<<<<<<< HEAD
type Order = { orderId?: number; id?: string; orderCode?: string; customerName?: string; customerEmail?: string; phone?: string; shippingAddress?: string; status: string };
type Label = { orderId?: string; orderCode?: string; receiver?: string; phone?: string; address?: string; codAmount?: number };
const orderId = (order: Order) => order.orderId ?? order.id;
const orderKey = (order: Order, fallback: string) => order.orderCode ?? fallback;
export default function PackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [label, setLabel] = useState<Label | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { setOrders(await staffList<Order>("/api/staff/warehouse/orders", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const completePacking = async (id: number | string) => {
    if (!window.confirm(`Xác nhận đơn #${id} đã lấy đủ và đóng gói xong?`)) return;
    setBusy(String(id)); setError(""); setNotice("");
=======
type WarehouseOrder = {
  id: number;
  orderCode?: string;
  createdAt?: string;
  status: string;
};

export default function WarehousePackingPage() {
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchPackingOrders = async () => {
>>>>>>> main
    try {
      setLoading(true);
      const data = await apiClient.get<WarehouseOrder[]>('/api/staff/warehouse/orders');
      if (Array.isArray(data)) {
        setOrders(data.filter((o: any) => o.status === 'PACKING' || o.status === 'PICKED' || o.status === 'CONFIRMED'));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi tải đơn đóng gói');
    } finally {
      setLoading(false);
    }
  };
<<<<<<< HEAD
  const openLabel = async (id: number | string) => {
    setBusy(String(id)); setError("");
    try { setLabel(await staffRequest<Label>(`/api/staff/warehouse/orders/${id}/label`)); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };
  const visible = orders.filter(o => o.status === "picking" || o.status === "packed");
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10 print:bg-white print:p-0 print:text-black"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap justify-between gap-4 print:hidden"><div><Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Bộ phận kho</Link><h1 className="mt-3 text-3xl font-bold">Đóng gói và in tem</h1></div><button className="rounded bg-orange-600 px-4 py-2" onClick={() => void load()}>Làm mới</button></div>
    <nav className="flex flex-wrap gap-2 text-sm mt-3 print:hidden">
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
    </nav>
    <p className="text-sm text-slate-400 print:hidden">Theo backend hiện tại, hoàn tất picking và packing đều đưa đơn về PACKED. Chọn một trong hai thao tác, không cần thực hiện cả hai.</p>
    {error && <p role="alert" className="rounded bg-red-950 p-3 text-red-200 print:hidden">{error}</p>}{notice && <p role="status" className="rounded bg-emerald-950 p-3 text-emerald-200 print:hidden">{notice}</p>}
    <section className="space-y-3 print:hidden">{loading ? <p>Đang tải đơn...</p> : visible.map(o => { const id=orderId(o); return <div key={id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><div><p className="font-bold">{o.orderCode ?? `Đơn #${id}`}</p><p className="text-sm text-slate-400">{o.customerName || o.customerEmail || "Khách hàng"} · {o.status}</p><p className="text-xs text-slate-400">{o.shippingAddress || "Chưa có địa chỉ"}</p></div><div className="flex flex-wrap gap-2">{o.status === "picking" && <button disabled={id == null || busy !== null} onClick={() => id != null && void completePacking(id)} className="rounded bg-emerald-700 px-4 py-2 text-sm disabled:opacity-50">Hoàn tất đóng gói</button>}{o.status === "packed" && <button disabled={id == null || busy !== null} onClick={() => id != null && void openLabel(id)} className="rounded bg-orange-700 px-4 py-2 text-sm disabled:opacity-50">Xem / in tem</button>}</div></div>; })}{!loading && !visible.length && <p className="rounded border border-slate-800 p-5 text-slate-400">Chưa có đơn đang picking hoặc đã đóng gói.</p>}</section>
    {label && <section className="rounded-xl border border-slate-600 bg-white p-6 text-black print:border-black" aria-label="Tem giao hàng"><h2 className="text-xl font-black">TEM GIAO HÀNG ET.TEE</h2><div className="mt-4 space-y-2 text-sm"><p>Mã đơn: {label.orderCode || label.orderId}</p><p>Người nhận: {label.receiver || "—"}</p><p>Điện thoại: {label.phone || "—"}</p><p>Địa chỉ: {label.address || "—"}</p><p>COD: {Number(label.codAmount || 0).toLocaleString("vi-VN")} ₫</p></div><button type="button" onClick={() => window.print()} className="mt-5 rounded bg-slate-900 px-4 py-2 text-sm text-white print:hidden">In tem</button><button type="button" onClick={() => setLabel(null)} className="ml-2 rounded border px-4 py-2 text-sm print:hidden">Đóng tem</button></section>}
  </div></main>;
=======

  useEffect(() => {
    fetchPackingOrders();
  }, []);

  const handlePack = async (id: number) => {
    setBusyId(id);
    try {
      await apiClient.post(`/api/staff/warehouse/orders/${id}/packing`);
      toast.success('Đã hoàn tất đóng gói đơn hàng!');
      await fetchPackingOrders();
    } catch (e: any) {
      toast.error(e?.message || 'Đóng gói đơn hàng thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const lower = searchQuery.toLowerCase();
    return (
      (o.orderCode || `#${o.id}`).toLowerCase().includes(lower) ||
      o.status.toLowerCase().includes(lower)
    );
  });

  const columns: Column<WarehouseOrder>[] = [
    {
      key: "orderCode",
      header: "Mã đơn hàng",
      render: (order) => (
        <span className="font-mono font-bold text-slate-900">{order.orderCode || `#${order.id}`}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày đặt",
      render: (order) => (
        <span className="text-xs text-slate-600">
          {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (order) => (
        <StatusBadge
          status={order.status}
          label={`Chờ đóng gói (${order.status})`}
        />
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (order) => (
        <Button
          variant="primary"
          size="sm"
          loading={busyId === order.id}
          onClick={() => handlePack(order.id)}
          icon={<PackageCheck className="w-3.5 h-3.5" />}
        >
          Hoàn tất đóng gói
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Danh Sách Đóng Gói (Packing)"
        subtitle="Kiểm tra lại sản phẩm, đóng kiện và dán nhãn trước khi chuyển sang khâu bàn giao vận chuyển"
        badge={<span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
        breadcrumbs={[
          { label: "Kho hàng", href: "/staff/dashboard/warehouse/dashboard" },
          { label: "Đóng gói" },
        ]}

        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPackingOrders}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            Làm mới
          </Button>
        }
      />

      <nav className="flex flex-wrap gap-2 text-xs font-semibold">
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/dashboard">Tổng quan</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
        <Link className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-bold px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
      </nav>

      <DataTable<WarehouseOrder>
        columns={columns}
        data={filteredOrders}
        rowKey={(order) => order.id}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm mã đơn hàng..."
        emptyTitle="Không có đơn hàng chờ đóng gói"
        emptyMessage="Hiện tại không có kiện hàng nào cần đóng gói."
      />
    </div>
  );
>>>>>>> main
}
