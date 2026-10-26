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
      { label: 'Tổng quan hệ thống', path: '/admin/dashboard', icon: LayoutDashboard, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupName: 'NGƯỜI DÙNG & BẢO MẬT',
    items: [
      { label: 'Quản lý người dùng', path: '/admin/users', icon: Users, allowedRoles: ['ADMIN'] },
      { label: 'Phân quyền (RBAC)', path: '/admin/rbac', icon: Sliders, allowedRoles: ['ADMIN'] },
      { label: 'Quản lý chi nhánh', path: '/admin/shops', icon: Building2, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupName: 'DỮ LIỆU DÙNG CHUNG',
    items: [
      { label: 'Danh mục toàn hệ thống', path: '/admin/categories', icon: Tag, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupName: 'AI & TÍNH NĂNG MỚI',
    items: [
      { label: 'Mô hình AI', path: '/admin/ai-config', icon: Cpu, allowedRoles: ['ADMIN'] },
      { label: 'Cờ tính năng AI', path: '/admin/ai-feature-flags', icon: Sparkles, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupName: 'NHẬT KÝ & VẬN HÀNH',
    items: [
      { label: 'Nhật ký kiểm toán', path: '/admin/audit-logs', icon: ScrollText, allowedRoles: ['ADMIN'] },
      { label: 'Nhật ký email', path: '/admin/mailing', icon: Mail, allowedRoles: ['ADMIN'] },
      { label: 'Nhật ký máy chủ', path: '/admin/logs', icon: Terminal, allowedRoles: ['ADMIN'] },
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
      { label: 'Lịch làm việc & xếp ca', path: '/store-owner/shifts', icon: CheckSquare },
      { label: 'Hàng đợi phê duyệt', path: '/store-owner/approvals', icon: FileText },
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
        { label: 'Chiến dịch email', path: '/staff/dashboard/marketing/email', icon: Mail },
        { label: 'Hiệu quả', path: '/staff/dashboard/marketing/analytics', icon: BarChart3 },
      ]
    }
  ],
  cskh: [
    {
      groupName: 'CHĂM SÓC KHÁCH HÀNG',
      items: [
        { label: 'Tổng quan', path: '/staff/dashboard/cskh', icon: Users },
        { label: 'Ticket', path: '/staff/tickets', icon: Ticket },
        { label: 'Đánh giá & bình luận', path: '/staff/reviews', icon: MessageSquare },
        { label: 'Hỗ trợ', path: '/staff/support', icon: Users },
      ]
    }
  ]
};

/* ───────────────────── FLAT REGISTRY FOR METADATA ───────────────────── */
const ALL_ROUTES_REGISTRY: Record<string, { label: string; section: string }> = {
  // Admin
  '/admin/dashboard': { label: 'Tổng quan hệ thống', section: 'Quản trị' },
  '/admin/users': { label: 'Quản lý người dùng', section: 'Quản trị' },
  '/admin/rbac': { label: 'Cấu hình phân quyền (RBAC)', section: 'Quản trị' },
  '/admin/categories': { label: 'Danh mục sản phẩm', section: 'Quản trị' },
  '/admin/shops': { label: 'Quản lý chi nhánh', section: 'Quản trị' },
  '/admin/ai-config': { label: 'Mô hình AI', section: 'Quản trị' },
  '/admin/ai-feature-flags': { label: 'Cờ tính năng AI', section: 'Quản trị' },
  '/admin/audit-logs': { label: 'Nhật ký kiểm toán', section: 'Quản trị' },
  '/admin/mailing': { label: 'Nhật ký email', section: 'Quản trị' },
  '/admin/logs': { label: 'Nhật ký máy chủ', section: 'Quản trị' },
  '/admin/style-guide': { label: 'Design System & UI', section: 'Quản trị' },
  '/admin/backup': { label: 'Sao lưu & khôi phục', section: 'Quản trị' },
  '/admin/monitoring': { label: 'Giám sát hệ thống', section: 'Quản trị' },

  // Store Owner
  '/store-owner/dashboard': { label: 'Tổng quan', section: 'Cửa hàng' },
  '/store-owner/products': { label: 'Sản phẩm & giá bán', section: 'Cửa hàng' },
  '/store-owner/products/import': { label: 'Nhập sản phẩm từ file', section: 'Cửa hàng' },
  '/store-owner/orders': { label: 'Đơn hàng', section: 'Cửa hàng' },
  '/store-owner/promotions': { label: 'Quản lý khuyến mãi & phê duyệt', section: 'Cửa hàng' },
  '/store-owner/categories': { label: 'Danh mục sản phẩm', section: 'Cửa hàng' },
  '/store-owner/inventory': { label: 'Quản lý tồn kho', section: 'Cửa hàng' },
  '/store-owner/manufacturers': { label: 'Quản lý nhà sản xuất', section: 'Cửa hàng' },
  '/store-owner/suppliers': { label: 'Quản lý nhà cung cấp', section: 'Cửa hàng' },
  '/store-owner/staff': { label: 'Quản lý nhân sự', section: 'Cửa hàng' },
  '/store-owner/shifts': { label: 'Lịch làm việc & xếp ca', section: 'Cửa hàng' },
  '/store-owner/approvals': { label: 'Hàng đợi phê duyệt', section: 'Cửa hàng' },
  '/store-owner/logs': { label: 'Nhật ký hoạt động', section: 'Cửa hàng' },

  // Staff
  '/staff/dashboard/sales': { label: 'Tổng quan bán hàng', section: 'Bán hàng' },
  '/staff/dashboard/sales/orders': { label: 'Đơn hàng', section: 'Bán hàng' },
  '/staff/dashboard/warehouse': { label: 'Tổng quan kho', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/dashboard': { label: 'Tổng quan kho hàng', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/fulfillment': { label: 'Xuất hàng', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/receiving': { label: 'Nhập kho', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/inventory': { label: 'Tồn kho & vị trí hàng', section: 'Kho hàng' },
  '/staff/dashboard/warehouse/replenishment': { label: 'Đề xuất nhập thêm', section: 'Kho hàng' },
  '/staff/dashboard/shipping': { label: 'Tổng quan vận chuyển', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/dashboard': { label: 'Tổng quan vận chuyển', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/orders': { label: 'Đơn chờ tạo vận đơn', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/shipments': { label: 'Quản lý kiện hàng', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/cod': { label: 'Quản lý & đối soát tài chính COD', section: 'Vận chuyển' },
  '/staff/dashboard/shipping/exceptions': { label: 'Ngoại lệ giao hàng', section: 'Vận chuyển' },
  '/staff/dashboard/marketing': { label: 'Marketing', section: 'Marketing' },
  '/staff/dashboard/marketing/homepage': { label: 'Trang chủ', section: 'Marketing' },
  '/staff/dashboard/marketing/posts': { label: 'Quản lý bài viết', section: 'Marketing' },
  '/staff/dashboard/marketing/vouchers': { label: 'Quản lý voucher & mã khuyến mãi', section: 'Marketing' },
  '/staff/dashboard/marketing/email': { label: 'Chiến dịch email', section: 'Marketing' },
  '/staff/dashboard/marketing/analytics': { label: 'Hiệu quả marketing', section: 'Marketing' },
  '/staff/dashboard/cskh': { label: 'Tổng quan CSKH', section: 'CSKH' },
  '/staff/tickets': { label: 'Quản lý ticket CSKH', section: 'CSKH' },
  '/store-owner/tickets': { label: 'Ticket hỗ trợ', section: 'Cửa hàng' },
  '/store-owner/support': { label: 'Xử lý ticket', section: 'Cửa hàng' },
  '/staff/reviews': { label: 'Quản lý đánh giá khách hàng', section: 'CSKH' },
  '/staff/support': { label: 'Trung tâm hỗ trợ khách hàng', section: 'CSKH' },

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
    return { title: 'Quản trị Hệ thống', section: 'Quản trị', breadcrumbs: [{ label: 'Quản trị', href: '/admin/dashboard' }, { label: 'Tổng quan' }] };
  }
  if (pathname.startsWith('/store-owner')) {
    return { title: 'Quản lý Cửa hàng', section: 'Cửa hàng', breadcrumbs: [{ label: 'Cửa hàng', href: '/store-owner/dashboard' }, { label: 'Tổng quan' }] };
  }
  return { title: 'Quản trị', section: 'Nhân viên', breadcrumbs: [{ label: 'Nhân viên' }, { label: 'Tổng quan' }] };
}
