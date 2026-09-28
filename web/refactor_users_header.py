import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\users\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# I will replace from {/* Header exact match to image */} down to the end of the Filter Card block.

new_block = '''{/* Filter Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-flat">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tìm kiếm</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên, username, email, SĐT..."
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Vai trò</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Tất cả vai trò</option>
                {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => loadUsers()}
                className="bg-primary hover:bg-red-700 text-white font-semibold text-sm px-6 py-2 rounded-lg shadow-sm transition-colors"
              >
                Tìm kiếm
              </button>
              <button
                onClick={() => { setKeyword(""); setRoleFilter(""); setStatusFilter(""); }}
                className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2 rounded-lg border border-slate-200 transition-colors"
              >
                Đặt lại
              </button>
              
              {canManage && (
                <>
                  <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    Thêm tài khoản mới
                  </button>
                </>
              )}
            </div>
          </div>
        </div>'''

text = re.sub(
    r'\{\/\* Header exact match to image \*\/.*?<\/div>\s*<\/div>',
    new_block,
    text,
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated Filter Card and removed old Header.")
