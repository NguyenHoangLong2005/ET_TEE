'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const uid = useId();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const emailErrId = `${uid}-email-err`;
  const passwordErrId = `${uid}-password-err`;

  const validateEmail = (value: string) => {
    if (!value) return 'Vui lòng nhập email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không đúng định dạng.';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Vui lòng nhập mật khẩu.';
    if (value.length < 6) return 'Mật khẩu phải từ 6 ký tự trở lên.';
    return '';
  };

  const handleBlur = (field: keyof FieldErrors) => {
    const val = formData[field];
    const err = field === 'email' ? validateEmail(val) : validatePassword(val);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);
    if (emailErr || passwordErr) {
      setFieldErrors({ email: emailErr, password: passwordErr });
      return;
    }

    setServerError('');
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      const res = await authService.login(formData);
      await login(res.token, rememberMe);

      const warnings = authService.getPendingCartMergeWarnings();
      if (warnings.length > 0) {
        const message = warnings.length === 1
          ? `Đã gộp giỏ hàng tạm vào tài khoản. Lưu ý: ${warnings[0]}`
          : `Đã gộp giỏ hàng tạm vào tài khoản với ${warnings.length} lưu ý.`;
        setServerError(message);
        authService.clearPendingCartMergeWarnings();
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      
      if (redirect) {
        router.push(redirect);
      } else {
        const userRole = res.user?.role || res.role;
        const roleRedirectMap: Record<string, string> = {
          ADMIN: '/admin/dashboard',
          SHOP_OWNER: '/staff/dashboard',
          MARKETING_STAFF: '/staff/dashboard/marketing',
          SALES_STAFF: '/staff/dashboard/sales',
          WAREHOUSE_STAFF: '/staff/dashboard/warehouse',
          SHIPPING_STAFF: '/staff/dashboard/shipping',
          STAFF: '/staff/dashboard',
        };
        
        if (userRole && roleRedirectMap[userRole]) {
          router.push(roleRedirectMap[userRole]);
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      if (err.message === 'UNVERIFIED') {
        setServerError('Tài khoản của bạn chưa được xác thực email.');
        setNeedsVerification(true);
      } else {
        setServerError(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToVerify = () => {
    router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pt-10 pb-12 sm:px-6 lg:px-8 min-h-[calc(100vh-64px)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Đăng nhập
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="font-medium text-[#e50027] hover:text-[#cc0022]">
            Tạo tài khoản mới
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            
            {serverError && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center">
                {serverError}
                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleGoToVerify}
                    className="block mt-2 font-bold underline text-[#e50027] w-full text-center"
                  >
                    Đến trang xác thực email →
                  </button>
                )}
              </div>
            )}

            <div>
              <label htmlFor={emailId} className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 relative">
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? emailErrId : undefined}
                  className={`appearance-none block w-full px-3 py-2.5 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-[15px] ${
                    fieldErrors.email 
                      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-[#e50027] focus:border-[#e50027]'
                  }`}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => handleBlur('email')}
                />
              </div>
              {fieldErrors.email && (
                <p id={emailErrId} role="alert" className="mt-2 text-sm text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700">Mật khẩu</label>
              </div>
              <div className="mt-1 relative">
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? passwordErrId : undefined}
                  className={`appearance-none block w-full px-3 py-2.5 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-[15px] ${
                    fieldErrors.password 
                      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-[#e50027] focus:border-[#e50027]'
                  }`}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  onBlur={() => handleBlur('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id={passwordErrId} role="alert" className="mt-2 text-sm text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id={`${uid}-remember`}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#e50027] focus:ring-[#e50027] border-gray-300 rounded"
                />
                <label htmlFor={`${uid}-remember`} className="ml-2 block text-sm text-gray-900">
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
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#e50027] hover:bg-[#cc0022] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e50027] disabled:opacity-50"
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
