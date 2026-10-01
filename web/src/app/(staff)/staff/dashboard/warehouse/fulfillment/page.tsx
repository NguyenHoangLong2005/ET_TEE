"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin, Play, PackageCheck, Printer, Truck, RefreshCw, Search, Phone, User, Clock, Info, Check, ClipboardList, Package } from "lucide-react";
import { staffAction, staffList, errorMessage } from "@/lib/staff-api";
import { formatVnd, printShippingLabel, type WarehouseOrder } from "@/lib/warehouse";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import SafeImage from "@/components/ui/SafeImage";

// Một đơn đi qua 3 bước, mỗi bước là một tab và có đúng một nút chính.
const STEPS = [
  {
    status: "CONFIRMED",
    label: "Lấy hàng",
    icon: ClipboardList,
    hint: "Bấm \"Bắt đầu lấy hàng\" để giữ tồn kho, rồi đi lấy hàng theo vị trí kệ bên dưới.",
  },
  {
    status: "PICKING",
    label: "Đóng gói",
    icon: Package,
    hint: "Đối chiếu hàng đã lấy, đóng gói rồi bấm \"Đã đóng gói\". Tồn kho sẽ được trừ.",
  },
  {
    status: "PACKED",
    label: "Bàn giao",
    icon: Truck,
    hint: "In tem dán lên kiện, đưa cho đơn vị vận chuyển rồi bấm \"Bàn giao\".",
  },
] as const;

type Step = (typeof STEPS)[number]["status"];

