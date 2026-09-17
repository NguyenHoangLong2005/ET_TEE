import { clearAuthSession, getAuthToken, setAuthSession } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = typeof window !== "undefined" ? window.localStorage.getItem("ettee_refresh_token") : null;
    if (!refreshToken) return false;
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || !payload.data) return false;
    setAuthSession(payload.data);
    return true;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Không kết nối được tới backend. Vui lòng kiểm tra server.");
  }

  if (response.status === 401 && retry && await refreshAccessToken()) {
    return apiRequest<T>(path, options, false);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    if (response.status === 401) clearAuthSession();
    throw new Error(payload?.message || `Yêu cầu thất bại (${response.status})`);
  }
  return payload.data as T;
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

export async function mergeGuestCart() {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem("ettee_cart");
  if (!raw) return;
  try {
    const items = JSON.parse(raw).map((item: { id: string; quantity: number }) => ({
      variantId: item.id,
      quantity: item.quantity,
    }));
    if (items.length) await apiClient.post("/api/cart/merge", { items });
    window.localStorage.removeItem("ettee_cart");
  } catch {
    // Giữ guest cart nếu merge thất bại để không làm mất dữ liệu khách hàng.
  }
}