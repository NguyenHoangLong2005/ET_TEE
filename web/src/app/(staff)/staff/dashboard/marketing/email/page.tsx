"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Send, Users } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

// Email campaigns to customers who consented (backend StaffEmailCampaignController). Recipients are
// chosen by consent + segment, not by shop: customers belong to the brand.

type Segment = { id: string; label: string };
type Stats = { sent: number; failed: number; opened: number; redeemedOrders: number; redeemedRevenue: number };
type CampaignView = {
  campaign: { id: number; name: string; subject: string; segment: string; status: string; recipients: number; createdAt: string; sentAt: string | null };
  segmentLabel: string;
  voucherCode: string | null;
  stats: Stats;
};
type PublicVoucher = { id: number; code: string; name: string };

const api = (path: string, init: RequestInit = {}) =>
  fetch(`${getApiBaseUrl()}${path}`, { ...init, headers: { ...getAuthHeaders(), ...(init.headers || {}) } }).then(async res => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) throw new Error(body.message || body.error || `Lỗi ${res.status}`);
    return body.data;
  });

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "-");

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [subscribers, setSubscribers] = useState(0);
  const [vouchers, setVouchers] = useState<PublicVoucher[]>([]);
  const [form, setForm] = useState({ name: "", subject: "", intro: "", voucherId: "", segment: "ALL_SUBSCRIBERS" });
  const [audience, setAudience] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/staff/marketing/email-campaigns");
      setCampaigns(data.campaigns);
      setSegments(data.segments);
      setSubscribers(data.subscribers);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tải được chiến dịch");
    }
  }, []);

  useEffect(() => {
    load();
    fetch(`${getApiBaseUrl()}/api/marketing/vouchers`).then(r => r.json()).then(j => setVouchers(j.data || [])).catch(() => {});
  }, [load]);

  useEffect(() => {
    setAudience(null);
    api(`/api/staff/marketing/email-campaigns/audience?segment=${form.segment}`)
      .then(d => setAudience(d.count))
      .catch(() => setAudience(null));
  }, [form.segment]);

  // a campaign being sent finishes in the background: refresh until none is SENDING
  useEffect(() => {
    if (!campaigns.some(c => c.campaign.status === "SENDING")) return;
    const t = setTimeout(load, 3000);
    return () => clearTimeout(t);
  }, [campaigns, load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/staff/marketing/email-campaigns", {
        method: "POST",
        body: JSON.stringify({ ...form, voucherId: form.voucherId || null }),
      });
      toast.success("Đã lưu chiến dịch nháp");
      setForm({ ...form, name: "", subject: "", intro: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  };

  const send = async (c: CampaignView) => {
    if (!confirm(`Gửi "${c.campaign.name}" tới nhóm "${c.segmentLabel}"? Không thể hoàn tác.`)) return;
    try {
      await api(`/api/staff/marketing/email-campaigns/${c.campaign.id}/send`, { method: "POST" });
      toast.success("Đang gửi…");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Chiến dịch email" subtitle="Chỉ gửi cho khách đã đồng ý nhận email; mỗi email có link hủy đăng ký" />

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <Users className="w-5 h-5 text-slate-500" />
        <span><strong>{subscribers}</strong> địa chỉ đang đồng ý nhận email ưu đãi.</span>
      </div>

      <form onSubmit={create} className="rounded-2xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-bold text-slate-900 flex items-center gap-2"><Mail className="w-4 h-4" /> Chiến dịch mới</h2>
        <label className="text-sm">
          <span className="block font-semibold text-slate-700 mb-1">Tên (nội bộ)</span>
          <input required maxLength={150} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                 className="w-full border border-slate-300 rounded-xl px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-slate-700 mb-1">Tiêu đề email</span>
          <input required maxLength={200} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                 className="w-full border border-slate-300 rounded-xl px-3 py-2" />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="block font-semibold text-slate-700 mb-1">Nội dung mở đầu</span>
          <textarea maxLength={2000} rows={3} value={form.intro} onChange={e => setForm({ ...form, intro: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-slate-700 mb-1">Voucher kèm theo (toàn hệ thống)</span>
          <select value={form.voucherId} onChange={e => setForm({ ...form, voucherId: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2">
            <option value="">Không kèm voucher</option>
            {vouchers.map(v => <option key={v.id} value={v.id}>{v.code} - {v.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-slate-700 mb-1">Nhóm khách nhận</span>
          <select value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2">
            {segments.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <span className="block text-xs text-slate-500 mt-1">
            {audience === null ? "Đang đếm…" : `${audience} người nhận nếu gửi bây giờ`}
          </span>
        </label>
        <div className="md:col-span-2">
          <Button type="submit" disabled={busy}>Lưu nháp</Button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="p-3">Chiến dịch</th><th className="p-3">Nhóm</th><th className="p-3">Voucher</th>
              <th className="p-3">Đã gửi</th><th className="p-3" title="Ước tính qua ảnh theo dõi: có ứng dụng mail tự tải ảnh hoặc chặn ảnh">Mở*</th>
              <th className="p-3" title="Người nhận đã dùng voucher sau khi email được gửi: cho thấy liên quan, không chứng minh email là nguyên nhân">Đơn dùng mã*</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">Chưa có chiến dịch nào.</td></tr>
            )}
            {campaigns.map(c => (
              <tr key={c.campaign.id} className="border-t border-slate-100">
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{c.campaign.name}</div>
                  <div className="text-xs text-slate-500">{c.campaign.subject}</div>
                </td>
                <td className="p-3 text-slate-700">{c.segmentLabel}</td>
                <td className="p-3 font-mono text-xs">{c.voucherCode ?? "-"}</td>
                <td className="p-3">{c.campaign.status === "DRAFT" ? "Nháp" : c.campaign.status === "SENDING" ? "Đang gửi…" : `${c.stats.sent}${c.stats.failed ? ` (lỗi ${c.stats.failed})` : ""}`}</td>
                <td className="p-3">{c.stats.sent ? `${c.stats.opened} (${pct(c.stats.opened, c.stats.sent)})` : "-"}</td>
                <td className="p-3">{c.voucherCode && c.stats.sent ? `${c.stats.redeemedOrders} · ${Math.round(c.stats.redeemedRevenue).toLocaleString("vi-VN")}đ` : "-"}</td>
                <td className="p-3 text-right">
                  {c.campaign.status === "DRAFT" && (
                    <Button size="sm" onClick={() => send(c)}><Send className="w-3.5 h-3.5 mr-1" /> Gửi</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        * Số lượt mở là ước tính (một số ứng dụng mail tự tải ảnh hoặc chặn ảnh). &ldquo;Đơn dùng mã&rdquo; đếm người nhận đã dùng voucher
        sau khi email được gửi: cho thấy sự liên quan, không chứng minh email là nguyên nhân.
      </p>
    </div>
  );
}
