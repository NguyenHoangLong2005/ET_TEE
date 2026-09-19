import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTE_PERMISSIONS } from '@/lib/rbac-config';

// JWT decoding utility function
function parseJwt(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We only care about checking the /staff, /admin, and /store-owner routes
  if (!pathname.startsWith('/staff') && !pathname.startsWith('/admin') && !pathname.startsWith('/store-owner')) {
    return NextResponse.next();
  }

  // 1. Try to get role from the test cookie first (QA/Dev environment override)
  const testRoleCookie = request.cookies.get('test_role')?.value;
  
  // 2. Fallback to auth_token
  const authToken = request.cookies.get('auth_token')?.value;

  let currentRole: string | null = testRoleCookie || null;

  if (!currentRole && authToken) {
    const decoded = parseJwt(authToken);
    if (decoded) {
      currentRole = decoded.role || decoded.authorities?.find((a: string) => a.startsWith('ROLE_'))?.replace('ROLE_', '');
    }
  }

  // If no role found at all, user is not logged in.
  if (!currentRole) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Find if this path requires specific roles
  let requiredRoles: string[] = [];
  
  // Find the most specific (longest) matching prefix
  const matchingPrefix = Object.keys(ROUTE_PERMISSIONS)
    .filter(prefix => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];

  if (matchingPrefix) {
    requiredRoles = ROUTE_PERMISSIONS[matchingPrefix as keyof typeof ROUTE_PERMISSIONS];
  }

  // If requiredRoles is empty, it means anyone logged in can access (e.g. /staff/dashboard root if not overridden)
  if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
    // User does not have permission for this route
    // Redirect to 403 or dashboard
    return NextResponse.redirect(new URL('/403', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/store-owner/:path*',
    '/staff/:path*'
  ],
};
