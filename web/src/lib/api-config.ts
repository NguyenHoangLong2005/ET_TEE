/**
 * Resolves the base URL for backend API requests.
 * In browser environments, returns empty string ("") by default so requests use relative paths
 * like `/api/cart`, allowing Next.js rewrites to proxy requests to the backend server smoothly
 * without CORS or cross-origin network issues.
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (typeof window !== 'undefined') return '';
  return process.env.BACKEND_URL || 'http://127.0.0.1:8081';
}
