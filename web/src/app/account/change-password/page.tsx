'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Save, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.currentPassword) {
      errors['currentPassword'] = 'Vui lòng nhập mật khẩu hiện tại.';
    }
    if (!formData.newPassword) {
      errors['newPassword'] = 'Vui lòng nhập mật khẩu mới.';
    } else if (formData.newPassword.length < 8) {
      errors['newPassword'] = 'Mật khẩu mới phải từ 8 ký tự trở lên.';
    } else if (!/[a-zA-Z]/.test(formData.newPassword) || !/[0-9]/.test(formData.newPassword)) {
      errors['newPassword'] = 'Mật khẩu mới phải bao gồm cả chữ và số.';
    }
    if (!formData.confirmPassword) {
      errors['confirmPassword'] = 'Vui lòng xác nhận mật khẩu mới.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors['confirmPassword'] = 'Xác nhận mật khẩu không khớp.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/account/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>)
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Lỗi đổi mật khẩu');
      }

      setSuccessMessage('Đổi mật khẩu thành công! Bạn sẽ được chuyển về trang đăng nhập.');
      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');

      // Clear form
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      // Force logout and redirect
      setTimeout(() => {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black uppercase mb-6 pb-4 border-b border-gray-100 flex items-center gap-2">
        <Lock className="w-6 h-6" /> Đổi mật khẩu
      </h2>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Mật khẩu hiện tại <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              name="currentPassword"
              required
              value={formData.currentPassword}
              onChange={handleChange}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow ${fieldErrors['currentPassword'] ? 'border-red-400' : 'border-gray-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-4 top-3 text-gray-400 hover:text-black"
            >
              {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {fieldErrors['currentPassword'] && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors['currentPassword']}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Mật khẩu mới <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              name="newPassword"
              required
              value={formData.newPassword}
              onChange={handleChange}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow ${fieldErrors['newPassword'] ? 'border-red-400' : 'border-gray-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-4 top-3 text-gray-400 hover:text-black"
            >
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {fieldErrors['newPassword'] ? (
            <p className="text-red-500 text-xs mt-1">{fieldErrors['newPassword']}</p>
          ) : (
            <p className="text-xs text-gray-500">Tối thiểu 8 ký tự, bao gồm cả chữ và số.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Xác nhận mật khẩu mới <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow ${fieldErrors['confirmPassword'] ? 'border-red-400' : 'border-gray-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-3 text-gray-400 hover:text-black"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {fieldErrors['confirmPassword'] && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors['confirmPassword']}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center justify-center gap-2 w-full px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save className="w-5 h-5" />
          )}
          CẬP NHẬT MẬT KHẨU
        </button>
      </form>
    </div>
  );
}
