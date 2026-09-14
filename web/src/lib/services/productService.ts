export interface ProductVariant {
  id?: number;
  sku: string;
  color: string;
  colorHex?: string;
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
  images: { imageUrl: string; alt?: string; isPrimary?: boolean; sortOrder?: number }[];
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
  totalActive: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';

export const ProductService = {
  
  async getProducts(params: Record<string, any>): Promise<PaginatedResponse<Product>> {
    const url = new URL(`${API_BASE_URL}/api/products`);
    
    // Append query params
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, String(params[key]));
      }
    });

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 } // optional Next.js cache
    });

    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }
    const json = await res.json();
    return json.data;
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${slug}`, {
        next: { revalidate: 60 }
      });
      if (!res.ok) return undefined;
      const json = await res.json();
      return json.data;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  },

  async getSimilarProducts(slug: string): Promise<Product[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${slug}/similar`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async getOutfits(slug: string): Promise<Product[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${slug}/outfits`);
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
    const res = await fetch(`${API_BASE_URL}/api/products/stats`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) {
      throw new Error('Failed to fetch product stats');
    }
    const json = await res.json();
    return json.data as ProductStats;
  }
};
