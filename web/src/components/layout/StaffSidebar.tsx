'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  ChevronRight, Store, Building2, Shield, User, KeyRound, HelpCircle, MoreVertical
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveRole, getRoleDisplayName } from '@/lib/auth';
import { getNavGroupsForPath, NavGroupConfig } from '@/config/role-navigation.config';
import { getTierFromPathname, getDepartmentFromPathname } from '@/config/tier-branding.config';

export default function StaffSidebar() {
  const pathname = usePathname() || '';
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userRole = mounted ? (user?.role || getActiveRole(user?.roles)) : 'STAFF';
  const tierBrand = getTierFromPathname(pathname);
  const navGroups: NavGroupConfig[] = mounted ? getNavGroupsForPath(pathname, userRole) : [];

  if (!mounted) {
    return (
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen">
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="ml-3 w-24 h-4 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-3 space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </aside>
    );
  }

  const isAdminArea = pathname.startsWith('/admin');
  const isStoreOwner = pathname.startsWith('/store-owner');

  // Enterprise sidebar label: unified, no per-department rainbow
  const areaLabel = isAdminArea
    ? 'Quản trị Hệ thống'
    : isStoreOwner
    ? 'Quản lý Chi nhánh'
    : getDepartmentFromPathname(pathname)?.name || 'Nhân viên Vận hành';

  const areaBadgeText = isAdminArea
    ? 'SYSTEM'
    : isStoreOwner
    ? 'BRANCH'
    : 'STAFF';

  return (
    <aside
      className={`
        ${isCollapsed ? 'w-16' : 'w-64'}
        flex-shrink-0 bg-white border-r border-slate-200
        flex flex-col transition-all duration-300 ease-in-out
        h-screen sticky top-0 z-30
      `}
      style={{ fontFamily: 'var(--font-sans, sans-serif)' }}
    >
      {/* ── Logo / Brand Header ── */}
      <div
        className={`flex items-center border-b border-slate-100 h-16 shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'px-4 gap-3'
        }`}
      >
        {/* Brand mark */}
        <div
          className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 text-xs font-black tracking-tighter select-none"
          style={{ background: '#E50027' }}
        >
          ET
        </div>

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight">ET.TEE</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              >
                {areaBadgeText}
              </span>
            </div>
            <span className="block text-[11px] text-slate-400 font-medium mt-0.5 truncate">
              {areaLabel}
            </span>
          </div>
        )}

        {/* Collapse / expand toggle */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 shrink-0"
            title="Thu gọn sidebar"
            aria-label="Thu gọn sidebar"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute -right-3 top-12 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all z-10"
            title="Mở rộng sidebar"
            aria-label="Mở rộng sidebar"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Branch indicator (store-owner only) ── */}
      {isStoreOwner && (
        <div className="px-3 py-2.5 border-b border-slate-100">
          {!isCollapsed ? (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-700 truncate">Chi nhánh #1</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto">
              <Store className="w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>
      )}

      {/* ── Navigation Groups ── */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className={groupIdx > 0 ? 'pt-4' : ''}>
            {/* Section label — eyebrow style */}
            {group.groupName && !isCollapsed && (
              <div className="px-2.5 pb-1.5 pt-0.5 flex items-center justify-between">
                <span
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  style={{ letterSpacing: '0.08em' }}
                >
                  {group.groupName}
                </span>
                {isAdminArea && groupIdx === 0 && (
                  <Shield className="w-3 h-3 text-slate-300" />
                )}
              </div>
            )}

            {/* Nav Items */}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.path ||
                (item.path !== '/store-owner/dashboard' &&
                  item.path !== '/admin/dashboard' &&
                  item.path !== '/staff/dashboard/sales' &&
                  item.path !== '/staff/dashboard/warehouse' &&
                  item.path !== '/staff/dashboard/shipping' &&
                  item.path !== '/staff/dashboard/marketing' &&
                  pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  style={isActive ? {
                    backgroundColor: '#F9E2E5',   /* primary-100 */
                    color: '#6E0013',              /* primary-900 */
                  } : {}}
                >
                  <span
                    className="shrink-0 flex items-center"
                    style={isActive ? { color: '#6E0013' } : { color: '#94A3B8' }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  {!isCollapsed && (
                    <span className="flex-1 truncate leading-none">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span
                      className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: '#F9E2E5',
                        color: '#E50027',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="p-3 border-t border-slate-100 shrink-0 relative" ref={dropdownRef}>
        {!isCollapsed ? (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 w-full text-left p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {/* Avatar — solid primary, no gradient */}
            <div
              className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 select-none"
              style={{ background: '#E50027' }}
            >
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate leading-none">
                {user?.fullName || 'Staff'}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                {getRoleDisplayName(userRole)}
              </p>
            </div>
            <MoreVertical className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        ) : (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex justify-center p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center select-none"
              style={{ background: '#E50027' }}
            >
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </button>
        )}

        {/* User Dropdown */}
        {showDropdown && (
          <div
            className={`absolute bottom-full mb-2 bg-white rounded-xl border border-slate-200 py-1 z-50 overflow-hidden ${
              isCollapsed ? 'left-3 w-56' : 'left-3 right-3'
            }`}
            style={{ boxShadow: 'var(--shadow-overlay)' }}
          >
            <div className="py-1">
              <Link
                href="/account/profile"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" /> Hồ sơ cá nhân
              </Link>
              <Link
                href="/account/change-password"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <KeyRound className="w-4 h-4 text-slate-400" /> Đổi mật khẩu
              </Link>
              <button
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
              >
                <HelpCircle className="w-4 h-4 text-slate-400" /> Trợ giúp
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
