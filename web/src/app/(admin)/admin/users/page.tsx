"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type UserItem = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  isStaff: boolean;
  roleCodes: string[];
  createdAt: string;
  lastLoginAt?: string | null;
};

type RoleOption = {
  id: string;
  code: string;
  name: string;
  description?: string;
  staffRole?: boolean;
};

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("ettee_access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [isStaffFilter, setIsStaffFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    employeeCode: "",
    department: "",
    roleCodes: "STORE_STAFF",
  });
  const [creating, setCreating] = useState(false);

  const loadRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/rbac/roles`, {
        headers: getAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể tải danh sách role");
      }
      const roleList = Array.isArray(payload.data) ? payload.data : [];
      setRoles(roleList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải role");
    }
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({ size: "50" });
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (isStaffFilter !== "all") params.set("isStaff", isStaffFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể tải danh sách người dùng");
      }
      setUsers(payload.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [keyword, isStaffFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      staff: users.filter((user) => user.isStaff).length,
      active: users.filter((user) => user.status === "active").length,
    };
  }, [users]);

  const handleCreateStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setCreating(true);
      setError(null);
      const roleCodes = formState.roleCodes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const response = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fullName: formState.fullName,
          email: formState.email,
          phone: formState.phone,
          password: formState.password,
          employeeCode: formState.employeeCode,
          department: formState.department,
          roleCodes,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể tạo tài khoản nhân viên");
      }

      setFormState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        employeeCode: "",
        department: "",
        roleCodes: "STORE_STAFF",
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo tài khoản nhân viên");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, action: "lock" | "unlock") => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: action === "lock" ? JSON.stringify({ reason: "Kích hoạt khóa tài khoản theo quy trình quản trị" }) : undefined,
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `Không thể ${action === "lock" ? "khóa" : "mở khóa"} tài khoản`);
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi cập nhật trạng thái người dùng");
    }
  };

  const handleAssignRole = async (userId: string) => {
    const roleCode = selectedRoleByUser[userId];
    if (!roleCode) {
      setError("Vui lòng chọn role để gán");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/roles`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ roleCode }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể gán role");
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gán role");
    }
  };

  const handleRevokeRole = async (userId: string, roleCode: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/roles/${encodeURIComponent(roleCode)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể gỡ role");
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gỡ role");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-bold">
            SYSTEM ADMIN PORTAL
          </span>
          <h1 className="text-2xl font-bold text-white">Quản trị hệ thống</h1>
        </div>
        <Link
          href="/"
          className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
        >
          ← Về Trang Khách Hàng
        </Link>
      </div>

      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-lg bg-violet-600/20 text-violet-300 font-bold text-xs border border-violet-500/30"
        >
          👤 Quản lý Tài khoản & Phân quyền
        </Link>
        <Link
          href="/admin/ai-config"
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition"
        >
          🤖 Cấu hình Mô hình AI
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Tổng người dùng</p>
          <div className="mt-2 text-2xl font-black text-white">{stats.total}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Nhân sự</p>
          <div className="mt-2 text-2xl font-black text-violet-300">{stats.staff}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Đang hoạt động</p>
          <div className="mt-2 text-2xl font-black text-emerald-300">{stats.active}</div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 text-sm">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">Tạo tài khoản nhân viên</h3>
        </div>

        <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={formState.fullName}
            onChange={(e) => setFormState((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="Họ tên"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={formState.email}
            onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={formState.phone}
            onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="SĐT"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <input
            value={formState.password}
            onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Mật khẩu"
            type="password"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={formState.employeeCode}
            onChange={(e) => setFormState((prev) => ({ ...prev, employeeCode: e.target.value }))}
            placeholder="Mã nhân viên"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={formState.department}
            onChange={(e) => setFormState((prev) => ({ ...prev, department: e.target.value }))}
            placeholder="Phòng ban"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <div className="md:col-span-2">
            <input
              value={formState.roleCodes}
              onChange={(e) => setFormState((prev) => ({ ...prev, roleCodes: e.target.value }))}
              placeholder="Role codes, ví dụ: STORE_STAFF,CSKH"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-60"
            >
              {creating ? "Đang tạo..." : "+ Tạo tài khoản"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <h3 className="font-bold text-white">Danh sách người dùng</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm theo tên/email"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <select
              value={isStaffFilter}
              onChange={(e) => setIsStaffFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="all">Tất cả</option>
              <option value="true">Nhân sự</option>
              <option value="false">Khách hàng</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-300 text-sm">Đang tải dữ liệu người dùng...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Họ tên</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-slate-400">Không có dữ liệu</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="p-3 font-semibold text-white">{user.fullName}</td>
                      <td className="p-3">{user.email || "-"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roleCodes.length ? user.roleCodes.map((role) => (
                            <span key={`${user.id}-${role}`} className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                              {role}
                            </span>
                          )) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${user.status === "active" ? "text-emerald-400" : "text-amber-300"}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={selectedRoleByUser[user.id] ?? ""}
                            onChange={(e) =>
                              setSelectedRoleByUser((prev) => ({ ...prev, [user.id]: e.target.value }))
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-white"
                          >
                            <option value="">Chọn role</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.code}>
                                {role.code}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignRole(user.id)}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"
                          >
                            Gán
                          </button>
                          {user.roleCodes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.roleCodes.map((roleCode) => (
                                <button
                                  key={`${user.id}-${roleCode}`}
                                  onClick={() => handleRevokeRole(user.id, roleCode)}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px]"
                                >
                                  Revoke {roleCode}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {user.status === "active" ? (
                            <button
                              onClick={() => handleToggleUserStatus(user.id, "lock")}
                              className="px-2 py-1 rounded border border-amber-500 text-amber-300 text-[11px]"
                            >
                              Khóa
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleUserStatus(user.id, "unlock")}
                              className="px-2 py-1 rounded border border-emerald-500 text-emerald-300 text-[11px]"
                            >
                              Mở khóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
