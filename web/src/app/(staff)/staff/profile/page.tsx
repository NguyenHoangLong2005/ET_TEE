'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { KeyRound, Save } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface StaffProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role?: string;
  shopId?: number | null;
  status?: string;
  createdAt?: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị hệ thống',
  SUPER_ADMIN: 'Quản trị hệ thống',
  SHOP_OWNER: 'Chủ cửa hàng',
  MARKETING_STAFF: 'Nhân viên Marketing',
  SALES_STAFF: 'Nhân viên Bán hàng',
  CSKH_STAFF: 'Nhân viên CSKH',
  WAREHOUSE_STAFF: 'Nhân viên Kho',
  SHIPPING_STAFF: 'Nhân viên Vận chuyển',
  STAFF: 'Nhân viên',
};

const inputClass =
  'ui-control w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500';

const initialsOf = (name: string) =>
  name ? name.trim().split(/\s+/).map((w) => w[0]).slice(-2).join('').toUpperCase() : 'U';

const formatDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

export default function StaffProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.get<StaffProfile>('/api/staff/me/profile');
        setProfile(data);
        setForm({ fullName: data.fullName || '', phone: data.phone || '' });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Không thể tải hồ sơ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty = !!profile && (form.fullName.trim() !== (profile.fullName || '') || form.phone.trim() !== (profile.phone || ''));

  const validate = () => {
    const next: Record<string, string> = {};
    const name = form.fullName.trim();
    if (name.length < 2) next.fullName = 'Họ tên tối thiểu 2 ký tự';
    else if (name.length > 100) next.fullName = 'Họ tên tối đa 100 ký tự';
    if (form.phone.trim() && !/^[0-9+\s-]{8,15}$/.test(form.phone.trim())) next.phone = 'Số điện thoại không hợp lệ (8-15 chữ số)';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const data = await apiClient.put<StaffProfile>('/api/staff/me/profile', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      });
      setProfile(data);
      setForm({ fullName: data.fullName || '', phone: data.phone || '' });
      updateUser({ fullName: data.fullName, phone: data.phone || '' }); // keeps the sidebar name in sync
      toast.success('Đã cập nhật hồ sơ');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">
      <PageHeader
        title="Hồ sơ cá nhân"
        subtitle="Thông tin tài khoản quản trị của bạn."
        actions={
          <Link href="/staff/change-password">
            <Button variant="outline" icon={<KeyRound className="w-4 h-4" />}>Đổi mật khẩu</Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3 animate-pulse">
          <div className="h-64 rounded-xl bg-white border border-slate-200" />
          <div className="h-64 rounded-xl bg-white border border-slate-200 lg:col-span-2" />
        </div>
      ) : !profile ? (
        <Card>
          <p className="text-sm text-slate-500">Không tải được hồ sơ. Vui lòng tải lại trang.</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Thẻ tóm tắt */}
          <Card>
            <div className="flex flex-col items-center text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                {initialsOf(profile.fullName)}
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{profile.fullName}</h2>
              <p className="text-sm text-slate-500 break-all">{profile.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {ROLE_LABELS[profile.role || ''] || profile.role || 'Nhân viên'}
              </span>
            </div>
            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-sm">
              {profile.shopId != null && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Chi nhánh</dt>
                  <dd className="font-semibold text-slate-900">#{profile.shopId}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Trạng thái</dt>
                <dd className="font-semibold text-emerald-600">{profile.status === 'ACTIVE' ? 'Đang hoạt động' : profile.status || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Tham gia từ</dt>
                <dd className="font-semibold text-slate-900">{formatDate(profile.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          {/* Form */}
          <Card className="lg:col-span-2">
            <form onSubmit={handleSave} className="space-y-5" noValidate>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Thông tin cơ bản</h3>
                <p className="mt-1 text-sm text-slate-500">Email và vai trò do quản trị viên hệ thống quản lý nên không thể tự thay đổi.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Họ tên <span className="text-rose-500">*</span></label>
                  <input
                    value={form.fullName}
                    onChange={(e) => { setForm({ ...form, fullName: e.target.value }); setErrors({ ...errors, fullName: '' }); }}
                    className={`${inputClass} ${errors.fullName ? '!border-rose-300' : ''}`}
                    autoComplete="name"
                  />
                  {errors.fullName && <p className="mt-1 text-xs font-medium text-rose-600">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Số điện thoại</label>
                  <input
                    value={form.phone}
                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }}
                    className={`${inputClass} ${errors.phone ? '!border-rose-300' : ''}`}
                    inputMode="tel"
                    placeholder="0901234567"
                    autoComplete="tel"
                  />
                  {errors.phone && <p className="mt-1 text-xs font-medium text-rose-600">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Email đăng nhập</label>
                  <input value={profile.email} disabled className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Vai trò</label>
                  <input value={ROLE_LABELS[profile.role || ''] || profile.role || ''} disabled className={inputClass} />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!dirty || saving}
                  onClick={() => { setForm({ fullName: profile.fullName || '', phone: profile.phone || '' }); setErrors({}); }}
                >
                  Hoàn tác
                </Button>
                <Button type="submit" loading={saving} disabled={!dirty} icon={<Save className="w-4 h-4" />}>
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
