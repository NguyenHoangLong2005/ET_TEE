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
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600">
          Mã xác thực 6 số đã được gửi tới email <strong>{emailParam}</strong>
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleVerify}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm text-center">
            {success}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 text-center">Nhập mã xác thực</label>
          <div className="mt-2 text-center">
            <input
              type="text"
              required
              maxLength={6}
              className="appearance-none block w-full text-center text-2xl tracking-widest px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e50027] focus:border-[#e50027]"
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#e50027] hover:bg-[#cc0022] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e50027] disabled:opacity-50"
          >
            {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={handleResend}
          disabled={countdown > 0 || isLoading}
          className="text-sm text-gray-500 hover:text-[#e50027] disabled:opacity-50 disabled:hover:text-gray-500"
        >
          {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã xác thực'}
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Xác thực Email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center">Đang tải...</div>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}
