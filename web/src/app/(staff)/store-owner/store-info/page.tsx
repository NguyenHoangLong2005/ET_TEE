'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';
import StoreInfoForm from '@/components/staff/StoreInfoForm';

export default function StoreOwnerStoreInfoPage() {
  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <StoreInfoForm />
    </PermissionGuard>
  );
}
