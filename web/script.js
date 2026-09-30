const fs = require('fs');
const file = 'C:\\userdata\\fashion-recommendation-system\\web\\src\\app\\(staff)\\admin\\dashboard\\page.tsx';
let text = fs.readFileSync(file, 'utf8');

const regex = /\{\/\*\s*── Header actions only.*?(<Button[\s\S]*?<\/Button>)\s*<\/div>\s*\{\/\*\s*── Health Banner ──\s*\*\/}\s*\{monitoring && \(\s*<div\s*className=\{\`flex items-center gap-3 p-4 rounded-xl border \$\{healthBannerStyle\}\`\}\s*>\s*([\s\S]*?)\s*<\/div>\s*\)\}/;

const match = text.match(regex);
if (match) {
    const buttonHtml = match[1];
    let healthBannerInner = match[2];
    
    // Add shrink-0 to button if not there
    let newButton = buttonHtml;
    if (!newButton.includes('className=')) {
        newButton = newButton.replace('<Button', '<Button className="shrink-0"');
    } else {
        newButton = newButton.replace('className="', 'className="shrink-0 ');
    }
    
    const replacement = `      {/* ── Health Banner & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {monitoring ? (
          <div className={\`flex-1 flex items-center gap-3 p-4 rounded-xl border \${healthBannerStyle}\`}>
            ${healthBannerInner}
          </div>
        ) : (
          <div className="flex-1"></div>
        )}
        ${newButton}
      </div>`;
      
    text = text.replace(regex, replacement);
    fs.writeFileSync(file, text, 'utf8');
    console.log('Layout replaced successfully.');
} else {
    console.log('Regex did not match.');
}
