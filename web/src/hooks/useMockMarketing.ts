"use client";
import { useState, useEffect } from 'react';
import { mockDB, Banner, Voucher } from '@/lib/mockDB';

export function useMockMarketing() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  const load = () => {
    setBanners(mockDB.getBanners());
    setVouchers(mockDB.getVouchers());
  };

  useEffect(() => {
    load();
    window.addEventListener('mock_marketing_changed', load);
    return () => window.removeEventListener('mock_marketing_changed', load);
  }, []);

  const addBanner = (banner: Omit<Banner, 'id'>) => {
    const current = mockDB.getBanners();
    const newBanner = { ...banner, id: `BAN-${Date.now()}` };
    mockDB.saveBanners([...current, newBanner]);
  };

  const addVoucher = (voucher: Omit<Voucher, 'id'>) => {
    const current = mockDB.getVouchers();
    const newVoucher = { ...voucher, id: `VOU-${Date.now()}` };
    mockDB.saveVouchers([...current, newVoucher]);
  };

  return {
    banners,
    vouchers,
    addBanner,
    addVoucher
  };
}
