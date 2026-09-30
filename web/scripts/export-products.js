/**
 * scripts/export-products.js
 * Exports a simplified JSON of all products for validation purposes.
 * Uses require() approach via a transpiled version.
 */
const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(WEB_ROOT, 'src', 'lib', 'data', 'products.ts'), 'utf-8');

// Extract all product objects by parsing the TypeScript manually
// We use a regex to extract all id, category, sizes, images, salePrice, price, recommendationTags, slug fields

// Strategy: find all product objects between { ... },
const productMatches = [];

// Match all category fields
const idMatches = [...content.matchAll(/id:\s*(\d+),/g)].map(m => parseInt(m[1]));
const categoryMatches = [...content.matchAll(/category:\s*"([^"]+)"/g)].map(m => m[1]);
const nameMatches = [...content.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
const slugMatches = [...content.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]);
const priceMatches = [...content.matchAll(/(?<!\w)price:\s*(\d+)/g)].map(m => parseInt(m[1]));
const salePriceMatches = [...content.matchAll(/salePrice:\s*(\d+)/g)].map(m => parseInt(m[1]));

// Extract sizes arrays for each product
const allSizesBlocks = [];
const productBlocks = content.split(/(?=\s*\{\s*\n\s*id:\s*\d+)/);
for (const block of productBlocks) {
  const sizesMatch = block.match(/sizes:\s*\[([^\]]+)\]/s);
  if (sizesMatch) {
    const sizes = sizesMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
    allSizesBlocks.push(sizes);
  }
}

// For each product, get all images
const imageMatches = [];
const imgBlockRe = /images:\s*\[([^\]]+)\]/gs;
let imgM;
while ((imgM = imgBlockRe.exec(content)) !== null) {
  const imgs = imgM[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
  imageMatches.push(imgs);
}

// Recommendation tags
const recTagBlocks = [];
const recTagRe = /recommendationTags:\s*\[([^\]]+)\]/gs;
let recM;
while ((recM = recTagRe.exec(content)) !== null) {
  const tags = recM[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
  recTagBlocks.push(tags);
}

const products = [];
const count = Math.min(idMatches.length, categoryMatches.length, nameMatches.length);

for (let i = 0; i < count; i++) {
  products.push({
    id: idMatches[i],
    name: nameMatches[i],
    slug: slugMatches[i] || '',
    category: categoryMatches[i] || '',
    sizes: allSizesBlocks[i] || [],
    images: imageMatches[i] || [],
    price: priceMatches[i] || 0,
    recommendationTags: recTagBlocks[i] || [],
  });
}

// Deduplicate by id (some matches might double-count)
const unique = Object.values(Object.fromEntries(products.map(p => [p.id, p])));
unique.sort((a, b) => a.id - b.id);

fs.writeFileSync(
  path.join(WEB_ROOT, 'public', 'images', 'products-export.json'),
  JSON.stringify(unique, null, 2)
);
console.log(`Exported ${unique.length} products to public/images/products-export.json`);
