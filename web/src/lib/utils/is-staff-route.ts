/**
 * Khu vực quản trị (admin / staff / store-owner) không dùng giỏ hàng và wishlist.
 * Dùng helper này để các provider của phân hệ khách hàng không gọi API vô ích
 * trên mọi lần load trang dashboard.
 */
export const STAFF_ROUTE_PREFIXES = ['/admin', '/staff', '/store-owner'] as const;

export function isStaffRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return STAFF_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
