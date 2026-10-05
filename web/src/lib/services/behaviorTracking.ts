import { getApiBaseUrl } from '@/lib/api-config';
import { getAuthHeaders } from '@/lib/auth';

// Storefront behavior events (user_behavior_events) - the click sequence the session-based
// recommender learns from. The browser only reports VIEW; ADD_TO_CART and PURCHASE are recorded
// by the backend itself once the action succeeded, it just needs the session id header below.

const SESSION_KEY = 'behavior_session';
const LAST_VIEW_KEY = 'behavior_last_view';
// A session ends after 30 minutes without activity (the usual analytics definition), shared
// across tabs via localStorage so two open tabs are one browsing session.
const SESSION_IDLE_MS = 30 * 60 * 1000;
// Refresh / React StrictMode double effects must not count as two views.
const REPEAT_VIEW_MS = 60 * 1000;

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Current behavior session id, rolled over after 30 idle minutes. Null on the server. */
export function getBehaviorSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const now = Date.now();
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as { id: string; at: number } | null;
    const id = stored && now - stored.at < SESSION_IDLE_MS ? stored.id : randomId();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
    return id;
  } catch {
    return null;
  }
}

/** Extra header for requests the backend records an event for (add to cart, checkout). */
export function behaviorSessionHeader(): Record<string, string> {
  const id = getBehaviorSessionId();
  return id ? { 'X-Behavior-Session': id } : {};
}

export function trackProductView(productId: number): void {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const last = JSON.parse(sessionStorage.getItem(LAST_VIEW_KEY) || 'null') as { id: number; at: number } | null;
    if (last && last.id === productId && Date.now() - last.at < REPEAT_VIEW_MS) return;
    sessionStorage.setItem(LAST_VIEW_KEY, JSON.stringify({ id: productId, at: Date.now() }));
  } catch {
    // storage unavailable: track anyway
  }

  // keepalive: the request survives the user clicking away right after the page opened.
  fetch(`${getApiBaseUrl()}/api/events`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ productId, eventType: 'VIEW', sessionId: getBehaviorSessionId() }),
    keepalive: true,
  }).catch(() => {
    // tracking is best effort, never surfaces to the shopper
  });
}
