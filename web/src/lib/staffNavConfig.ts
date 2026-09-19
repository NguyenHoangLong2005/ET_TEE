import {
  LayoutDashboard,
  Users,
  Settings,
  ShoppingBag,
  Package,
  Headset,
  Megaphone,
  Box,
  Truck,
  FileText,
  BarChart,
  Tag,
  FolderTree,
  Activity,
  History,
  HardDrive,
  Sparkles,
  ScrollText,
  Mail,
  CheckSquare
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

export const STAFF_NAV_CONFIG: Record<string, NavItem[]> = {
  ADMIN: [
    { label: 'Tổng quan hệ thống', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Quản lý người dùng', path: '/admin/users', icon: Users },
    { label: 'Cây danh mục', path: '/admin/categories', icon: FolderTree },
    { label: 'Cấu hình hệ thống', path: '/admin/settings/payments-shipping', icon: Settings },
    { label: 'Giám sát lỗi', path: '/admin/monitoring', icon: Activity },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
    { label: 'Sao lưu dữ liệu', path: '/admin/backup', icon: HardDrive },
    { label: 'AI & Feature Flags', path: '/admin/ai-feature-flags', icon: Sparkles },
    { label: 'System Logs', path: '/admin/logs', icon: ScrollText },
    { label: 'Mailing Center', path: '/admin/mailing', icon: Mail },
  ],
  SHOP_OWNER: [
    { label: 'Doanh thu & Báo cáo', path: '/store-owner/dashboard', icon: BarChart },
    { label: 'Quản lý sản phẩm', path: '/store-owner/products', icon: ShoppingBag },
    { label: 'Nhân sự cửa hàng', path: '/store-owner/staff', icon: Users },
    { label: 'Phê duyệt & Xử lý', path: '/store-owner/approvals', icon: CheckSquare },
    { label: 'Nhật ký cửa hàng', path: '/store-owner/logs', icon: ScrollText },
  ],
  MARKETING_STAFF: [
    { label: 'Dashboard Marketing', path: '/staff/dashboard/marketing', icon: LayoutDashboard },
    { label: 'Quản lý sản phẩm', path: '/staff/products', icon: ShoppingBag },
    { label: 'Quản lý Banner', path: '/staff/banners', icon: Megaphone },
    { label: 'Quản lý Khuyến mãi', path: '/staff/vouchers', icon: Tag },
  ],
  SALES_STAFF: [
    { label: 'Dashboard Sales', path: '/staff/dashboard/sales', icon: LayoutDashboard },
    { label: 'Xử lý đơn hàng', path: '/staff/dashboard/sales/orders', icon: Package },
    { label: 'Hỗ trợ khách hàng', path: '/staff/support', icon: Headset },
  ],
  WAREHOUSE_STAFF: [
    { label: 'Dashboard Kho', path: '/staff/dashboard/warehouse', icon: LayoutDashboard },
    { label: 'Tồn kho', path: '/staff/dashboard/warehouse/inventory', icon: Box },
    { label: 'Nhập hàng', path: '/staff/dashboard/warehouse/receiving', icon: Package },
    { label: 'Lấy hàng (Picking)', path: '/staff/dashboard/warehouse/picking', icon: FileText },
    { label: 'Đóng gói (Packing)', path: '/staff/dashboard/warehouse/packing', icon: Box },
  ],
  SHIPPING_STAFF: [
    { label: 'Dashboard Vận chuyển', path: '/staff/dashboard/shipping', icon: LayoutDashboard },
    { label: 'Vận đơn cần giao', path: '/staff/dashboard/shipping/shipments', icon: Truck },
    { label: 'Quản lý COD', path: '/staff/dashboard/shipping/cod', icon: FileText },
    { label: 'Ngoại lệ giao hàng', path: '/staff/dashboard/shipping/exceptions', icon: Headset },
  ],
  STAFF: [
    { label: 'Tổng quan', path: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'Sản phẩm', path: '/staff/products', icon: ShoppingBag },
    { label: 'Đơn hàng', path: '/staff/orders', icon: Package },
  ]
};
