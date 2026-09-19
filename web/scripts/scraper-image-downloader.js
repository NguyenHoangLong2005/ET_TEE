const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DRYRUN_FILE = path.join(__dirname, '../scraped-products-dryrun.json');
const OUT_FILE = path.join(__dirname, '../scraped-products.json');
const IMG_BASE_DIR = path.join(__dirname, '../public/images');

async function downloadImage(url, dest) {
    if (fs.existsSync(dest)) return true; // skip if exists
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(dest);
            response.data.pipe(writer);
            writer.on('finish', () => resolve(true));
            writer.on('error', reject);
        });
    } catch (e) {
        console.error(`Failed to download ${url}: ${e.message}`);
        return false;
    }
}

async function run() {
    if (!fs.existsSync(DRYRUN_FILE)) {
        console.error('Dryrun file not found!');
        return;
    }

    const products = JSON.parse(fs.readFileSync(DRYRUN_FILE, 'utf-8')).filter(p => p.category !== 'other' && p.name.trim() !== '');
    
    // Create base directories
    ['men', 'women', 'kids', 'family', 'accessories'].forEach(tg => {
        ['tshirt', 'shirt', 'pants', 'shorts', 'skirt', 'outerwear', 'homewear', 'accessories'].forEach(cat => {
            const dir = path.join(IMG_BASE_DIR, tg, cat);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });
    });

    console.log(`Starting download for ${products.length} products...`);
    
    let downloaded = 0;
    const finalProducts = [];
    
    // Batch processing to avoid overloading
    const BATCH_SIZE = 10;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async p => {
            if (!p.originalImage || !p.originalImage.startsWith('http')) return;
            
            // Extract extension
            const extMatch = p.originalImage.match(/\.(jpg|jpeg|png|webp|avif)/i);
            const ext = extMatch ? extMatch[1] : 'webp';
            
            // e.g. men/tshirt/ao-phong-nam-123.webp
            const relPath = `${p.targetGroup}/${p.category}/${p.slug}.${ext}`;
            const absPath = path.join(IMG_BASE_DIR, p.targetGroup, p.category, `${p.slug}.${ext}`);
            
            const success = await downloadImage(p.originalImage, absPath);
            if (success) {
                p.localImage = `/images/${relPath}`;
                p.image = p.localImage;
                p.hoverImage = p.localImage; // Since we only have 1 image per product
                finalProducts.push(p);
                downloaded++;
            }
        }));
        console.log(`Progress: ${Math.min(i + BATCH_SIZE, products.length)} / ${products.length}`);
    }

    fs.writeFileSync(OUT_FILE, JSON.stringify(finalProducts, null, 2));
    console.log(`Finished! Successfully downloaded ${downloaded} images.`);
    console.log('Saved final dataset to scraped-products.json');
}

run();
