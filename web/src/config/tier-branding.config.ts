/**
 * ET.TEE ENTERPRISE TIER BRANDING
 *
 * Design System Rule: All admin/staff/store-owner areas share the same
 * visual language. Department badges use a UNIFIED neutral/slate style —
 * NOT rainbow per-department colors.
 *
 * The only brand color is primary (#E50027).
 * Department differentiation is through text labels, NOT color coding.
 */

export type SystemTier = 'ADMIN' | 'STORE_OWNER' | 'STAFF';

export interface TierBranding {
  tier: SystemTier;
  name: string;
  shortBadge: string;
  description: string;
  primaryAccentClass: string;
  borderAccentClass: string;
  bgLightClass: string;
  badgeClass: string;
  iconName: 'Shield' | 'Store' | 'Users';
  useMonospaceForTechnicalIds: boolean;
}

/**
 * Unified enterprise tier branding.
 * All tiers use slate/neutral — enterprise feel, not rainbow.
 */
export const TIER_BRANDING_CONFIG: Record<SystemTier, TierBranding> = {
  ADMIN: {
    tier: 'ADMIN',
    name: 'Quản trị Hệ thống',
    shortBadge: 'SYSTEM',
    description: 'Hệ thống hạ tầng, cấu hình máy chủ, AI & kiểm toán',
    primaryAccentClass: 'text-slate-900',
    borderAccentClass: 'border-slate-200',
    bgLightClass: 'bg-slate-50',
    badgeClass: 'bg-slate-900 text-white font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded',
    iconName: 'Shield',
    useMonospaceForTechnicalIds: true,
  },
  STORE_OWNER: {
    tier: 'STORE_OWNER',
    name: 'Quản lý Chi nhánh',
    shortBadge: 'BRANCH',
    description: 'Quản lý kho hàng, nhân sự và đơn hàng tại cửa hàng',
    primaryAccentClass: 'text-slate-900',
    borderAccentClass: 'border-slate-200',
    bgLightClass: 'bg-slate-50',
    badgeClass: 'bg-slate-800 text-white font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded',
    iconName: 'Store',
    useMonospaceForTechnicalIds: false,
  },
  STAFF: {
    tier: 'STAFF',
    name: 'Nhân viên Vận hành',
    shortBadge: 'STAFF',
    description: 'Bán hàng, đóng gói kho, vận chuyển, CSKH & Marketing',
    primaryAccentClass: 'text-slate-900',
    borderAccentClass: 'border-slate-200',
    bgLightClass: 'bg-slate-50',
    badgeClass: 'bg-slate-700 text-white font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded',
    iconName: 'Users',
    useMonospaceForTechnicalIds: false,
  },
};

export type StaffDepartment = 'sales' | 'warehouse' | 'shipping' | 'marketing' | 'cskh';

export interface DepartmentBranding {
  code: StaffDepartment;
  name: string;
  badgeText: string;
  /**
   * Enterprise: unified neutral badge for all departments.
   * Differentiation via text label, not color.
   */
  badgeClass: string;
  primaryAccentClass: string;
  borderAccentClass: string;
  bgLightClass: string;
}

/**
 * Department branding — enterprise unified style.
 *
 * Per spec: "role phải sử dụng cùng một design language".
 * No blue/amber/emerald/rose/purple per department.
 * All departments use the same neutral slate badge.
 */
export const DEPARTMENT_BRANDING: Record<StaffDepartment, DepartmentBranding> = {
  sales: {
    code: 'sales',
    name: 'Bán Hàng',
    badgeText: 'BÁN HÀNG',
    badgeClass: 'bg-slate-800 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider',
    primaryAccentClass: 'text-slate-900',
    borderAccentClass: 'border-slate-200',
    bgLightClass: 'bg-slate-50',
  },
  warehouse: {
    code: 'warehouse',
    name: 'Kho Hàng',
    badgeText: 'KHO HÀNG',
    badgeClass: 'bg-slate-800 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider',
    primaryAccentClass: 'text-slate-900',
    borderAccentClass: 'border-slate-200',
    bgLightClass: 'bg-slate-50',
  },
  shipping: {
    code: 'shipping',
    name: 'Vận Chuyển',
    badgeText: 'VẬN CHUYỂN',
    badgeClass: 'bg-slate-800 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider',
    primaryAccentClass: 'text-slate-900',
    borderAccentClass: 'border-slate-200',
    bgLightClass: 'bg-slate-50',
  },
  marketing: {
    code: 'marketing',
    name: 'Marketing',
    badgeText: 'MARKETING',
    badgeClass: 'bg-slate-800 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider',
    primaryAccentClass: 'text-slate-900',
    borderAccentClass: 'border-slate-200',
    bgLightClass: 'bg-slate-50',
  },
  cskh: {
    code: 'cskh',
    name: 'Chăm Sóc Khách Hàng',
    badgeText: 'CSKH',
    badgeClass: 'bg-slate-800 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider',
    primaryAccentClass: 'text-slate-900',
    borderAccentClass: 'border-slate-200',
    bgLightClass: 'bg-slate-50',
  },
};

export function getDepartmentFromPathname(pathname: string): DepartmentBranding | null {
  if (!pathname) return null;
  if (pathname.includes('/sales')) return DEPARTMENT_BRANDING.sales;
  if (pathname.includes('/warehouse')) return DEPARTMENT_BRANDING.warehouse;
  if (pathname.includes('/shipping')) return DEPARTMENT_BRANDING.shipping;
  if (pathname.includes('/marketing')) return DEPARTMENT_BRANDING.marketing;
  if (
    pathname.includes('/staff/tickets') ||
    pathname.includes('/staff/reviews') ||
    pathname.includes('/staff/support')
  ) {
    return DEPARTMENT_BRANDING.cskh;
  }
  return null;
}

export function getTierFromPathname(pathname: string): TierBranding {
  if (!pathname) return TIER_BRANDING_CONFIG.ADMIN;
  if (pathname.startsWith('/admin')) return TIER_BRANDING_CONFIG.ADMIN;
  if (pathname.startsWith('/store-owner')) return TIER_BRANDING_CONFIG.STORE_OWNER;
  return TIER_BRANDING_CONFIG.STAFF;
}
