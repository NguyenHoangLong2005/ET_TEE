import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\users\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

columns_str = '''const userColumns: Column<UserAdminDto>[] = [
    {
      key: "id",
      header: "#ID",
      render: (u) => <span className="font-mono text-slate-500 font-medium">#{u.id}</span>
    },
    {
      key: "account",
      header: "TÀI KHOẢN",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
            style={{ backgroundColor: avatarBg(u.role) }}
          >
            {u.fullName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="font-bold text-slate-900">{u.username || u.email?.split('@')[0] || u.employeeCode}</div>
            <div className="text-xs text-slate-500 mt-0.5">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "HỌ TÊN & SĐT",
      render: (u) => (
        <div>
          <div className="font-semibold text-slate-800">{u.fullName}</div>
          <div className="text-xs text-slate-500 mt-0.5">{u.phone || "-"}</div>
        </div>
      )
    },
    {
      key: "role",
      header: "VAI TRÒ",
      render: (u) => {
        let roleBg = "bg-slate-50 text-slate-700";
        if (u.role === "CUSTOMER") roleBg = "bg-[#DCFCE7] text-[#166534] font-semibold";
        else if (u.role === "PHARMACIST" || u.role === "SALES_STAFF") roleBg = "bg-blue-100 text-blue-700 font-semibold";
        else roleBg = "bg-emerald-100 text-emerald-700 font-semibold";
        return (
          <span className={inline-flex px-2.5 py-1 rounded-full text-[11px] }>
            {getRoleDisplayName(u.role)}
          </span>
        );
      }
    },
    {
      key: "status",
      header: "TRẠNG THÁI",
      render: (u) => (
        u.status === "ACTIVE" ? (
          <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#166534]">
            Hoạt động
          </span>
        ) : (
          <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B]">
            Đã khóa
          </span>
        )
      ),
    },
    {
      key: "time",
      header: "THỜI GIAN",
      render: (u) => {
        const d = new Date(u.createdAt);
        return (
          <div>
            <div className="text-sm text-slate-700">{d.toLocaleDateString('vi-VN')}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 italic">{u.lastLogin ? new Date(u.lastLogin).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</div>
          </div>
        )
      }
    },
    {
      key: "actions",
      header: "HÀNH ĐỘNG",
      render: (u) => (
        <div className="flex items-center gap-2">
          {u.status === "ACTIVE" ? (
            <button className="px-3 py-1.5 rounded-md border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-semibold transition-colors">
              Khóa
            </button>
          ) : (
            <button className="px-3 py-1.5 rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold transition-colors">
              Mở khóa
            </button>
          )}
        </div>
      ),
    },
  ];'''

text = re.sub(
    r'const userColumns: Column<UserAdminDto>\[\] = \[.*?(?=\/\* 🪪 RENDER 🪪 \*\/)',
    columns_str + '\n\n  /* 🪪 RENDER 🪪 */\n',
    text,
    flags=re.DOTALL
)

render_str = '''return (
    <PermissionGuard requiredPermissions={["MANAGE_USER", "MANAGE_ROLE_PERMISSION"]}>
      <div className="p-6 space-y-5 bg-[#F8FAFC] min-h-screen">

        {/* Filter Card exact match to user's second image (with create button inside) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-2">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[#334155] mb-2">Tìm kiếm</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên, username, email, SĐT..."
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-semibold text-[#334155] mb-2">Vai trò</label>
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
                className="bg-white hover:bg-slate-50 text-[#334155] font-semibold text-sm px-4 py-2 rounded-lg border border-slate-200 transition-colors"
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

# Slice lines to replace render block correctly
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
    print("Successfully replaced block using manual line split.")
else:
    print(f"Failed. start_idx={start_idx}, end_idx={end_idx}")

