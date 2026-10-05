'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName } from '@/lib/auth';
import {
  LogOut, ChevronDown, User, KeyRound, HelpCircle, Bell, Home,
  CheckCircle2, AlertTriangle, AlertCircle, HardDrive, Sparkles,
  Shield, ExternalLink, X, Star,
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

export default function StaffHeader() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
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
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue navigation
      }
    }
    setShowNotifications(false);
    if (notif.targetUrl) {
      router.push(notif.targetUrl);
    }
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

  // Notification icon: semantic only, default muted
  const getNotifIcon = (type: string, severity: string) => {
    if (type === 'PERFORMANCE_EVALUATION') return <Star className="w-4 h-4" style={{ color: '#D97706' }} />;
    if (type.includes('BACKUP')) return <HardDrive className="w-4 h-4 text-slate-400" />;
    if (type.includes('AI') || type.includes('AUDIT') && severity !== 'DANGER')
      return <Sparkles className="w-4 h-4 text-slate-400" />;
    if (severity === 'DANGER') return <AlertCircle className="w-4 h-4" style={{ color: '#DC2626' }} />;
    if (severity === 'WARNING') return <AlertTriangle className="w-4 h-4" style={{ color: '#D97706' }} />;
    if (severity === 'SUCCESS') return <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />;
    return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);
      if (diffSec < 60) return 'Vừa xong';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      return `${Math.floor(diffSec / 86400)} ngày trước`;
    } catch {
      return '';
    }
  };

  const homeHref = pathname.startsWith('/admin')
    ? '/admin/dashboard'
    : pathname.startsWith('/store-owner')
    ? '/store-owner/dashboard'
    : '/staff/dashboard/sales';

  return (
    <>
      {/* ── Topbar — 64px, clean, minimal ── */}
      <header
        className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-5 sticky top-0 z-40"
        style={{ boxShadow: 'none' }}
      >
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            href={homeHref}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title="Về trang tổng quan"
            aria-label="Trang chủ"
          >
            <Home className="w-4 h-4" />
          </Link>
          <span className="text-slate-300 text-sm select-none">/</span>
          {sectionName && (
            <>
              <span className="text-xs text-slate-400 font-medium hidden sm:block truncate max-w-[120px]">
                {sectionName}
              </span>
              <span className="text-slate-300 hidden sm:block select-none">/</span>
            </>
          )}
          <h1 className="text-sm font-semibold text-slate-800 truncate">{pageTitle}</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) fetchNotifications();
              }}
              className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Thông báo"
              aria-expanded={showNotifications}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[15px] h-[15px] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
                  style={{ background: '#E50027' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 py-0 z-50 overflow-hidden"
                style={{ boxShadow: 'var(--shadow-overlay)' }}
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Thông báo</span>
                    {unreadCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: '#F9E2E5', color: '#E50027' }}
                      >
                        {unreadCount} mới
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Đã đọc tất cả
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {loadingNotifs && notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">Đang tải thông báo...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Không có thông báo nào.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !notif.isRead ? 'bg-slate-50/70' : ''
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                          {getNotifIcon(notif.type, notif.severity)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-slate-900 truncate">{notif.title}</p>
                            <span
                              className="text-[10px] text-slate-400 shrink-0"
                              style={{ fontFamily: 'var(--font-mono, monospace)' }}
                            >
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
                            style={{ background: '#E50027' }}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {isAdmin && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                    <Link
                      href="/admin/audit-logs"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                    >
                      Xem lịch sử Audit toàn hệ thống <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sign Out Action */}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 ml-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:block text-sm font-medium">Đăng xuất</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Internal Help Modal ── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden"
            style={{ boxShadow: 'var(--shadow-overlay)' }}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-sm text-white">Trung tâm Hỗ trợ Quản trị ET.TEE</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-slate-600">
              <div>
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  1. Nguyên tắc An toàn &amp; Bảo mật
                </h4>
                <p className="text-xs leading-relaxed text-slate-500">
                  Mọi thao tác quản trị tài khoản, phân quyền RBAC, sao lưu dữ liệu và cấu hình AI đều được ghi lại vào bảng <strong className="text-slate-700">Audit Logs</strong> với địa chỉ IP và timestamp chính xác.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  2. Khắc phục Sự cố &amp; Khẩn cấp
                </h4>
                <p className="text-xs leading-relaxed text-slate-500">
                  Khi phát hiện dịch vụ gián đoạn, truy cập mục <strong className="text-slate-700">Giám sát Hạ tầng</strong> để kiểm tra kết nối PostgreSQL và mức tiêu thụ JVM Heap.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  3. Thông tin Hệ thống
                </h4>
                <div
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1"
                  style={{ fontFamily: 'var(--font-mono, monospace)' }}
                >
                  <p><span className="text-slate-400">Phiên bản:</span> ET.TEE Core Platform v2.6</p>
                  <p><span className="text-slate-400">Hạ tầng:</span> Spring Boot 3 + PostgreSQL 16</p>
                  <p><span className="text-slate-400">Hotline Kỹ thuật:</span> 1900 6868</p>
                  <p><span className="text-slate-400">Email:</span> tech-admin@ettee.vn</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
