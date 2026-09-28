import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Staff/Admin roles - không được phép truy cập customer routes
const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SHOP_OWNER', 'MARKETING_STAFF', 'SALES_STAFF', 'CSKH_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF', 'STAFF'];

// Public routes - ai cũng có thể truy cập
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/products',
  '/categories',
  '/search',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
];

// Customer routes mà staff không được truy cập
const CUSTOMER_ONLY_ROUTES = [
  '/cart',
  '/checkout',
  '/payment',
  '/payment-callback',
  '/payment-success',
  '/payment-failed',
  '/order-success',
  '/wishlist',
  '/reviews',
];

function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  // Check patterns
  if (pathname === '/') return true;
  if (pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/products/')) return true;
  if (pathname.startsWith('/categories/')) return true;
  if (pathname.startsWith('/search')) return true;
  return false;
}

function isCustomerOnlyRoute(pathname: string): boolean {
  // Check exact matches
  if (CUSTOMER_ONLY_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return true;
  }
  // Check patterns like /orders/[id], /reviews/[id]
  if (pathname.match(/^\/orders\//) && !pathname.startsWith('/staff')) return true;
  if (pathname.match(/^\/reviews\//)) return true;
  if (pathname.match(/^\/wishlist\//)) return true;
  if (pathname.match(/^\/payment\//)) return true;
  
  return false;
}

// Get role from token payload (simple decode without verification)
function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  
  try {
    // Simple JWT decode (just payload, not verification)
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    const rawRole = payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : payload.roles) || (Array.isArray(payload.authorities) ? payload.authorities[0] : payload.authorities) || null;
    return typeof rawRole === 'string' ? rawRole : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip proxy for non-page requests
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Allow public routes without checking
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get auth token from cookies
  const authToken = request.cookies.get('auth_token')?.value;
  
  // Get user role from the real auth token only. This used to also accept a
  // `test_role` cookie and trust it over the token — anyone could run
  // `document.cookie='test_role=ADMIN'` in the browser console and have this
  // proxy route them as ADMIN. The backend still enforced real authorization
  // (Spring Security ignores this cookie entirely), so no data was exposed, but
  // a client-settable role override has no place in a production edge layer.
  const userRole: string | null = authToken ? getRoleFromToken(authToken) : null;
  
  // Check if user is a staff/admin
  const normalizedRole = userRole ? userRole.toUpperCase().replace(/^ROLE_/, '') : null;
  const isStaff = Boolean(normalizedRole && STAFF_ROLES.includes(normalizedRole));
  
  const roleDashboardMap: Record<string, string> = {
    'ADMIN': '/admin/dashboard',
    'SUPER_ADMIN': '/admin/dashboard',
    'SHOP_OWNER': '/store-owner/dashboard',
    'MARKETING_STAFF': '/staff/dashboard/marketing',
    'SALES_STAFF': '/staff/dashboard/sales',
    'CSKH_STAFF': '/staff/tickets',
    'WAREHOUSE_STAFF': '/staff/dashboard/warehouse',
    'SHIPPING_STAFF': '/staff/dashboard/shipping',
    'STAFF': '/staff/dashboard/sales',
  };

  // Enforce role boundaries on /admin, /store-owner, and /staff when role is known from token/cookie
  if (normalizedRole) {
    if (!isStaff && (pathname.startsWith('/admin') || pathname.startsWith('/store-owner') || pathname.startsWith('/staff'))) {
      return NextResponse.redirect(new URL('/403', request.url));
    }

    if (isStaff) {
      if (pathname.startsWith('/admin') && normalizedRole !== 'ADMIN' && normalizedRole !== 'SUPER_ADMIN') {
        const redirectUrl = roleDashboardMap[normalizedRole] || '/staff/dashboard';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
      if (pathname.startsWith('/store-owner') && normalizedRole !== 'SHOP_OWNER' && normalizedRole !== 'ADMIN' && normalizedRole !== 'SUPER_ADMIN') {
        const redirectUrl = roleDashboardMap[normalizedRole] || '/staff/dashboard';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
  }

  // If user is staff and trying to access customer-only routes, redirect
  if (isStaff && isCustomerOnlyRoute(pathname)) {
    const redirectUrl = (normalizedRole && roleDashboardMap[normalizedRole]) || '/staff/dashboard/sales';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
