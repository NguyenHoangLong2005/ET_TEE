import * as fs from 'fs';
import * as path from 'path';

// Load the raw products directly from the TS file
import { PRODUCTS } from '../web/src/lib/data/products';

const validProducts = [];
const rejectedProducts = [];

const colorMapper = {
  black: { name: 'Đen', hex: '#111111', code: 'black' },
  white: { name: 'Trắng', hex: '#ffffff', code: 'white' },
  navy: { name: 'Xanh navy', hex: '#0f172a', code: 'navy' },
  blue: { name: 'Xanh', hex: '#2563eb', code: 'blue' },
  denim: { name: 'Xanh denim', hex: '#3b5f8a', code: 'denim' },
  beige: { name: 'Be', hex: '#d6c3a5', code: 'beige' },
  gray: { name: 'Xám', hex: '#9ca3af', code: 'gray' },
  pink: { name: 'Hồng', hex: '#f9a8d4', code: 'pink' },
  yellow: { name: 'Vàng', hex: '#facc15', code: 'yellow' },
  red: { name: 'Đỏ', hex: '#dc2626', code: 'red' },
  green: { name: 'Xanh lá', hex: '#16a34a', code: 'green' },
  cream: { name: 'Kem', hex: '#f3e5ab', code: 'cream' },
  earth: { name: 'Nâu đất', hex: '#8b5a2b', code: 'earth' },
  graygreen: { name: 'Xám xanh', hex: '#5f7a61', code: 'graygreen' },
  unknown: { name: 'Nhiều màu', hex: '#cccccc', code: 'unknown' },
};

function extractColorFromUrl(url: string) {
  if (url.match(/-sw[0-9]*\.webp$/)) return colorMapper.white;
  if (url.match(/-sb[0-9]*\.webp$/)) return colorMapper.black;
  if (url.match(/-sk[0-9]*\.webp$/)) return colorMapper.gray;
  if (url.match(/-sa[0-9]*\.webp$/)) return colorMapper.beige;
  if (url.match(/-sl[0-9]*\.webp$/)) return colorMapper.cream;
  if (url.match(/-se[0-9]*\.webp$/)) return colorMapper.earth;
  if (url.match(/-sg[0-9]*\.webp$/)) return colorMapper.graygreen;
  if (url.match(/-sy[0-9]*\.webp$/)) return colorMapper.yellow;
  return null;
}

function determineColors(productName, targetGroup, productType) {
  const name = productName.toLowerCase();
  
  // Explicit colors in name
  if (name.includes('đen')) return [colorMapper.black];
  if (name.includes('trắng')) return [colorMapper.white];
  if (name.includes('navy')) return [colorMapper.navy];
  if (name.includes('denim')) return [colorMapper.denim];
  if (name.includes('hồng')) return [colorMapper.pink];
  if (name.includes('vàng')) return [colorMapper.yellow];
  if (name.includes('đỏ')) return [colorMapper.red];
  if (name.includes('be')) return [colorMapper.beige];
  if (name.includes('xám')) return [colorMapper.gray];
  if (name.includes('xanh lá')) return [colorMapper.green];
  if (name.includes('xanh')) return [colorMapper.blue];

  // Logic for unassigned colors based on target group and product type
  const colors = [];
  
  if (productType === 'jeans' || productType === 'quần jeans') {
    colors.push(colorMapper.denim, colorMapper.black, colorMapper.gray);
    return colors;
  }

  if (targetGroup === 'kids' || targetGroup === 'bé' || name.includes('bé')) {
    colors.push(colorMapper.white, colorMapper.pink, colorMapper.blue, colorMapper.yellow);
    return colors;
  }

  if (productType === 'tshirt' || productType === 'áo phông' || name.includes('áo phông') || name.includes('áo thun')) {
    colors.push(colorMapper.black, colorMapper.white, colorMapper.beige, colorMapper.navy);
    return colors;
  }

  if (targetGroup === 'women' || targetGroup === 'nữ' || name.includes('nữ')) {
    colors.push(colorMapper.white, colorMapper.beige, colorMapper.pink, colorMapper.black);
    return colors;
  }

  // Default fallback for adult men or generic
  colors.push(colorMapper.black, colorMapper.navy, colorMapper.gray);
  return colors;
}

function getValidSizes(targetGroup, isAccessory) {
  if (isAccessory) return ['One Size'];
  if (targetGroup === 'kids' || targetGroup === 'bé') {
    return ['90', '100', '110', '120', '130', '140', '150', '160'];
  }
  return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
}

let colorStats = {
  black: 0,
  unknown: 0,
  assorted_assigned: 0
};

