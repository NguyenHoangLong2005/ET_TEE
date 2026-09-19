const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, '../raw_data');
const OUT_DRYRUN = path.join(__dirname, '../scraped-products-dryrun.json');
const OUT_REPORT = path.join(__dirname, '../validation-report.json');

// Helper to convert vietnamese to slug
function toSlug(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function processFiles() {
    const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));
    let allProducts = [];
    
    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf-8'));
        allProducts = allProducts.concat(data);
    });

    // Deduplicate by URL
    const unique = [];
    const seen = new Set();
    allProducts.forEach(p => {
        if (!seen.has(p.url)) {
            seen.add(p.url);
            unique.push(p);
        }
    });

    const categoriesAdult = ['tshirt', 'shirt', 'pants', 'jeans', 'dress', 'skirt', 'outerwear', 'accessories'];
    
    const finalProducts = unique.map(p => {
        const n = p.name.toLowerCase();
        let targetGroup = 'women'; // default
        if (n.includes('nam') || p.url.includes('-nam-')) targetGroup = 'men';
        if (n.includes('bé') || n.includes('be-') || p.url.includes('-be-')) targetGroup = 'kids';
        if (n.includes('phụ kiện') || n.includes('tất') || n.includes('khăn') || n.includes('mũ') || n.includes('túi')) targetGroup = 'accessories';
        if (n.includes('unisex')) targetGroup = 'family';

        let category = 'other';
        if (n.includes('áo phông') || n.includes('áo thun') || n.includes('áo ba lỗ') || n.includes('áo polo') || n.includes('áo tank top') || n.includes('áo kiểu') || n.includes('áo sát nách')) category = 'tshirt';
        else if (n.includes('áo sơ mi')) category = 'shirt';
        else if (n.includes('quần soóc') || n.includes('quần đùi')) category = 'shorts';
        else if (n.includes('quần')) category = 'pants';
        else if (n.includes('váy') || n.includes('chân váy')) category = 'skirt';
        else if (n.includes('áo khoác') || n.includes('áo nỉ') || n.includes('áo len') || n.includes('áo gilet')) category = 'outerwear';
        else if (n.includes('bộ mặc nhà') || n.includes('pyjama')) category = 'homewear';
        else if (n.includes('tất') || n.includes('khăn') || n.includes('mũ') || n.includes('túi')) category = 'accessories';

        let sizes = ['S', 'M', 'L', 'XL']; // default
        if (targetGroup === 'kids') {
            sizes = ['90', '100', '110', '120', '130', '140', '150', '160'];
        } else if (targetGroup === 'accessories') {
            sizes = ['One Size'];
        } else {
            sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        }

        let colors = [];
        const colorMatch = p.url.match(/color=([a-zA-Z0-9]+)/);
        if (colorMatch) colors.push(colorMatch[1]);
        else colors.push('Default');

        return {
            name: p.name,
            slug: toSlug(p.name + '-' + (colorMatch ? colorMatch[1] : Date.now())),
            price: p.price,
            salePrice: p.price, // Same for now
            category,
            targetGroup,
            productType: category,
            colors,
            sizes,
            description: p.name,
            material: n.includes('cotton') ? 'Cotton' : 'Mixed',
            sourceUrl: p.url,
            originalImage: p.image,
            localImage: '' // Will be filled later
        };
    });

    fs.writeFileSync(OUT_DRYRUN, JSON.stringify(finalProducts, null, 2));

    const report = {
        totalRaw: allProducts.length,
        totalUnique: finalProducts.length,
        byTargetGroup: finalProducts.reduce((acc, p) => { acc[p.targetGroup] = (acc[p.targetGroup] || 0) + 1; return acc; }, {}),
        byCategory: finalProducts.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {}),
        issues: finalProducts.filter(p => p.category === 'other').map(p => `Unknown category: ${p.name}`)
    };

    fs.writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2));

    console.log(`Processed ${allProducts.length} raw items into ${finalProducts.length} unique products.`);
    console.log('Report saved to validation-report.json');
}

processFiles();
