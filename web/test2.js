const fs = require('fs');
const file = 'C:\\userdata\\fashion-recommendation-system\\web\\src\\app\\(staff)\\admin\\dashboard\\page.tsx';
const text = fs.readFileSync(file, 'utf8');
const i1 = text.indexOf('<div className="min-h-screen');
const i2 = text.indexOf('Metric Cards', i1);
console.log(text.substring(i1, i2));
