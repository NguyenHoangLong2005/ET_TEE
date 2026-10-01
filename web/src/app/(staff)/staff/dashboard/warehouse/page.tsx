import { redirect } from 'next/navigation';

// Trang tổng quan duy nhất của kho nằm ở /dashboard (khớp sidebar và trang đăng nhập).
export default function WarehouseIndexPage() {
  redirect('/staff/dashboard/warehouse/dashboard');
}
