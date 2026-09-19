const fs = require('fs');
const path = require('path');
function walk(dir) {
  for (const f of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let code = fs.readFileSync(full, 'utf-8');
      if (code.includes('https://via.placeholder.com')) {
        code = code.replace(/https:\/\/via\.placeholder\.com\/[^\'\"]+/g, '/placeholder.svg');
        fs.writeFileSync(full, code);
      }
    }
  }
}
walk(path.join(__dirname, '..', 'src'));
console.log('Replaced placeholder URLs');
