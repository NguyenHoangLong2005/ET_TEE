import {
  LayoutDashboard, Users, Package, ShoppingCart, Tag,
  Mail, ChevronRight,
  Warehouse, Truck, Ticket, Layers, FileText,
  Store, CreditCard, Sliders, ScrollText, CheckSquare, Building2, MessageSquare,
  Grid3X3, BarChart3, ClipboardList, PackagePlus, HardDrive, Cpu, Terminal, Activity, Sparkles, Palette
} from 'lucide-react';
import React from 'react';
import { normalizeRoleCode } from '@/lib/auth';

export interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  allowedRoles?: string[];
  description?: string;
}

export interface NavGroupConfig {
  groupName?: string;
  items: NavItemConfig[];
}

export const STAFF_ROLES = [
  'ADMIN',
  'SHOP_OWNER',
  'MARKETING_STAFF',
  'SALES_STAFF',
  'CSKH_STAFF',
  'WAREHOUSE_STAFF',
  'SHIPPING_STAFF',
  'STAFF'
];

export const ROLE_DEFAULT_HOME: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  SHOP_OWNER: '/store-owner/dashboard',
  MARKETING_STAFF: '/staff/dashboard/marketing',
  SALES_STAFF: '/staff/dashboard/sales',
  CSKH_STAFF: '/staff/dashboard/cskh',
  WAREHOUSE_STAFF: '/staff/dashboard/warehouse/dashboard',
  SHIPPING_STAFF: '/staff/dashboard/shipping/dashboard',
  STAFF: '/staff/dashboard/sales',
};

