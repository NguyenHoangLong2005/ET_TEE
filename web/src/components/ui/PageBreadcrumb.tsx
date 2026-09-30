import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function PageBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
      <Link href="/" className="hover:text-primary transition-colors">
        Trang chủ
      </Link>
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-2">
          <span className="text-slate-300">/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="font-bold text-slate-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
