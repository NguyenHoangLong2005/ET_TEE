'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import { toast } from 'sonner';
import {
  LifeBuoy, Plus, MessageSquare, Send, CheckCircle2,
  Clock, AlertCircle, ArrowLeft, RefreshCw, X, ShieldAlert,
  Calendar, FileText, ChevronRight
} from 'lucide-react';

/* ─── Interfaces matching Backend CustomerTicketController ─── */
interface SupportTicket {
  id: string;
  ticketCode: string;
  customerId: string;
  customerName?: string;
  orderId?: number;
  orderCode?: string;
  shopId?: number;
  channel?: string;
  subject: string;
  status: string;
  priority: number;
  assignedToName?: string;
  createdAt: string;
  resolvedAt?: string;
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'CUSTOMER' | 'STAFF' | 'SYSTEM' | string;
  senderId?: string;
  senderName?: string;
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

interface SupportTicketDetail extends SupportTicket {
  messages: TicketMessage[];
}

interface CustomerOrder {
  id?: number;
  orderCode: string;
  totalAmount: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: any }> = {
  OPEN:        { label: 'Chờ tiếp nhận', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  IN_PROGRESS: { label: 'Đang xử lý',    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',    icon: RefreshCw },
  WAITING_CUSTOMER: { label: 'Chờ bạn phản hồi', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', icon: MessageSquare },
  RESOLVED:    { label: 'Đã giải quyết', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  CLOSED:      { label: 'Đã đóng',       badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<number, { label: string; dotClass: string }> = {
  1: { label: 'Thấp',        dotClass: 'bg-slate-400' },
  2: { label: 'Bình thường',  dotClass: 'bg-blue-500' },
  3: { label: 'Cao',         dotClass: 'bg-amber-500' },
  4: { label: 'Khẩn cấp',    dotClass: 'bg-red-500' },
};

export default function CustomerTicketsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  /* Detail & Chat Modal */
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  /* Create Ticket Modal */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [createForm, setCreateForm] = useState({
    subject: '',
    initialMessage: '',
    orderId: '' as string | number,
    priority: 2,
  });
  const [creating, setCreating] = useState(false);

  /* ── Load My Tickets ── */
  const fetchTickets = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/customer/tickets/my-tickets?page=0&size=50`, {
        headers: headers as any,
      });
      const json = await res.json();
      if (json.success && json.data) {
        // PaginatedResponseDto returns the page in `items` (Spring's Page would use `content`)
        setTickets(json.data.items || json.data.content || []);
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách khiếu nại & hỗ trợ');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Load Orders for Create Ticket Selector ── */
  const fetchOrders = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/orders/me`, {
        headers: headers as any,
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTickets();
      fetchOrders();
    }
  }, [authLoading, user, fetchTickets, fetchOrders]);

  /* ── View Detail ── */
  const handleOpenDetail = async (ticketId: string) => {
    setDetailLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/customer/tickets/${ticketId}`, {
        headers: headers as any,
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedTicket(json.data);
      } else {
        toast.error('Không thể xem chi tiết yêu cầu hỗ trợ');
      }
    } catch {
      toast.error('Lỗi kết nối khi tải chi tiết');
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Send Message on Ticket ── */
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/customer/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>),
        },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        toast.success('Đã gửi phản hồi thành công');
        setReplyMessage('');
        // Append message directly to detail
        setSelectedTicket(prev => prev ? {
          ...prev,
          messages: [...prev.messages, json.data],
        } : null);
      } else {
        toast.error(json.message || 'Không thể gửi phản hồi');
      }
    } catch {
      toast.error('Lỗi khi gửi phản hồi');
    } finally {
      setSendingReply(false);
    }
  };

  /* ── Create New Ticket ── */
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.subject.trim() || !createForm.initialMessage.trim()) {
      toast.error('Vui lòng điền tiêu đề và nội dung yêu cầu');
      return;
    }

    setCreating(true);
    try {
      const headers = getAuthHeaders();
      const payload: any = {
        subject: createForm.subject.trim(),
        initialMessage: createForm.initialMessage.trim(),
        priority: Number(createForm.priority),
        channel: 'WEB',
      };
      if (createForm.orderId) {
        payload.orderId = Number(createForm.orderId);
      }

      const res = await fetch(`${getApiBaseUrl()}/api/customer/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        toast.success('Tạo yêu cầu hỗ trợ thành công! Đội ngũ CSKH sẽ phản hồi sớm nhất.');
        setShowCreateModal(false);
        setCreateForm({
          subject: '',
          initialMessage: '',
          orderId: '',
          priority: 2,
        });
        await fetchTickets(true);
      } else {
        toast.error(json.message || 'Không thể gửi yêu cầu hỗ trợ');
      }
    } catch {
      toast.error('Lỗi máy chủ khi tạo yêu cầu');
    } finally {
      setCreating(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'OPEN', label: 'Chờ tiếp nhận' },
          { key: 'IN_PROGRESS', label: 'Đang xử lý' },
          { key: 'RESOLVED', label: 'Đã giải quyết' },
          { key: 'CLOSED', label: 'Đã đóng' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`h-10 px-5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
              filterStatus === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex h-12 items-center justify-center gap-2 px-6 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Tạo yêu cầu hỗ trợ</span>
        </button>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white border border-slate-200/80 rounded-2xl p-5 animate-pulse" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1.5">Chưa có yêu cầu hỗ trợ nào</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
            Nếu bạn gặp khó khăn với đơn hàng hoặc dịch vụ, hãy bấm tạo yêu cầu để đội ngũ ET.TEE hỗ trợ kịp thời.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex h-11 items-center gap-2 px-6 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo yêu cầu ngay</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map(ticket => {
            const statusCfg = STATUS_CONFIG[ticket.status] || {
              label: ticket.status,
              badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
              icon: Clock,
            };
            const StatusIcon = statusCfg.icon;
            const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG[2];

            return (
              <div
                key={ticket.id}
                onClick={() => handleOpenDetail(ticket.id)}
                className="group bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                      #{ticket.ticketCode}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.badgeClass}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusCfg.label}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className={`w-2 h-2 rounded-full ${priorityCfg.dotClass}`} />
                      <span>Ưu tiên {priorityCfg.label}</span>
                    </span>
                    {ticket.orderCode && (
                      <span className="text-xs font-semibold text-primary bg-red-50 border border-red-100 px-2.5 py-1 rounded-md">
                        Đơn hàng: {ticket.orderCode}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {ticket.subject}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(ticket.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    {ticket.assignedToName && (
                      <span>Hỗ trợ viên: <strong className="text-slate-700">{ticket.assignedToName}</strong></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-slate-500 group-hover:text-slate-900 flex-shrink-0">
                  <span>Xem hội thoại</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Detail & Conversation Modal ─── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-slate-900 bg-slate-200 px-2.5 py-1 rounded-md">
                    #{selectedTicket.ticketCode}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_CONFIG[selectedTicket.status]?.badgeClass || 'bg-slate-100'}`}>
                    {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                  </span>
                  {selectedTicket.orderCode && (
                    <span className="text-xs font-bold text-primary bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                      Đơn: {selectedTicket.orderCode}
                    </span>
                  )}
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 leading-snug">{selectedTicket.subject}</h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                aria-label="Đóng"
                className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map(msg => {
                  const isCustomer = msg.senderType === 'CUSTOMER';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-bold text-slate-600">
                          {isCustomer ? 'Bạn' : (msg.senderName || 'Hỗ trợ viên ET.TEE')}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                          isCustomer
                            ? 'bg-slate-900 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        {msg.attachmentUrl && (
                          <div className="mt-2 pt-2 border-t border-slate-200/20">
                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-xs hover:opacity-80"
                            >
                              Tệp đính kèm
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">
                  Chưa có tin nhắn phản hồi nào trong yêu cầu này.
                </div>
              )}
            </div>

            {/* Reply Input Box */}
            {selectedTicket.status !== 'CLOSED' ? (
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-white flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nhập nội dung phản hồi tới CSKH..."
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  className="flex-1 h-12 px-5 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="h-12 px-6 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-bold rounded-full text-sm flex items-center gap-2 transition-all flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingReply ? 'Đang gửi...' : 'Gửi'}</span>
                </button>
              </form>
            ) : (
              <div className="p-4 bg-slate-100 text-center text-sm text-slate-500 font-medium border-t border-slate-200">
                Yêu cầu hỗ trợ này đã được đóng. Nếu vẫn cần trợ giúp, bạn vui lòng tạo một yêu cầu mới.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Create New Ticket Modal ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-2.5">
                <LifeBuoy className="w-6 h-6 text-primary" />
                <span>Tạo yêu cầu hỗ trợ mới</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Đóng"
                className="flex h-10 w-10 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Tiêu đề yêu cầu <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cần hỗ trợ đổi kích cỡ sản phẩm, chậm giao hàng..."
                  value={createForm.subject}
                  onChange={e => setCreateForm({ ...createForm, subject: e.target.value })}
                  className="w-full h-12 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Đơn hàng liên quan (Tùy chọn)
                </label>
                <select
                  value={createForm.orderId}
                  onChange={e => setCreateForm({ ...createForm, orderId: e.target.value })}
                  className="w-full h-12 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">-- Không gắn đơn hàng cụ thể --</option>
                  {orders.map(o => (
                    <option key={o.id ?? o.orderCode} value={o.id ?? ''}>
                      Đơn #{o.orderCode} ({o.totalAmount.toLocaleString('vi-VN')}₫)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Mức độ ưu tiên
                </label>
                <select
                  value={createForm.priority}
                  onChange={e => setCreateForm({ ...createForm, priority: Number(e.target.value) })}
                  className="w-full h-12 px-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value={1}>Thấp - Cần giải đáp chung</option>
                  <option value={2}>Bình thường - Thắc mắc về đơn hoặc sản phẩm</option>
                  <option value={3}>Cao - Lỗi giao nhận / Cần hỗ trợ gấp</option>
                  <option value={4}>Khẩn cấp - Sự cố thanh toán / Hàng hư hỏng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Nội dung chi tiết <span className="text-primary">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể sự cố hoặc thắc mắc của bạn để chúng tôi phục vụ nhanh nhất..."
                  value={createForm.initialMessage}
                  onChange={e => setCreateForm({ ...createForm, initialMessage: e.target.value })}
                  className="w-full p-4 border border-slate-300 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-12 border border-slate-200 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 h-12 bg-primary hover:bg-primary-hover text-white rounded-full text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {creating ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
