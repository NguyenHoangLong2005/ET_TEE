'use client';

import { useEffect } from 'react';
import { trackProductView } from '@/lib/services/behaviorTracking';

/** Reports one VIEW event per product page open; renders nothing. */
export default function ProductViewTracker({ productId }: { productId: number }) {
  useEffect(() => {
    trackProductView(productId);
  }, [productId]);

  return null;
}
