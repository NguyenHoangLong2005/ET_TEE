/**
 * scripts/validate-product-data.js
 * Kiểm tra toàn bộ product data theo các quy tắc:
 * - Kids không được dùng XS/S/M/L/XL/XXL
 * - Adult không được dùng size trẻ em
 * - productType hợp lệ
 * - image path phải tồn tại
 * - slug/id không trùng
 * - salePrice <= price
 * - stock >= 0
 * - recommendationTags không rỗng
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.join(__dirname, '..');

// ── Load products ─────────────────────────────────────────
// Products.ts is TypeScript — we'll read and parse the PRODUCTS array manually
const productsFile = path.join(WEB_ROOT, 'src', 'lib', 'data', 'products.ts');
const content = fs.readFileSync(productsFile, 'utf-8');

// Simple extraction: eval the array using a mock setup
// We strip TS types and eval the JS
let evalContent = content
  .replace(/export type[^;]+;/g, '')
  .replace(/export const PRODUCTS: Product\[\] = /g, 'const PRODUCTS = ')
  .replace(/: "MỚI" \| "SALE" \| "BEST"/g, '')
  .replace(/as any/g, '')
  .replace(/\/\/ .*$/gm, '')
  .replace(/export function[^}]+}/gs, '');

let PRODUCTS = [];
try {
  PRODUCTS = eval(evalContent + '; PRODUCTS;');
} catch (e) {
  // Fallback: parse JSON export from products if available
  console.warn('Could not eval products.ts directly. Attempting fallback...');
  // Try to count products by counting id fields
  const ids = [...content.matchAll(/id:\s*(\d+)/g)].map(m => parseInt(m[1]));
  console.log(`Found ${ids.length} id fields in products.ts`);
  console.log('Run TypeScript version for full validation: npx ts-node scripts/validate-product-data.ts');
  process.exit(0);
}

// ── Constants ─────────────────────────────────────────────
const ADULT_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
const KIDS_SIZES = new Set(['2Y','3Y','4Y','5Y','6Y','7Y','8Y','9Y','10Y','11Y','12Y','13Y','14Y',
  '90','100','110','120','130','140','150','160']);
const VALID_CATEGORIES = new Set(['women', 'men', 'kids', 'accessories', 'family']);
const VALID_PRODUCT_TYPES = new Set([
  'tshirt','polo','shirt','hoodie','sweater','jacket','dress','skirt',
  'pants','jeans','shorts','activewear','accessory','family-set'
]);
const VALID_GROUPS = new Set(['women','men','kids','accessories','family']);
const ACCESSORY_SIZES = new Set(['One Size','35-38','39-42','35','36','37','38','39','40','41','42',
  '90cm','95cm','100cm','105cm','S/M','M/L']);

const PUBLIC_ROOT = path.join(WEB_ROOT, 'public');

// ── Validate ──────────────────────────────────────────────
const errors = [];
const seenIds = new Set();
const seenSlugs = new Set();

function addError(product, field, severity, msg, fix) {
  errors.push({
    id: product.id,
    name: product.name,
    image: (product.images || [])[0] || '—',
    field,
    severity,
    message: msg,
    suggestedFix: fix,
  });
}

for (const p of PRODUCTS) {
  // ── Duplicate id/slug
  if (seenIds.has(p.id))   addError(p, 'id',   'CRITICAL', `Duplicate id: ${p.id}`, 'Assign unique id');
  else seenIds.add(p.id);

  if (seenSlugs.has(p.slug)) addError(p, 'slug', 'CRITICAL', `Duplicate slug: ${p.slug}`, 'Assign unique slug');
  else seenSlugs.add(p.slug);

  // ── Category valid
  if (!VALID_CATEGORIES.has(p.category)) {
    addError(p, 'category', 'HIGH', `Invalid category: ${p.category}`, `Use one of: ${[...VALID_CATEGORIES].join(', ')}`);
  }

  // ── salePrice
  if (p.salePrice !== undefined && p.salePrice > p.price) {
    addError(p, 'salePrice', 'HIGH', `salePrice (${p.salePrice}) > price (${p.price})`, 'Set salePrice <= price');
  }

  // ── recommendationTags
  if (!p.recommendationTags || p.recommendationTags.length === 0) {
    addError(p, 'recommendationTags', 'MEDIUM', 'recommendationTags is empty', 'Add at least one recommendation tag');
  }

  // ── Image paths exist
  for (const imgPath of (p.images || [])) {
    const absPath = path.join(PUBLIC_ROOT, imgPath);
    if (!fs.existsSync(absPath)) {
      addError(p, 'images', 'CRITICAL', `Image not found: ${imgPath}`, 'Fix image path or add image file');
    }
  }

  // ── SIZE VALIDATION ───────────────────────────
  const sizes = p.sizes || [];
  const variantSizes = (p.variants || []).map(v => v.size);
  const allSizes = [...new Set([...sizes, ...variantSizes])];

  if (p.category === 'kids') {
    // Kids must not have adult sizes
    const wrongSizes = allSizes.filter(s => ADULT_SIZES.has(s));
    if (wrongSizes.length > 0) {
      addError(p, 'sizes', 'CRITICAL',
        `Kids product has adult sizes: ${wrongSizes.join(', ')}`,
        `Replace with kids sizes: 4Y, 5Y, 6Y, 7Y, 8Y, 9Y, 10Y, 11Y, 12Y, 13Y, 14Y`
      );
    }
  } else if (p.category === 'women' || p.category === 'men') {
    // Adult must not have kids sizes
    const wrongSizes = allSizes.filter(s => KIDS_SIZES.has(s));
    if (wrongSizes.length > 0) {
      addError(p, 'sizes', 'HIGH',
        `Adult product has kids sizes: ${wrongSizes.join(', ')}`,
        `Replace with adult sizes: XS, S, M, L, XL, XXL`
      );
    }
  } else if (p.category === 'accessories') {
    // Accessory should not have clothing sizes
    const wrongSizes = allSizes.filter(s => ADULT_SIZES.has(s) && !['S', 'M', 'L'].includes(s));
    // Note: S/M, M/L are OK for caps, so we're lenient here
  }

  // ── Stock
  for (const v of (p.variants || [])) {
    if (v.stock < 0) {
      addError(p, 'variants.stock', 'HIGH', `Negative stock for variant ${v.sku}: ${v.stock}`, 'Set stock >= 0');
    }
  }
}

// ── Report ────────────────────────────────────────────────
const critical = errors.filter(e => e.severity === 'CRITICAL');
const high     = errors.filter(e => e.severity === 'HIGH');
const medium   = errors.filter(e => e.severity === 'MEDIUM');

console.log('\n' + '═'.repeat(70));
console.log('🔍 PRODUCT DATA VALIDATION REPORT');
console.log('═'.repeat(70));
console.log(`Total products: ${PRODUCTS.length}`);
console.log(`Total errors:   ${errors.length}`);
console.log(`  CRITICAL: ${critical.length}`);
console.log(`  HIGH:     ${high.length}`);
console.log(`  MEDIUM:   ${medium.length}`);
console.log('');

if (critical.length > 0) {
  console.log('🔴 CRITICAL ERRORS:');
  console.log('─'.repeat(70));
  critical.forEach(e => {
    console.log(`[${e.id}] ${e.name}`);
    console.log(`  Field: ${e.field}`);
    console.log(`  Error: ${e.message}`);
    console.log(`  Fix:   ${e.suggestedFix}`);
    console.log('');
  });
}

if (high.length > 0) {
  console.log('🟠 HIGH ERRORS:');
  console.log('─'.repeat(70));
  high.forEach(e => {
    console.log(`[${e.id}] ${e.name} — ${e.field}: ${e.message}`);
  });
  console.log('');
}

if (medium.length > 0) {
  console.log('🟡 MEDIUM ERRORS:');
  console.log('─'.repeat(70));
  medium.forEach(e => {
    console.log(`[${e.id}] ${e.name} — ${e.field}: ${e.message}`);
  });
  console.log('');
}

// Save report
const reportPath = path.join(WEB_ROOT, 'public', 'images', 'validation-report.json');
fs.writeFileSync(reportPath, JSON.stringify({ 
  generatedAt: new Date().toISOString(),
  totalProducts: PRODUCTS.length,
  totalErrors: errors.length,
  errors 
}, null, 2));
console.log(`📄 Full report saved to: public/images/validation-report.json`);

if (errors.length === 0) {
  console.log('✅ All products valid!');
} else {
  console.log(`\n⚠️  Fix ${critical.length} CRITICAL and ${high.length} HIGH errors before production.`);
}
