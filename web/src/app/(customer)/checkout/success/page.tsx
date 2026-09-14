"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get("orderCode") ?? "ET-ORDER";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-3xl border border-emerald-500/30 bg-slate-950 p-8 text-center shadow-2xl shadow-emerald-950/20">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-400 font-bold">Order confirmed</p>
        <h1 className="mt-4 text-4xl font-black text-white">Đặt hàng thành công!</h1>
        <p className="mt-4 text-slate-300">
          Mã đơn hàng của bạn là <span className="font-bold text-amber-300">{orderCode}</span>.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Cảm ơn bạn đã mua sắm tại ET.TEE. Chúng tôi sẽ xác nhận và xử lý đơn hàng ngay.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/products"
            className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition"
          >
            Tiếp tục mua sắm
          </Link>
          <Link
            href="/cart"
            className="px-5 py-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold transition"
          >
            Quay lại giỏ hàng
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="rounded-3xl border border-slate-700 bg-slate-950 p-8 text-slate-300">
          Đang tải xác nhận đơn hàng...
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
