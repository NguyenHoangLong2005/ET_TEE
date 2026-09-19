"use client";
import React from 'react';
import { Headset, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { useMockTickets } from '@/hooks/useMockTickets';

export default function SupportChatPage() {
  const { tickets, updateTicketStatus } = useMockTickets();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trung Tâm Hỗ Trợ (CSKH)</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-red-600" /> Danh sách Ticket
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tickets.map(ticket => (
              <div key={ticket.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50 hover:border-red-200 transition cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900">{ticket.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    ticket.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                  }`}>{ticket.priority}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</p>
                <p className="text-xs text-gray-500 mt-1">Khách: {ticket.customer}</p>
                
                <div className="mt-3 flex gap-2">
                  {ticket.status !== 'CLOSED' && (
                    <button 
                      onClick={() => updateTicketStatus(ticket.id, 'CLOSED')}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs py-1.5 rounded font-medium transition flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Đóng
                    </button>
                  )}
                  {ticket.status === 'OPEN' && (
                    <button 
                      onClick={() => updateTicketStatus(ticket.id, 'IN_PROGRESS')}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs py-1.5 rounded font-medium transition flex items-center justify-center gap-1"
                    >
                      <Clock className="w-3 h-3" /> Xử lý
                    </button>
                  )}
                  {ticket.status === 'CLOSED' && (
                    <span className="text-xs text-gray-400 font-medium w-full text-center py-1.5 border border-dashed border-gray-200 rounded">Đã xử lý xong</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-gray-400 h-[600px]">
          <Headset className="w-12 h-12 text-gray-300 mb-3" />
          <p>Chọn một ticket để bắt đầu chat với khách hàng.</p>
        </div>
      </div>
    </div>
  );
}
