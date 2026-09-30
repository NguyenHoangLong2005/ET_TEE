const fs = require('fs');
const file = 'C:\\userdata\\fashion-recommendation-system\\web\\src\\app\\(staff)\\admin\\dashboard\\page.tsx';
let text = fs.readFileSync(file, 'utf8');

const startIdx = text.indexOf('{/* -- Header actions only');
const endIdx = text.indexOf('{/* ─── Metric Cards', startIdx);

if (startIdx > -1 && endIdx > -1) {
    const oldBlock = text.substring(startIdx, endIdx);
    
    // Extract health banner
    const hStart = oldBlock.indexOf('<div\n        className={`rounded-xl border');
    const hEnd = oldBlock.indexOf('</div>', hStart) + 6;
    let healthBanner = oldBlock.substring(hStart, hEnd);
    healthBanner = healthBanner.replace('className={`rounded-xl border', 'className={`flex-1 rounded-xl border');
    
    const newBlock = `{/* -- Health Banner & Actions -- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        ${healthBanner}
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 bg-white"
          icon={<RefreshCw className={\`w-3.5 h-3.5 \${loading ? "animate-spin" : ""}\`} />}
          onClick={fetchAllData}
          disabled={loading}
        >
          Làm mới
        </Button>
      </div>
      `;
      
    text = text.substring(0, startIdx) + newBlock + text.substring(endIdx);
    fs.writeFileSync(file, text, 'utf8');
    console.log('Replaced block perfectly.');
} else {
    console.log('Could not find bounds. startIdx=', startIdx, 'endIdx=', endIdx);
}
