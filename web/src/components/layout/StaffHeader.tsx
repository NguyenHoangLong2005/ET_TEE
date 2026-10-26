'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getActiveRole, getRoleDisplayName } from '@/lib/auth';
import {
  LogOut, ChevronDown, ChevronRight, User, KeyRound, Bell, Menu, Store,
  CheckCircle2, AlertTriangle, AlertCircle, HardDrive, ScrollText, ExternalLink, Star,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getRouteMetadata } from '@/config/role-navigation.config';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface SystemNotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
}

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return '';
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (!Number.isFinite(diffSec)) return '';
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return `${Math.floor(diffSec / 86400)} ngày trước`;
};

const notifIcon = (type: string, severity: string) => {
  if (type === 'PERFORMANCE_EVALUATION') return <Star className="h-4 w-4 text-slate-400" />;
  if (type.includes('BACKUP')) return <HardDrive className="h-4 w-4 text-slate-400" />;
  if (type.includes('AI') || (type.includes('AUDIT') && severity !== 'DANGER')) return <ScrollText className="h-4 w-4 text-slate-400" />;
  if (severity === 'DANGER') return <AlertCircle className="h-4 w-4 text-red-600" />;
  if (severity === 'WARNING') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (severity === 'SUCCESS') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  return <CheckCircle2 className="h-4 w-4 text-slate-400" />;
};

export default function StaffHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname() || '';

  const { title: pageTitle, section: sectionName } = getRouteMetadata(pathname);
  const isAdmin = pathname.startsWith('/admin');
  // Admin xem thông báo hệ thống; các role khác xem thông báo cá nhân (vd: đánh giá hiệu suất).
  const notifApiBase = isAdmin ? '/api/admin/notifications' : '/api/notifications/me';

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingNotifs(true);
      const res: any = await apiClient.get(notifApiBase);
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Quiet fail
    } finally {
      setLoadingNotifs(false);
    }
  }, [user, notifApiBase]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleNotificationClick = async (notif: SystemNotificationItem) => {
    if (!notif.isRead) {
      try {
        await apiClient.patch(`${notifApiBase}/${notif.id}/read`, {});
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue navigation
      }
    }
    setShowNotifications(false);
    if (notif.targetUrl) router.push(notif.targetUrl);
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post(`${notifApiBase}/mark-all-read`, {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch {
      toast.error('Không thể đánh dấu thông báo');
    }
  };

  const role = user?.role || getActiveRole(user?.roles);
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-6">
      {/* Left: menu (mobile) + breadcrumb */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="-ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
          {sectionName && (
            <>
              <span className="hidden truncate text-slate-400 sm:block">{sectionName}</span>
              <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:block" />
            </>
          )}
          <h1 className="truncate text-sm font-semibold text-slate-900">{pageTitle}</h1>
        </nav>
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href="/"
          className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:inline-flex"
          title="Mở trang cửa hàng"
        >
          <Store className="h-4 w-4" /> Xem cửa hàng
        </Link>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) fetchNotifications();
            }}
            className={`relative rounded-lg p-2 transition-colors ${showNotifications ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            aria-label="Thông báo"
            aria-expanded={showNotifications}
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold text-primary">{unreadCount} mới</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-slate-500 hover:text-slate-900">
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>

              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {loadingNotifs && notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Đang tải thông báo...</div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-center">
                    <Bell className="h-6 w-6 text-slate-300" />
                    <p className="text-xs text-slate-400">Bạn chưa có thông báo nào.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      type="button"
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!notif.isRead ? 'bg-primary-50/30' : ''}`}
                    >
                      <span className="mt-0.5 shrink-0 rounded-lg bg-slate-100 p-1.5">{notifIcon(notif.type, notif.severity)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-slate-900">{notif.title}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">{formatRelativeTime(notif.createdAt)}</span>
                        </span>
                        <span className="line-clamp-3 block text-xs leading-relaxed text-slate-500">{notif.message}</span>
                      </span>
                      {!notif.isRead && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </button>
                  ))
                )}
              </div>

              {isAdmin && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                  <Link
                    href="/admin/audit-logs"
                    onClick={() => setShowNotifications(false)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Xem nhật ký kiểm toán <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

        {/* User menu */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors ${showUserMenu ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
              aria-expanded={showUserMenu}
              aria-label="Tài khoản"
            >
              <span className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{initial}</span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[160px] truncate text-xs font-semibold leading-tight text-slate-900">{user.fullName || user.email}</span>
                <span className="block text-[11px] leading-tight text-slate-500">{getRoleDisplayName(role)}</span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10">
                <div className="border-b border-slate-100 px-4 pb-3 pt-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{user.fullName || 'Tài khoản'}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="py-1.5">
                  <Link href="/staff/profile" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                    <User className="h-4 w-4 text-slate-400" /> Hồ sơ cá nhân
                  </Link>
                  <Link href="/staff/change-password" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                    <KeyRound className="h-4 w-4 text-slate-400" /> Đổi mật khẩu
                  </Link>
                </div>
                <div className="border-t border-slate-100 pt-1.5">
                  <button type="button" onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
