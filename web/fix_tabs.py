import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Replace state
text = re.sub(
    r'const \[auditTab, setAuditTab\] = useState<"system" \| "cskh">\("system"\);',
    r'const [auditTab, setAuditTab] = useState<"access" | "data" | "finance" | "cskh" | "system">("access");',
    text
)

# 2. Add filtering logic before const hasError =
filter_logic = '''
  const getFilteredLogs = () => {
    if (auditTab === "cskh") return cskhAuditLogs;
    if (!systemAuditLogs) return [];
    
    if (auditTab === "access") {
      return systemAuditLogs.filter((log: any) => log.action?.includes('LOGIN') || log.action?.includes('LOGOUT') || log.action?.includes('AUTH') || log.action?.includes('ROLE') || log.action?.includes('PASSWORD'));
    }
    if (auditTab === "data") {
      return systemAuditLogs.filter((log: any) => log.action?.includes('CREATE') || log.action?.includes('UPDATE') || log.action?.includes('DELETE') || log.action?.includes('SETTING'));
    }
    if (auditTab === "finance") {
      return systemAuditLogs.filter((log: any) => log.action?.includes('PAYMENT') || log.action?.includes('ORDER') || log.action?.includes('REFUND') || log.action?.includes('INVENTORY') || log.action?.includes('STOCK'));
    }
    if (auditTab === "system") {
      return systemAuditLogs.filter((log: any) => log.action?.includes('SYSTEM') || log.action?.includes('SYNC') || log.action?.includes('BACKUP') || log.action?.includes('CRON'));
    }
    
    return systemAuditLogs;
  };
  const currentLogs = getFilteredLogs();
'''
if 'const getFilteredLogs' not in text:
    text = text.replace('const hasError =', filter_logic + '\n  const hasError =')


# 3. Replace the action buttons in the Card
old_action_pattern = r'action=\{[\s\S]*?<div className="inline-flex p-0\.5 bg-slate-100 rounded-xl text-xs font-semibold">[\s\S]*?</div>[\s\S]*?\}'
new_action = r'''action={
            <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto hide-scrollbar snap-x max-w-[280px] sm:max-w-full">
              {[
                { id: "access", label: "Truy cập & Bảo mật" },
                { id: "data", label: "Thay đổi Dữ liệu" },
                { id: "finance", label: "Tài chính & Kho" },
                { id: "cskh", label: "Tra cứu CSKH" },
                { id: "system", label: "Hệ thống" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAuditTab(tab.id as any)}
                  className={snap-start whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }'''
text = re.sub(old_action_pattern, new_action, text, flags=re.DOTALL)


# 4. Replace the DataTable rendering
# It currently looks like: {auditTab === "system" ? ( <DataTable ... /> ) : ( <DataTable ... /> )}
dt_pattern = r'\{\s*auditTab === "system"\s*\?.*?<DataTable.*?/>\s*\)\s*:\s*\(\s*<DataTable.*?/>\s*\)\s*\}'
new_dt = r'''<DataTable
            columns={auditTab === "cskh" ? cskhAuditColumns : systemAuditColumns}
            data={currentLogs}
            loading={loading}
            rowKey={(item: any, idx: number) => item.id || idx}
            emptyTitle={Chưa có dữ liệu cho mục này}
            emptyMessage="Các thao tác sẽ tự động xuất hiện tại đây khi phát sinh."
          />'''
text = re.sub(dt_pattern, new_dt, text, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Added tabs successfully!")
