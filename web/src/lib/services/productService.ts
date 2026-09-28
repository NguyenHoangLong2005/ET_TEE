export interface ProductVariant {
  id?: number;
  sku: string;
  color: string;
  colorHex?: string;
  colorCode?: string;
  size: string;
  price: number;
  salePrice?: number;
  stock: number;
  availableQuantity?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  brand?: string;
  price: number;
  salePrice?: number;
  categoryId?: number;
  category?: { id: number; name: string; description: string };
  gender?: string;
  targetGroup?: string;
  productType?: string;
  material?: string;
  style?: string;
  status?: string;
  isNew?: boolean;
  isBestSeller?: boolean;
  isSale?: boolean;
  createdAt?: string;
  updatedAt?: string;
  styleTags?: string[];
  recommendationTags?: string[];
  variants: ProductVariant[];
  images: { imageUrl: string; alt?: string; isPrimary?: boolean; sortOrder?: number; colorCode?: string; colorHex?: string; }[];
  averageRating?: number;
  totalReviews?: number;
  soldCount?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  filtersAvailable?: Record<string, any>;
}

export interface ProductStats {
  targetGroup: Record<string, number>;
  productType: Record<string, number>;
  category: Record<string, number>;
  sizes: { adult: string[]; kids: string[] };
  totalActive: number;
}

import { getApiBaseUrl } from '@/lib/api-config';

const getBaseUrl = () => getApiBaseUrl();

export const ProductService = {
  
  async getProducts(params: Record<string, any>): Promise<PaginatedResponse<Product>> {
    const searchParams = new URLSearchParams();
    
    // Append query params
    Object.keys(params).forEach(key => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          val.forEach(item => {
            if (item !== undefined && item !== null && item !== '') {
              searchParams.append(key, String(item));
            }
          });
        } else {
          searchParams.append(key, String(val));
        }
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `${getBaseUrl()}/api/products${queryString ? `?${queryString}` : ''}`;

    try {
      const res = await fetch(endpoint, {
        next: { revalidate: 60 } // optional Next.js cache
      });

      if (!res.ok) {
        throw new Error('Failed to fetch products');
      }
      const json = await res.json();
      return json.data;
    } catch (error) {
      throw new Error('Không thể tải danh sách sản phẩm');
    }
  },


  async getProductBySlug(slug: string): Promise<Product | undefined> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/products/${slug}`, {
        next: { revalidate: 60 }
      });
      if (!res.ok) return undefined;
      const json = await res.json();
      return json.data;
    } catch (e) {
      return undefined;
    }
  },

  async getSimilarProducts(slug: string): Promise<Product[]> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/products/${slug}/similar`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async getOutfits(slug: string): Promise<Product[]> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/products/${slug}/outfits`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // Homepage helpers mapping to getProducts
  async getNewProducts(limit: number = 8): Promise<Product[]> {
    const res = await this.getProducts({ pageSize: limit, sort: 'newest' });
    return res.items || [];
  },

  async getBestSellers(limit: number = 8): Promise<Product[]> {
    const res = await this.getProducts({ pageSize: limit, sort: 'best-seller' });
    return res.items || [];
  },

  async getSaleProducts(limit: number = 8): Promise<Product[]> {
    const res = await this.getProducts({ pageSize: limit, sort: 'price-asc' }); // Simplification for sale
    return res.items || [];
  },

  async getFamilyOutfitProducts(limit: number = 4): Promise<Product[]> {
    const res = await this.getProducts({ pageSize: limit, category: 'family' });
    return res.items || [];
  },

  async getStats(): Promise<ProductStats> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/products/stats`, {
        next: { revalidate: 60 }
      });
      if (!res.ok) {
        return { targetGroup: {}, productType: {}, category: {}, sizes: { adult: [], kids: [] }, totalActive: 0 };
      }
      const json = await res.json();
      return json.data as ProductStats;
    } catch {
      return { targetGroup: {}, productType: {}, category: {}, sizes: { adult: [], kids: [] }, totalActive: 0 };
    }
  }
};
