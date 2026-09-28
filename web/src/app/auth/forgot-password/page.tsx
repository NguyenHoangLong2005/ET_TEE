'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.forgotPassword({ email });
      // Always redirect to reset password page to prevent email enumeration
      router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col pt-20 pb-16 sm:px-6 lg:px-8 min-h-[calc(100vh-64px)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-4 text-center text-3xl font-black uppercase tracking-tight text-slate-900">
          Quên mật khẩu
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Nhập email của bạn để nhận mã khôi phục
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
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <div>
                <input
                  type="email"
                  required
                  className="appearance-none block w-full px-3.5 py-3 border border-slate-300 rounded-xl shadow-2xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-[15px] text-slate-900 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-6 border border-transparent rounded-full shadow-md text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang gửi...' : 'Gửi mã khôi phục'}
              </button>
            </div>
            
            <div className="text-center pt-2">
              <Link href="/auth/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

