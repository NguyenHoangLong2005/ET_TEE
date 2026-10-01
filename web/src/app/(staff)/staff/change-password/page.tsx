'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Eye, EyeOff, Save } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

const inputClass =
  'ui-control w-full h-11 pl-3.5 pr-11 bg-white border border-slate-200 rounded-xl font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

function PasswordField({
  label, name, value, onChange, error, autoComplete,
}: {
  label: string;
  name: FieldName;
  value: string;
  onChange: (name: FieldName, value: string) => void;
  error?: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          autoComplete={autoComplete}
          className={`${inputClass} ${error ? '!border-rose-300' : ''}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export default function StaffChangePasswordPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [form, setForm] = useState<Record<FieldName, string>>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const rules = [
    { label: 'Ít nhất 8 ký tự', ok: form.newPassword.length >= 8 },
    { label: 'Có chữ cái', ok: /[a-zA-Z]/.test(form.newPassword) },
    { label: 'Có chữ số', ok: /[0-9]/.test(form.newPassword) },
    { label: 'Khác mật khẩu hiện tại', ok: !!form.newPassword && form.newPassword !== form.currentPassword },
  ];
  const strength = rules.filter((r) => r.ok).length + (/[^A-Za-z0-9]/.test(form.newPassword) ? 1 : 0);
  const strengthLabel = strength <= 2 ? 'Yếu' : strength === 3 ? 'Trung bình' : strength === 4 ? 'Khá' : 'Mạnh';
  const strengthColor = strength <= 2 ? 'bg-rose-500' : strength === 3 ? 'bg-amber-500' : 'bg-emerald-500';

  const setField = (name: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const next: Partial<Record<FieldName, string>> = {};
    if (!form.currentPassword) next.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (!rules.every((r) => r.ok)) next.newPassword = 'Mật khẩu mới chưa đáp ứng đủ yêu cầu bên dưới';
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = 'Xác nhận mật khẩu không khớp';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // After a successful change the session is ended so the new password is used from the next sign-in.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      logout();
      router.push('/auth/login');
    }, 2500);
    return () => clearTimeout(t);
  }, [done, logout, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await apiClient.put('/api/staff/me/password', form);
      toast.success('Đổi mật khẩu thành công');
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể đổi mật khẩu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">
      <PageHeader title="Đổi mật khẩu" subtitle="Dùng mật khẩu riêng, mạnh và không trùng với dịch vụ khác." />

      <div className="max-w-2xl">
        <Card>
          {done ? (
            <div className="py-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-7 w-7 text-emerald-600" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">Đã đổi mật khẩu</h3>
              <p className="mt-1 text-sm text-slate-500">Bạn sẽ được đăng xuất để đăng nhập lại bằng mật khẩu mới...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <PasswordField label="Mật khẩu hiện tại" name="currentPassword" value={form.currentPassword} onChange={setField} error={errors.currentPassword} autoComplete="current-password" />

              <div className="space-y-3">
                <PasswordField label="Mật khẩu mới" name="newPassword" value={form.newPassword} onChange={setField} error={errors.newPassword} autoComplete="new-password" />
                {form.newPassword && (
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strengthColor}`} style={{ width: `${Math.min(strength, 5) * 20}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 w-20 text-right">{strengthLabel}</span>
                    </div>
                  </div>
                )}
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {rules.map((r) => (
                    <li key={r.label} className={`flex items-center gap-2 text-sm ${r.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Check className={`h-4 w-4 shrink-0 ${r.ok ? '' : 'opacity-30'}`} />
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>

              <PasswordField label="Nhập lại mật khẩu mới" name="confirmPassword" value={form.confirmPassword} onChange={setField} error={errors.confirmPassword} autoComplete="new-password" />

              <div className="flex justify-end pt-1">
                <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>
                  Đổi mật khẩu
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
