import { clearAuthSession, getAuthToken } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";

const getApiBase = () => getApiBaseUrl();

// There is no refresh-token endpoint on the backend: login issues a single JWT
// with a fixed expiration and nothing else. An earlier version of this client
// called POST /api/auth/refresh on every 401, which always 404'd (no refresh
// token was ever stored, and the endpoint doesn't exist) before falling through
// to the same clearAuthSession() below anyway. Removed the dead round-trip
// rather than keep a "retry" mechanism that can never succeed.
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  } catch {
    throw new Error("Không kết nối được tới backend. Vui lòng kiểm tra server.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || (payload && payload.success === false)) {
    if (response.status === 401) clearAuthSession();
    if (response.status === 403) throw new Error("Bạn không có quyền thực hiện thao tác này.");
    throw new Error(payload?.message || payload?.error || `Yêu cầu thất bại (${response.status})`);
  }

  const extractedData = (payload && payload.data !== undefined ? payload.data : payload);
  if (extractedData && typeof extractedData === 'object' && !Array.isArray(extractedData) && !('data' in extractedData)) {
    try {
      Object.defineProperty(extractedData, 'data', {
        value: extractedData,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    } catch {}
  }
  return extractedData as T;
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

