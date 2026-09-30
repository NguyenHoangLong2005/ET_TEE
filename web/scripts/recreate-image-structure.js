/**
 * scripts/recreate-image-structure.js
 * 
 * Task 4: Recreate empty folder structure for images.
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.join(__dirname, '..');
const PUBLIC_IMAGES = path.join(WEB_ROOT, 'public', 'images');

const DIRS = [
  'banners/home',
  'banners/sale',
  'banners/collection',
  'categories/women',
  'categories/men',
  'categories/kids',
  'categories/accessories',
  'categories/family',
  'products/women/tshirt',
  'products/women/shirt',
  'products/women/dress',
  'products/women/skirt',
  'products/women/pants',
  'products/women/jacket',
  'products/men/tshirt',
  'products/men/polo',
  'products/men/shirt',
  'products/men/pants',
  'products/men/jacket',
  'products/kids/tshirt',
  'products/kids/dress',
  'products/kids/set',
  'products/kids/pants',
  'products/kids/jacket',
  'products/accessories/socks',
  'products/accessories/hat',
  'products/accessories/bag',
  'products/accessories/belt',
  'products/accessories/shoes',
  'products/family/matching-set',
  'lookbook/women',
  'lookbook/men',
  'lookbook/kids',
  'lookbook/family',
  'recommendations/similar',
  'recommendations/outfit',
  'campaigns',
  'uncategorized'
];

console.log('📁 Recreating image directory structure...');
DIRS.forEach(dir => {
    const fullPath = path.join(PUBLIC_IMAGES, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

const readmePath = path.join(PUBLIC_IMAGES, 'README_IMAGE_NAMING.md');
const readmeContent = `# Hướng dẫn đặt tên ảnh (Image Naming Convention)

Tuân thủ định dạng đặt tên ảnh dưới đây để đảm bảo hệ thống nhận diện và phân loại đúng.

## Banner
- \`banner-home-family-casual-01.webp\`
- \`banner-sale-summer-01.webp\`
- \`banner-collection-new-arrival-01.webp\`

## Category
- \`category-women-casual-01.webp\`
- \`category-men-basic-01.webp\`
- \`category-kids-school-01.webp\`
- \`category-accessories-01.webp\`
- \`category-family-matching-01.webp\`

## Product
- \`women-tshirt-white-01.webp\`
- \`women-tshirt-white-hover-01.webp\`
- \`women-dress-floral-01.webp\`
- \`men-polo-navy-01.webp\`
- \`men-shirt-white-01.webp\`
- \`kids-tshirt-blue-01.webp\`
- \`kids-dress-pink-01.webp\`
- \`accessory-socks-black-01.webp\`
- \`family-matching-set-neutral-01.webp\`

## Lookbook
- \`lookbook-family-casual-01.webp\`
- \`lookbook-women-office-01.webp\`
- \`lookbook-men-weekend-01.webp\`

## Recommendation
- \`similar-women-basic-tshirt-group-01.webp\`
- \`outfit-men-polo-kaki-01.webp\`
- \`outfit-women-dress-bag-01.webp\`
`;

fs.writeFileSync(readmePath, readmeContent);
console.log('✅ Structure created and README_IMAGE_NAMING.md generated.');
