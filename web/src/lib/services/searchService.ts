import { Product } from './productService';
import { getApiBaseUrl } from '@/lib/api-config';

export type SearchResult = {
  /** HYBRID = keywords + CLIP meaning; KEYWORD = meaning service down; IMAGE = search by photo */
  strategy: 'HYBRID' | 'KEYWORD' | 'IMAGE';
  products: Product[];
};

const EMPTY: SearchResult = { strategy: 'KEYWORD', products: [] };

/** Sprint 5 search (backend SemanticSearchService). */
export const SearchService = {
  async search(q: string, limit: number = 24): Promise<SearchResult> {
    if (!q.trim()) return EMPTY;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
        cache: 'no-store',
      });
      if (!res.ok) return EMPTY;
      const json = await res.json();
      return json.data ?? EMPTY;
    } catch {
      return EMPTY;
    }
  },

  /** Browser only. Throws with the backend's message (too large, not an image, unavailable). */
  async searchByImage(file: File, limit: number = 24): Promise<SearchResult> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${getApiBaseUrl()}/api/search/image?limit=${limit}`, { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || json.error || 'Không tìm được bằng ảnh này');
    return json.data ?? EMPTY;
  },
};
