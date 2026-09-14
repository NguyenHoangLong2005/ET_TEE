"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  roles: string[];
  permissions: string[];
};

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("ettee_access_token");
      if (!token) {
        setError("Bạn chưa đăng nhập.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Không thể tải thông tin profile");
        }

        setProfile(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải thông tin profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
          Đang tải thông tin cá nhân...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">
          <h1 className="text-2xl font-black mb-2">Không thể tải profile</h1>
          <p>{error || "Không tìm thấy thông tin người dùng."}</p>
          <Link href="/products" className="mt-5 inline-block text-violet-300 hover:text-violet-200">
            ← Quay lại cửa hàng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            ET.TEE FASHION
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="/products" className="hover:text-violet-400 transition-colors">Sản phẩm</Link>
            <Link href="/cart" className="hover:text-violet-400 transition-colors">Giỏ hàng</Link>
            <Link href="/profile" className="text-white font-semibold">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-violet-400 font-semibold">Customer profile</p>
            <h1 className="text-3xl font-black text-white">Thông tin cá nhân</h1>
          </div>
          <Link href="/cart" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700">
            ← Quay lại giỏ hàng
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8">
          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-5">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-slate-400">Họ tên</p>
              <p className="text-2xl font-bold text-white">{profile.fullName}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300 space-y-1">
              <p><span className="text-slate-500">Email:</span> {profile.email}</p>
              <p><span className="text-slate-500">SĐT:</span> {profile.phone}</p>
              <p><span className="text-slate-500">Trạng thái:</span> {profile.status}</p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Vai trò</h2>
              <div className="flex flex-wrap gap-2">
                {profile.roles.length ? profile.roles.map((role) => (
                  <span key={role} className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold">
                    {role}
                  </span>
                )) : <span className="text-slate-400 text-sm">Không có vai trò</span>}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Permissions</h2>
              <div className="flex flex-wrap gap-2">
                {profile.permissions.length ? profile.permissions.map((permission) => (
                  <span key={permission} className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    {permission}
                  </span>
                )) : <span className="text-slate-400 text-sm">Không có permission</span>}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