export default function WarehouseFulfillmentPage() {
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTabState] = useState<Step>("CONFIRMED");
  const setTab = (t: Step) => {
    setTabState(t);
    window.history.replaceState(null, "", `?tab=${t}`); // giữ tab khi tải lại / chia sẻ link
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(0); // mốc tính "chờ bao lâu", cập nhật mỗi lần tải
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ order: WarehouseOrder; kind: "pack" | "handover" } | null>(null);

  const load = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    setError("");
    try {
      setOrders(await staffList<WarehouseOrder>("/api/staff/warehouse/orders"));
      setNow(Date.now());
    } catch (e) {
      const msg = errorMessage(e);
      setError(msg);
      toast.error(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (STEPS.some((s) => s.status === t)) setTabState(t as Step);
    void load();
    // Quay lại tab trình duyệt thì làm mới: đơn có thể đã được người khác xử lý.
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const run = async (order: WarehouseOrder, path: string, success: string) => {
    setBusyId(order.id);
    try {
      await staffAction(`/api/staff/warehouse/orders/${order.id}/${path}`, "POST");
      toast.success(success);
      setConfirm(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
      await load(true); // trạng thái đơn có thể đã đổi bởi người khác
    }
  };

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders
      .filter((o) => o.status === tab)
      // Đơn cũ xử lý trước (FIFO); backend trả mới nhất trước.
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
      .filter(
        (o) =>
          !q ||
          [o.orderCode, o.customerName, o.phone].some((v) => (v ?? "").toLowerCase().includes(q)) ||
          o.items.some((i) => (i.productName ?? "").toLowerCase().includes(q)),
      );
  }, [orders, tab, searchQuery]);

  const waitMinutes = (iso?: string | null) => (!iso || !now ? 0 : Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000)));
  const formatWait = (mins: number) =>
    mins < 60 ? `${mins} phút` : mins < 60 * 24 ? `${Math.floor(mins / 60)} giờ` : `${Math.floor(mins / 1440)} ngày`;
  // Đơn chờ càng lâu càng nổi bật: >1 ngày vàng, >3 ngày đỏ.
  const waitTone = (mins: number) =>
    mins > 3 * 1440
      ? { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-200" }
      : mins > 1440
        ? { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200" }
        : { bar: "bg-emerald-500", chip: "bg-slate-50 text-slate-600 border-slate-200" };

  const step = STEPS.find((s) => s.status === tab)!;
  const totalUnits = visible.reduce((sum, o) => sum + o.itemCount, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Xuất Hàng"
          subtitle="Lấy hàng → Đóng gói → Bàn giao vận chuyển"
          badge={<span className="bg-primary-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          actions={
            <Button variant="outline" size="sm" onClick={() => void load()} icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}>
              Làm mới
            </Button>
          }
        />

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</p>}

        {/* Stepper: 3 bước, bấm để chuyển tab */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STEPS.map((s, idx) => {
            const count = orders.filter((o) => o.status === s.status).length;
            const active = tab === s.status;
            const Icon = s.icon;
            return (
              <button
                key={s.status}
                onClick={() => setTab(s.status)}
                aria-pressed={active}
                className={`group relative flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-primary-600 bg-white shadow-md ring-2 ring-primary-100"
                    : "border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    active ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bước {idx + 1}</span>
                  <span className={`block text-sm font-bold ${active ? "text-slate-900" : "text-slate-600"}`}>{s.label}</span>
                </span>
                <span
                  className={`min-w-[2.25rem] rounded-full px-2.5 py-1 text-center text-sm font-black font-mono ${
                    count === 0 ? "bg-slate-100 text-slate-400" : active ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {loading && !orders.length ? "–" : count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          <p>{step.hint}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, khách hàng, sản phẩm..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
          </div>
          {!loading && visible.length > 0 && (
            <p className="text-xs text-slate-500">
              <b className="text-slate-800">{visible.length}</b> đơn · <b className="text-slate-800">{totalUnits}</b> sản phẩm · cũ nhất xử lý trước
            </p>
          )}
        </div>

        {loading && orders.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-7 w-7 text-emerald-600" />
            </span>
            <p className="font-bold text-slate-700">{searchQuery ? "Không tìm thấy đơn phù hợp" : "Đã xử lý hết đơn ở bước này"}</p>
            <p className="mt-1 text-xs text-slate-400">{searchQuery ? "Thử từ khóa khác." : "Đơn mới sẽ xuất hiện tại đây."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((order) => {
              // Sắp theo vị trí kệ để đi một vòng kho; hàng chưa gán vị trí xuống cuối.
              const lines = [...order.items].sort((a, b) =>
                (a.warehouseLocation ?? "\uffff").localeCompare(b.warehouseLocation ?? "\uffff"),
              );
              const busy = busyId === order.id;
              const shortLines = lines.filter((l) => l.availableQuantity != null && l.availableQuantity < l.quantity);
              const mins = waitMinutes(order.createdAt);
              const tone = waitTone(mins);
              const cod = (order.codAmount ?? 0) > 0;
              return (
                <article key={order.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  <span className={`absolute inset-y-0 left-0 w-1 ${shortLines.length ? "bg-rose-500" : tone.bar}`} aria-hidden />

                  <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 py-4 pl-6 pr-5">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-mono text-base font-black tracking-tight text-slate-900">{order.orderCode}</h3>
                        {order.createdAt && (
                          <span
                            title={new Date(order.createdAt).toLocaleString("vi-VN")}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.chip}`}
                          >
                            <Clock className="h-3 w-3" /> Chờ {formatWait(mins)}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                            cod ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"
                          }`}
                        >
                          {cod ? `Thu hộ ${formatVnd(order.codAmount)}` : "Đã thanh toán"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400" />{order.customerName || "Khách hàng"}</span>
                        {order.phone && <span className="inline-flex items-center gap-1.5 font-mono"><Phone className="h-3.5 w-3.5 text-slate-400" />{order.phone}</span>}
                      </div>
                      {tab === "PACKED" && order.shippingAddress && (
                        <p className="flex items-start gap-1.5 text-xs text-slate-600">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />{order.shippingAddress}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {tab === "CONFIRMED" && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={busy}
                          disabled={busyId !== null || shortLines.length > 0}
                          onClick={() => void run(order, "picking", `Đã bắt đầu lấy hàng đơn ${order.orderCode}. Lấy xong thì sang bước "Đóng gói".`)}
                          icon={<Play className="h-3.5 w-3.5" />}
                        >
                          Bắt đầu lấy hàng
                        </Button>
                      )}
                      {tab === "PICKING" && (
                        <Button variant="primary" size="sm" disabled={busyId !== null} onClick={() => setConfirm({ order, kind: "pack" })} icon={<PackageCheck className="h-3.5 w-3.5" />}>
                          Đã đóng gói
                        </Button>
                      )}
                      {tab === "PACKED" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId !== null}
                            onClick={() => void printShippingLabel(order.id).catch((e) => toast.error(errorMessage(e)))}
                            icon={<Printer className="h-3.5 w-3.5" />}
                          >
                            In tem
                          </Button>
                          <Button variant="primary" size="sm" disabled={busyId !== null} onClick={() => setConfirm({ order, kind: "handover" })} icon={<Truck className="h-3.5 w-3.5" />}>
                            Bàn giao
                          </Button>
                        </>
                      )}
                    </div>
                  </header>

                  {shortLines.length > 0 && (
                    <p className="border-b border-rose-100 bg-rose-50 py-2 pl-6 pr-5 text-xs font-semibold text-rose-700">
                      Không đủ tồn để lấy hàng. Nhập thêm hàng hoặc báo quản lý xử lý đơn này.
                    </p>
                  )}

                  <ul className="divide-y divide-slate-100">
                    {lines.map((line, idx) => {
                      const short = line.availableQuantity != null && line.availableQuantity < line.quantity;
                      const variant = [line.color, line.size].filter(Boolean).join(" / ");
                      return (
                        <li key={`${line.productId}-${idx}`} className="flex items-center gap-4 py-3 pl-6 pr-5">
                          <SafeImage
                            src={line.image ?? undefined}
                            alt={line.productName}
                            className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800" title={line.productName}>{line.productName}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                              {variant && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{variant}</span>}
                              {line.warehouseLocation ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono font-semibold text-slate-700">
                                  <MapPin className="h-3 w-3 text-slate-400" />{line.warehouseLocation}
                                </span>
                              ) : (
                                <span className="italic text-slate-400">Chưa gán vị trí</span>
                              )}
                              {short && (
                                <span className="rounded-md border border-rose-200 bg-rose-100 px-2 py-0.5 font-bold text-rose-700">
                                  Thiếu hàng (còn {Math.max(0, line.availableQuantity ?? 0)})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm font-black text-white">× {line.quantity}</span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        <ConfirmModal
          isOpen={confirm !== null}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (!confirm) return;
            if (confirm.kind === "pack") {
              await run(confirm.order, "packing", `Đã đóng gói đơn ${confirm.order.orderCode}. Sang tab "3. Bàn giao" để in tem.`);
            } else {
              await run(confirm.order, "handover", `Đã bàn giao đơn ${confirm.order.orderCode} cho vận chuyển`);
            }
          }}
          title={confirm?.kind === "pack" ? "Xác nhận đóng gói" : "Xác nhận bàn giao"}
          message={
            confirm?.kind === "pack"
              ? `Đã lấy đủ ${confirm.order.itemCount} sản phẩm và đóng gói xong đơn ${confirm.order.orderCode}? Tồn kho sẽ được trừ ngay.`
              : `Bàn giao đơn ${confirm?.order.orderCode ?? ""} cho vận chuyển? Không thể hoàn tác.`
          }
          confirmText={confirm?.kind === "pack" ? "Đã đóng gói" : "Bàn giao"}
          type="info"
          isLoading={busyId !== null}
        />
      </div>
    </main>
  );
}
