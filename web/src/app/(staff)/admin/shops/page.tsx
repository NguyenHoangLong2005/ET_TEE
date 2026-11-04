'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';
import StoreInfoForm from '@/components/staff/StoreInfoForm';

// He thong chi quan ly mot cua hang: trang "Quan ly chi nhanh" cu nay gio la
// trang sua thong tin cua hang duy nhat.
export default function AdminShopPage() {
  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <StoreInfoForm />
    </PermissionGuard>
  );
}
