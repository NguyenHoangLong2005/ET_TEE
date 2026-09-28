import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\users\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

render_str = '''return (
    <PermissionGuard requiredPermissions={["MANAGE_USER", "MANAGE_ROLE_PERMISSION"]}>
      <div className="p-6 space-y-5 bg-[#F8FAFC] min-h-screen">

        {/* Filter Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-2">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            
            {/* Left side: Filters */}
            <div className="flex flex-1 flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 max-w-md">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Tìm kiếm</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tên, username, email, SĐT..."
                    className="w-full h-9 pl-9 pr-3 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <div className="w-full md:w-56">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Vai trò</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
                >
                  <option value="">Tất cả vai trò</option>
                  {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </div>
            </div>

            {/* Right side: Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                onClick={() => loadUsers()}
                className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" /> Lọc
              </button>
              <button
                onClick={() => { setKeyword(""); setRoleFilter(""); setStatusFilter(""); }}
                className="h-9 px-4 bg-white hover:bg-slate-50 text-slate-600 font-medium text-sm rounded-lg border border-slate-200 transition-colors"
              >
                Xóa
              </button>
              
              {canManage && (
                <>
                  <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="h-9 px-4 bg-primary hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Thêm tài khoản
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Table Card exact match to image */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#1e293b]">Danh sách tài khoản</h2>
            <span className="bg-[#f1f5f9] text-[#475569] px-2.5 py-0.5 rounded-full text-xs font-semibold">
              {totalElements} người dùng
            </span>
          </div>
          
          <DataTable<UserAdminDto>
            columns={userColumns}
            data={users}
            loading={loadingUsers}
            rowKey={(u) => u.id}
            emptyTitle="Không có tài khoản nào"
            emptyMessage="Vui lòng điều chỉnh bộ lọc tìm kiếm."
            pagination={{
              currentPage: page + 1,
              totalPages: totalPages,
              onPageChange: (p) => setPage(p - 1),
            }}
          />
        </div>
      </div>
    </PermissionGuard>
  );'''

# Slice lines
lines = text.split('\n')
start_idx = -1
for i, line in enumerate(lines):
    if "return (" in line and "<PermissionGuard requiredPermissions=" in lines[i+1] if i+1 < len(lines) else False:
        start_idx = i
        break
    elif "<PermissionGuard requiredPermissions=" in line:
        start_idx = i - 1
        break

end_idx = -1
for i in range(start_idx + 1, len(lines)):
    if "MODALS" in lines[i]:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_text = '\n'.join(lines[:start_idx]) + '\n  ' + render_str + '\n\n        ' + '\n'.join(lines[end_idx:])
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Successfully replaced block with new heights.")
else:
    print(f"Failed. start_idx={start_idx}, end_idx={end_idx}")
