"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Truck, Save, ShieldCheck, AlertTriangle, RefreshCw, Smartphone, Banknote, ShieldAlert } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Form State
  const [momoEnabled, setMomoEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(true);
  const [vnpayEnabled, setVnpayEnabled] = useState(true);
  const [freeShipThreshold, setFreeShipThreshold] = useState(500000);
  const [standardShipFee, setStandardShipFee] = useState(30000);
  const [expressShipFee, setExpressShipFee] = useState(50000);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/api/admin/settings');
      const settings = res?.settings || {};

      if (settings.payment_momo_enabled !== undefined) {
        setMomoEnabled(settings.payment_momo_enabled === 'true');
      }
      if (settings.payment_cod_enabled !== undefined) {
        setCodEnabled(settings.payment_cod_enabled === 'true');
      }
      if (settings.payment_vnpay_enabled !== undefined) {
        setVnpayEnabled(settings.payment_vnpay_enabled === 'true');
      }
      if (settings.shipping_free_threshold !== undefined) {
        setFreeShipThreshold(Number(settings.shipping_free_threshold) || 500000);
      }
      if (settings.shipping_standard_fee !== undefined) {
        setStandardShipFee(Number(settings.shipping_standard_fee) || 30000);
      }
      if (settings.shipping_express_fee !== undefined) {
        setExpressShipFee(Number(settings.shipping_express_fee) || 50000);
      }
      if (settings.system_maintenance_mode !== undefined) {
        setMaintenanceMode(settings.system_maintenance_mode === 'true');
      }
    } catch {
      toast.error('Không thể tải cấu hình từ máy chủ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!momoEnabled && !codEnabled && !vnpayEnabled) {
      toast.error('Phải bật ít nhất 1 phương thức thanh toán để khách hàng có thể mua sắm!');
      return;
    }
    if (freeShipThreshold < 0 || standardShipFee < 0 || expressShipFee < 0) {
      toast.error('Phí vận chuyển và hạn mức miễn phí vận chuyển không được âm!');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post('/api/admin/settings', {
        payment_momo_enabled: String(momoEnabled),
        payment_cod_enabled: String(codEnabled),
        payment_vnpay_enabled: String(vnpayEnabled),
        shipping_free_threshold: String(freeShipThreshold),
        shipping_standard_fee: String(standardShipFee),
        shipping_express_fee: String(expressShipFee),
        system_maintenance_mode: String(maintenanceMode),
      });

      setLastSaved(new Date());
      toast.success('Đã lưu cấu hình Thanh toán & Vận chuyển vào cơ sở dữ liệu thành công!');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']} requiredPermissions={['CONFIG_PAYMENT_SHIPPING']}>
      <form onSubmit={handleSave} className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-800">
        <PageHeader
          title="Cấu Hình Thanh Toán & Vận Chuyển"
          subtitle={`Quản lý các cổng thanh toán khả dụng và biểu phí giao hàng toàn hệ thống${
            lastSaved ? ` · Đã lưu lúc ${lastSaved.toLocaleTimeString('vi-VN')}` : ''
          }`}
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Thanh toán & Vận chuyển' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                onClick={fetchSettings}
                disabled={loading || isSaving}
              >
                Làm mới
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSaving || loading}
                loading={isSaving}
                icon={<Save className="w-4 h-4" />}
              >
                Lưu Cấu Hình
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* ─── Payment Methods Section ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Phương Thức Thanh Toán Khả Dụng</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bật/tắt các cổng thanh toán trực tuyến và tiền mặt cho khách hàng
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* MoMo */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Ví Điện Tử MoMo</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Thanh toán quét mã QR & liên kết ví trực tiếp
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={momoEnabled}
                    onChange={(e) => setMomoEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              {/* VNPAY / VietQR */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">VNPAY-QR & Chuyển Khoản Ngân Hàng</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cổng thanh toán thẻ ATM / Visa / VietQR tự động
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={vnpayEnabled}
                    onChange={(e) => setVnpayEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              {/* COD */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Thanh Toán Khi Nhận Hàng (COD)</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Khách hàng thanh toán tiền mặt trực tiếp cho bưu tá
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={codEnabled}
                    onChange={(e) => setCodEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>
          </div>

          {/* ─── Shipping & Logistics Section ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Cấu Hình Vận Chuyển Toàn Quốc</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập hạn mức miễn phí vận chuyển và biểu phí giao hàng
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Hạn Mức Miễn Phí Vận Chuyển (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    required
                    value={freeShipThreshold}
                    onChange={(e) => setFreeShipThreshold(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-3 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Đơn hàng có tổng giá trị từ mức này trở lên sẽ tự động được miễn phí ship.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Phí Vận Chuyển Tiêu Chuẩn (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={standardShipFee}
                    onChange={(e) => setStandardShipFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-3 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Áp dụng cho các đơn hàng chưa đạt hạn mức miễn phí vận chuyển.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Phí Giao Hàng Hỏa Tốc (2H - 4H)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={expressShipFee}
                    onChange={(e) => setExpressShipFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-3 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── System Maintenance Mode ─── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Chế Độ Bảo Trì Hệ Thống (Maintenance Mode)</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Khi bật, storefront sẽ tạm dừng nhận đơn hàng mới để phục vụ nâng cấp cơ sở dữ liệu.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>

        </div>
      </form>
    </PermissionGuard>
  );
}
