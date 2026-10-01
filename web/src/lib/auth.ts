export type StoredUser = {
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  username?: string;
  roles?: string[];
  permissions?: string[];
  status?: string;
  accessToken?: string;
  refreshToken?: string;
  shopId?: number | null;
};

export const AUTH_STORAGE = {
  accessToken: "auth_token",
  refreshToken: "ettee_refresh_token",
  user: "ettee_user",
  cart: "ettee_cart",
  /** Flag lưu role quản lý khi chọn "Ghi nhớ đăng nhập" */
  adminRemember: "ettee_admin_remember",
  /**
   * Lưu trong sessionStorage để đánh dấu đã auto-redirect trong phiên này.
   * sessionStorage tự xóa khi đóng browser → redirect lại khi mở browser mới.
   */
  autoRedirected: "ettee_auto_redirected",
};

export function normalizeRoleCode(value: string | null | undefined) {
  if (!value) return "";

  return value
    .toUpperCase()
    .replace(/^ROLE_/, "")
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Trang doi mat khau tam (do admin cap lai) theo loai tai khoan. Khach hang
 * (USER) khong vao duoc khu /staff, nen phai dung trang cua tai khoan khach.
 */
export function getPasswordChangePath(role: string | null | undefined) {
  const norm = normalizeRoleCode(role);
  return !norm || norm === "USER" || norm === "CUSTOMER"
    ? "/account/change-password"
    : "/staff/change-password";
}

export function normalizeRoleList(values?: (string | null | undefined)[] | string | null) {
  if (!values) return [];
  const arr = Array.isArray(values) ? values : [values];
  return Array.from(
    new Set(
      arr
        .map((value) => normalizeRoleCode(value))
        .filter(Boolean)
    )
  );
}

export function normalizePermissionCode(value: string | null | undefined) {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/^authority_/, "")
    .replace(/[^a-z0-9_.-]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

export function normalizePermissionList(values?: string[] | null) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => normalizePermissionCode(value))
        .filter(Boolean)
    )
  );
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE.user) || window.sessionStorage.getItem(AUTH_STORAGE.user);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredUser;
    return {
      ...parsed,
      roles: normalizeRoleList(parsed.roles),
      permissions: normalizePermissionList(parsed.permissions),
    };
  } catch {
    return null;
  }
}

export function setAuthSession(payload: StoredUser) {
  if (typeof window === "undefined") return;

  if (payload.accessToken) {
    window.localStorage.setItem(AUTH_STORAGE.accessToken, payload.accessToken);
    document.cookie = `auth_token=${payload.accessToken}; path=/; max-age=2592000; SameSite=Lax`;
  }

  if (payload.refreshToken) {
    window.localStorage.setItem(AUTH_STORAGE.refreshToken, payload.refreshToken);
  }

  const normalizedUser: StoredUser = {
    id: payload.id,
    fullName: payload.fullName || payload.username || "ET.TEE User",
    email: payload.email || payload.username,
    phone: payload.phone,
    roles: normalizeRoleList(payload.roles),
    permissions: normalizePermissionList(payload.permissions),
    status: payload.status,
  };

  window.localStorage.setItem(AUTH_STORAGE.user, JSON.stringify(normalizedUser));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(AUTH_STORAGE.accessToken);
  window.localStorage.removeItem(AUTH_STORAGE.refreshToken);
  window.localStorage.removeItem(AUTH_STORAGE.user);
  window.localStorage.removeItem(AUTH_STORAGE.adminRemember);

  window.sessionStorage.removeItem(AUTH_STORAGE.accessToken);
  window.sessionStorage.removeItem(AUTH_STORAGE.refreshToken);
  window.sessionStorage.removeItem(AUTH_STORAGE.user);
  // Reset cờ auto-redirect để lần login sau vẫn redirect được
  window.sessionStorage.removeItem(AUTH_STORAGE.autoRedirected);
  
  // Clear cookies
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'ettee_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'test_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}

/**
 * Lưu role quản lý vào localStorage khi chọn "Ghi nhớ đăng nhập".
 * Chỉ lưu các role không phải USER/khách hàng.
 */
export function setAdminRemember(role: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE.adminRemember, role);
}

/**
 * Đọc role quản lý đã ghi nhớ từ localStorage.
 * Trả về null nếu không có hoặc không phải role quản lý.
 */
export function getAdminRemember(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_STORAGE.adminRemember);
}

/**
 * Xóa flag ghi nhớ đăng nhập quản lý.
 */
export function clearAdminRemember() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE.adminRemember);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_STORAGE.accessToken) || window.sessionStorage.getItem(AUTH_STORAGE.accessToken);
}

