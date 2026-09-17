"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearAuthSession, getStoredUser, hasAnyPermission, hasAnyRole, refreshCurrentUser } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "Trang chủ" },
  { href: "/products", label: "Sản phẩm" },
  { href: "/cart", label: "Giỏ hàng" },
  { href: "/profile", label: "Tài khoản" },
];

const OPERATIONS_ITEMS = [
  { href: "/staff/dashboard", label: "Cửa hàng", roles: ["ADMIN", "SHOP_OWNER"], permissions: ["report.view"] },
  { href: "/staff/orders", label: "Đơn vận hành", roles: ["ADMIN", "SHOP_OWNER", "CSKH_STAFF"], permissions: ["order.view"] },
  { href: "/staff/support", label: "CSKH", roles: ["ADMIN", "SHOP_OWNER", "CSKH_STAFF"], permissions: ["support.handle", "return.handle", "refund.process"] },
  { href: "/staff/products", label: "Sản phẩm & kho", roles: ["ADMIN", "SHOP_OWNER"], permissions: ["product.manage"] },
  { href: "/admin/dashboard", label: "Admin", roles: ["ADMIN"], permissions: ["report.view"] },
  { href: "/admin/users", label: "RBAC", roles: ["ADMIN"], permissions: ["account.manage"] },
  { href: "/admin/ai-config", label: "AI config", roles: ["ADMIN"], permissions: ["feature.manage", "model.manage"] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    let active = true;
    const currentUser = getStoredUser();
    setUser(currentUser);

    if (currentUser) {
      refreshCurrentUser()
        .then((refreshedUser) => {
          if (active && refreshedUser) setUser(refreshedUser);
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
    };
  }, [pathname]);

  const isAuthPage = useMemo(
    () => ["/login", "/register"].includes(pathname ?? ""),
    [pathname]
  );

  const handleSignOut = () => {
    clearAuthSession();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {!isAuthPage ? (
        <header className="border-b border-slate-800 bg-slate-950/85 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <span className="text-2xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                ET.TEE
              </span>
              <span className="hidden sm:inline-flex text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-300 font-semibold">
                Fashion AI
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? "text-white font-semibold" : "hover:text-violet-400 transition-colors"}
                >
                  {item.label}
                </Link>
              ))}
              {user ? OPERATIONS_ITEMS.filter((item) => hasAnyRole(user.roles, item.roles) && hasAnyPermission(user.permissions, item.permissions)).slice(0, 2).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname?.startsWith(item.href) ? "text-white font-semibold" : "hover:text-violet-400 transition-colors"}
                >
                  {item.label}
                </Link>
              )) : null}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Link href="/profile" className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 text-xs font-semibold hover:bg-slate-800 transition">
                    {user.fullName || user.email || "Tài khoản"}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs font-semibold hover:bg-rose-500/20 transition"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition">
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
      ) : null}

      <div>{children}</div>

      {!isAuthPage ? (
        <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <p className="text-lg font-black text-white">ET.TEE</p>
              <p className="mt-2">Fashion commerce platform vận hành bởi Next.js và Spring Boot.</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-[0.18em] text-slate-300">Điều hướng</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {NAV_ITEMS.map((item) => <Link key={item.href} href={item.href} className="hover:text-violet-300">{item.label}</Link>)}
              </div>
            </div>
            <div>
              <p className="font-bold uppercase tracking-[0.18em] text-slate-300">Không gian làm việc</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {user ? OPERATIONS_ITEMS.filter((item) => hasAnyRole(user.roles, item.roles) && hasAnyPermission(user.permissions, item.permissions)).map((item) => <Link key={item.href} href={item.href} className="hover:text-violet-300">{item.label}</Link>) : <Link href="/login" className="hover:text-violet-300">Đăng nhập để truy cập</Link>}
              </div>
            </div>
          </div>
          <p className="max-w-7xl mx-auto mt-8 border-t border-slate-900 pt-4">ET.TEE Fashion Recommendation System © 2026</p>
        </footer>
      ) : null}
    </div>
  );
}
