'use client';

import { useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api-config';

// Counts one view per post per browser session, so a reload or back-navigation doesn't inflate
// the number used to pick the featured post on /news.
export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `post-viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Storage blocked: still count, just without per-session dedupe.
    }
    fetch(`${getApiBaseUrl()}/api/marketing/posts/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
  }, [slug]);

  return null;
}
