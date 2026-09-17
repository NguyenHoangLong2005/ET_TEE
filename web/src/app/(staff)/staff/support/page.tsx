"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiClient } from "@/lib/api-client";

type Ticket = {
  id: string;
  customerId?: string;
  orderId?: string;
  subject?: string;
  status: string;
  priority: number;
  assignedTo?: string;
  createdAt: string;
};

type Message = {
  id: string;
  senderType: string;
  message: string;
  createdAt: string;
};

type ReturnRequest = {
  id: string;
  orderId: string;
  requestType: string;
  reason: string;
  status: string;
  createdAt: string;
};

const ticketStatuses = ["open", "in_progress", "escalated", "resolved", "closed"];
const returnStatuses = ["requested", "approved", "rejected", "item_received", "completed", "refunded", "cancelled"];

export default function StaffSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [refundForm, setRefundForm] = useState({ orderId: "", paymentId: "", returnRequestId: "", amount: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketPage, returnPage] = await Promise.all([
        apiClient.get<{ items?: Ticket[] }>("/api/cskh/tickets?size=50"),
        apiClient.get<{ items?: ReturnRequest[] }>("/api/cskh/returns?size=50"),
      ]);
      setTickets(ticketPage.items ?? []);
      setReturns(returnPage.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải workspace CSKH");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openTicket = async (ticket: Ticket) => {
    try {
      setSelectedTicket(ticket);
      setMessages(await apiClient.get<Message[]>(`/api/cskh/tickets/${ticket.id}/messages`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải hội thoại");
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    try {
      await apiClient.post(`/api/cskh/tickets/${selectedTicket.id}/messages`, { message: reply.trim() });
      setReply("");
      await openTicket(selectedTicket);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi trả lời");
    }
  };

  const updateTicket = async (ticket: Ticket, status: string) => {
    try {
      await apiClient.put(`/api/cskh/tickets/${ticket.id}/status`, { status });
      setNotice("Đã cập nhật trạng thái ticket");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật ticket");
    }
  };

  const updateReturn = async (request: ReturnRequest, status: string) => {
    try {
      await apiClient.put(`/api/cskh/returns/${request.id}`, { newStatus: status });
      setNotice("Đã cập nhật yêu cầu đổi trả");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật yêu cầu đổi trả");
    }
  };

  const processRefund = async () => {
    try {
      await apiClient.post(`/api/cskh/returns/orders/${refundForm.orderId}/refunds`, {
        paymentId: refundForm.paymentId,
        returnRequestId: refundForm.returnRequestId || null,
        amount: Number(refundForm.amount),
      });
      setNotice("Đã tạo giao dịch hoàn tiền");
      setRefundForm({ orderId: "", paymentId: "", returnRequestId: "", amount: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xử lý hoàn tiền");
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SHOP_OWNER", "CSKH_STAFF"]} allowedPermissions={["support.handle", "return.handle", "refund.process"]}>
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100 space-y-8">
        <header className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-bold">Customer care workspace</p>
            <h1 className="mt-2 text-3xl font-black text-white">Ticket, đổi trả & hoàn tiền</h1>
          </div>
          <a href="/staff/orders" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900">Đơn hàng</a>
        </header>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

        {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Đang tải dữ liệu CSKH...</div> : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">Tickets</h2><span className="text-xs text-slate-400">{tickets.length} ticket</span></div>
              <div className="space-y-3 max-h-[520px] overflow-auto">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className={`rounded-2xl border p-4 ${selectedTicket?.id === ticket.id ? "border-cyan-400/50 bg-cyan-400/5" : "border-slate-800 bg-slate-950"}`}>
                    <button type="button" onClick={() => openTicket(ticket)} className="w-full text-left">
                      <div className="flex justify-between gap-3"><span className="font-semibold text-white">{ticket.subject || "Không có tiêu đề"}</span><span className="text-xs text-cyan-300">P{ticket.priority}</span></div>
                      <p className="mt-2 text-xs text-slate-400">{ticket.id} · {ticket.status}</p>
                    </button>
                    <select value={ticket.status} onChange={(event) => updateTicket(ticket, event.target.value)} className="mt-3 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white">
                      {ticketStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-xl font-bold text-white">Hội thoại</h2>
              {!selectedTicket ? <p className="text-sm text-slate-400">Chọn một ticket để xem nội dung.</p> : (
                <>
                  <div className="max-h-72 space-y-3 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    {messages.map((message) => <div key={message.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3"><p className="text-[11px] uppercase text-cyan-300">{message.senderType}</p><p className="mt-1 text-sm text-slate-200">{message.message}</p></div>)}
                  </div>
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} placeholder="Nhập nội dung trả lời..." className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
                  <button type="button" onClick={sendReply} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500">Gửi trả lời</button>
                </>
              )}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">Đổi trả</h2><span className="text-xs text-slate-400">{returns.length} yêu cầu</span></div>
              <div className="space-y-3 max-h-80 overflow-auto">
                {returns.map((request) => <div key={request.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="font-semibold text-white">{request.requestType} · {request.orderId}</p><p className="mt-1 text-xs text-slate-400">{request.reason}</p><select value={request.status} onChange={(event) => updateReturn(request, event.target.value)} className="mt-3 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white">{returnStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>)}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-xl font-bold text-white">Hoàn tiền</h2>
              <p className="text-xs text-slate-400">Cần order ID, payment ID và số tiền đã được backend xác thực.</p>
              <input placeholder="Order ID" value={refundForm.orderId} onChange={(event) => setRefundForm({ ...refundForm, orderId: event.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
              <input placeholder="Payment ID" value={refundForm.paymentId} onChange={(event) => setRefundForm({ ...refundForm, paymentId: event.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
              <input placeholder="Return request ID (không bắt buộc)" value={refundForm.returnRequestId} onChange={(event) => setRefundForm({ ...refundForm, returnRequestId: event.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
              <input type="number" placeholder="Số tiền hoàn" value={refundForm.amount} onChange={(event) => setRefundForm({ ...refundForm, amount: event.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
              <button type="button" onClick={processRefund} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500">Xử lý hoàn tiền</button>
            </section>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
