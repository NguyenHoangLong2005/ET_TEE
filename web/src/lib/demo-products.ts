export type DemoProduct = {
  id: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  status: string;
  basePrice: number;
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    active: boolean;
    attributeSignature: string;
  }>;
};

export const demoProducts: DemoProduct[] = [
  {
    id: "p-oversized-shirt",
    name: "Classic Oversized Cotton T-Shirt",
    brand: "Urban Wear",
    description:
      "Áo thun cotton oversize được thiết kế để mang phong cách tối giản, thoải mái và dễ mix match với nhiều loại trang phục.",
    category: "Tops & Shirts",
    status: "active",
    basePrice: 2999000,
    variants: [
      {
        id: "v-shirt-black",
        sku: "TSH-1024-BLK-M",
        price: 2999000,
        compareAtPrice: 3499000,
        active: true,
        attributeSignature: "size:M;color:Black",
      },
    ],
  },
  {
    id: "p-slim-jeans",
    name: "Slim Fit Denim Jeans",
    brand: "Denim Co",
    description:
      "Quần denim slim fit giúp tạo form dáng chuẩn, phù hợp cho cả công việc và đi chơi.",
    category: "Bottoms & Pants",
    status: "active",
    basePrice: 5999000,
    variants: [
      {
        id: "v-jeans-blue",
        sku: "DJE-8841-BLU-L",
        price: 5999000,
        compareAtPrice: 6999000,
        active: true,
        attributeSignature: "size:L;color:Blue",
      },
    ],
  },
  {
    id: "p-windbreaker",
    name: "Minimalist Windbreaker Jacket",
    brand: "Outdoor Tech",
    description:
      "Áo khoác windbreaker nhẹ nhưng ấm, dễ dàng kết hợp với quần jeans hoặc áo thun trong mọi thời tiết.",
    category: "Outerwear",
    status: "active",
    basePrice: 8999000,
    variants: [
      {
        id: "v-jacket-charcoal",
        sku: "JKT-2201-CHR-XL",
        price: 8999000,
        compareAtPrice: 10999000,
        active: true,
        attributeSignature: "size:XL;color:Charcoal",
      },
    ],
  },
  {
    id: "p-runner-sneakers",
    name: "Street Runner Sneakers",
    brand: "Stride Lab",
    description:
      "Giày sneaker chạy bộ street style với đế êm, thoải mái suốt cả ngày.",
    category: "Footwear",
    status: "active",
    basePrice: 3299000,
    variants: [
      {
        id: "v-sneakers-black",
        sku: "SNE-5510-BLK-42",
        price: 3299000,
        compareAtPrice: 3999000,
        active: true,
        attributeSignature: "size:42;color:Black",
      },
    ],
  },
];

export const demoProductMap = Object.fromEntries(demoProducts.map((product) => [product.id, product]));

export function getProductPrice(product: DemoProduct) {
  return product.variants.find((variant) => variant.active)?.price ?? product.basePrice;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
