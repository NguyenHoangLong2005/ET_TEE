"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredUser, hasAnyPermission, hasAnyRole, refreshCurrentUser } from "@/lib/auth";

export default function ProtectedRoute({
  allowedRoles = [],
  allowedPermissions = [],
  children,
}: {
  allowedRoles?: string[];
  allowedPermissions?: string[];
  children: React.ReactNode;
}) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function syncUser() {
      const currentUser = getStoredUser();
      if (!currentUser) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const refreshedUser = await refreshCurrentUser();
        if (active) setUser(refreshedUser || currentUser);
      } catch {
        if (active) setUser(currentUser);
      } finally {
        if (active) setLoading(false);
      }
    }

    syncUser();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-slate-300">
          Đang kiểm tra quyền truy cập...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-slate-900 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-400 font-bold">Access denied</p>
          <h1 className="mt-4 text-3xl font-black text-white">Bạn chưa đăng nhập</h1>
          <p className="mt-3 text-sm text-slate-300">Vui lòng đăng nhập để tiếp tục sử dụng chức năng này.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold">
              Đăng nhập
            </Link>
            <Link href="/" className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 font-semibold">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasRequiredRole = allowedRoles.length === 0 || hasAnyRole(user.roles, allowedRoles);
  const hasRequiredPermission = allowedPermissions.length === 0 || hasAnyPermission(user.permissions, allowedPermissions);

  if (!hasRequiredRole || !hasRequiredPermission) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-amber-500/30 bg-slate-900 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">Forbidden</p>
          <h1 className="mt-4 text-3xl font-black text-white">Không đủ quyền truy cập</h1>
          <p className="mt-3 text-sm text-slate-300">
            Tài khoản hiện tại không có quyền để xem nội dung này. Vui lòng liên hệ quản trị viên.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold">
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