function generateGuestToken(): string {
  // crypto.randomUUID() only exists in secure contexts (HTTPS or localhost).
  // Opening the site over a LAN IP (http://192.168.x.x:3000, exactly how the
  // README says to test on a phone) is an insecure context, so this threw
  // and silently broke the guest cart entirely. Fall back to crypto.getRandomValues
  // (available without a secure context) when randomUUID isn't there.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getGuestCartToken(): string | null {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem('guest_cart_token');
  if (!token) {
    token = generateGuestToken();
    localStorage.setItem('guest_cart_token', token);
  }
  return token;
}

export function hasAnyRole(userRoles: string[] | null | undefined, allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map((role) => normalizeRoleCode(role));
  const normalizedUserRoles = normalizeRoleList(userRoles);
  return normalizedAllowed.some((role) => normalizedUserRoles.includes(role));
}

export function hasAnyPermission(
  userPermissions: string[] | null | undefined,
  allowedPermissions: string[],
  userRoles?: (string | null | undefined)[] | string | null
) {
  return checkAnyPermission(userPermissions, allowedPermissions, userRoles);
}

export function getActiveRole(userRoles?: (string | null | undefined)[] | string | null): string {
  // Previously also read a `test_role` value from localStorage and trusted it
  // over the account's real role, so anyone could run
  // localStorage.setItem('test_role','ADMIN') in the console and have
  // PermissionGuard / StaffSidebar treat them as an admin. Removed: the backend
  // never checks this value, so it only ever controlled what the UI *showed*,
  // but a role switch a user can flip themselves has no legitimate use outside
  // a real impersonation feature (which this wasn't).
  const normalizedUserRoles = normalizeRoleList(userRoles);
  if (normalizedUserRoles.length > 0) return normalizedUserRoles[0];
  return "";
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'MANAGE_USER', 'MANAGE_ROLE_PERMISSION', 'MANAGE_GLOBAL_CATEGORY',
    'CONFIG_PAYMENT_SHIPPING', 'VIEW_SYS_ERROR_LOG', 'VIEW_AUDIT_LOG',
    'MANAGE_BACKUP', 'MANAGE_AI_MODEL_FEATURE_FLAG', 'MANAGE_MAILING',
    'VIEW_SYSTEM_DASHBOARD', 'PRODUCT_VIEW', 'ORDER_VIEW'
  ],
  SUPER_ADMIN: [
    'MANAGE_USER', 'MANAGE_ROLE_PERMISSION', 'MANAGE_GLOBAL_CATEGORY',
    'CONFIG_PAYMENT_SHIPPING', 'VIEW_SYS_ERROR_LOG', 'VIEW_AUDIT_LOG',
    'MANAGE_BACKUP', 'MANAGE_AI_MODEL_FEATURE_FLAG', 'MANAGE_MAILING',
    'VIEW_SYSTEM_DASHBOARD', 'PRODUCT_VIEW', 'ORDER_VIEW'
  ],
  SHOP_OWNER: [
    'MANAGE_SHOP_STAFF', 'VIEW_SHOP_DASHBOARD', 'VIEW_SHOP_LOG', 'VIEW_SHOP_AUDIT_LOG',
    'APPROVE_SHOP_PROMO', 'APPROVE_PROMOTION', 'MANAGE_SHOP_INVENTORY', 'APPROVE_INVENTORY_ADJUSTMENT',
    'MANAGE_SHOP_CATEGORY', 'MANAGE_SHOP_PRODUCT', 'VIEW_NEW_ORDER', 'VERIFY_ORDER', 'PROCESS_ORDER_NOTE',
    'MANAGE_TICKET', 'LOOKUP_ORDER_BASIC', 'PICK_PACK_LABEL', 'INBOUND_STOCK', 'MANAGE_WAYBILL',
    'RECONCILE_COD', 'MANAGE_BANNER_LANDING', 'MANAGE_CAMPAIGN_PROMO', 'VIEW_CAMPAIGN_ANALYTICS',
    'ORDER_VIEW', 'PRODUCT_VIEW'
  ],
  SALES_STAFF: [
    'VIEW_NEW_ORDER', 'VERIFY_ORDER', 'PROCESS_ORDER_NOTE', 'REQUEST_STOCK_HOLD', 'MONITOR_ORDER_SLA',
    'SEARCH_ORDER_BASIC', 'LOOKUP_ORDER_BASIC', 'ORDER_VIEW', 'PRODUCT_VIEW'
  ],
  CSKH_STAFF: [
    'CHAT_CUSTOMER', 'MANAGE_TICKET', 'SEARCH_ORDER_BASIC', 'LOOKUP_ORDER_BASIC',
    'PROCESS_RETURN_REFUND', 'ISSUE_SUPPORT_VOUCHER', 'GRANT_CSKH_VOUCHER', 'ESCALATE_TICKET',
    'ORDER_VIEW', 'PRODUCT_VIEW'
  ],
  WAREHOUSE_STAFF: [
    'INBOUND_STOCK', 'COUNT_STOCK', 'MANAGE_STOCK_LOCATION', 'ADJUST_STOCK',
    'HOLD_STOCK_ORDER', 'PICK_PACK_LABEL', 'HANDOVER_SHIPPING', 'PROPOSE_RESTOCK',
    'ORDER_VIEW', 'PRODUCT_VIEW'
  ],
  SHIPPING_STAFF: [
    'RECEIVE_PACKED_LIST', 'MANAGE_WAYBILL', 'CONFIRM_HANDOVER',
    'UPDATE_SHIPPING_EXCEPTION', 'UPLOAD_POD', 'RECONCILE_COD',
    'ORDER_VIEW', 'PRODUCT_VIEW'
  ],
  MARKETING_STAFF: [
    'MANAGE_BANNER_LANDING', 'MANAGE_CAMPAIGN_PROMO', 'MANAGE_PRODUCT_PLACEMENT',
    'AB_TEST_CAMPAIGN', 'VIEW_CAMPAIGN_ANALYTICS', 'MANAGE_MERCHANDISING',
    'ORDER_VIEW', 'PRODUCT_VIEW'
  ],
  STAFF: [
    'VIEW_NEW_ORDER', 'VERIFY_ORDER', 'PROCESS_ORDER_NOTE', 'ORDER_VIEW', 'PRODUCT_VIEW'
  ],
};