/* ───────────────────── ADMIN NAVIGATION ───────────────────── */
export const ADMIN_NAV_GROUPS: NavGroupConfig[] = [
  {
    groupName: 'HẠ TẦNG & TỔNG QUAN',
    items: [
      { label: 'Dashboard Hệ thống', path: '/admin/dashboard', icon: LayoutDashboard, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupName: 'NGƯỜI DÙNG & BẢO MẬT',
    items: [
      { label: 'Quản lý Người dùng', path: '/admin/users', icon: Users, allowedRoles: ['ADMIN'] },
      { label: 'Cấu hình RBAC', path: '/admin/rbac', icon: Sliders, allowedRoles: ['ADMIN'] },
      { label: 'Quản lý Chi nhánh', path: '/admin/shops', icon: Building2, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupName: 'DỮ LIỆU DÙNG CHUNG',
    items: [
      { label: 'Danh mục Toàn hệ thống', path: '/admin/categories', icon: Tag, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupName: 'AI & TÍNH NĂNG MỚI',
    items: [
      { label: 'AI Models & Cấu hình', path: '/admin/ai-config', icon: Cpu, allowedRoles: ['ADMIN'] },
      { label: 'AI Feature Flags', path: '/admin/ai-feature-flags', icon: Sparkles, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupName: 'NHẬT KÝ & VẬN HÀNH',
    items: [
      { label: 'Nhật ký Audit', path: '/admin/audit-logs', icon: ScrollText, allowedRoles: ['ADMIN'] },
      { label: 'Email Logs', path: '/admin/mailing', icon: Mail, allowedRoles: ['ADMIN'] },
      { label: 'Nhật ký Máy chủ', path: '/admin/logs', icon: Terminal, allowedRoles: ['ADMIN'] },
    ]
  }
];

/* ───────────────────── STORE OWNER NAVIGATION ───────────────────── */
export const STORE_OWNER_NAV_GROUPS: NavGroupConfig[] = [
  {
    items: [
      { label: 'Tổng quan', path: '/store-owner/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    groupName: 'BÁN HÀNG',
    items: [
      { label: 'Đơn hàng', path: '/store-owner/orders', icon: ShoppingCart },
    ]
  },
  {
    groupName: 'SẢN PHẨM & KHO',
    items: [
      { label: 'Sản phẩm', path: '/store-owner/products', icon: Package },
      { label: 'Danh mục', path: '/store-owner/categories', icon: Layers },
    ]
  },
  {
    groupName: 'NHÀ CUNG ỨNG',
    items: [
      { label: 'Nhà sản xuất', path: '/store-owner/manufacturers', icon: Building2 },
      { label: 'Nhà cung cấp', path: '/store-owner/suppliers', icon: Store },
    ]
  },
  {
    groupName: 'QUẢN LÝ',
    items: [
      { label: 'Nhân sự', path: '/store-owner/staff', icon: Users },
      { label: 'Lịch làm việc / Xếp ca', path: '/store-owner/shifts', icon: CheckSquare },
      { label: 'Hàng đợi Phê duyệt', path: '/store-owner/approvals', icon: FileText },
      { label: 'Ticket hỗ trợ', path: '/store-owner/tickets', icon: Ticket },
      { label: 'Nhật ký', path: '/store-owner/logs', icon: ScrollText },
    ]
  }
];

/* ───────────────────── STAFF NAVIGATION ───────────────────── */
export const STAFF_NAV_GROUPS: Record<string, NavGroupConfig[]> = {
  sales: [
    {
      groupName: 'BÁN HÀNG',
      items: [
        { label: 'Tổng quan', path: '/staff/dashboard/sales', icon: LayoutDashboard },
        { label: 'Đơn hàng', path: '/staff/dashboard/sales/orders', icon: ShoppingCart },
      ]
    }
  ],
  warehouse: [
    {
      groupName: 'XỬ LÝ ĐƠN',
      items: [
        { label: 'Tổng quan', path: '/staff/dashboard/warehouse/dashboard', icon: LayoutDashboard },
        { label: 'Xuất hàng', path: '/staff/dashboard/warehouse/fulfillment', icon: Truck },
      ]
    },
    {
      groupName: 'TỒN KHO',
      items: [
        { label: 'Tồn kho', path: '/staff/dashboard/warehouse/inventory', icon: Layers },
        { label: 'Nhập hàng', path: '/staff/dashboard/warehouse/receiving', icon: PackagePlus },
        { label: 'Đề xuất nhập', path: '/staff/dashboard/warehouse/replenishment', icon: Tag },
      ]
    }
  ],
  shipping: [
    {
      groupName: 'VẬN CHUYỂN',
      items: [
        { label: 'Tổng quan', path: '/staff/dashboard/shipping/dashboard', icon: LayoutDashboard },
        { label: 'Đơn hàng', path: '/staff/dashboard/shipping/orders', icon: ShoppingCart },
        { label: 'Vận đơn', path: '/staff/dashboard/shipping/shipments', icon: Truck },
        { label: 'COD', path: '/staff/dashboard/shipping/cod', icon: CreditCard },
        { label: 'Ngoại lệ', path: '/staff/dashboard/shipping/exceptions', icon: FileText },
      ]
    }
  ],
  marketing: [
    {
      groupName: 'MARKETING & KINH DOANH',
      items: [
        { label: 'Tổng quan', path: '/staff/dashboard/marketing', icon: LayoutDashboard },
        { label: 'Trang chủ', path: '/staff/dashboard/marketing/homepage', icon: LayoutDashboard },
        { label: 'Bài viết', path: '/staff/dashboard/marketing/posts', icon: FileText },
        { label: 'Voucher', path: '/staff/dashboard/marketing/vouchers', icon: Tag },
        { label: 'Hiệu quả', path: '/staff/dashboard/marketing/analytics', icon: BarChart3 },
      ]
    }
  ],
  cskh: [
    {
      groupName: 'CHĂM SÓC KHÁCH HÀNG',
      items: [
        { label: 'Tổng quan', path: '/staff/dashboard/cskh', icon: Users },
        { label: 'Tickets', path: '/staff/tickets', icon: Ticket },
        { label: 'Đánh giá & Comment', path: '/staff/reviews', icon: MessageSquare },
        { label: 'Hỗ trợ', path: '/staff/support', icon: Users },
      ]
    }
  ]
};

/* ───────────────────── FLAT REGISTRY FOR METADATA ───────────────────── */
const ALL_ROUTES_REGISTRY: Record<string, { label: string; section: string }> = {
  // Admin
  '/admin/dashboard': { label: 'Dashboard Hệ thống', section: 'Admin' },
  '/admin/users': { label: 'Quản lý Người dùng', section: 'Admin' },
  '/admin/rbac': { label: 'Cấu hình RBAC', section: 'Admin' },
  '/admin/categories': { label: 'Danh mục Toàn hệ thống', section: 'Admin' },
  '/admin/shops': { label: 'Quản lý Chi nhánh', section: 'Admin' },
  '/admin/settings/payments-shipping': { label: 'Thanh toán & Vận chuyển', section: 'Admin' },
  '/admin/ai-config': { label: 'AI Models & Cấu hình', section: 'Admin' },
  '/admin/ai-feature-flags': { label: 'AI Feature Flags', section: 'Admin' },
  '/admin/audit-logs': { label: 'Nhật ký Audit', section: 'Admin' },
  '/admin/mailing': { label: 'Email Logs', section: 'Admin' },
  '/admin/logs': { label: 'Nhật ký Máy chủ', section: 'Admin' },
  '/admin/style-guide': { label: 'Design System & UI', section: 'Admin' },

  // Store Owner
  '/store-owner/dashboard': { label: 'Tổng quan', section: 'Store Owner' },
  '/store-owner/products': { label: 'Sản phẩm', section: 'Store Owner' },
  '/store-owner/orders': { label: 'Đơn hàng', section: 'Store Owner' },
  '/store-owner/promotions': { label: 'Khuyến mãi', section: 'Store Owner' },
  '/store-owner/categories': { label: 'Danh mục', section: 'Store Owner' },
  '/store-owner/inventory': { label: 'Tồn kho', section: 'Store Owner' },
  '/store-owner/manufacturers': { label: 'Nhà sản xuất', section: 'Store Owner' },
  '/store-owner/suppliers': { label: 'Nhà cung cấp', section: 'Store Owner' },
  '/store-owner/staff': { label: 'Nhân sự', section: 'Store Owner' },
  '/store-owner/shifts': { label: 'Lịch làm việc / Xếp ca', section: 'Store Owner' },
  '/store-owner/approvals': { label: 'Hàng đợi Phê duyệt', section: 'Store Owner' },
  '/store-owner/logs': { label: 'Nhật ký', section: 'Store Owner' },

  // Staff
  '/staff/dashboard/sales': { label: 'Dashboard Bán hàng', section: 'Bán hàng' },
  '/staff/dashboard/sales/orders': { label: 'Đơn hàng Bán hàng', section: 'Bán hàng' },
  '/staff/dashboard/warehouse': { label: 'Dashboard Kho', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/dashboard': { label: 'Tổng quan Kho', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/fulfillment': { label: 'Xuất hàng', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/receiving': { label: 'Nhập hàng', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/inventory': { label: 'Tồn kho', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/replenishment': { label: 'Đề xuất Nhập hàng', section: 'Kho hàng' },
  '/staff/dashboard/shipping': { label: 'Dashboard Vận chuyển', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/dashboard': { label: 'Tổng quan Vận chuyển', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/orders': { label: 'Kiện hàng Cần giao', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/shipments': { label: 'Quản lý Vận đơn', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/cod': { label: 'Đối soát Tiền COD', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/exceptions': { label: 'Sự cố & Ngoại lệ Giao hàng', section: 'Vận chuyển' },
  '/staff/dashboard/marketing': { label: 'Dashboard Marketing', section: 'Marketing' },
  '/staff/dashboard/marketing/homepage': { label: 'Chỉnh sửa Trang chủ', section: 'Marketing' },
  '/staff/dashboard/marketing/posts': { label: 'Bài viết & Tin tức', section: 'Marketing' },
  '/staff/dashboard/marketing/vouchers': { label: 'Mã Giảm giá', section: 'Marketing' },
  '/staff/dashboard/marketing/analytics': { label: 'Hiệu quả Chiến dịch', section: 'Marketing' },
  '/staff/dashboard/cskh': { label: 'Tổng quan CSKH', section: 'CSKH' },
  '/staff/tickets': { label: 'Hàng đợi Tickets CSKH', section: 'CSKH' },
  '/store-owner/tickets': { label: 'Ticket hỗ trợ', section: 'Store Owner' },
  '/store-owner/support': { label: 'Xử lý ticket', section: 'Store Owner' },
  '/staff/reviews': { label: 'Duyệt Đánh giá Sản phẩm', section: 'CSKH' },
  '/staff/support': { label: 'Trung tâm Hỗ trợ Khách hàng', section: 'CSKH' },

  // Own account of the signed-in staff member (all staff roles)
  '/staff/profile': { label: 'Hồ sơ cá nhân', section: 'Tài khoản' },
  '/staff/change-password': { label: 'Đổi mật khẩu', section: 'Tài khoản' },
};

/* ───────────────────── PERMISSION VERIFICATION ───────────────────── */
export function isRouteAllowedForStaffRole(pathname: string, role: string): boolean {
  const norm = normalizeRoleCode(role);
  if (norm === 'ADMIN') return true;

  // 1. System Admin routes (/admin/*) -> ONLY ADMIN
  if (pathname.startsWith('/admin')) {
    return false;
  }

  // 2. Store Owner routes (/store-owner/*) -> ONLY SHOP_OWNER
  if (pathname.startsWith('/store-owner')) {
    return norm === 'SHOP_OWNER';
  }

  // 3. SHOP_OWNER has oversight across /staff/*
  if (norm === 'SHOP_OWNER') return true;

  // 4. Department-specific /staff/* routes
  if (pathname.startsWith('/staff/dashboard/marketing')) {
    return norm === 'MARKETING_STAFF';
  }
  if (pathname.startsWith('/staff/dashboard/warehouse')) {
    return norm === 'WAREHOUSE_STAFF';
  }
  if (pathname.startsWith('/staff/dashboard/shipping')) {
    return norm === 'SHIPPING_STAFF';
  }
  if (pathname.startsWith('/staff/dashboard/sales')) {
    return norm === 'SALES_STAFF' || norm === 'STAFF';
  }
  if (pathname.startsWith('/staff/dashboard/cskh') || pathname.startsWith('/staff/tickets') || pathname.startsWith('/staff/support') || pathname.startsWith('/staff/reviews')) {
    return norm === 'CSKH_STAFF' || norm === 'STAFF';
  }

  return STAFF_ROLES.includes(norm);
}

/* ───────────────────── NAV GROUPS RESOLVER ───────────────────── */
export function getNavGroupsForPath(pathname: string, userRole: string): NavGroupConfig[] {
  const normRole = normalizeRoleCode(userRole);

  if (pathname.startsWith('/admin')) {
    return ADMIN_NAV_GROUPS;
  }
  if (pathname.startsWith('/store-owner')) {
    return STORE_OWNER_NAV_GROUPS;
  }
  if (pathname.startsWith('/staff/dashboard/sales')) {
    return STAFF_NAV_GROUPS.sales;
  }
  if (pathname.startsWith('/staff/dashboard/warehouse')) {
    return STAFF_NAV_GROUPS.warehouse;
  }
  if (pathname.startsWith('/staff/dashboard/shipping')) {
    return STAFF_NAV_GROUPS.shipping;
  }
  if (pathname.startsWith('/staff/dashboard/marketing')) {
    return STAFF_NAV_GROUPS.marketing;
  }
  if (pathname.startsWith('/staff/dashboard/cskh') || pathname.startsWith('/staff/tickets') || pathname.startsWith('/staff/support') || pathname.startsWith('/staff/reviews')) {
    return STAFF_NAV_GROUPS.cskh;
  }

  // Fallback by role
  if (normRole === 'ADMIN' || normRole === 'SUPER_ADMIN') {
    return ADMIN_NAV_GROUPS;
  }
  if (normRole === 'SHOP_OWNER') {
    return STORE_OWNER_NAV_GROUPS;
  }
  if (normRole === 'WAREHOUSE_STAFF') return STAFF_NAV_GROUPS.warehouse;
  if (normRole === 'SHIPPING_STAFF') return STAFF_NAV_GROUPS.shipping;
  if (normRole === 'MARKETING_STAFF') return STAFF_NAV_GROUPS.marketing;
  if (normRole === 'CSKH_STAFF') return STAFF_NAV_GROUPS.cskh;

  return STAFF_NAV_GROUPS.sales;
}

function getSectionDashboard(pathname: string): string {
  if (pathname.startsWith('/admin')) return '/admin/dashboard';
  if (pathname.startsWith('/store-owner')) return '/store-owner/dashboard';
  if (pathname.startsWith('/staff/dashboard/marketing')) return '/staff/dashboard/marketing';
  if (pathname.startsWith('/staff/dashboard/warehouse')) return '/staff/dashboard/warehouse/dashboard';
  if (pathname.startsWith('/staff/dashboard/shipping')) return '/staff/dashboard/shipping/dashboard';
  if (pathname.startsWith('/staff/dashboard/cskh')) return '/staff/dashboard/cskh';
  if (pathname.startsWith('/staff/dashboard/sales')) return '/staff/dashboard/sales/dashboard';
  if (pathname.startsWith('/staff/tickets') || pathname.startsWith('/staff/support')) return '/staff/dashboard/cskh';
  return '/staff/dashboard/sales';
}

/* ───────────────────── AUTOMATIC BREADCRUMB & TITLE ───────────────────── */
export function getRouteMetadata(pathname: string): {
  title: string;
  section: string;
  breadcrumbs: { label: string; href?: string }[];
} {
  // Direct match
  if (ALL_ROUTES_REGISTRY[pathname]) {
    const meta = ALL_ROUTES_REGISTRY[pathname];
    return {
      title: meta.label,
      section: meta.section,
      breadcrumbs: [
        { label: meta.section, href: getSectionDashboard(pathname) },
        { label: meta.label }
      ]
    };
  }

  // Prefix match
  for (const [path, meta] of Object.entries(ALL_ROUTES_REGISTRY)) {
    if (pathname.startsWith(path + '/')) {
      return {
        title: meta.label,
        section: meta.section,
        breadcrumbs: [
          { label: meta.section, href: path },
          { label: meta.label }
        ]
      };
    }
  }

  // Fallback by segment
  if (pathname.startsWith('/admin')) {
    return { title: 'Quản trị Hệ thống', section: 'Admin', breadcrumbs: [{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Tổng quan' }] };
  }
  if (pathname.startsWith('/store-owner')) {
    return { title: 'Quản lý Cửa hàng', section: 'Store Owner', breadcrumbs: [{ label: 'Store Owner', href: '/store-owner/dashboard' }, { label: 'Tổng quan' }] };
  }
  return { title: 'Quản trị', section: 'Staff', breadcrumbs: [{ label: 'Staff' }, { label: 'Tổng quan' }] };
}
