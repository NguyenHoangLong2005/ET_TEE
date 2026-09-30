/**
 * scripts/validate-from-export.js
 * Validate dữ liệu từ products-export.json
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.join(__dirname, '..');
const EXPORT_FILE = path.join(WEB_ROOT, 'public', 'images', 'products-export.json');
const PUBLIC_ROOT = path.join(WEB_ROOT, 'public');

if (!fs.existsSync(EXPORT_FILE)) {
  console.error('Run scripts/export-products.js first');
  process.exit(1);
}

const PRODUCTS = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf-8'));

const ADULT_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
const KIDS_SIZES_Y = new Set(['2Y','3Y','4Y','5Y','6Y','7Y','8Y','9Y','10Y','11Y','12Y','13Y','14Y']);
const KIDS_SIZES_H = new Set(['90','100','110','120','130','140','150','160']);
const KIDS_SIZES = new Set([...KIDS_SIZES_Y, ...KIDS_SIZES_H]);
const VALID_CATS = new Set(['women','men','kids','accessories','family']);

const errors = [];
const seenIds = new Set();
const seenSlugs = new Set();

for (const p of PRODUCTS) {
  // Duplicate ID
  if (seenIds.has(p.id)) errors.push({ id: p.id, name: p.name, severity: 'CRITICAL', field: 'id', msg: `Duplicate id: ${p.id}` });
  else seenIds.add(p.id);

  // Duplicate slug
  if (p.slug && seenSlugs.has(p.slug)) errors.push({ id: p.id, name: p.name, severity: 'CRITICAL', field: 'slug', msg: `Duplicate slug: ${p.slug}` });
  else if (p.slug) seenSlugs.add(p.slug);

  // Category
  if (!VALID_CATS.has(p.category)) {
    errors.push({ id: p.id, name: p.name, severity: 'HIGH', field: 'category', msg: `Invalid category: "${p.category}"` });
  }

  // salePrice
  if (p.salePrice !== undefined && p.salePrice !== null && p.salePrice > p.price) {
    errors.push({ id: p.id, name: p.name, severity: 'HIGH', field: 'salePrice', msg: `salePrice ${p.salePrice} > price ${p.price}` });
  }

  // recommendationTags
  if (!p.recommendationTags || p.recommendationTags.length === 0) {
    errors.push({ id: p.id, name: p.name, severity: 'MEDIUM', field: 'recommendationTags', msg: 'Empty recommendationTags' });
  }

  // Images exist
  for (const img of (p.images || [])) {
    const abs = path.join(PUBLIC_ROOT, img);
    if (!fs.existsSync(abs)) {
      errors.push({ id: p.id, name: p.name, severity: 'CRITICAL', field: 'images', msg: `Image not found: ${img}` });
    }
  }

  // Size rules
  const allSizes = [...new Set(p.sizes || [])];
  if (p.category === 'kids') {
    const wrong = allSizes.filter(s => ADULT_SIZES.has(s));
    if (wrong.length > 0) {
      errors.push({ id: p.id, name: p.name, severity: 'CRITICAL', field: 'sizes', msg: `Kids has adult sizes: ${wrong.join(', ')}` });
    }
  } else if (p.category === 'women' || p.category === 'men') {
    const wrong = allSizes.filter(s => KIDS_SIZES.has(s));
    if (wrong.length > 0) {
      errors.push({ id: p.id, name: p.name, severity: 'HIGH', field: 'sizes', msg: `Adult has kids sizes: ${wrong.join(', ')}` });
    }
  }
}

const critical = errors.filter(e => e.severity === 'CRITICAL');
const high     = errors.filter(e => e.severity === 'HIGH');
const medium   = errors.filter(e => e.severity === 'MEDIUM');

const valid = PRODUCTS.filter(p => !errors.some(e => e.id === p.id));

console.log('\n══════════════════════════════════════════════════════════════');
console.log('🔍 PRODUCT DATA VALIDATION REPORT');
console.log('══════════════════════════════════════════════════════════════');
console.log(`Total products:  ${PRODUCTS.length}`);
console.log(`Valid products:  ${valid.length}`);
console.log(`Erroneous:       ${PRODUCTS.length - valid.length}`);
console.log(`Total errors:    ${errors.length}`);
console.log(`  🔴 CRITICAL:   ${critical.length}`);
console.log(`  🟠 HIGH:       ${high.length}`);
console.log(`  🟡 MEDIUM:     ${medium.length}`);
console.log('');

// Group critical by type
const imageNotFound = critical.filter(e => e.field === 'images');
const kidsAdultSize = critical.filter(e => e.field === 'sizes');
const dupIds = critical.filter(e => e.field === 'id');

if (imageNotFound.length > 0) {
  console.log(`🔴 Image 404 errors (${imageNotFound.length}):`);
  imageNotFound.slice(0, 20).forEach(e => console.log(`   [${e.id}] ${e.name}: ${e.msg}`));
  if (imageNotFound.length > 20) console.log(`   ... and ${imageNotFound.length - 20} more`);
  console.log('');
}

if (kidsAdultSize.length > 0) {
  console.log(`🔴 Kids with adult sizes (${kidsAdultSize.length}):`);
  kidsAdultSize.forEach(e => console.log(`   [${e.id}] ${e.name}: ${e.msg}`));
  console.log('');
}

if (dupIds.length > 0) {
  console.log(`🔴 Duplicate IDs (${dupIds.length}):`);
  dupIds.forEach(e => console.log(`   [${e.id}] ${e.name}: ${e.msg}`));
  console.log('');
}

if (high.length > 0) {
  console.log(`🟠 HIGH (${high.length}):`);
  high.forEach(e => console.log(`   [${e.id}] ${e.name} — ${e.field}: ${e.msg}`));
  console.log('');
}

if (medium.length > 0) {
  console.log(`🟡 MEDIUM (${medium.length}):`);
  medium.slice(0, 10).forEach(e => console.log(`   [${e.id}] ${e.name}: ${e.msg}`));
  if (medium.length > 10) console.log(`   ... and ${medium.length - 10} more`);
  console.log('');
}

// Save report
const reportPath = path.join(WEB_ROOT, 'public', 'images', 'validation-report.json');
fs.writeFileSync(reportPath, JSON.stringify({ 
  generatedAt: new Date().toISOString(),
  totalProducts: PRODUCTS.length,
  validProducts: valid.length,
  totalErrors: errors.length,
  errors 
}, null, 2));
console.log(`📄 Report saved: public/images/validation-report.json`);

if (errors.length === 0) {
  console.log('✅ All products valid!');
} else {
  process.exit(1);
}
