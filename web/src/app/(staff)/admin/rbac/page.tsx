"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  Shield, Trash2, Search, Check,
} from "lucide-react";
import { toast } from "sonner";

interface RoleWithPermissions {
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

interface PermissionCatalogItem {
  code: string;
  group: string;
  name: string;
  description: string;
}

const PROTECTED_ROLES = ["ADMIN", "SHOP_OWNER", "USER", "STAFF"];

const GROUP_LABELS: Record<string, string> = {
  ADMIN:            "Quản trị Hệ thống",
  SHOP_OWNER:       "Chủ cửa hàng & Chi nhánh",
  SALES_STAFF:      "Bán hàng & Đơn hàng",
  CSKH_STAFF:       "Chăm sóc Khách hàng (CSKH)",
  WAREHOUSE_STAFF:  "Kho vận & Tồn kho",
  SHIPPING_STAFF:   "Vận chuyển & Vận đơn",
  MARKETING_STAFF:  "Marketing & Khuyến mãi",
  OTHER:            "Quyền chung",
};

export default function AdminRbacPage() {
  const [roles, setRoles]                     = useState<RoleWithPermissions[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogItem[]>([]);
  const [selectedRoleCode, setSelectedRoleCode]   = useState<string>("ADMIN");
  const [loading, setLoading]                 = useState(true);
  const [searchTerm, setSearchTerm]           = useState("");
  const [deleteTargetRole, setDeleteTargetRole] = useState<RoleWithPermissions | null>(null);
  const [isDeleting, setIsDeleting]           = useState(false);
  const [togglingPerm, setTogglingPerm]       = useState<string | null>(null);

  const fetchData = useCallback(async (silent?: unknown) => {
    try {
      if (silent !== true) setLoading(true);
      const [rolesRes, catalogRes]: any[] = await Promise.all([
        apiClient.get("/api/admin/rbac/roles"),
        apiClient.get("/api/admin/rbac/permissions"),
      ]);
      const roleList    = Array.isArray(rolesRes)   ? rolesRes   : rolesRes?.data   ?? [];
      const catalogList = Array.isArray(catalogRes) ? catalogRes : catalogRes?.data ?? [];
      setRoles(roleList);
      setPermissionCatalog(catalogList);
      if (roleList.length > 0 && !roleList.some((r: any) => r.code === selectedRoleCode)) {
        setSelectedRoleCode(roleList[0].code);
      }
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải dữ liệu RBAC từ máy chủ");
    } finally {
      setLoading(false);
    }
  }, [selectedRoleCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedRole = roles.find((r) => r.code === selectedRoleCode) || roles[0];

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionCatalogItem[]> = {};
    for (const perm of permissionCatalog) {
      const group = perm.group || "OTHER";
      if (!groups[group]) groups[group] = [];
      groups[group].push(perm);
    }
    return groups;
  }, [permissionCatalog]);

  const handleTogglePermission = async (permCode: string) => {
    if (!selectedRole) return;
    const isGranted = selectedRole.permissions.includes(permCode);
    setTogglingPerm(permCode);

    setRoles((prev) =>
      prev.map((r) => {
        if (r.code !== selectedRole.code) return r;
        const newPerms = isGranted
          ? r.permissions.filter((p) => p !== permCode)
          : [...r.permissions, permCode];
        return { ...r, permissions: newPerms };
      })
    );

    try {
      if (isGranted) {
        await apiClient.delete(`/api/admin/rbac/roles/${selectedRole.code}/permissions/${permCode}`);
        toast.success(`Đã thu hồi quyền ${permCode}`);
      } else {
        await apiClient.post(`/api/admin/rbac/roles/${selectedRole.code}/permissions`, { permission: permCode });
        toast.success(`Đã cấp quyền ${permCode}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Không thể cập nhật quyền hạn. Đang hoàn tác...");
      fetchData(true);
    } finally {
      setTogglingPerm(null);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTargetRole) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/admin/rbac/roles/${deleteTargetRole.code}`);
      toast.success(`Đã xóa vai trò ${deleteTargetRole.name}`);
      setDeleteTargetRole(null);
      setSelectedRoleCode("ADMIN");
      await fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || "Không thể xóa vai trò này");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PermissionGuard allowedRoles={["ADMIN"]} requiredPermissions={["MANAGE_ROLE_PERMISSION"]}>
      <div className="bg-slate-50 p-4 md:p-6 space-y-4 text-slate-800">

        <PageHeader
          title="Cấu Hình RBAC"
          subtitle="Phân quyền chi tiết theo vai trò: gán và thu hồi quyền hệ thống"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Cấu hình RBAC" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* ─── Role Selector Sidebar ─── */}
          <div className="lg:col-span-3">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-700" />
                  <span>Danh sách vai trò</span>
                </div>
              }
              action={
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {roles.length} roles
                </span>
              }
              noPadding
            >
              <div className="p-2 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                {loading && roles.length === 0 ? (
                  /* Skeleton loading */
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse mx-1" />
                  ))
                ) : (
                  roles.map((r) => {
                    const isSelected  = r.code === selectedRole?.code;
                    const isProtected = PROTECTED_ROLES.includes(r.code);

                    return (
                      <div
                        key={r.code}
                        onClick={() => setSelectedRoleCode(r.code)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between group ${
                          isSelected
                            ? "bg-primary/5 border-primary/20 text-primary"
                            : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-bold truncate ${isSelected ? "text-primary" : "text-slate-900"}`}>
                              {r.name}
                            </p>
                            {isProtected && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                SYSTEM
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono mt-0.5 truncate text-slate-400">
                            {r.code} · {r.permissions.length} quyền
                          </p>
                        </div>

                        {!isProtected && !isSelected && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeleteTargetRole(r); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all shrink-0 ml-2"
                            title="Xóa vai trò tùy chỉnh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* ─── Permissions Matrix ─── */}
          <div className="lg:col-span-9">
            <Card noPadding>
              {selectedRole ? (
                <>
                  {/* Role header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900">{selectedRole.name}</h2>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                          {selectedRole.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {selectedRole.description || "Chưa có mô tả chi tiết cho vai trò này."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-mono whitespace-nowrap">
                        {selectedRole.permissions.length}/{permissionCatalog.length} quyền bật
                      </span>
                      {!PROTECTED_ROLES.includes(selectedRole.code) && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
                          onClick={() => setDeleteTargetRole(selectedRole)}
                          className="text-red-600 hover:bg-red-50 border-red-200"
                        >
                          Xóa role
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="px-5 py-3 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo mã (VD: MANAGE_USER) hoặc tên nghiệp vụ..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Permission groups */}
                  <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">
                    {Object.entries(groupedPermissions).map(([groupKey, perms]) => {
                      const groupTitle    = GROUP_LABELS[groupKey] || groupKey;
                      const filteredPerms = perms.filter(
                        (p) =>
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                      if (filteredPerms.length === 0) return null;

                      const grantedCount = filteredPerms.filter((p) => selectedRole.permissions.includes(p.code)).length;

                      return (
                        <div key={groupKey} className="space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              {groupTitle}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {grantedCount}/{filteredPerms.length}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {filteredPerms.map((perm) => {
                              const isGranted = selectedRole.permissions.includes(perm.code);
                              const isBusy    = togglingPerm === perm.code;

                              return (
                                <div
                                  key={perm.code}
                                  onClick={() => !isBusy && handleTogglePermission(perm.code)}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                    isGranted
                                      ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                  } ${isBusy ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {isGranted ? (
                                      <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 rounded border-2 border-slate-300" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-bold truncate ${isGranted ? "text-emerald-800" : "text-slate-900"}`}>
                                      {perm.name}
                                    </p>
                                    <p className="text-[10px] font-mono mt-0.5 text-slate-400">{perm.code}</p>
                                    {perm.description && (
                                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{perm.description}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Empty state — consistent with admin/users pattern */
                <div className="flex flex-col items-center justify-center text-center p-16">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Chọn một vai trò</p>
                  <p className="text-xs text-slate-400 mt-1">Danh sách vai trò ở cột bên trái</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        <ConfirmModal
          isOpen={Boolean(deleteTargetRole)}
          title="Xác nhận xóa vai trò"
          message={`Bạn có chắc chắn muốn xóa vai trò "${deleteTargetRole?.name}" (${deleteTargetRole?.code})? Hành động này sẽ thu hồi toàn bộ phân quyền liên kết.`}
          confirmText="Xóa vĩnh viễn"
          cancelText="Hủy"
          type="danger"
          isLoading={isDeleting}
          onConfirm={handleDeleteRole}
          onClose={() => setDeleteTargetRole(null)}
        />
      </div>
    </PermissionGuard>
  );
}

