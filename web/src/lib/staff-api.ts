/** All staff requests use Next's same-origin proxy; do not call localhost:8080 from LAN clients. */
export async function staffRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  const data = body && typeof body === "object" ? body as Record<string, unknown> : null;
  if (!response.ok || data?.success === false) {
    const errorText = typeof data?.message === "string" ? data.message : undefined;
    throw new Error(errorText || (response.status === 502 || response.status === 503
      ? "Không thể kết nối Spring Boot. Kiểm tra backend cổng 8080."
      : `Yêu cầu API thất bại (HTTP ${response.status}).`));
  }
  return (data && "data" in data ? data.data : body) as T;
}

export async function staffList<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const result = await staffRequest<unknown>(path, { signal });
  if (!Array.isArray(result)) throw new Error("API không trả về danh sách hợp lệ.");
  return result as T[];
}

export function staffAction<T = unknown>(path: string, method: "POST" | "PUT", payload?: unknown): Promise<T> {
  return staffRequest<T>(path, { method, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi khi xử lý yêu cầu.";
}
