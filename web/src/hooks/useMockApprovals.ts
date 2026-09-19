"use client";
import { useState, useEffect } from 'react';
import { mockDB, Approval } from '@/lib/mockDB';

export function useMockApprovals() {
  const [approvals, setApprovals] = useState<Approval[]>([]);

  const load = () => {
    setApprovals(mockDB.getApprovals());
  };

  useEffect(() => {
    load();
    window.addEventListener('mock_approvals_changed', load);
    return () => window.removeEventListener('mock_approvals_changed', load);
  }, []);

  return {
    approvals,
    updateApprovalStatus: mockDB.updateApprovalStatus
  };
}
