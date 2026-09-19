const fs = require('fs');
const path = require('path');

const JSON_FILE = path.join(__dirname, '../scraped-products.json');
const TS_FILE = path.join(__dirname, '../src/lib/data/products.ts');

function generateTS() {
    const products = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    
    const tsProducts = products.map((p, i) => {
        const id = i + 1;
        const variants = [];
        const colors = [{ name: p.colors[0], hex: "#000000" }]; // Dummy hex
        
        p.sizes.forEach(size => {
            variants.push({
                color: p.colors[0],
                colorHex: "#000000",
                size: size,
                stock: Math.floor(Math.random() * 50) + 10,
                sku: `${p.slug.toUpperCase()}-${size}`
            });
        });

        // Recommendation tags
        const recTags = [p.category];
        if (p.name.toLowerCase().includes('cotton')) recTags.push('cotton');
        if (p.name.toLowerCase().includes('mặc nhà')) recTags.push('mặc nhà');
        if (p.name.toLowerCase().includes('active')) recTags.push('thể thao');
        
        return `
  {
    id: ${id},
    slug: "${p.slug}",
    name: "${p.name.replace(/"/g, '\\"')}",
    brand: "CANIFA",
    category: "${p.targetGroup}",
    subCategory: "${p.category}",
    price: ${p.price},
    salePrice: ${p.salePrice < p.price ? p.salePrice : p.price},
    images: ["${p.image}", "${p.hoverImage}"],
    variants: ${JSON.stringify(variants, null, 4).replace(/"([^"]+)":/g, '$1:')},
    colors: ${JSON.stringify(colors)},
    sizes: ${JSON.stringify(p.sizes)},
    material: "${p.material}",
    description: "${p.description.replace(/"/g, '\\"')}",
    care: "Giặt máy ở nhiệt độ thường. Không sử dụng hóa chất tẩy.",
    styleTags: ${JSON.stringify([p.category, p.targetGroup])},
    recommendationTags: ${JSON.stringify(recTags)},
    badge: ${Math.random() > 0.8 ? '"MỚI"' : Math.random() > 0.8 ? '"SALE"' : 'undefined'},
    isActive: true,
    soldCount: ${Math.floor(Math.random() * 500)},
    rating: ${(Math.random() * 1.5 + 3.5).toFixed(1)},
    reviewCount: ${Math.floor(Math.random() * 100)}
  }`;
    });

    const header = `// ============================================================
// ET.TEE SHOP — PRODUCT MOCK DATA
// TODO: Replace with Spring Boot API call GET /api/products
// ============================================================

export type ProductVariant = {
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  sku: string;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: "women" | "men" | "kids" | "accessories" | "family";
  subCategory: string;
  price: number;
  salePrice?: number;
  images: string[];
  variants: ProductVariant[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  material: string;
  description: string;
  care: string;
  styleTags: string[];
  recommendationTags: string[];
  badge?: "MỚI" | "SALE" | "BEST";
  isActive: boolean;
  soldCount: number;
  rating: number;
  reviewCount: number;
};

export const PRODUCTS: Product[] = [${tsProducts.join(',')}
];
`;

    fs.writeFileSync(TS_FILE, header);
    console.log(`Generated products.ts with ${tsProducts.length} products.`);
}

generateTS();