console.log(`Starting normalization for ${PRODUCTS.length} products...`);

PRODUCTS.forEach(p => {
  let rejectReason = null;

  if (!p.images || p.images.length === 0) rejectReason = 'Missing primary image';
  if (p.price < 0) rejectReason = 'Negative price';
  if (p.salePrice && p.salePrice > p.price) rejectReason = 'Sale price > Regular price';
  if (p.variants && p.variants.length === 0) rejectReason = 'No variants';
  if (!p.name) rejectReason = 'Missing name';

  if (rejectReason) {
    rejectedProducts.push({ product: p.name || p.id, reason: rejectReason });
    return;
  }

  // Normalize Target Group and Category
  let targetGroup = p.category;
  if (p.name.toLowerCase().includes('bé trai') || p.name.toLowerCase().includes('bé gái')) {
    targetGroup = 'kids';
  } else if (p.name.toLowerCase().includes('nam')) {
    targetGroup = 'men';
  } else if (p.name.toLowerCase().includes('nữ')) {
    targetGroup = 'women';
  }

  // Normalize Colors based on Images
  const mappedColors = [];
  const uniqueColorCodes = new Set();
  
  const mappedImages = p.images.map((img, i) => {
    const color = extractColorFromUrl(img);
    if (color && !uniqueColorCodes.has(color.code)) {
      uniqueColorCodes.add(color.code);
      mappedColors.push(color);
    }
    return {
      imageUrl: img,
      alt: `${p.name} - ${i + 1}`,
      isPrimary: i === 0,
      sortOrder: i,
      colorCode: color ? color.code : null,
      colorHex: color ? color.hex : null
    };
  });

  if (mappedColors.length === 0) {
    const fallbackColors = determineColors(p.name, targetGroup, p.subCategory);
    mappedColors.push(...fallbackColors);
  }
  
  if (mappedColors.length === 1 && mappedColors[0].hex === '#111111') colorStats.black++;
  else if (mappedColors.length === 1 && mappedColors[0].hex === '#cccccc') colorStats.unknown++;
  else colorStats.assorted_assigned++;

  // Normalize Sizes
  const isAccessory = p.category === 'accessories' || p.subCategory === 'accessories';
  const validSizes = getValidSizes(targetGroup, isAccessory);

  // Rebuild Variants
  const newVariants = [];
  mappedColors.forEach(color => {
    validSizes.forEach(size => {
      newVariants.push({
        sku: `${p.slug}-${color.hex.replace('#', '')}-${size}`.toUpperCase(),
        colorName: color.name,
        colorHex: color.hex,
        colorCode: color.code,
        size: size,
        stockQuantity: Math.floor(Math.random() * 50) + 10, // Mock stock 10-60
        availableQuantity: Math.floor(Math.random() * 50) + 10,
        price: p.price,
        salePrice: p.salePrice || p.price
      });
    });
  });

  validProducts.push({
    name: p.name,
    slug: p.slug,
    description: p.description,
    category: p.category,
    targetGroup: targetGroup,
    productType: p.subCategory,
    material: p.material || 'Cotton',
    price: p.price,
    salePrice: p.salePrice || p.price,
    status: 'ACTIVE',
    isNew: p.badge === 'MỚI',
    isSale: p.badge === 'SALE',
    isBestSeller: p.badge === 'BEST',
    images: mappedImages,
    variants: newVariants,
    styleTags: p.styleTags || [],
    recommendationTags: p.recommendationTags || []
  });
});

// Remove duplicate slugs
const seenSlugs = new Set();
const deduplicatedProducts = [];
validProducts.forEach(p => {
  if (!seenSlugs.has(p.slug)) {
    seenSlugs.add(p.slug);
    deduplicatedProducts.push(p);
  } else {
    rejectedProducts.push({ product: p.name, reason: `Duplicate slug: ${p.slug}` });
  }
});

const report = {
  totalOriginal: PRODUCTS.length,
  totalValid: deduplicatedProducts.length,
  totalRejected: rejectedProducts.length,
  totalVariants: deduplicatedProducts.reduce((acc, p) => acc + p.variants.length, 0),
  totalImages: deduplicatedProducts.reduce((acc, p) => acc + p.images.length, 0),
  colorStats: colorStats
};

fs.writeFileSync(path.join(__dirname, '../valid-products.json'), JSON.stringify(deduplicatedProducts, null, 2));
fs.writeFileSync(path.join(__dirname, '../rejected-products.json'), JSON.stringify(rejectedProducts, null, 2));
fs.writeFileSync(path.join(__dirname, '../validation-report.json'), JSON.stringify(report, null, 2));

console.log('Normalization complete. Report:', report);
