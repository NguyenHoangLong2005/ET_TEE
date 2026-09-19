"use client";
import React from 'react';
import { CheckSquare, CheckCircle, XCircle } from 'lucide-react';
import { useMockApprovals } from '@/hooks/useMockApprovals';

export default function StoreApprovalsPage() {
  const { approvals, updateApprovalStatus } = useMockApprovals();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Phê Duyệt Khuyến Mãi & Chênh Lệch Kho</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Mã Yêu Cầu</th>
              <th className="px-6 py-3">Loại Yêu Cầu</th>
              <th className="px-6 py-3">Nội Dung</th>
              <th className="px-6 py-3">Trạng Thái</th>
              <th className="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {approvals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <CheckSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  Không có yêu cầu phê duyệt nào đang chờ.
                </td>
              </tr>
            ) : (
              approvals.map(approval => (
                <tr key={approval.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{approval.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-700">
                    {approval.type === 'VOUCHER' ? 'Mã Giảm Giá' : 'Chênh Lệch Kho'}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{approval.description}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${approval.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        approval.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 
                        'bg-red-50 text-red-700 border-red-200'}`}
                    >
                      {approval.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {approval.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => updateApprovalStatus(approval.id, 'APPROVED')} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition" title="Duyệt">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => updateApprovalStatus(approval.id, 'REJECTED')} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition" title="Từ chối">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
