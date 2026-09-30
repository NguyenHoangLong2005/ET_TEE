import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# I will find the 'return (\n    <div className="min-h-screen...' part
# and replace the header actions and health banner.

pattern = re.compile(
    r'(<div className="min-h-screen[^>]*>).*?\{/\*.*?Header actions only.*?\*/\}.*?<div className="flex justify-end">\s*<Button.*?>\s*.*?</Button>\s*</div>.*?\{/\*.*?System Health Banner.*?\*/\}.*?(<div[^>]*healthBannerStyle[^>]*>.*?</span>\s*\}\s*</div>)',
    re.DOTALL
)

match = pattern.search(text)
if match:
    prefix = match.group(1)
    health_banner = match.group(2)
    
    # modify health banner classes to include flex-1
    health_banner = health_banner.replace('rounded-xl border px-4 py-2.5 flex items-center gap-3', 'flex-1 rounded-xl border px-4 py-2.5 flex items-center gap-3')
    
    replacement = prefix + '''
      {/* -- Header actions & Health Banner -- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        ''' + health_banner + '''
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          icon={<RefreshCw className={w-3.5 h-3.5 } />}
          onClick={fetchAllData}
          disabled={loading}
        >
          Làm mới
        </Button>
      </div>'''
      
    new_text = text[:match.start()] + replacement + text[match.end():]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Replaced layout successfully.")
else:
    print("Pattern not found!")
