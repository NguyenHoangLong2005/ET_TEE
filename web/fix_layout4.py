import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '{/* -- Health Banner & Actions -- */}'
end_marker = 'Metric Cards'

idx1 = text.find(start_marker)
idx2 = text.find(end_marker, idx1)

if idx1 > -1 and idx2 > -1:
    idx2 = text.rfind('{/* ', idx1, idx2)
    
    new_block = '''{/* -- Health Banner & Actions -- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className={lex-1 rounded-xl border px-4 py-2.5 flex items-center gap-3 }>
          {hasError || hasWarning ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span className="text-sm font-semibold">{healthBannerLabel}</span>
          {monitoring && (
            <span className="ml-auto text-xs opacity-60 font-mono whitespace-nowrap hidden sm:block">
              JVM {jvmMemPct}% {dbTotal ?  · DB % : ""}
              {monitoring.uptime?.uptimeFormatted ?  · Uptime  : ""}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 bg-white"
          icon={<RefreshCw className={w-3.5 h-3.5 } />}
          onClick={fetchAllData}
          disabled={loading}
        >
          Làm mới
        </Button>
      </div>
      '''
      
    new_text = text[:idx1] + new_block + text[idx2:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Replaced layout manually.")
else:
    print("Markers not found.")
