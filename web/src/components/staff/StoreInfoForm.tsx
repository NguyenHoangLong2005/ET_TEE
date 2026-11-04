'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save, Store } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

interface Shop {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
}

const inputClass =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

/**
 * Thong tin cua hang duy nhat (ten, dia chi, dien thoai) - hien o trang
 * Lien he, chan trang va app. Dung chung cho chu cua hang va ADMIN.
 */
export default function StoreInfoForm() {
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shop = await apiClient.get<Shop>('/api/shops/current');
      setForm({ name: shop?.name ?? '', address: shop?.address ?? '', phone: shop?.phone ?? '' });
    } catch (e: any) {
      toast.error(e.message || 'Không thể tải thông tin cửa hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Tên cửa hàng không được để trống');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/api/shops/current', form);
      toast.success('Đã lưu thông tin cửa hàng');
    } catch (e: any) {
      toast.error(e.message || 'Không thể lưu thông tin cửa hàng');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8 text-slate-900">
      <PageHeader
        title="Thông tin cửa hàng"
        subtitle="Tên, địa chỉ và số điện thoại hiển thị cho khách ở trang Liên hệ, chân trang website và ứng dụng."
        actions={
          <Button variant="outline" onClick={load} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
            Làm mới
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-xl bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Store className="w-4 h-4 text-primary" /> Cửa hàng
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
            Tên cửa hàng <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={loading}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="VD: ET.TEE"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Địa chỉ</label>
          <input
            type="text"
            disabled={loading}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={inputClass}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Điện thoại</label>
          <input
            type="text"
            disabled={loading}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
            placeholder="VD: 028 1234 5678"
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving} disabled={loading} icon={<Save className="w-4 h-4" />}>
            Lưu
          </Button>
        </div>
      </form>
    </div>
  );
}
