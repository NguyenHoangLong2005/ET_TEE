"use client";

import { useAuth } from '@/contexts/AuthContext';
import { LogOut, MonitorSmartphone } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StaffHeader() {
  const { user, logout } = useAuth();
  const [testRole, setTestRole] = useState<string>('');

  useEffect(() => {
    setTestRole(localStorage.getItem('test_role') || '');
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      localStorage.setItem('test_role', val);
      document.cookie = `test_role=${val}; path=/; max-age=86400; SameSite=Strict`;
    } else {
      localStorage.removeItem('test_role');
      document.cookie = `test_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    setTestRole(val);
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/auth/login';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40 shrink-0 shadow-sm">
      <div className="flex-1 flex items-center gap-4">
        {/* Test Mode Switcher */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          <MonitorSmartphone className="w-4 h-4" />
          <span className="font-semibold hidden md:inline">Test Mode:</span>
          <select 
            value={testRole}
            onChange={handleRoleChange}
            className="bg-transparent border-none outline-none font-medium text-amber-900 cursor-pointer text-sm"
          >
            <option value="">-- Mặc định (JWT) --</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SHOP_OWNER">SHOP_OWNER</option>
            <option value="MARKETING_STAFF">MARKETING_STAFF</option>
            <option value="SALES_STAFF">SALES_STAFF</option>
            <option value="WAREHOUSE_STAFF">WAREHOUSE_STAFF</option>
            <option value="SHIPPING_STAFF">SHIPPING_STAFF</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{user.fullName}</span>
              <span className="text-[10px] text-gray-500">{user.email}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center border border-gray-200">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
