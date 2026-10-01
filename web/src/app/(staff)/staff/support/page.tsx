"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Headset, MessageSquare, CheckCircle, Clock, Send, AlertTriangle, 
  Search, RefreshCw, Paperclip, UserCheck, TrendingUp, X, Gift,
  Package, Link as LinkIcon, ShieldAlert, DollarSign, FileText
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRoleCode } from '@/lib/auth';
import { toast } from 'sonner';

interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
  senderId?: string;
  senderName?: string;
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  ticketCode: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  orderId?: number;
  orderCode?: string;
  shopId?: number;
  channel: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  priority: number;
  assignedTo?: string;
  assignedToName?: string;
  escalatedTo?: string;
  escalatedToName?: string;
  createdAt: string;
  resolvedAt?: string;
  lastMessage?: TicketMessage;
}

interface SupportTicketDetail extends SupportTicket {
  customerPhone?: string;
  messages: TicketMessage[];
}

interface PaginatedTickets {
  items: SupportTicket[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

interface UserCandidate {
  id: string;
  fullName: string;
  email: string;
  role: string;
  shopId?: number;
}

interface OrderItemInfo {
  id: number;
  productName: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
}

interface RestrictedOrderLookupDto {
  id: number;
  orderCode: string;
  customerName: string;
  customerPhoneMasked: string;
  shippingAddressMasked: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  shopId?: number;
  items: OrderItemInfo[];
}

interface CskhQuotaStatusDto {
  staffId: string;
  shopId?: number;
  period: string;
  quotaAmount: number;
  usedAmount: number;
  remainingQuota: number;
}

const DENOMINATIONS = [
  { value: 20000, label: '20,000 VNĐ' },
  { value: 50000, label: '50,000 VNĐ' },
  { value: 100000, label: '100,000 VNĐ' },
  { value: 200000, label: '200,000 VNĐ' },
  { value: 500000, label: '500,000 VNĐ' },
];

export default function SupportChatPage() {
  // Order lookup and compensation vouchers (incl. the quota) are CSKH/Admin-only on the backend
  // (CskhExtendedController). This page is also served at /store-owner/support, where calling them
  // 403'd and threw a dev error overlay.
  const { user } = useAuth();
  const role = normalizeRoleCode(user?.role);
  const canUseCskhTools = role === 'CSKH_STAFF' || role === 'ADMIN' || role === 'SUPER_ADMIN';
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<SupportTicketDetail | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const [replyMessage, setReplyMessage] = useState<string>('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states for Assign & Escalate
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState<boolean>(false);
  const [candidateList, setCandidateList] = useState<UserCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [actionNote, setActionNote] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [modalErrorMsg, setModalErrorMsg] = useState<string | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);

  // Restricted Order Lookup Modal State
  const [isLookupModalOpen, setIsLookupModalOpen] = useState<boolean>(false);
  const [lookupSearchType, setLookupSearchType] = useState<'PHONE' | 'ORDER_CODE'>('PHONE');
  const [lookupQueryInput, setLookupQueryInput] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<RestrictedOrderLookupDto | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [linkingOrder, setLinkingOrder] = useState<boolean>(false);

  // Grant Compensation Voucher Modal State
  const [isGrantModalOpen, setIsGrantModalOpen] = useState<boolean>(false);
  const [grantDenomination, setGrantDenomination] = useState<number>(20000);
  const [grantReason, setGrantReason] = useState<string>('');
  const [grantLoading, setGrantLoading] = useState<boolean>(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<CskhQuotaStatusDto | null>(null);
  const [loadingQuota, setLoadingQuota] = useState<boolean>(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load ticket list
  const fetchTickets = async (silent?: unknown) => {
    if (silent !== true) setLoadingList(true);
    setErrorMsg(null);
    try {
      let query = `?page=0&size=50`;
      if (statusFilter !== 'ALL') {
        query += `&status=${statusFilter}`;
      }
      if (searchQuery.trim()) {
        query += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await apiClient.get<PaginatedTickets>(`/api/staff/support/tickets${query}`);
      setTickets(res.items || []);
    } catch (err: any) {
      console.error("Lỗi tải danh sách ticket:", err);
      setErrorMsg(err.message || "Không thể tải danh sách Ticket hỗ trợ");
      setTickets([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  // Load ticket detail when selected
  const fetchTicketDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.get<SupportTicketDetail>(`/api/staff/support/tickets/${id}`);
      setTicketDetail(res);
    } catch (err: any) {
      console.error("Lỗi chi tiết ticket:", err);
      setErrorMsg(err.message || "Không thể tải chi tiết ticket");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetail(selectedTicketId);
    } else {
      setTicketDetail(null);
    }
  }, [selectedTicketId]);

  // Fetch quota
  const fetchQuotaInfo = async (silent?: unknown) => {
    if (silent !== true) setLoadingQuota(true);
    try {
      const res = await apiClient.get<CskhQuotaStatusDto>('/api/staff/cskh/vouchers/quota');
      setQuotaInfo(res);
    } catch (err: any) {
      console.error("Lỗi tải thông tin hạn mức CSKH:", err);
    } finally {
      setLoadingQuota(false);
    }
  };

  useEffect(() => {
    if (canUseCskhTools) fetchQuotaInfo();
  }, [canUseCskhTools]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (ticketDetail?.messages) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticketDetail?.messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMessage.trim() || sendingMsg) return;

    setSendingMsg(true);
    try {
      await apiClient.post(`/api/staff/support/tickets/${selectedTicketId}/messages`, {
        message: replyMessage.trim()
      });
      setReplyMessage('');
      await fetchTicketDetail(selectedTicketId);
      fetchTickets(true);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi gửi tin nhắn phản hồi");
    } finally {
      setSendingMsg(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/api/staff/support/tickets/${ticketId}/status`, {
        status: newStatus
      });
      fetchTickets(true);
      if (selectedTicketId === ticketId) {
        fetchTicketDetail(ticketId);
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật trạng thái ticket");
    }
  };

  // Open Assign Modal
  const openAssignModal = async () => {
    if (!ticketDetail) return;
    setIsAssignModalOpen(true);
    setModalErrorMsg(null);
    setSelectedCandidateId('');
    setActionNote('');
    await fetchAssignCandidates(ticketDetail.id);
  };

  const fetchAssignCandidates = async (ticketId: string) => {
    setLoadingCandidates(true);
    setModalErrorMsg(null);
    try {
      const res = await apiClient.get<UserCandidate[]>(`/api/staff/support/tickets/${ticketId}/assignable-staff`);
      setCandidateList(res || []);
      if (res && res.length > 0) {
        setSelectedCandidateId(res[0].id);
      } else {
        setSelectedCandidateId('');
      }
    } catch (err: any) {
      console.error("Lỗi lấy danh sách nhân viên:", err);
      setModalErrorMsg(err.message || "Không thể lấy danh sách nhân viên");
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Open Escalate Modal
  const openEscalateModal = async () => {
    if (!ticketDetail) return;
    setIsEscalateModalOpen(true);
    setModalErrorMsg(null);
    setSelectedCandidateId('');
    setActionNote('');
    await fetchEscalateCandidates(ticketDetail.id);
  };

  const fetchEscalateCandidates = async (ticketId: string) => {
    setLoadingCandidates(true);
    setModalErrorMsg(null);
    try {
      const res = await apiClient.get<UserCandidate[]>(`/api/staff/support/tickets/${ticketId}/escalatable-owners`);
      setCandidateList(res || []);
      if (res && res.length > 0) {
        setSelectedCandidateId(res[0].id);
      } else {
        setSelectedCandidateId('');
      }
    } catch (err: any) {
      console.error("Lỗi lấy danh sách quản lý:", err);
      setModalErrorMsg(err.message || "Không thể lấy danh sách quản lý");
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Submit Assign
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !selectedCandidateId || submittingAction) return;

    setSubmittingAction(true);
    setModalErrorMsg(null);
    try {
      await apiClient.patch(`/api/staff/support/tickets/${selectedTicketId}/assign`, {
        assignedTo: selectedCandidateId,
        note: actionNote.trim() || undefined
      });
      setIsAssignModalOpen(false);
      await fetchTicketDetail(selectedTicketId);
      fetchTickets(true);
    } catch (err: any) {
      console.error("Lỗi phân công ticket:", err);
      setModalErrorMsg(err.message || "Lỗi phân công ticket");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Escalate
  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !selectedCandidateId || submittingAction) return;

    setSubmittingAction(true);
    setModalErrorMsg(null);
    try {
      await apiClient.patch(`/api/staff/support/tickets/${selectedTicketId}/assign`, {
        escalatedTo: selectedCandidateId,
        note: actionNote.trim() || undefined
      });
      setIsEscalateModalOpen(false);
      await fetchTicketDetail(selectedTicketId);
      fetchTickets(true);
    } catch (err: any) {
      console.error("Lỗi leo thang ticket:", err);
      setModalErrorMsg(err.message || "Lỗi leo thang ticket");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Restricted Order Lookup Handlers
  const handleOpenLookupModal = () => {
    setIsLookupModalOpen(true);
    setLookupQueryInput('');
    setLookupResult(null);
    setLookupError(null);
  };

  const handleExecuteLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQueryInput.trim() || lookupLoading) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await apiClient.post<RestrictedOrderLookupDto>(
        '/api/staff/cskh/orders/lookup',
        {
          searchType: lookupSearchType,
          query: lookupQueryInput.trim()
        }
      );
      setLookupResult(res);
    } catch (err: any) {
      console.error("Lỗi tra cứu đơn hàng:", err);
      setLookupError(err.message || "Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn hàng này.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLinkOrderToTicket = async (orderId: number) => {
    if (!selectedTicketId || linkingOrder) return;
    setLinkingOrder(true);
    try {
      await apiClient.patch(`/api/staff/support/tickets/${selectedTicketId}/link-order`, {
        orderId: orderId
      });
      await fetchTicketDetail(selectedTicketId);
      fetchTickets(true);
      setIsLookupModalOpen(false);
      toast.success("Đã liên kết đơn hàng vào ticket thành công!");
    } catch (err: any) {
      toast.error(err.message || "Không thể liên kết đơn hàng vào ticket");
    } finally {
      setLinkingOrder(false);
    }
  };

  // Grant Compensation Voucher Handlers
  const handleOpenGrantModal = async () => {
    if (!ticketDetail) return;
    setIsGrantModalOpen(true);
    setGrantDenomination(20000);
    setGrantReason('');
    setGrantError(null);
    await fetchQuotaInfo(true);
  };

  const handleGrantVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !ticketDetail?.customerId || grantLoading) return;

    setGrantLoading(true);
    setGrantError(null);
    try {
      await apiClient.post('/api/staff/cskh/vouchers/grant', {
        ticketId: selectedTicketId,
        amount: grantDenomination,
        reason: grantReason.trim() || undefined
      });
      setIsGrantModalOpen(false);
      await fetchTicketDetail(selectedTicketId);
      await fetchQuotaInfo(true);
      fetchTickets(true);
    } catch (err: any) {
      console.error("Lỗi cấp voucher tri ân:", err);
      setGrantError(err.message || "Không thể cấp voucher tri ân");
    } finally {
      setGrantLoading(false);
    }
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 5:
      case 4:
        return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">KHẨN CẤP</span>;
      case 3:
        return <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">CAO</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">BÌNH THƯỜNG</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded font-medium">Mới tiếp nhận</span>;
      case 'IN_PROGRESS':
        return <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-0.5 rounded font-medium">Đang xử lý</span>;
      case 'ESCALATED':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-0.5 rounded font-medium">Leo thang Quản lý</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded font-medium">Đã xử lý</span>;
      case 'CLOSED':
        return <span className="bg-slate-100 text-slate-600 border border-slate-200 text-xs px-2 py-0.5 rounded font-medium">Đã đóng</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 text-xs px-2 py-0.5 rounded">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Headset className="w-7 h-7 text-red-600" /> Trung Tâm Hỗ Trợ (CSKH & Live Chat)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tiếp nhận ticket, tra cứu đơn hàng bảo mật & tặng voucher đền bù theo hạn mức chi nhánh
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canUseCskhTools && (
            <button
              onClick={handleOpenLookupModal}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg shadow-flat transition font-medium"
            >
              <Search className="w-3.5 h-3.5" /> Tra cứu đơn hàng
            </button>
          )}

          <button
            onClick={fetchTickets}
            className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg shadow-flat transition font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} /> Tải lại danh sách
          </button>
        </div>
      </div>

      {/* Quota Banner */}
      {quotaInfo && (
        <div className="p-3.5     border border-red-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-flat">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 text-white rounded-lg shadow-flat">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Hạn Mức Voucher CSKH Tháng {quotaInfo.period}</div>
              <div className="text-slate-600 text-[11px] mt-0.5">
                Đã sử dụng: <strong className="text-red-700">{quotaInfo.usedAmount.toLocaleString('vi-VN')} đ</strong> / {quotaInfo.quotaAmount.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Hạn mức còn lại</span>
              <span className="font-extrabold text-sm text-emerald-700">
                {quotaInfo.remainingQuota.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-red-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (quotaInfo.usedAmount / (quotaInfo.quotaAmount || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-flat overflow-hidden flex flex-col h-[650px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-red-600" /> Danh sách Ticket
              </span>
              <span className="text-xs text-slate-500 font-medium">{tickets.length} ticket</span>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm mã ticket, tiêu đề..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTickets()}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
              >
                <option value="ALL">Tất cả</option>
                <option value="OPEN">Mới</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="ESCALATED">Leo thang</option>
                <option value="RESOLVED">Đã xong</option>
                <option value="CLOSED">Đã đóng</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loadingList ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-500" />
                <p>Đang tải danh sách ticket...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không tìm thấy ticket hỗ trợ nào.
              </div>
            ) : (
              tickets.map((ticket) => {
                const isSelected = selectedTicketId === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'border-red-500 bg-red-50/40 shadow-flat'
                        : 'border-slate-100 bg-slate-50/60 hover:border-red-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{ticket.ticketCode || ticket.id}</span>
                      {getPriorityBadge(ticket.priority)}
                    </div>

                    <p className="text-xs font-semibold text-slate-900 truncate mb-1">{ticket.subject}</p>
                    
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">Khách: {ticket.customerName || ticket.customerId || 'Khách ẩn danh'}</span>
                      {getStatusBadge(ticket.status)}
                    </div>

                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                      {ticket.shopId ? (
                        <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                          Shop #{ticket.shopId}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Hội sở</span>
                      )}

                      {ticket.assignedToName && (
                        <span className="text-indigo-600 font-medium truncate max-w-[120px]">
                          • {ticket.assignedToName}
                        </span>
                      )}
                    </div>

                    {/* Quick action buttons */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {ticket.status === 'OPEN' && (
                        <button
                          onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] py-1 rounded font-medium transition flex items-center justify-center gap-1"
                        >
                          <Clock className="w-3 h-3" /> Tiếp nhận
                        </button>
                      )}
                      {ticket.status !== 'CLOSED' && (
                        <button
                          onClick={() => handleUpdateStatus(ticket.id, 'CLOSED')}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] py-1 rounded font-medium transition flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" /> Đóng
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat / Ticket Detail Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-flat overflow-hidden flex flex-col h-[650px]">
          {!selectedTicketId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <Headset className="w-14 h-14 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600">Chưa chọn Ticket</p>
              <p className="text-xs text-slate-400 mt-1">Chọn một ticket ở danh sách bên trái để xem nội dung hội thoại & phản hồi khách hàng.</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
              <RefreshCw className="w-8 h-8 animate-spin text-red-500 mb-2" />
              <p className="text-xs">Đang tải cuộc trò chuyện...</p>
            </div>
          ) : ticketDetail ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{ticketDetail.ticketCode}</span>
                      {getStatusBadge(ticketDetail.status)}
                      {getPriorityBadge(ticketDetail.priority)}
                    </div>
                    <h2 className="text-sm font-semibold text-slate-800 mt-0.5">{ticketDetail.subject}</h2>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Khách: <strong className="text-slate-700">{ticketDetail.customerName || ticketDetail.customerId}</strong></span>
                      {ticketDetail.customerEmail && <span>Email: {ticketDetail.customerEmail}</span>}
                      {ticketDetail.orderCode ? (
                        <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                          Đơn #{ticketDetail.orderCode}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">Chưa gắn đơn</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center flex-wrap gap-2">
                    {canUseCskhTools && ticketDetail.status !== 'CLOSED' && (
                      <button
                        onClick={handleOpenGrantModal}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-flat transition flex items-center gap-1"
                      >
                        <Gift className="w-3.5 h-3.5" /> Tặng Voucher CSKH
                      </button>
                    )}

                    {ticketDetail.status !== 'CLOSED' && (
                      <button
                        onClick={openAssignModal}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-flat transition flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Phân công
                      </button>
                    )}

                    {ticketDetail.status !== 'CLOSED' && (
                      <button
                        onClick={openEscalateModal}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-flat transition flex items-center gap-1"
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> Leo thang
                      </button>
                    )}

                    {ticketDetail.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleUpdateStatus(ticketDetail.id, 'RESOLVED')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-flat transition flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Giải quyết
                      </button>
                    )}

                    {ticketDetail.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleUpdateStatus(ticketDetail.id, 'CLOSED')}
                        className="bg-slate-600 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-flat transition"
                      >
                        Đóng Ticket
                      </button>
                    )}
                  </div>
                </div>

                {/* Assignment & Shop Info Row */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200/80 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Phụ trách:</span>
                    <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${ticketDetail.assignedToName ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                      {ticketDetail.assignedToName || 'Chưa phân công'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Leo thang:</span>
                    <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${ticketDetail.escalatedToName ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-500'}`}>
                      {ticketDetail.escalatedToName || 'Chưa leo thang'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <span>Chi nhánh:</span>
                    <strong className="text-slate-700">
                      {ticketDetail.shopId ? `Shop #${ticketDetail.shopId}` : 'Hội sở (Shop NULL)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {ticketDetail.messages && ticketDetail.messages.length > 0 ? (
                  ticketDetail.messages.map((msg) => {
                    const isStaff = msg.senderType === 'STAFF';
                    const isSystem = msg.senderType === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="text-[11px] bg-red-100 text-red-800 border border-red-200 font-medium px-3.5 py-1.5 rounded-full text-center max-w-lg shadow-flat flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {isStaff ? (msg.senderName || 'Nhân viên CSKH') : (msg.senderName || 'Khách hàng')}
                          </span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[75%] rounded-xl px-4 py-2.5 text-xs shadow-flat ${
                            isStaff
                              ? 'bg-red-600 text-white rounded-br-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          {msg.attachmentUrl && (
                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-2 flex items-center gap-1 text-[11px] underline ${
                                isStaff ? 'text-red-100' : 'text-blue-600'
                              }`}
                            >
                              <Paperclip className="w-3 h-3" /> Xem file đính kèm
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-400 text-xs py-10">Chưa có tin nhắn nào trong cuộc hội thoại này.</div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    ticketDetail.status === 'CLOSED'
                      ? 'Ticket này đã đóng, không thể nhắn tin'
                      : 'Nhập nội dung tin nhắn phản hồi khách hàng...'
                  }
                  disabled={ticketDetail.status === 'CLOSED' || sendingMsg}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={ticketDetail.status === 'CLOSED' || !replyMessage.trim() || sendingMsg}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white p-2.5 rounded-xl transition shadow-flat flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>

      {/* Restricted Order Lookup Modal */}
      {isLookupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-flat border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" /> Tra Cứu Đơn Hàng Bảo Mật CSKH
              </h3>
              <button
                onClick={() => setIsLookupModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Chính sách Bảo mật & Audit Log:</strong> Mọi thao tác tra cứu đơn hàng của nhân viên CSKH đều được ghi lại nhật ký kiểm toán (Search Query, Mã đơn, Thời gian, Chi nhánh). Dữ liệu nhạy cảm (SĐT, Địa chỉ) được ẩn tự động.
                </div>
              </div>

              {/* Search Form */}
              <form onSubmit={handleExecuteLookup} className="flex gap-2">
                <select
                  value={lookupSearchType}
                  onChange={(e) => setLookupSearchType(e.target.value as 'PHONE' | 'ORDER_CODE')}
                  className="text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-800 font-bold text-slate-800 bg-slate-50"
                >
                  <option value="PHONE">SĐT Khách hàng</option>
                  <option value="ORDER_CODE">Mã Đơn Hàng</option>
                </select>
                <input
                  type="text"
                  placeholder={lookupSearchType === 'PHONE' ? "Nhập SĐT khách hàng (VD: 0901234567)..." : "Nhập Mã đơn hàng (VD: ORD-12345)..."}
                  value={lookupQueryInput}
                  onChange={(e) => setLookupQueryInput(e.target.value)}
                  className="flex-1 text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
                <button
                  type="submit"
                  disabled={lookupLoading || !lookupQueryInput.trim()}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs px-4 py-2.5 rounded-lg font-medium transition flex items-center gap-1.5"
                >
                  {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Tra cứu
                </button>
              </form>

              {lookupError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              {/* Lookup Result */}
              {lookupResult && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900">Đơn #{lookupResult.orderCode}</span>
                      <span className="text-slate-500 ml-2">({new Date(lookupResult.createdAt).toLocaleDateString('vi-VN')})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        {lookupResult.orderStatus}
                      </span>
                      {lookupResult.shopId && (
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                          Shop #{lookupResult.shopId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Khách hàng</span>
                      <strong className="text-slate-900">{lookupResult.customerName || 'N/A'}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Số điện thoại (Masked)</span>
                      <strong className="text-slate-900 font-mono">{lookupResult.customerPhoneMasked}</strong>
                    </div>

                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[11px]">Địa chỉ giao hàng (Masked)</span>
                      <span className="text-slate-800 font-medium">{lookupResult.shippingAddressMasked}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Thanh toán</span>
                      <span className="font-semibold text-slate-800">{lookupResult.paymentStatus}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Tổng giá trị đơn</span>
                      <strong className="text-red-600 text-sm">{lookupResult.totalAmount.toLocaleString('vi-VN')} đ</strong>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="pt-3 border-t border-slate-200">
                    <span className="font-semibold text-slate-900 block mb-2">Danh sách sản phẩm:</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {lookupResult.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-800">{item.productName}</span>
                            {(item.size || item.color) && (
                              <span className="text-slate-500 ml-1.5">({item.size || ''} {item.color || ''})</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-slate-600">{item.quantity} x {item.unitPrice.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Link Order Button */}
                  {selectedTicketId && ticketDetail && (
                    <div className="pt-3 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() => handleLinkOrderToTicket(lookupResult.id)}
                        disabled={linkingOrder || ticketDetail.orderId === lookupResult.id}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold px-4 py-2 rounded-lg shadow-flat transition flex items-center gap-1.5"
                      >
                        {linkingOrder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                        {ticketDetail.orderId === lookupResult.id ? 'Đã liên kết đơn này' : 'Liên kết đơn hàng vào Ticket hiện tại'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grant Compensation Voucher Modal */}
      {isGrantModalOpen && ticketDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-flat border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between    text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Gift className="w-4.5 h-4.5 text-amber-300" /> Gửi Voucher Tri Ân CSKH
              </h3>
              <button
                onClick={() => setIsGrantModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantVoucherSubmit} className="p-5 space-y-4 text-xs">
              {grantError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>{grantError}</div>
                </div>
              )}

              {quotaInfo && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" /> Hạn mức cá nhân tháng {quotaInfo.period}:
                  </div>
                  <div>Còn lại: <strong className="text-emerald-700 font-bold">{quotaInfo.remainingQuota.toLocaleString('vi-VN')} đ</strong> (Đã dùng {quotaInfo.usedAmount.toLocaleString('vi-VN')} đ / {quotaInfo.quotaAmount.toLocaleString('vi-VN')} đ)</div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khách hàng thụ hưởng</label>
                <input
                  type="text"
                  disabled
                  value={`${ticketDetail.customerName || 'Khách hàng'} (${ticketDetail.customerId})`}
                  className="w-full bg-slate-100 text-slate-700 border border-slate-300 rounded-lg p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn Mệnh Giá Đền Bù (Cố định 5 mức)</label>
                <select
                  value={grantDenomination}
                  onChange={(e) => setGrantDenomination(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-red-500 font-bold text-red-700 text-sm"
                >
                  {DENOMINATIONS.map((d) => (
                    <option key={d.value} value={d.value} disabled={quotaInfo ? d.value > quotaInfo.remainingQuota : false}>
                      {d.label} {quotaInfo && d.value > quotaInfo.remainingQuota ? '(Vượt quá hạn mức)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý do tặng / đền bù (Tùy chọn)</label>
                <textarea
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="VD: Đền bù giao hàng chậm 2 ngày cho khách hàng..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px]">
                • Quy tắc: Mỗi ticket chỉ được cấp tối đa 1 voucher tri ân.<br />
                • Voucher sẽ tự động gắn mã khách hàng (`grantedToCustomerId`) và chỉ áp dụng được tại bước Checkout của chính khách hàng này.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGrantModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={grantLoading || (quotaInfo ? grantDenomination > quotaInfo.remainingQuota : false)}
                  className="px-4 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 rounded-lg shadow-flat transition flex items-center gap-1.5"
                >
                  {grantLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận Cấp Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-flat border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" /> Phân Công Yêu Cầu Hỗ Trợ
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
              {modalErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{modalErrorMsg}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Nhân Viên CSKH
                  {ticketDetail?.shopId ? ` (Cùng chi nhánh Shop #${ticketDetail.shopId})` : ' (Hội sở / Admin)'}
                </label>
                {loadingCandidates ? (
                  <div className="text-xs text-slate-500 py-2 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Đang tải danh sách nhân viên...
                  </div>
                ) : (
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    {candidateList.length === 0 ? (
                      <option value="">-- Không có nhân viên hợp lệ --</option>
                    ) : (
                      candidateList.map((cand) => (
                        <option key={cand.id} value={cand.id}>
                          {cand.fullName} ({cand.role}{cand.shopId ? ` - Shop #${cand.shopId}` : ' - HQ'})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú phân công (Tùy chọn)</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Nhập ghi chú giao việc cho nhân viên..."
                  rows={2}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !selectedCandidateId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-flat transition flex items-center gap-1.5"
                >
                  {submittingAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Xác nhận Phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {isEscalateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-flat border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" /> Leo Thang Ticket Lên Quản Lý
              </h3>
              <button
                onClick={() => setIsEscalateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEscalateSubmit} className="p-5 space-y-4">
              {modalErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{modalErrorMsg}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Quản Lý Chi Nhánh (SHOP_OWNER) / Admin
                  {ticketDetail?.shopId ? ` (Cùng chi nhánh Shop #${ticketDetail.shopId})` : ' (Hội sở)'}
                </label>
                {loadingCandidates ? (
                  <div className="text-xs text-slate-500 py-2 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" /> Đang tải danh sách quản lý...
                  </div>
                ) : (
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  >
                    {candidateList.length === 0 ? (
                      <option value="">-- Không có quản lý hợp lệ --</option>
                    ) : (
                      candidateList.map((cand) => (
                        <option key={cand.id} value={cand.id}>
                          {cand.fullName} ({cand.role}{cand.shopId ? ` - Shop #${cand.shopId}` : ' - HQ'})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do leo thang (Tùy chọn)</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Nhập lý do cần leo thang cấp quản lý xử lý..."
                  rows={2}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEscalateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !selectedCandidateId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 rounded-lg shadow-flat transition flex items-center gap-1.5"
                >
                  {submittingAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Xác nhận Leo thang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


