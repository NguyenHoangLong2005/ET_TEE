/**
 * scripts/scraper-dryrun.js
 * Scrapes metadata from Canifa.com
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TARGETS = [
  { url: 'https://canifa.com/nu.html', category: 'women', targetGroup: 'women', limit: 100 },
  { url: 'https://canifa.com/nam.html', category: 'men', targetGroup: 'men', limit: 100 },
  { url: 'https://canifa.com/be-gai.html', category: 'kids', targetGroup: 'kids', limit: 45 },
  { url: 'https://canifa.com/be-trai.html', category: 'kids', targetGroup: 'kids', limit: 45 },
  { url: 'https://canifa.com/phu-kien.html', category: 'accessories', targetGroup: 'accessories', limit: 50 },
];

const DRY_RUN_OUTPUT = path.join(__dirname, '..', 'scraped-products-dryrun.json');
const REPORT_OUTPUT = path.join(__dirname, '..', 'validation-report.json');

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 15000) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

function parseProductType(name, targetGroup) {
  const n = name.toLowerCase();
  if (n.includes('áo thun') || n.includes('áo phông') || n.includes('t-shirt')) return 'tshirt';
  if (n.includes('áo polo')) return 'polo';
  if (n.includes('áo sơ mi')) return 'shirt';
  if (n.includes('áo khoác') || n.includes('jacket')) return 'jacket';
  if (n.includes('quần') || n.includes('pants') || n.includes('jeans') || n.includes('short')) return 'pants';
  if (n.includes('váy') || n.includes('đầm') || n.includes('dress')) return 'dress';
  if (n.includes('chân váy')) return 'skirt';
  if (n.includes('bộ') || n.includes('set')) return 'set';
  
  if (targetGroup === 'accessories') {
    if (n.includes('tất') || n.includes('vớ')) return 'socks';
    if (n.includes('mũ') || n.includes('nón')) return 'hat';
    if (n.includes('túi') || n.includes('balo')) return 'bag';
    if (n.includes('thắt lưng') || n.includes('dây nịt')) return 'belt';
    if (n.includes('giày') || n.includes('dép')) return 'shoes';
    return 'accessory';
  }
  
  return 'other';
}

function normalizeSize(sizeStr, targetGroup) {
  const s = sizeStr.toUpperCase().trim();
  if (targetGroup === 'adult' || targetGroup === 'women' || targetGroup === 'men') {
    if (['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(s)) return s;
    if (s.includes('FREESIZE') || s === 'F') return 'M'; // Fallback
    return s;
  }
  
  if (targetGroup === 'kids') {
    // Canifa kids sizes are usually like 110, 120, 130 or 2Y, 3Y
    // Just return what it is so we can report it in dry run
    return s; 
  }
  
  if (targetGroup === 'accessories') {
    return s;
  }
  
  return s;
}

(async () => {
  console.log('🚀 Launching scraper...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const allProducts = [];
  const seenUrls = new Set();
  const seenNames = new Set();

  for (const target of TARGETS) {
    console.log(`\n👉 Scraping ${target.category} from ${target.url}...`);
    const page = await browser.newPage();
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    try {
      await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });
      console.log('Scrolling to load products...');
      await autoScroll(page);
      
      // Extract links
      const productLinks = await page.evaluate(() => {
        const links = [];
        // Canifa product items usually have a specific class or are inside an a tag
        document.querySelectorAll('a.product-item-link').forEach(a => {
          if (a.href && !links.includes(a.href)) links.push(a.href);
        });
        return links;
      });
      
      console.log(`Found ${productLinks.length} product links on listing page. Extracting details for up to ${target.limit}...`);
      
      let count = 0;
      for (const link of productLinks) {
        if (count >= target.limit) break;
        if (seenUrls.has(link)) continue;
        
        const detailPage = await browser.newPage();
        await detailPage.setRequestInterception(true);
        detailPage.on('request', req => {
          if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
          else req.continue();
        });

        try {
          await detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // Wait for title and price to render
          await detailPage.waitForSelector('.page-title span', { timeout: 10000 }).catch(()=>null);
          
          const product = await detailPage.evaluate((url) => {
            const nameEl = document.querySelector('.page-title span');
            if (!nameEl) return null;
            const name = nameEl.innerText.trim();
            
            const priceEl = document.querySelector('.price-box .price');
            const salePriceEl = document.querySelector('.price-box .special-price .price');
            const oldPriceEl = document.querySelector('.price-box .old-price .price');
            
            let priceStr = oldPriceEl ? oldPriceEl.innerText : (priceEl ? priceEl.innerText : '0');
            let salePriceStr = salePriceEl ? salePriceEl.innerText : null;
            
            if (!oldPriceEl && salePriceEl && priceEl) {
               priceStr = priceEl.innerText;
            }
            
            const price = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
            const salePrice = salePriceStr ? parseInt(salePriceStr.replace(/[^0-9]/g, '')) : null;
            
            const sizes = Array.from(document.querySelectorAll('.swatch-option.text')).map(el => el.innerText.trim());
            const colors = Array.from(document.querySelectorAll('.swatch-option.color')).map(el => el.getAttribute('option-label') || '');
            
            const descEl = document.querySelector('.description .value');
            const description = descEl ? descEl.innerText.trim() : '';
            
            return {
              name,
              price,
              salePrice: salePrice && salePrice < price ? salePrice : price,
              sourceUrl: url,
              rawSizes: sizes,
              rawColors: colors,
              description
            };
          }, link);
          
          if (product && product.name && !seenNames.has(product.name)) {
            seenUrls.add(link);
            seenNames.add(product.name);
            
            product.category = target.category;
            product.targetGroup = target.targetGroup;
            product.productType = parseProductType(product.name, target.targetGroup);
            product.sizes = product.rawSizes.map(s => normalizeSize(s, target.targetGroup));
            
            // Dummy image logic for dry-run
            product.imageUrls = []; // We will scrape images in Phase 2
            
            allProducts.push(product);
            count++;
            process.stdout.write(`\rScraped: ${count}/${target.limit}`);
          }
          
        } catch (err) {
          // ignore timeout for single product
        } finally {
          await detailPage.close();
        }
      }
      console.log(`\nFinished ${target.category}.`);
      
    } catch (e) {
      console.error(`\nFailed to scrape ${target.category}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n🎉 Total scraped: ${allProducts.length} products`);
  
  // Validation
  const report = {
    totalScraped: allProducts.length,
    byCategory: {},
    byProductType: {},
    kidsSizesObserved: new Set(),
    adultSizesObserved: new Set(),
    accessorySizesObserved: new Set(),
    errors: []
  };

  allProducts.forEach(p => {
    report.byCategory[p.category] = (report.byCategory[p.category] || 0) + 1;
    report.byProductType[p.productType] = (report.byProductType[p.productType] || 0) + 1;
    
    if (p.sizes.length === 0) {
      report.errors.push({ url: p.sourceUrl, error: 'No sizes found' });
    }
    
    if (p.targetGroup === 'kids') {
      p.sizes.forEach(s => report.kidsSizesObserved.add(s));
    } else if (p.targetGroup === 'women' || p.targetGroup === 'men') {
      p.sizes.forEach(s => report.adultSizesObserved.add(s));
    } else {
      p.sizes.forEach(s => report.accessorySizesObserved.add(s));
    }
  });

  report.kidsSizesObserved = Array.from(report.kidsSizesObserved);
  report.adultSizesObserved = Array.from(report.adultSizesObserved);
  report.accessorySizesObserved = Array.from(report.accessorySizesObserved);

  fs.writeFileSync(DRY_RUN_OUTPUT, JSON.stringify(allProducts, null, 2));
  fs.writeFileSync(REPORT_OUTPUT, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Data saved to ${path.relative(process.cwd(), DRY_RUN_OUTPUT)}`);
  console.log(`📊 Report saved to ${path.relative(process.cwd(), REPORT_OUTPUT)}`);
  
  console.log('\n--- VALIDATION SUMMARY ---');
  console.log('Categories:', report.byCategory);
  console.log('Kids sizes observed from CANIFA:', report.kidsSizesObserved.join(', '));
  console.log('Adult sizes observed from CANIFA:', report.adultSizesObserved.join(', '));
  console.log('Accessory sizes observed from CANIFA:', report.accessorySizesObserved.join(', '));
  console.log(`Validation Errors: ${report.errors.length}`);
})();
