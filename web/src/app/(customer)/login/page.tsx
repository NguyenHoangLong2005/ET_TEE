"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export default function LoginPage() {
  const [usernameOrPhone, setUsernameOrPhone] = useState("admin@ettee.vn");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usernameOrPhone, password }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Đăng nhập thất bại");
      }

      localStorage.setItem("ettee_access_token", payload.data.accessToken);
      localStorage.setItem("ettee_refresh_token", payload.data.refreshToken);
      localStorage.setItem("ettee_user", JSON.stringify(payload.data));
      setMessage("Đăng nhập thành công. Bạn đã được lưu token vào localStorage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-violet-950/40">
        <div className="text-center space-y-3 mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-400 font-bold">ET.TEE</p>
          <h1 className="text-3xl font-black text-white">Đăng nhập</h1>
          <p className="text-sm text-slate-400">Kết nối tới Spring Boot backend thật</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Email hoặc số điện thoại</label>
            <input
              value={usernameOrPhone}
              onChange={(e) => setUsernameOrPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-500"
              placeholder="admin@ettee.vn"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-500"
              placeholder="Admin@123"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 py-3 font-bold text-white transition"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/" className="text-violet-300 hover:text-violet-200">
            Quay lại trang chủ
          </Link>
          <Link href="/register" className="text-slate-300 hover:text-white">
            Đăng ký mới
          </Link>
        </div>

        {message ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
