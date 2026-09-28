'use client';

import { useState, useEffect, useId, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { Eye, EyeOff } from 'lucide-react';

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  password?: string;
  confirmPassword?: string;
}

const COMMON_PASSWORDS = new Set([
  '123456', '12345678', '123456789', 'password', 'password123', '12345', '1234567', '111111', '123123', 'qwerty', 'admin', 'admin123', 'Password123'
]);

type PasswordStrength = 'weak' | 'medium' | 'strong' | '';

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return '';
  if (COMMON_PASSWORDS.has(password.toLowerCase()) || COMMON_PASSWORDS.has(password)) return 'weak';
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

const STRENGTH_CONFIG = {
  weak:   { label: 'Yếu',       color: 'bg-rose-400',    text: 'text-rose-500',   bars: 1 },
  medium: { label: 'Trung bình', color: 'bg-amber-400',  text: 'text-amber-600', bars: 2 },
  strong: { label: 'Mạnh',      color: 'bg-emerald-500',  text: 'text-emerald-600', bars: 3 },
};

const VN_PHONE_RE = /^(0[3-9][0-9]{8}|\+84[3-9][0-9]{8})$/;

export default function RegisterPage() {
  const router = useRouter();
  const uid = useId();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', address: '', password: '', confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  useEffect(() => {
    const email = formData.email;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    const handler = setTimeout(async () => {
      try {
        const { available } = await authService.checkEmail(email);
        if (!available) {
          setFieldErrors(prev => ({ ...prev, email: 'Email đã được sử dụng.' }));
        } else {
          setFieldErrors(prev => {
            if (prev.email === 'Email đã được sử dụng.') {
              const newErr = { ...prev };
              delete newErr.email;
              return newErr;
            }
            return prev;
          });
        }
      } catch (err) {
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [formData.email]);

  const validators: Record<keyof FieldErrors, (v: string) => string> = {
    fullName: v => !v.trim() ? 'Vui lòng nhập họ và tên.' : v.trim().length < 2 ? 'Họ tên quá ngắn.' : '',
    email: v => !v ? 'Vui lòng nhập email.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Email không đúng định dạng.' : fieldErrors.email === 'Email đã được sử dụng.' ? fieldErrors.email : '',
    phone: v => !v ? 'Vui lòng nhập số điện thoại.' : !VN_PHONE_RE.test(v.replace(/\s/g, '')) ? 'Số điện thoại không hợp lệ (VD: 0901234567).' : '',
    address: v => !v.trim() ? 'Vui lòng nhập địa chỉ giao hàng.' : '',
    password: v => !v ? 'Vui lòng nhập mật khẩu.' : v.length < 6 ? 'Mật khẩu phải từ 6 ký tự trở lên.' : (COMMON_PASSWORDS.has(v) || COMMON_PASSWORDS.has(v.toLowerCase())) ? 'Mật khẩu quá phổ biến, dễ bị đoán.' : '',
    confirmPassword: v => !v ? 'Vui lòng nhập lại mật khẩu.' : v !== formData.password ? 'Mật khẩu nhập lại không khớp.' : '',
  };

  const handleBlur = (field: keyof FieldErrors) => {
    const err = validators[field](formData[field]);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'confirmPassword' && value) {
      const err = value !== formData.password ? 'Mật khẩu nhập lại không khớp.' : '';
      setFieldErrors(prev => ({ ...prev, confirmPassword: err }));
    }
    if (field === 'password' && formData.confirmPassword) {
      const err = formData.confirmPassword !== value ? 'Mật khẩu nhập lại không khớp.' : '';
      setFieldErrors(prev => ({ ...prev, confirmPassword: err }));
    }
  }, [formData.password, formData.confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FieldErrors = {};
    (Object.keys(validators) as (keyof FieldErrors)[]).forEach(field => {
      const err = validators[field](formData[field]);
      if (err) errors[field] = err;
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setServerError('');
    setIsLoading(true);
    try {
      await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address,
        password: formData.password,
      });
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      setServerError(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const errId = (field: string) => `${uid}-${field}-err`;

  const getInputClass = (field: keyof FieldErrors) => {
    return `appearance-none block w-full px-3.5 py-3 border rounded-xl shadow-2xs placeholder-slate-400 focus:outline-none text-[15px] transition-all ${
      fieldErrors[field]
        ? 'border-rose-300 text-rose-900 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500'
        : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-primary/40 focus:border-primary'
    }`;
  };

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col pt-10 pb-16 sm:px-6 lg:px-8 min-h-[calc(100vh-64px)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <h2 className="mt-4 text-center text-3xl font-black uppercase tracking-tight text-slate-900">
          Tạo tài khoản
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="font-bold text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-md rounded-3xl sm:px-10 border border-slate-200/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <form className="space-y-6 relative z-10" onSubmit={handleSubmit} noValidate>

            {serverError && (
              <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm text-center font-medium">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Full name */}
              <div>
                <label htmlFor={`${uid}-fullName`} className="block text-sm font-semibold text-slate-700">Họ và tên</label>
                <div className="mt-1.5 relative">
                  <input
                    id={`${uid}-fullName`}
                    type="text"
                    required
                    autoComplete="name"
                    aria-invalid={!!fieldErrors.fullName}
                    aria-describedby={fieldErrors.fullName ? errId('fullName') : undefined}
                    className={getInputClass('fullName')}
                    value={formData.fullName}
                    onChange={e => handleChange('fullName', e.target.value)}
                    onBlur={() => handleBlur('fullName')}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p id={errId('fullName')} role="alert" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor={`${uid}-email`} className="block text-sm font-semibold text-slate-700">Email</label>
                <div className="mt-1.5 relative">
                  <input
                    id={`${uid}-email`}
                    type="email"
                    required
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? errId('email') : undefined}
                    className={getInputClass('email')}
                    value={formData.email}
                    onChange={e => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                  />
                </div>
                {fieldErrors.email && (
                  <p id={errId('email')} role="alert" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <label htmlFor={`${uid}-phone`} className="block text-sm font-semibold text-slate-700">Số điện thoại</label>
                <div className="mt-1.5 relative">
                  <input
                    id={`${uid}-phone`}
                    type="tel"
                    required
                    autoComplete="tel"
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={fieldErrors.phone ? errId('phone') : undefined}
                    className={getInputClass('phone')}
                    value={formData.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                  />
                </div>
                {fieldErrors.phone && (
                  <p id={errId('phone')} role="alert" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label htmlFor={`${uid}-address`} className="block text-sm font-semibold text-slate-700">Địa chỉ giao hàng</label>
                <div className="mt-1.5 relative">
                  <input
                    id={`${uid}-address`}
                    type="text"
                    required
                    autoComplete="street-address"
                    aria-invalid={!!fieldErrors.address}
                    aria-describedby={fieldErrors.address ? errId('address') : undefined}
                    className={getInputClass('address')}
                    value={formData.address}
                    onChange={e => handleChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                  />
                </div>
                {fieldErrors.address && (
                  <p id={errId('address')} role="alert" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.address}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Password */}
              <div>
                <label htmlFor={`${uid}-password`} className="block text-sm font-semibold text-slate-700">Mật khẩu</label>
                <div className="mt-1.5 relative">
                  <input
                    id={`${uid}-password`}
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? errId('password') : undefined}
                    className={`${getInputClass('password')} pr-10`}
                    value={formData.password}
                    onChange={e => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="w-full h-1 flex gap-1 rounded-full overflow-hidden">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`h-full flex-1 transition-all duration-300 ${
                            i <= STRENGTH_CONFIG[passwordStrength].bars
                              ? STRENGTH_CONFIG[passwordStrength].color
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    {!fieldErrors.password && (
                      <p className={`mt-1 text-xs font-medium ${STRENGTH_CONFIG[passwordStrength].text}`}>
                        Độ mạnh: {STRENGTH_CONFIG[passwordStrength].label}
                      </p>
                    )}
                  </div>
                )}
                {fieldErrors.password && (
                  <p id={errId('password')} role="alert" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor={`${uid}-confirmPassword`} className="block text-sm font-semibold text-slate-700">Nhập lại mật khẩu</label>
                <div className="mt-1.5 relative">
                  <input
                    id={`${uid}-confirmPassword`}
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? errId('confirmPassword') : undefined}
                    className={`${getInputClass('confirmPassword')} pr-10`}
                    value={formData.confirmPassword}
                    onChange={e => handleChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p id={errId('confirmPassword')} role="alert" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-6 rounded-full text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-primary/90 shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang xử lý...' : 'Tạo tài khoản'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

