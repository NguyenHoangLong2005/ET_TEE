/**
 * Resolves the base URL for backend API requests.
 * In browser environments, returns empty string ("") by default so requests use relative paths
 * like `/api/cart`, allowing Next.js rewrites to proxy requests to the backend server smoothly
 * without CORS or cross-origin network issues.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // In browser client environments, return relative base URL ("") by default so requests use
    // relative paths like `/api/cart`, allowing Next.js rewrites to proxy requests to the backend
    // server smoothly without CORS or cross-origin network issues.
    return process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || '';
  }
  // On server-side (SSR / Node.js): use explicit 127.0.0.1 IP to prevent Node IPv6 localhost resolution failures (ECONNREFUSED)
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8081';
}

