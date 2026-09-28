"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_DEFAULT_HOME } from "@/config/role-navigation.config";
import ProtectedRoute from "@/components/ProtectedRoute";
import { 
  BarChart3, Package, TrendingUp, Users, ShoppingCart, 
  Clock, CheckCircle, AlertTriangle, Truck, Box,
  Headphones, Megaphone, ArrowRight, Activity, 
  ShoppingBag, RotateCcw, Timer, DollarSign
} from "lucide-react";

interface QuickStat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
  bgColor: string;
}

export default function StaffDashboardPage() {
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && mounted) {
      const role = user?.role || (user as any)?.roles?.[0] || '';
      const targetRoute = ROLE_DEFAULT_HOME[role as keyof typeof ROLE_DEFAULT_HOME] || '/staff/dashboard/sales';
      // Redirect to role-specific dashboard
    }
  }, [user, isLoading, mounted]);

  const roleName = user?.role || (user as any)?.roles?.[0] || 'STAFF';

  // Get role-specific color theme
  const getRoleTheme = (role: string) => {
    const themes: Record<string, { bg: string; border: string; text: string; badge: string }> = {
      ADMIN: { bg: 'bg-rose-500/20', border: 'border-rose-500/30', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-400' },
      SHOP_OWNER: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
      SALES_STAFF: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
      WAREHOUSE_STAFF: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-400' },
      SHIPPING_STAFF: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
      MARKETING_STAFF: { bg: 'bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-400' },
      CSKH_STAFF: { bg: 'bg-violet-500/20', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-400' },
    };
    return themes[role] || themes.SALES_STAFF;
  };

  const theme = getRoleTheme(roleName);

  const quickStats: QuickStat[] = [
    { label: 'Đơn hàng hôm nay', value: 24, change: '+12%', trend: 'up', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    { label: 'Đang xử lý', value: 8, change: '-3', trend: 'down', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    { label: 'Đã hoàn thành', value: 156, change: '+28', trend: 'up', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
    { label: 'Cần xử lý', value: 3, trend: 'neutral', color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  ];

  const studioCards = [
    {
      title: 'Sales Studio',
      description: 'Quản lý đơn hàng, xác nhận, xử lý',
      icon: ShoppingCart,
      href: '/staff/dashboard/sales',
      color: 'blue',
      stats: { label: 'Đơn mới', value: 12 }
    },
    {
      title: 'Warehouse Studio',
      description: 'Quản lý kho, nhập xuất, tồn kho',
      icon: Box,
      href: '/staff/dashboard/warehouse',
      color: 'cyan',
      stats: { label: 'Cần nhập', value: 5 }
    },
    {
      title: 'Shipping Studio',
      description: 'Vận đơn, theo dõi, đối soát COD',
      icon: Truck,
      href: '/staff/dashboard/shipping',
      color: 'emerald',
      stats: { label: 'Đang giao', value: 18 }
    },
    {
      title: 'Marketing Studio',
      description: 'Banner, khuyến mãi, voucher',
      icon: Megaphone,
      href: '/staff/dashboard/marketing',
      color: 'pink',
      stats: { label: 'Đang chạy', value: 3 }
    },
  ];

  const recentActivities = [
    { id: 1, action: 'Đơn hàng mới #12345', time: '2 phút trước', type: 'order', status: 'pending' },
    { id: 2, action: 'Xác nhận đơn #12340', time: '5 phút trước', type: 'confirm', status: 'success' },
    { id: 3, action: 'Nhập kho sản phẩm A', time: '10 phút trước', type: 'inventory', status: 'success' },
    { id: 4, action: 'Bàn giao vận đơn #VN123', time: '15 phút trước', type: 'shipping', status: 'success' },
    { id: 5, action: 'Ticket #TK001 được phản hồi', time: '20 phút trước', type: 'ticket', status: 'info' },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SHOP_OWNER", "STAFF", "SALES_STAFF", "MARKETING_STAFF", "WAREHOUSE_STAFF", "SHIPPING_STAFF", "CSKH_STAFF"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded text-xs font-bold border ${theme.badge}`}>
              OPERATIONS PORTAL
            </span>
            <h1 className="text-2xl font-bold text-white">Bàn Làm Việc Vận Hành</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition"
            >
              ← Về Trang Khách Hàng
            </Link>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                <span className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                  <Activity className={`w-4 h-4 ${stat.color}`} />
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                {stat.change && (
                  <span className={`text-xs mb-1 ${stat.trend === 'up' ? 'text-emerald-400' : stat.trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Studio Switcher */}
        <div className="flex gap-3 border-b border-slate-800 pb-3">
          {studioCards.map((studio) => {
            const Icon = studio.icon;
            const colorMap: Record<string, string> = {
              blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
              cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30',
              emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
              pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30',
            };
            return (
              <Link 
                key={studio.href}
                href={studio.href}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition flex items-center gap-2 ${colorMap[studio.color]}`}
              >
                <Icon className="w-4 h-4" />
                {studio.title}
              </Link>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Studio Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-slate-300">Phân Hệ Làm Việc</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studioCards.map((studio) => {
                const Icon = studio.icon;
                const colorMap: Record<string, { border: string; iconBg: string; iconColor: string }> = {
                  blue: { border: 'border-blue-500/30', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400' },
                  cyan: { border: 'border-cyan-500/30', iconBg: 'bg-cyan-500/20', iconColor: 'text-cyan-400' },
                  emerald: { border: 'border-emerald-500/30', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
                  pink: { border: 'border-pink-500/30', iconBg: 'bg-pink-500/20', iconColor: 'text-pink-400' },
                };
                const colors = colorMap[studio.color];
                return (
                  <Link 
                    key={studio.href}
                    href={studio.href}
                    className={`bg-slate-900 border ${colors.border} rounded-2xl p-5 hover:scale-[1.02] transition-transform`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                        <Icon className={`w-6 h-6 ${colors.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{studio.title}</h3>
                        <p className="text-xs text-slate-400 mb-3">{studio.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">{studio.stats.label}: <span className="text-white font-semibold">{studio.stats.value}</span></span>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-300">Hoạt Động Gần Đây</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-800">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-800/50 transition">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${
                        activity.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                        activity.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {activity.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> :
                         activity.status === 'pending' ? <Clock className="w-3.5 h-3.5" /> :
                         <Activity className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{activity.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-lg font-semibold text-slate-300 pt-2">Thao Tác Nhanh</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <Link href="/staff/dashboard/sales/orders" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-slate-200">Xem đơn hàng mới</span>
              </Link>
              <Link href="/staff/tickets" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition">
                <Headphones className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-slate-200">Hỗ trợ khách hàng</span>
              </Link>
              <Link href="/staff/dashboard/warehouse/inventory" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition">
                <Box className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-slate-200">Kiểm tra tồn kho</span>
              </Link>
              <Link href="/staff/dashboard/marketing/vouchers" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition">
                <Tag className="w-5 h-5 text-pink-400" />
                <span className="text-sm text-slate-200">Tạo mã giảm giá</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="border-t border-slate-800 pt-4 mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ET.TEE SHOP Operations Portal v1.0</span>
            <span>Người dùng: {user?.fullName || 'N/A'} | Vai trò: {roleName}</span>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Import Tag from lucide
import { Tag } from "lucide-react";
