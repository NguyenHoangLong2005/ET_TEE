'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services/authService';
import Link from 'next/link';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const body: any = await authService.verifyEmail({ email: emailParam, code });
      setSuccess('Xác thực thành công! Đang chuyển hướng...');
      const warnings: string[] = body?.cartWarnings || [];
      const suffix = warnings.length
        ? ` Lưu ý giỏ hàng: ${warnings.length} mục đã được điều chỉnh.`
        : '';
      setSuccess(`Xác thực thành công! Đang chuyển hướng...${suffix}`);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message);
      if (err.message?.toLowerCase().includes('hết hạn')) {
        setCountdown(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await authService.resendCode({ email: emailParam });
      setSuccess('Mã mới đã được gửi tới email của bạn.');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-md rounded-3xl sm:px-10 border border-slate-200/80 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="text-center mb-6 relative z-10">
        <p className="text-sm text-slate-600 leading-relaxed">
          Mã xác thực 6 số đã được gửi tới email <strong className="text-slate-900">{emailParam}</strong>
        </p>
      </div>

      <form className="space-y-6 relative z-10" onSubmit={handleVerify}>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm text-center font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-sm text-center font-medium">
            {success}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 text-center mb-2">Nhập mã xác thực</label>
          <div className="text-center">
            <input
              type="text"
              required
              maxLength={6}
              className="appearance-none block w-full text-center text-2xl tracking-widest px-3.5 py-3 border border-slate-300 rounded-xl shadow-2xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono font-bold text-slate-900 transition-all"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full flex justify-center py-3.5 px-6 border border-transparent rounded-full shadow-md text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center relative z-10">
        <button
          onClick={handleResend}
          disabled={countdown > 0 || isLoading}
          className="text-sm font-bold text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã xác thực'}
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col justify-center py-16 sm:px-6 lg:px-8 min-h-[calc(100vh-64px)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-4 text-center text-3xl font-black uppercase tracking-tight text-slate-900">
          Xác thực Email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center text-slate-500">Đang tải...</div>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}

