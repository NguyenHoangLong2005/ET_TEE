import { redirect } from 'next/navigation';

// Trang tổng quan duy nhất của vận chuyển nằm ở /dashboard (khớp sidebar). Bản cũ ở đây
// đọc danh sách "đơn chờ tạo vận đơn" nên các ô Đang giao / Đã giao luôn bằng 0.
export default function ShippingIndexPage() {
  redirect('/staff/dashboard/shipping/dashboard');
}
