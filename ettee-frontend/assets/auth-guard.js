/**
 * ET.TEE Store — Auth guard.
 * QUAN TRỌNG: nạp script này ở <head>, CÀNG SỚM CÀNG TỐT (trước cả CSS nếu được),
 * để redirect ngay khi chưa đăng nhập/sai quyền — tránh việc nội dung nội bộ bị
 * "chớp" ra màn hình rồi mới bị đá đi (nhấp nháy khó chịu + rò dữ liệu 1 khoảnh khắc).
 *
 * Cách dùng — đặt data-required-role trên chính thẻ <script>:
 *   <script src="../assets/auth-guard.js" data-required-role="admin"></script>
 *   <script src="../assets/auth-guard.js" data-required-role="shop_owner"></script>
 *   <script src="../assets/auth-guard.js" data-required-role="cskh_staff"></script>
 * role "admin" luôn được coi là qua được mọi guard (đúng như phân quyền phía backend).
 */
(function () {
  'use strict';

  const currentScript = document.currentScript;
  const requiredRole = currentScript ? currentScript.getAttribute('data-required-role') : null;

  function depthPrefix() {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const depth = Math.max(segments.length - 1, 0);
    return '../'.repeat(depth);
  }

  function redirectToLogin() {
    localStorage.removeItem('ettee_auth');
    window.location.replace(depthPrefix() + 'login.html');
  }

  let auth = null;
  try {
    const raw = localStorage.getItem('ettee_auth');
    auth = raw ? JSON.parse(raw) : null;
  } catch (e) {
    auth = null;
  }

  if (!auth || !auth.accessToken) {
    redirectToLogin();
    return;
  }

  // Kiểm tra JWT hết hạn (decode phần payload, không cần gọi mạng).
  try {
    const payload = JSON.parse(atob(auth.accessToken.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      redirectToLogin();
      return;
    }
  } catch (e) {
    redirectToLogin();
    return;
  }

  if (requiredRole) {
    const roles = Array.isArray(auth.roles) ? auth.roles : [];
    const allowed = roles.includes(requiredRole) || roles.includes('admin');
    if (!allowed) {
      redirectToLogin();
      return;
    }
  }

  // Cho các trang phía sau biết đã qua guard + có sẵn thông tin người dùng hiện tại.
  window.ETTEE_CURRENT_USER = auth;
})();
