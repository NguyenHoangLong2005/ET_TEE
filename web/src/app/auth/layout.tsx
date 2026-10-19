import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

// The storefront header/footer are hidden on /auth, which left these pages with no logo and no
// way back to the shop, and the page background stopped at 85vh with a white band below.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 xl:px-8 pt-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-slate-900">
            <Image src="/images/logo.jpg" alt="ET.TEE" fill sizes="36px" className="object-cover" />
          </span>
          <span className="font-black text-xl tracking-tighter text-slate-900 group-hover:text-primary transition-colors">ET.TEE</span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Về trang chủ
        </Link>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
