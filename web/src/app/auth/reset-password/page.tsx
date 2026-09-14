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
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
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
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi lại mã khôi phục');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Tạo mật khẩu mới
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Mã xác nhận (OTP) gồm 6 chữ số đã được gửi đến<br />
          <span className="font-medium text-gray-900">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm text-center">
                {successMessage}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Mã OTP (6 chữ số)</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e50027] focus:border-[#e50027] sm:text-sm text-center tracking-widest text-lg font-semibold"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e50027] focus:border-[#e50027] sm:text-sm"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e50027] focus:border-[#e50027] sm:text-sm"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#e50027] hover:bg-[#cc0022] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e50027] disabled:opacity-50"
              >
                {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <Suspense fallback={<div className="flex-1 flex justify-center items-center">Đang tải...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
