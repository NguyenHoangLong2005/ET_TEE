"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_DEFAULT_HOME } from "@/config/role-navigation.config";
import ProtectedRoute from "@/components/ProtectedRoute";

/**
 * This used to render a generic "Operations Portal" dashboard with entirely
 * hardcoded fake numbers (24 đơn hôm nay, +12%, 156 đã hoàn thành, ...) shown
 * to every staff role regardless of what actually happened that day. The
 * redirect to each role's real, data-backed dashboard was already written
 * (ROLE_DEFAULT_HOME) but never called. Every role maps to a real target, so
 * this page now only redirects there instead of showing fabricated stats.
 */
export default function StaffDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && mounted) {
      const role = user?.role || (user as any)?.roles?.[0] || '';
      const targetRoute = ROLE_DEFAULT_HOME[role as keyof typeof ROLE_DEFAULT_HOME] || '/staff/dashboard/sales';
      router.replace(targetRoute);
    }
  }, [user, isLoading, mounted, router]);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SHOP_OWNER", "STAFF", "SALES_STAFF", "MARKETING_STAFF", "WAREHOUSE_STAFF", "SHIPPING_STAFF", "CSKH_STAFF"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Đang chuyển tới khu vực làm việc của bạn...</div>
      </div>
    </ProtectedRoute>
  );
}
