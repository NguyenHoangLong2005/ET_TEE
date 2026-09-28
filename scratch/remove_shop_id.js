const fs = require("fs");

const filePath = "c:\\userdata\\fashion-recommendation-system\\web\\src\\app\\(staff)\\admin\\users\\page.tsx";
let code = fs.readFileSync(filePath, "utf8");

// 1. Remove shopId from createForm state
const oldState = `  const [createForm, setCreateForm] = useState({
    employeeCode: "", fullName: "", email: "",
    phone: "", roleCode: "SALES_STAFF", shopId: "1", initialPassword: "",
  });
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);`;

const newState = `  const [createForm, setCreateForm] = useState({
    employeeCode: "", fullName: "", email: "",
    phone: "", roleCode: "SALES_STAFF", initialPassword: "",
  });
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);`;

code = code.replace(oldState, newState);

// 2. Update submitCreateUser and handleCreateUser
const oldSubmitCreate = `  /* ── user actions ── */
  const submitCreateUser = async () => {
    const isSystemRole = ["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode);
    const parsedShopId = !isSystemRole && createForm.shopId.trim() ? parseInt(createForm.shopId.trim(), 10) : undefined;

    try {
      setCreating(true);
      setError(null);
      await apiClient.post("/api/admin/users", {
        employeeCode: createForm.employeeCode.trim() || undefined,
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        roleCode: createForm.roleCode,
        shopId: parsedShopId,
        initialPassword: createForm.initialPassword || undefined,
      });
      toast.success("Tạo tài khoản thành công!");
      setShowCreateModal(false);
      setShowAdminConfirm(false);
      setCreateForm({ employeeCode: "", fullName: "", email: "", phone: "", roleCode: "SALES_STAFF", shopId: "1", initialPassword: "" });
      loadUsers(); loadStats();
    } catch (e: any) {
      setError(e.message || "Không thể tạo tài khoản");
      toast.error(e.message || "Không thể tạo tài khoản");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    const cleanName = createForm.fullName.trim();
    const cleanEmail = createForm.email.trim();
    const cleanPhone = createForm.phone.trim();
    if (!cleanName || !cleanEmail) {
      toast.error("Vui lòng nhập đầy đủ Họ tên và Email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Địa chỉ Email không hợp lệ");
      return;
    }
    if (cleanPhone && !/^[0-9+\s\-]{8,15}$/.test(cleanPhone)) {
      toast.error("Số điện thoại không hợp lệ (8-15 chữ số)");
      return;
    }

    const isShopRole = ["SHOP_OWNER", "SALES_STAFF", "CSKH_STAFF", "WAREHOUSE_STAFF", "SHIPPING_STAFF", "MARKETING_STAFF"].includes(createForm.roleCode);
    const isSystemRole = ["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode);

    if (isShopRole && !createForm.shopId.trim()) {
      toast.error("Vai trò theo chi nhánh bắt buộc phải nhập Mã chi nhánh (Shop ID, ví dụ: 1)");
      return;
    }

    const parsedShopId = !isSystemRole && createForm.shopId.trim() ? parseInt(createForm.shopId.trim(), 10) : undefined;
    if (parsedShopId !== undefined && (isNaN(parsedShopId) || parsedShopId <= 0)) {
      toast.error("Mã chi nhánh (Shop ID) phải là số nguyên dương");
      return;
    }

    if (isSystemRole) {
      setShowAdminConfirm(true);
      return;
    }

    await submitCreateUser();
  };`;

const newSubmitCreate = `  /* ── user actions ── */
  const submitCreateUser = async () => {
    // TODO: hệ thống hiện single-shop (shopId=1 cố định). Nếu mở rộng multi-shop
    // thật trong tương lai, cần thêm bảng Shop + API + UI chọn chi nhánh ở đây.
    const isSystemRole = ["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode);
    const resolvedShopId = isSystemRole ? undefined : 1;

    try {
      setCreating(true);
      setError(null);
      await apiClient.post("/api/admin/users", {
        employeeCode: createForm.employeeCode.trim() || undefined,
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        roleCode: createForm.roleCode,
        shopId: resolvedShopId,
        initialPassword: createForm.initialPassword || undefined,
      });
      toast.success("Tạo tài khoản thành công!");
      setShowCreateModal(false);
      setShowAdminConfirm(false);
      setCreateForm({ employeeCode: "", fullName: "", email: "", phone: "", roleCode: "SALES_STAFF", initialPassword: "" });
      loadUsers(); loadStats();
    } catch (e: any) {
      setError(e.message || "Không thể tạo tài khoản");
      toast.error(e.message || "Không thể tạo tài khoản");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    const cleanName = createForm.fullName.trim();
    const cleanEmail = createForm.email.trim();
    const cleanPhone = createForm.phone.trim();
    if (!cleanName || !cleanEmail) {
      toast.error("Vui lòng nhập đầy đủ Họ tên và Email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Địa chỉ Email không hợp lệ");
      return;
    }
    if (cleanPhone && !/^[0-9+\s\-]{8,15}$/.test(cleanPhone)) {
      toast.error("Số điện thoại không hợp lệ (8-15 chữ số)");
      return;
    }

    const isSystemRole = ["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode);
    if (isSystemRole) {
      setShowAdminConfirm(true);
      return;
    }

    await submitCreateUser();
  };`;

code = code.replace(oldSubmitCreate, newSubmitCreate);

// 3. Remove Shop ID from Modal JSX completely
const oldFormFields = `                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
                  <input type="email" required value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="email@domain.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số điện thoại</label>
                    <input type="text" value={createForm.phone}
                      onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="0987654321"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Mã chi nhánh (Shop ID) {["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode) ? "(HQ)" : "*"}
                    </label>
                    <input type="number" min="1"
                      disabled={["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode)}
                      value={["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode) ? "" : createForm.shopId}
                      onChange={e => setCreateForm({ ...createForm, shopId: e.target.value })}
                      placeholder={["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode) ? "Không áp dụng (HQ)" : "VD: 1"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode)
                        ? "Tài khoản cấp Admin quản trị toàn bộ hệ thống (HQ)."
                        : "💡 Mặc định = 1 cho chi nhánh hiện tại. Để trống = HQ."}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Vai trò *</label>
                  <select value={createForm.roleCode}
                    onChange={e => {
                      const newRole = e.target.value;
                      setCreateForm(prev => ({
                        ...prev,
                        roleCode: newRole,
                        shopId: ["ADMIN", "SUPER_ADMIN"].includes(newRole) ? "" : (prev.shopId || "1"),
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                  >
                    {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                </div>`;

const newFormFields = `                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
                    <input type="email" required value={createForm.email}
                      onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="email@domain.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số điện thoại</label>
                    <input type="text" value={createForm.phone}
                      onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="0987654321"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Vai trò *</label>
                  <select value={createForm.roleCode}
                    onChange={e => setCreateForm(prev => ({ ...prev, roleCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                  >
                    {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                </div>`;

code = code.replace(oldFormFields, newFormFields);

fs.writeFileSync(filePath, code, "utf8");
console.log("Updated admin/users/page.tsx: removed Shop ID completely, hardcoded shopId=1 under the hood!");
