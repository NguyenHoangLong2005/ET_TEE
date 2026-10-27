"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyPermission, hasAnyRole } from "@/lib/auth";

// Same light card as /403: these screens used to be a dark slate-950 page with violet
// buttons, unlike anything else in the staff area or the storefront.
function Notice({ title, text, showLogin }: { title: string; text: string; showLogin?: boolean }) {
  return (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full text-center">
      <div className="w-14 h-14 bg-primary-50 border border-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">{title}</h1>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">{text}</p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        {showLogin && (
          <Link href="/auth/login" className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-bold uppercase text-xs tracking-wider transition-colors">
            Đăng nhập
          </Link>
        )}
        <Link
          href="/"
          className={showLogin
            ? 'px-6 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full font-bold uppercase text-xs tracking-wider transition-colors'
            : 'px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-bold uppercase text-xs tracking-wider transition-colors'}
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  </div>
);
}

export default function ProtectedRoute({
  allowedRoles = [],
  allowedPermissions = [],
  children,
}: {
  allowedRoles?: string[];
  allowedPermissions?: string[];
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-primary animate-spin" />
          Đang kiểm tra quyền truy cập...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Notice title="Bạn chưa đăng nhập" text="Vui lòng đăng nhập để tiếp tục sử dụng chức năng này." showLogin />;
  }

  const userRoles = (user as any).roles || [user.role];
  const hasRequiredRole = allowedRoles.length === 0 || hasAnyRole(userRoles, allowedRoles);
  const hasRequiredPermission = allowedPermissions.length === 0 || hasAnyPermission(user.permissions, allowedPermissions, userRoles);

  if (!hasRequiredRole || !hasRequiredPermission) {
    return <Notice title="Không đủ quyền truy cập" text="Tài khoản hiện tại không có quyền xem nội dung này. Vui lòng liên hệ quản trị viên." />;
  }

  return <>{children}</>;
}
