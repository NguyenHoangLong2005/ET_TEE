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
};

export const AUTH_STORAGE = {
  accessToken: "ettee_access_token",
  refreshToken: "ettee_refresh_token",
  user: "ettee_user",
  cart: "ettee_cart",
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

export function normalizeRoleList(values?: string[] | null) {
  return Array.from(
    new Set(
      (values ?? [])
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

  const raw = window.localStorage.getItem(AUTH_STORAGE.user);
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
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_STORAGE.accessToken);
}

export function hasAnyRole(userRoles: string[] | null | undefined, allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map((role) => normalizeRoleCode(role));
  const normalizedUserRoles = normalizeRoleList(userRoles);
  return normalizedAllowed.some((role) => normalizedUserRoles.includes(role));
}

export function hasAnyPermission(userPermissions: string[] | null | undefined, allowedPermissions: string[]) {
  const normalizedAllowed = allowedPermissions.map((permission) => normalizePermissionCode(permission));
  const normalizedUserPermissions = normalizePermissionList(userPermissions);
  return normalizedAllowed.some((permission) => normalizedUserPermissions.includes(permission));
}

export async function refreshCurrentUser(apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080") {
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

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  const token = getAuthToken();

  return {
    "Content-Type": "application/json",
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
