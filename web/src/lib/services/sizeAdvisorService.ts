import { getApiBaseUrl } from '@/lib/api-config';
import { getAuthHeaders } from '@/lib/auth';

// Sprint 6: size advice from the shop's published size charts (backend SizeAdvisorService).
// Not a learned model - there is no fit / return data to learn from yet.

export type Fit = 'SLIM' | 'REGULAR' | 'LOOSE';

export type Body = {
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  fit?: Fit;
};

export type SizeAdvice = {
  size: string | null;
  confidence: 'FITS' | 'CLOSE' | 'OUTSIDE_CHART' | null;
  chart: string | null;
  smaller: string | null;
  larger: string | null;
  /** false: the best size for these measurements is out of stock, `size` is the nearest one in stock */
  bestInStock: boolean;
  bestSize: string | null;
  reasons: string[];
  source: 'INPUT' | 'PROFILE' | null;
  /** NEED_MEASUREMENTS | NO_CHART | NO_STOCK when size is null */
  reason: string | null;
};

export const CONFIDENCE_LABEL: Record<string, string> = {
  FITS: 'Vừa với số đo của bạn',
  CLOSE: 'Gần đúng, nên xem thêm bảng size',
  OUTSIDE_CHART: 'Số đo nằm ngoài bảng size, nên liên hệ tư vấn',
};

const STORAGE_KEY = 'size_profile';

function query(body?: Body): string {
  if (!body) return '';
  const p = new URLSearchParams();
  for (const k of ['height', 'weight', 'chest', 'waist'] as const) {
    const v = body[k];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) p.set(k, String(v));
  }
  if (body.fit) p.set('fit', body.fit);
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function get(url: string): Promise<SizeAdvice | null> {
  try {
    const res = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export const SizeAdvisorService = {
  /** Product's own chart and stock; without a body the signed-in shopper's saved measurements are used. */
  forProduct(slug: string, body?: Body) {
    return get(`${getApiBaseUrl()}/api/recommendations/size/${encodeURIComponent(slug)}${query(body)}`);
  },

  /** chart: MEN_TOP | MEN_BOTTOM | WOMEN | KIDS */
  forChart(chart: string, body: Body) {
    return get(`${getApiBaseUrl()}/api/recommendations/size-chart/${chart}${query(body)}`);
  },

  /** Measurements typed by a guest, remembered on this device only. */
  loadBody(): Body | null {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  },

  saveBody(body: Body) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
    } catch {
      // storage unavailable: nothing to remember
    }
  },
};
