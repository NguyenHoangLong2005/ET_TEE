'use client';

import { useState, useId, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';

import { toast } from 'sonner';

interface FieldErrors {
  email?: string;
  password?: string;
  captcha?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const uid = useId();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [userCaptcha, setUserCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const captchaId = `${uid}-captcha`;
  const emailErrId = `${uid}-email-err`;
  const passwordErrId = `${uid}-password-err`;
  const captchaErrId = `${uid}-captcha-err`;

  const generateCaptchaCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  useEffect(() => {
    setCaptchaCode(generateCaptchaCode());
  }, []);

  const handleRefreshCaptcha = () => {
    setCaptchaCode(generateCaptchaCode());
    setUserCaptcha('');
    setFieldErrors(prev => ({ ...prev, captcha: undefined }));
  };

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

  const validateCaptcha = (value: string) => {
    if (!value.trim()) return 'Vui lòng nhập mã Captcha.';
    if (value.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      return 'Mã Captcha không chính xác.';
    }
    return '';
  };

  const handleBlur = (field: keyof FieldErrors) => {
    let err = '';
    if (field === 'email') err = validateEmail(formData.email);
    if (field === 'password') err = validatePassword(formData.password);
    if (field === 'captcha') err = validateCaptcha(userCaptcha);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);
    const captchaErr = validateCaptcha(userCaptcha);

    if (captchaErr === 'Mã Captcha không chính xác.') {
      handleRefreshCaptcha();
    }

    if (emailErr || passwordErr || captchaErr) {
      setFieldErrors({ email: emailErr, password: passwordErr, captcha: captchaErr });
      if (captchaErr) {
        captchaRef.current?.focus();
      } else if (passwordErr) {
        passwordRef.current?.focus();
      } else if (emailErr) {
        emailRef.current?.focus();
      }
      return;
    }

    setServerError('');
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      const res = await authService.login(formData);
      await login(res.token, rememberMe);

      // Get role from login response or from JWT
      let userRole = res.role || res.user?.role;
      
      // If not in response, try to parse from token
      if (!userRole && res.token) {
        try {
          const payload = JSON.parse(atob(res.token.split('.')[1]));
          userRole = payload?.role || 
                     payload?.authorities?.find((a: any) => a.startsWith('ROLE_'))?.replace('ROLE_', '') ||
                     payload?.sub;
        } catch (e) {}
      }

      const warnings = authService.getPendingCartMergeWarnings();
      if (warnings.length > 0) {
        const message = warnings.length === 1
          ? `Đã gộp giỏ hàng tạm vào tài khoản. Lưu ý: ${warnings[0]}`
          : `Đã gộp giỏ hàng tạm vào tài khoản với ${warnings.length} lưu ý.`;
        toast.info(message);
        authService.clearPendingCartMergeWarnings();
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      
      if (redirect) {
        router.push(redirect);
      } else {
        const roleRedirectMap: Record<string, string> = {
          ADMIN: '/admin/dashboard',
          SUPER_ADMIN: '/admin/dashboard',
          SHOP_OWNER: '/store-owner/dashboard',
          MARKETING_STAFF: '/staff/dashboard/marketing',
          SALES_STAFF: '/staff/dashboard/sales',
          CSKH_STAFF: '/staff/tickets',
          WAREHOUSE_STAFF: '/staff/dashboard/warehouse',
          SHIPPING_STAFF: '/staff/dashboard/shipping',
          STAFF: '/staff/dashboard/sales',
        };
        
        // Normalize role (remove ROLE_ prefix if present)
        const normalizedRole = userRole?.toUpperCase().replace(/^ROLE_/, '');
        const dashboardPath = normalizedRole ? roleRedirectMap[normalizedRole] : null;
        
        if (dashboardPath) {
          router.push(dashboardPath);
        } else {
          setTimeout(async () => {
            const { getStoredUser } = await import('@/lib/auth');
            const storedUser = getStoredUser();
            const storedRole = storedUser?.roles?.[0]?.toUpperCase().replace(/^ROLE_/, '');
            const storedDashboard = storedRole ? roleRedirectMap[storedRole] : null;
            
            if (storedDashboard && window.location.pathname === '/auth/login') {
              router.push(storedDashboard);
            }
          }, 100);
        }
      }
    } catch (err: any) {
      handleRefreshCaptcha();
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
    <div className="bg-slate-50/50 flex items-center justify-center min-h-[85vh] px-4 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-md border border-slate-200/80 p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
              Đăng nhập
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Chưa có tài khoản?{' '}
              <Link href="/auth/register" className="font-bold text-primary hover:underline">
                Tạo tài khoản mới
              </Link>
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            
            {serverError && (
              <div role="alert" className="bg-red-50 border border-red-200 text-primary px-4 py-3 rounded-2xl text-xs font-medium text-center">
                {serverError}
                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleGoToVerify}
                    className="block mt-2 font-bold underline text-primary w-full text-center"
                  >
                    Đến trang xác thực email →
                  </button>
                )}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor={emailId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <input
                  id={emailId}
                  ref={emailRef}
                  type="email"
                  required
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? emailErrId : undefined}
                  className={`appearance-none block w-full px-4 py-3 border rounded-xl shadow-xs placeholder-slate-400 focus:outline-none text-sm ${
                    fieldErrors.email 
                      ? 'border-red-300 text-red-900 focus:ring-2 focus:ring-primary/40 focus:border-primary' 
                      : 'border-slate-300 focus:ring-2 focus:ring-primary/40 focus:border-primary'
                  }`}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => handleBlur('email')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      passwordRef.current?.focus();
                    }
                  }}
                />
              </div>
              {fieldErrors.email && (
                <p id={emailErrId} role="alert" className="mt-1.5 text-xs font-medium text-primary">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={passwordId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <input
                  id={passwordId}
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? passwordErrId : undefined}
                  className={`appearance-none block w-full px-4 py-3 pr-11 border rounded-xl shadow-xs placeholder-slate-400 focus:outline-none text-sm ${
                    fieldErrors.password 
                      ? 'border-red-300 text-red-900 focus:ring-2 focus:ring-primary/40 focus:border-primary' 
                      : 'border-slate-300 focus:ring-2 focus:ring-primary/40 focus:border-primary'
                  }`}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  onBlur={() => handleBlur('password')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      captchaRef.current?.focus();
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id={passwordErrId} role="alert" className="mt-1.5 text-xs font-medium text-primary">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end -mt-2">
              <Link href="/auth/forgot-password" className="text-xs font-bold text-primary hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            {/* Captcha Field */}
            <div>
              <label htmlFor={captchaId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mã xác thực (Captcha)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 min-w-0">
                  <input
                    id={captchaId}
                    ref={captchaRef}
                    type="text"
                    required
                    placeholder="Nhập mã..."
                    autoComplete="off"
                    maxLength={6}
                    aria-invalid={!!fieldErrors.captcha}
                    aria-describedby={fieldErrors.captcha ? captchaErrId : undefined}
                    className={`appearance-none block w-full px-4 py-3 border rounded-xl shadow-xs placeholder-slate-400 focus:outline-none text-[15px] font-mono tracking-wider uppercase ${
                      fieldErrors.captcha 
                        ? 'border-red-300 text-red-900 focus:ring-2 focus:ring-primary/40 focus:border-primary' 
                        : 'border-slate-300 focus:ring-2 focus:ring-primary/40 focus:border-primary'
                    }`}
                    value={userCaptcha}
                    onChange={e => {
                      setUserCaptcha(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                      if (fieldErrors.captcha) setFieldErrors(prev => ({ ...prev, captcha: undefined }));
                    }}
                    onBlur={() => handleBlur('captcha')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>

                {/* Styled Captcha Visual Code Box */}
                <button
                  type="button"
                  onClick={handleRefreshCaptcha}
                  title="Nhấp để đổi mã Captcha mới"
                  className="h-[44px] px-3 bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono font-bold text-sm tracking-[0.15em] select-none cursor-pointer hover:bg-slate-800 transition-all shadow-sm border border-slate-700 min-w-[140px] group relative overflow-hidden shrink-0"
                >
                  <span className="drop-shadow-sm z-10 whitespace-nowrap">{captchaCode.split('').join(' ')}</span>
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-all transform group-hover:rotate-180 ml-2 z-10 shrink-0" />
                </button>
              </div>
              {fieldErrors.captcha && (
                <p id={captchaErrId} role="alert" className="mt-1.5 text-xs font-medium text-primary">
                  {fieldErrors.captcha}
                </p>
              )}
            </div>

            {/* Remember Me & Submit */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  id={`${uid}-remember`}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary/40 border-slate-300 rounded accent-primary cursor-pointer"
                />
                <label htmlFor={`${uid}-remember`} className="ml-2 block text-xs font-medium text-slate-700 cursor-pointer">
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3.5 border border-transparent rounded-full shadow-md text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-slate-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                {isLoading ? '...' : 'Đăng nhập'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
