'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  
  const [formData, setFormData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      router.push('/auth/forgot-password');
    }
  }, [searchParams, router]);

  useEffect(() => {
    const expiryTime = sessionStorage.getItem('resetPwdCooldownExpiry');
    if (expiryTime) {
      const remaining = Math.max(0, Math.floor((parseInt(expiryTime) - Date.now()) / 1000));
      setResendCooldown(remaining);
      if (remaining === 0) {
        sessionStorage.removeItem('resetPwdCooldownExpiry');
      }
    } else {
      sessionStorage.setItem('resetPwdCooldownExpiry', (Date.now() + 60000).toString());
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
        if (resendCooldown - 1 <= 0) {
          sessionStorage.removeItem('resetPwdCooldownExpiry');
        }
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.newPassword.length < 8 || !/.*[a-zA-Z].*/.test(formData.newPassword) || !/.*[0-9].*/.test(formData.newPassword)) {
      setError('Mật khẩu phải từ 8 ký tự, bao gồm cả chữ và số');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword({
        email,
        otp: formData.otp,
        newPassword: formData.newPassword
      });
      setSuccessMessage('Đổi mật khẩu thành công. Đang chuyển hướng...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    setSuccessMessage('');
    setIsResending(true);

    try {
      await authService.resendPasswordResetCode({ email });
      setSuccessMessage('Mã khôi phục mới đã được gửi');
      setResendCooldown(60);
      sessionStorage.setItem('resetPwdCooldownExpiry', (Date.now() + 60000).toString());
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi lại mã khôi phục');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col justify-center py-16 sm:px-6 lg:px-8 min-h-[calc(100vh-64px)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-4 text-center text-3xl font-black uppercase tracking-tight text-slate-900">
          Tạo mật khẩu mới
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Mã xác nhận (OTP) gồm 6 chữ số đã được gửi đến<br />
          <span className="font-bold text-slate-900">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-3xl sm:px-10 border border-slate-200/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm text-center font-medium">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-sm text-center font-medium">
                {successMessage}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mã OTP (6 chữ số)</label>
              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="appearance-none block w-full px-3.5 py-3 border border-slate-300 rounded-xl shadow-2xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-center tracking-widest text-lg font-mono font-bold text-slate-900 transition-all"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu mới</label>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none block w-full px-3.5 py-3 border border-slate-300 rounded-xl shadow-2xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-[15px] text-slate-900 transition-all"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Xác nhận mật khẩu mới</label>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none block w-full px-3.5 py-3 border border-slate-300 rounded-xl shadow-2xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-[15px] text-slate-900 transition-all"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-6 border border-transparent rounded-full shadow-md text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
              </button>
            </div>
            
            <div className="text-center mt-4 pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="text-sm font-bold text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isResending ? 'Đang gửi...' : resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : 'Gửi lại mã'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex justify-center items-center p-8 text-slate-500">Đang tải...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

