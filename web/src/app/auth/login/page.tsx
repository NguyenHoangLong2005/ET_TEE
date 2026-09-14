'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      const res = await authService.login(formData);
      await login(res.token);

      // Phase B: If the backend reported any cart-merge warnings (e.g. guest cart
      // item exceeded available stock), surface them so the user is informed
      // instead of silently capping their quantity.
      const warnings = authService.getPendingCartMergeWarnings();
      if (warnings.length > 0) {
        const message = warnings.length === 1
          ? `Đã gộp giỏ hàng tạm vào tài khoản. Lưu ý: ${warnings[0]}`
          : `Đã gộp giỏ hàng tạm vào tài khoản với ${warnings.length} lưu ý.`;
        setError(message);
        authService.clearPendingCartMergeWarnings();
        return;
      }

      // Redirect to home or back to previous page
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        router.push(redirect);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      if (err.message === 'UNVERIFIED') {
        setError('Tài khoản của bạn chưa được xác thực email.');
        setNeedsVerification(true);
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToVerify = () => {
    router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Đăng nhập
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Hoặc{' '}
          <Link href="/auth/register" className="font-medium text-[#e50027] hover:text-[#cc0022]">
            tạo tài khoản mới
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center">
                {error}
                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleGoToVerify}
                    className="block mt-2 font-bold underline"
                  >
                    Đến trang xác thực email
                  </button>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e50027] focus:border-[#e50027] sm:text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e50027] focus:border-[#e50027] sm:text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#e50027] focus:ring-[#e50027] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <div className="text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-[#e50027] hover:text-[#cc0022]">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#e50027] hover:bg-[#cc0022] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e50027] disabled:opacity-50"
              >
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
