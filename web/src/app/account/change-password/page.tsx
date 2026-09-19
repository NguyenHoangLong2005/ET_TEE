'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const getApiBase = () => getApiBaseUrl();

export default function ChangePasswordPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const calculateStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };

  const strength = calculateStrength(formData.newPassword);

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

    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${getApiBase()}/api/account/change-password`, {
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

      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setIsSuccess(true);
      
      let timeLeft = 3;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          logout(); // This clears both local and session storage
          router.push('/auth/login');
        }
      }, 1000);

    } catch (err: any) {
      toast.error(err.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-black uppercase mb-4">Đổi mật khẩu thành công!</h2>
        <p className="text-gray-500 mb-8">
          Mật khẩu của bạn đã được cập nhật an toàn. Vui lòng đăng nhập lại bằng mật khẩu mới.
        </p>
        <p className="font-medium text-gray-900 bg-gray-50 py-3 rounded-lg border border-gray-200">
          Tự động đăng xuất sau <span className="text-red-600 font-bold">{countdown}</span> giây...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-2">
      <h2 className="text-2xl font-black uppercase mb-6 pb-4 border-b border-gray-100 flex items-center justify-center gap-2">
        <Lock className="w-6 h-6" /> Đổi mật khẩu
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Mật khẩu hiện tại <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              name="currentPassword"
              required
              value={formData.currentPassword}
              onChange={handleChange}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 ${fieldErrors['currentPassword'] ? 'border-red-400' : 'border-gray-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-4 top-3 text-gray-400 hover:text-black transition-colors"
            >
              {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {fieldErrors['currentPassword'] && (
            <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors['currentPassword']}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Mật khẩu mới <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              name="newPassword"
              required
              value={formData.newPassword}
              onChange={handleChange}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 ${fieldErrors['newPassword'] ? 'border-red-400' : 'border-gray-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-4 top-3 text-gray-400 hover:text-black transition-colors"
            >
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {formData.newPassword && (
            <div className="flex gap-1 mt-2">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 flex-1 rounded-full ${
                    strength > i * 25 
                      ? strength > 75 ? 'bg-green-500' : strength > 50 ? 'bg-yellow-500' : 'bg-red-500' 
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          {fieldErrors['newPassword'] ? (
            <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors['newPassword']}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Tối thiểu 8 ký tự, bao gồm chữ cái và số.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Xác nhận mật khẩu mới <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              onPaste={(e) => {
                e.preventDefault();
                toast.error('Vui lòng gõ lại mật khẩu để xác nhận.');
              }}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-shadow text-gray-900 ${fieldErrors['confirmPassword'] ? 'border-red-400' : 'border-gray-300'}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-3 text-gray-400 hover:text-black transition-colors"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {fieldErrors['confirmPassword'] && (
            <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors['confirmPassword']}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center justify-center gap-2 w-full px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-4"
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
