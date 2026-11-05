'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ruler, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

const DISMISS_KEY = 'measure_prompt_dismissed:';
// Trang da tu hoi so do, hoac khong hop de chen loi moi.
const QUIET_PATHS = ['/style-quiz', '/account/measurements', '/checkout', '/auth', '/login'];

/**
 * Loi moi nhap so do cho khach chua co so do (thuong la khach vua dang ky). So do duoc dung de goi
 * y size o trang san pham. Hien mot lan; "De sau" an loi moi tren thiet bi nay.
 */
export default function MeasurementPrompt() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  const isCustomer = !!user && (user.role || '').toUpperCase().replace(/^ROLE_/, '') === 'USER';
  const quiet = QUIET_PATHS.some(p => pathname?.startsWith(p));

  useEffect(() => {
    if (isLoading || !isCustomer || !user) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY + user.email) === '1';
    } catch {}
    if (dismissed) return;
    let cancelled = false;
    apiClient.get<{ heightCm?: number | null; weightKg?: number | null }>('/api/account/measurements')
      .then(d => {
        if (!cancelled && !(d?.heightCm && d?.weightKg)) setShow(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoading, isCustomer, user]);

  if (!show || quiet || !user) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY + user.email, '1');
    } catch {}
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 sm:right-auto sm:w-[360px]">
      <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <button type="button" onClick={dismiss} aria-label="Đóng"
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Ruler className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">Chọn size dễ hơn với số đo của bạn</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Cho ET.TEE biết chiều cao, cân nặng và kiểu mặc yêu thích, mỗi sản phẩm sẽ gợi ý size vừa với bạn.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link href="/style-quiz" onClick={() => setShow(false)}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover">
                Nhập số đo (1 phút)
              </Link>
              <button type="button" onClick={dismiss} className="px-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
                Để sau
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
