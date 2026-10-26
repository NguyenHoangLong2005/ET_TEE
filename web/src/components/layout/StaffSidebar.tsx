'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Building2, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveRole, getRoleDisplayName } from '@/lib/auth';
import { getNavGroupsForPath, NavGroupConfig } from '@/config/role-navigation.config';
import { getDepartmentFromPathname } from '@/config/tier-branding.config';

const COLLAPSE_KEY = 'ettee_staff_sidebar_collapsed';

/** Section landing pages: only an exact match makes them active, otherwise every sub-page would light them up too. */
const EXACT_ONLY = new Set([
  '/store-owner/dashboard', '/admin/dashboard', '/staff/dashboard/sales',
  '/staff/dashboard/warehouse', '/staff/dashboard/shipping', '/staff/dashboard/marketing',
]);

interface StaffSidebarProps {
  /** Below lg the sidebar is a drawer; these control it. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function StaffSidebar({ mobileOpen, onMobileClose }: StaffSidebarProps) {
  const pathname = usePathname() || '';
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* private mode */ }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ }
      return !c;
    });
  };

  const userRole = mounted ? (user?.role || getActiveRole(user?.roles)) : 'STAFF';
  const navGroups: NavGroupConfig[] = mounted ? getNavGroupsForPath(pathname, userRole) : [];

  const isAdminArea = pathname.startsWith('/admin');
  const isStoreOwner = pathname.startsWith('/store-owner');
  const areaLabel = isAdminArea
    ? 'Quản trị hệ thống'
    : isStoreOwner
    ? 'Quản lý cửa hàng'
    : getDepartmentFromPathname(pathname)?.name || 'Vận hành';
  const areaBadge = isAdminArea ? 'Admin' : isStoreOwner ? 'Store' : 'Staff';

  // the drawer is always full width; only the desktop rail collapses
  const renderSidebar = (rail: boolean, inDrawer: boolean) => (
    <div className="flex h-full flex-col border-r border-slate-200/80 bg-white text-slate-600">
      {/* Brand */}
      <div className={`flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 ${rail ? 'justify-center px-2' : 'px-4'}`}>
        <Link href="/" className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl bg-primary text-[13px] font-black tracking-tighter text-white shadow-[0_6px_14px_-6px_rgba(229,0,39,0.6)]" title="Về trang cửa hàng">
          ET
        </Link>
        {!rail && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-extrabold tracking-tight text-slate-900">ET.TEE</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {areaBadge}
              </span>
            </div>
            <span className="mt-0.5 block truncate text-[11px] text-slate-400">{areaLabel}</span>
          </div>
        )}
        {inDrawer ? (
          <button type="button" onClick={onMobileClose} aria-label="Đóng menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        ) : !rail && (
          <button type="button" onClick={toggleCollapsed} aria-label="Thu gọn thanh bên" title="Thu gọn"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Branch */}
      {isStoreOwner && !rail && (
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900">ET.TEE Store</p>
              <p className="text-[10px] text-slate-400">Chi nhánh đang quản lý</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.groupName && !rail && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {group.groupName}
              </p>
            )}
            {group.groupName && rail && gi > 0 && <div className="mx-3 mb-3 h-px bg-slate-100" />}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path || (!EXACT_ONLY.has(item.path) && pathname.startsWith(item.path + '/'));
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      title={rail ? item.label : undefined}
                      onClick={inDrawer ? onMobileClose : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                        rail ? 'justify-center' : ''
                      } ${active
                        ? 'bg-slate-100 font-semibold text-slate-900'
                        : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {!rail && <span className="flex-1 truncate">{item.label}</span>}
                      {!rail && item.badge && (
                        <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold text-primary">{item.badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        {rail ? (
          <button type="button" onClick={toggleCollapsed} aria-label="Mở rộng thanh bên" title="Mở rộng"
            className="flex w-full justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">{user?.fullName || 'Nhân viên'}</p>
              <p className="truncate text-[11px] text-slate-400">{mounted ? getRoleDisplayName(userRole) : ''}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside className={`hidden h-screen shrink-0 transition-[width] duration-200 lg:block ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        {renderSidebar(collapsed, false)}
      </aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onMobileClose}
        />
        <aside className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {renderSidebar(false, true)}
        </aside>
      </div>
    </>
  );
}
