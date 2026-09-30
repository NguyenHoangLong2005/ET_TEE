import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '{/* -- Header actions only'
idx1 = text.find(start_marker)
if idx1 == -1:
    start_marker = 'Header actions only'
    idx1 = text.find(start_marker)
    if idx1 > -1:
        idx1 = text.rfind('{', 0, idx1)

idx2 = text.find('Metric Cards', idx1)

if idx1 > -1 and idx2 > -1:
    idx2 = text.rfind('</div>', idx1, idx2) + 6
    old_section = text[idx1:idx2]
    
    health_match = re.search(r'(<div[^>]*healthBannerStyle.*?</div>)', old_section, re.DOTALL)
    
    if health_match:
        health_div = health_match.group(1)
        health_div = health_div.replace('rounded-xl border', 'flex-1 rounded-xl border')
        
        new_section = '''{/* -- Health Banner & Actions -- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        ''' + health_div + '''
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
      
        new_text = text[:idx1] + new_section + text[idx2:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print("Replaced layout successfully.")
    else:
        print("Health banner not found.")
else:
    print("Markers not found.")