export function getUserEffectivePermissions(userPermissions?: string[] | null, userRoles?: (string | null | undefined)[] | string | null): string[] {
  const activeRole = getActiveRole(userRoles);
  const userPerms = normalizePermissionList(userPermissions);
  const defaultPerms = activeRole ? normalizePermissionList(DEFAULT_ROLE_PERMISSIONS[activeRole] || []) : [];
  
  return Array.from(new Set([...userPerms, ...defaultPerms]));
}

export function checkAnyPermission(userPermissions: string[] | null | undefined, requiredPermissions: string[], userRoles?: (string | null | undefined)[] | string | null) {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  
  const activeRole = getActiveRole(userRoles);
  if (activeRole === "ADMIN" || activeRole === "SUPER_ADMIN") return true;
  
  const normRoles = normalizeRoleList(userRoles);
  if (normRoles.includes("ADMIN") || normRoles.includes("SUPER_ADMIN")) return true;

  const effectivePermissions = getUserEffectivePermissions(userPermissions, userRoles);
  const normalizedAllowed = requiredPermissions.map((permission) => normalizePermissionCode(permission));

  return normalizedAllowed.some((permission) => effectivePermissions.includes(permission));
}

import { getApiBaseUrl } from "@/lib/api-config";

export async function refreshCurrentUser(apiBase = getApiBaseUrl()) {
  if (typeof window === "undefined" || !getAuthToken()) return null;

  const response = await fetch(`${apiBase}/api/auth/me`, {

    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || "Không thể đồng bộ phiên đăng nhập");
  }

  const currentToken = getAuthToken();
  setAuthSession({ ...payload.data, accessToken: currentToken || undefined });
  return getStoredUser();
}

export function getAuthHeaders(guestTokenRequired = false, extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  const authToken = getAuthToken();
  const guestToken = getGuestCartToken();

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (guestTokenRequired && guestToken) {
    headers['X-Guest-Cart-Token'] = guestToken;
  } else if (!authToken && guestToken) {
    headers['X-Guest-Cart-Token'] = guestToken;
  }

  return headers;
}

export function getRoleDisplayName(role: string | null | undefined): string {
  if (!role) return 'Nhân viên';
  const norm = normalizeRoleCode(role);
  switch (norm) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return 'Quản trị viên Hệ thống';
    case 'SHOP_OWNER':
      return 'Chủ cửa hàng';
    case 'SALES_STAFF':
      return 'Nhân viên Bán hàng';
    case 'CSKH_STAFF':
      return 'Chăm sóc Khách hàng';
    case 'WAREHOUSE_STAFF':
      return 'Nhân viên Kho';
    case 'SHIPPING_STAFF':
      return 'Nhân viên Vận chuyển';
    case 'MARKETING_STAFF':
      return 'Nhân viên Marketing';
    case 'STAFF':
      return 'Nhân viên Cửa hàng';
    default:
      return norm.replace(/_/g, ' ');
  }
}

export function formatGreetingName(fullName: string | null | undefined, fallback: string = 'Bạn'): string {
  if (!fullName) return fallback;
  const cleanName = fullName.replace(/\(.*?\)/g, '').trim();
  if (!cleanName) return fallback;

  const lower = cleanName.toLowerCase();
  if (
    lower.includes('cửa hàng') ||
    lower.includes('quản trị') ||
    lower.includes('nhân viên') ||
    lower === 'admin' ||
    lower === 'owner' ||
    lower === 'staff'
  ) {
    return cleanName;
  }

  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1];
}


