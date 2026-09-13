import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { EtteeApi } from './api';

const STORAGE_KEY = 'ettee_auth';

const roleConfig = {
  admin: {
    label: 'Super Admin',
    landing: '/admin/tong-quan-he-thong',
    menu: [
      { label: 'Tổng quan hệ thống', path: '/admin/tong-quan-he-thong', icon: '▦' },
      { label: 'Tài khoản & Khóa user', path: '/admin/tai-khoan-va-khoa-user', icon: '◌' },
      { label: 'Ma trận phân quyền', path: '/admin/ma-tran-phan-quyen', icon: '◍' },
      { label: 'Danh mục toàn hệ thống', path: '/admin/danh-muc-toan-he-thong', icon: '▤' },
      { label: 'Cổng thanh toán & Vận chuyển', path: '/admin/cong-thanh-toan-va-van-chuyen', icon: '◫' },
      { label: 'AI Engine & Feature Flags', path: '/admin/ai-engine-va-feature-flags', icon: '✦' },
      { label: 'Nhật ký hệ thống (Logs)', path: '/admin/nhat-ky-he-thong', icon: '▣' },
      { label: 'Mẫu Email & Thông báo', path: '/admin/mau-email-va-thong-bao', icon: '✉' }
    ]
  },
  shop_owner: {
    label: 'Store Owner',
    landing: '/store-owner/doanh-thu-va-ban-hang',
    menu: [
      { label: 'Doanh thu & Bán hàng', path: '/store-owner/doanh-thu-va-ban-hang', icon: '◫' },
      { label: 'Sản phẩm & Bảng giá', path: '/store-owner/quan-ly-san-pham-va-bang-gia', icon: '◬' },
      { label: 'Tồn kho & Phê duyệt', path: '/store-owner/ton-kho-va-phe-duyet', icon: '◭' },
      { label: 'Nhân sự chi nhánh', path: '/store-owner/nhan-su-chi-nhanh', icon: '◐' },
      { label: 'Chiến dịch & Voucher', path: '/store-owner/chien-dich-va-voucher', icon: '◧' },
      { label: 'Nhật ký cửa hàng', path: '/store-owner/nhat-ky-cua-hang', icon: '▣' }
    ]
  },
  cskh_staff: {
    label: 'CSKH',
    landing: '/cskh/workspace-cskh-da-kenh',
    menu: [
      { label: 'Workspace CSKH đa kênh', path: '/cskh/workspace-cskh-da-kenh', icon: '◧' },
      { label: 'Tra cứu & Đổi trả đơn', path: '/cskh/tra-cuu-va-doi-tra-don', icon: '◭' },
      { label: 'Quản lý ticket & Khiếu nại', path: '/cskh/quan-ly-ticket-va-khieu-nai', icon: '◫' },
      { label: 'Hỗ trợ voucher đến bù', path: '/cskh/ho-tro-voucher-den-bu', icon: '◬' }
    ]
  }
};

function getStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function App() {
  const [auth, setAuth] = useState(getStoredAuth());

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth());
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage auth={auth} setAuth={setAuth} />} />
      <Route path="/admin" element={<Navigate to="/admin/tong-quan-he-thong" replace />} />
      <Route path="/store-owner" element={<Navigate to="/store-owner/doanh-thu-va-ban-hang" replace />} />
      <Route path="/cskh" element={<Navigate to="/cskh/workspace-cskh-da-kenh" replace />} />

      <Route path="/admin/tong-quan-he-thong" element={<ProtectedRoute requireRole="admin"><AppShell role="admin" auth={auth} setAuth={setAuth}><AdminOverviewPage /></AppShell></ProtectedRoute>} />

      <Route path="/admin/tai-khoan-va-khoa-user" element={<ProtectedRoute requireRole="admin"><AppShell role="admin" auth={auth} setAuth={setAuth}><AdminUsersPage /></AppShell></ProtectedRoute>} />

      <Route path="/admin/ma-tran-phan-quyen" element={<ProtectedRoute requireRole="admin"><AppShell role="admin" auth={auth} setAuth={setAuth}><PageShell title="Ma trận phân quyền" description="Kiểm tra vai trò, quyền và điều kiện truy cập theo module" stats={[{ label: 'Role đang active', value: '12', caption: 'Bao gồm 3 role mới' }, { label: 'Permission', value: '64', caption: 'Mỗi role gắn 5-8 permission' }, { label: 'Policy conflict', value: '0', caption: 'Không có xung đột' }, { label: 'Cập nhật gần nhất', value: '1h', caption: '20 phút trước' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/admin/danh-muc-toan-he-thong" element={<ProtectedRoute requireRole="admin"><AppShell role="admin" auth={auth} setAuth={setAuth}><PageShell title="Danh mục toàn hệ thống" description="Quản lý danh mục, phân loại và điều hướng dữ liệu trên toàn bộ hệ thống" stats={[{ label: 'Danh mục đang dùng', value: '43', caption: '3 danh mục phụ mới' }, { label: 'Nút cần review', value: '06', caption: 'Chờ cập nhật' }, { label: 'Slug trùng', value: '02', caption: 'Đang xử lý' }, { label: 'Tổng items', value: '2,419', caption: 'Tăng 7%' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/admin/cong-thanh-toan-va-van-chuyen" element={<ProtectedRoute requireRole="admin"><AppShell role="admin" auth={auth} setAuth={setAuth}><PageShell title="Cổng thanh toán & Vận chuyển" description="Theo dõi gateway thanh toán, provider giao hàng và trạng thái tích hợp" stats={[{ label: 'Gateway hoạt động', value: '04', caption: 'Tất cả online' }, { label: 'Đơn vận chuyển', value: '1,236', caption: '8% tăng so với hôm qua' }, { label: 'Thanh toán thất bại', value: '03', caption: '1 do timeout' }, { label: 'Delay trung bình', value: '2.1h', caption: 'Mức chuẩn' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/admin/ai-engine-va-feature-flags" element={<ProtectedRoute requireRole="admin"><AppShell role="admin" auth={auth} setAuth={setAuth}><PageShell title="AI Engine & Feature Flags" description="Kích hoạt và điều khiển tính năng AI, feature rollout và config theo nhóm" stats={[{ label: 'Model active', value: '08', caption: '2 model đang thử nghiệm' }, { label: 'Feature flag on', value: '14', caption: '4 feature đang rollout' }, { label: 'Latency p95', value: '180 ms', caption: 'Đã cải thiện 12%' }, { label: 'Error rate', value: '0.12%', caption: 'Cực thấp' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/admin/nhat-ky-he-thong" element={<ProtectedRoute requireRole="admin"><AppShell role="admin" auth={auth} setAuth={setAuth}><PageShell title="Nhật ký hệ thống (Logs)" description="Xem hoạt động hệ thống, sự kiện bảo mật và nhật ký lỗi" stats={[{ label: 'Event hôm nay', value: '14,204', caption: 'Tăng 5%' }, { label: 'Critical errors', value: '02', caption: '1 đã xử lý' }, { label: 'Audit trail', value: '98.6%', caption: 'Hoàn tất' }, { label: 'Retention', value: '180d', caption: 'Dữ liệu lưu trữ' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/admin/mau-email-va-thong-bao" element={<ProtectedRoute requireRole="admin"><AppShell role="admin" auth={auth} setAuth={setAuth}><PageShell title="Mẫu Email & Thông báo" description="Quản lý template email, thông báo hệ thống và kịch bản gửi tin nhắn" stats={[{ label: 'Template active', value: '27', caption: '5 template mới' }, { label: 'Campaign tuần này', value: '09', caption: '2 đang chạy' }, { label: 'Deliverability', value: '99.1%', caption: 'Tỷ lệ thành công' }, { label: 'Pending review', value: '03', caption: 'Cần xác nhận' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/store-owner/doanh-thu-va-ban-hang" element={<ProtectedRoute requireRole="shop_owner"><AppShell role="shop_owner" auth={auth} setAuth={setAuth}><StoreOwnerOverviewPage /></AppShell></ProtectedRoute>} />

      <Route path="/store-owner/quan-ly-san-pham-va-bang-gia" element={<ProtectedRoute requireRole="shop_owner"><AppShell role="shop_owner" auth={auth} setAuth={setAuth}><StoreProductsPage /></AppShell></ProtectedRoute>} />

      <Route path="/store-owner/ton-kho-va-phe-duyet" element={<ProtectedRoute requireRole="shop_owner"><AppShell role="shop_owner" auth={auth} setAuth={setAuth}><PageShell title="Tồn kho & Phê duyệt" description="Theo dõi tồn kho, hàng chờ phê duyệt và trạng thái nhập xuất" stats={[{ label: 'Tồn kho hiện tại', value: '96.4%', caption: 'Bình thường' }, { label: 'Đơn chờ duyệt', value: '18', caption: '6 yêu cầu khẩn' }, { label: 'Sắp hết hàng', value: '09', caption: '2 SKU nguy hiểm' }, { label: 'Phân bổ kho', value: '3 điểm', caption: 'Hoàn tất' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/store-owner/nhan-su-chi-nhanh" element={<ProtectedRoute requireRole="shop_owner"><AppShell role="shop_owner" auth={auth} setAuth={setAuth}><PageShell title="Nhân sự chi nhánh" description="Quản lý nhân sự, lịch làm việc và hiệu suất bán hàng" stats={[{ label: 'Nhân sự', value: '24', caption: '3 nhân sự mới' }, { label: 'Đang làm việc', value: '21', caption: '87.5%' }, { label: 'Tăng ca', value: '05', caption: 'Tuần này' }, { label: 'Chấm công trễ', value: '03', caption: 'Cần nhắc nhở' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/store-owner/chien-dich-va-voucher" element={<ProtectedRoute requireRole="shop_owner"><AppShell role="shop_owner" auth={auth} setAuth={setAuth}><PageShell title="Chiến dịch & Voucher" description="Theo dõi chiến dịch khuyến mãi, voucher và hiệu quả marketing" stats={[{ label: 'Chiến dịch active', value: '07', caption: '2 campaign mới' }, { label: 'Voucher phát hành', value: '158', caption: 'Tăng 9%' }, { label: 'Tỷ lệ dùng', value: '22%', caption: 'Khá tốt' }, { label: 'CTR', value: '8.4%', caption: 'Cao hơn mục tiêu' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/store-owner/nhat-ky-cua-hang" element={<ProtectedRoute requireRole="shop_owner"><AppShell role="shop_owner" auth={auth} setAuth={setAuth}><PageShell title="Nhật ký cửa hàng" description="Theo dõi hoạt động bán hàng, sự cố và lịch sử thao tác" stats={[{ label: 'Sự kiện hôm nay', value: '896', caption: '1,230 tổng tuần' }, { label: 'Hoàn tất', value: '739', caption: '82.5%' }, { label: 'Cần xem xét', value: '18', caption: '3 sự cố' }, { label: 'Phản hồi khách hàng', value: '35', caption: '9 đánh giá tích cực' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/cskh/workspace-cskh-da-kenh" element={<ProtectedRoute requireRole="cskh_staff"><AppShell role="cskh_staff" auth={auth} setAuth={setAuth}><CskhOverviewPage /></AppShell></ProtectedRoute>} />

      <Route path="/cskh/tra-cuu-va-doi-tra-don" element={<ProtectedRoute requireRole="cskh_staff"><AppShell role="cskh_staff" auth={auth} setAuth={setAuth}><PageShell title="Tra cứu & Đổi trả đơn" description="Tra cứu đơn hàng, phương thức thanh toán và quy trình đổi trả" stats={[{ label: 'Đơn cần tra cứu', value: '148', caption: '9 đang chờ phản hồi' }, { label: 'Đổi trả', value: '21', caption: '6 yêu cầu cần duyệt' }, { label: 'Đã giải quyết', value: '84%', caption: 'Tỷ lệ xử lý tốt' }, { label: 'Tỷ lệ phản hồi', value: '2.1h', caption: 'Mức chuẩn' }]} /></AppShell></ProtectedRoute>} />

      <Route path="/cskh/quan-ly-ticket-va-khieu-nai" element={<ProtectedRoute requireRole="cskh_staff"><AppShell role="cskh_staff" auth={auth} setAuth={setAuth}><CskhTicketsPage /></AppShell></ProtectedRoute>} />

      <Route path="/cskh/ho-tro-voucher-den-bu" element={<ProtectedRoute requireRole="cskh_staff"><AppShell role="cskh_staff" auth={auth} setAuth={setAuth}><PageShell title="Hỗ trợ voucher đến bù" description="Theo dõi voucher, hỗ trợ khách hàng và xử lý yêu cầu bù tiền" stats={[{ label: 'Yêu cầu voucher', value: '42', caption: '16 đang chờ xác nhận' }, { label: 'Đã giải quyết', value: '31', caption: '74%' }, { label: 'Bị từ chối', value: '05', caption: 'Cần review' }, { label: 'Tổng giá trị bù', value: '₫7.6M', caption: 'Tuần này' }]} /></AppShell></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={auth?.roles?.includes('admin') ? '/admin/tong-quan-he-thong' : auth?.roles?.includes('shop_owner') ? '/store-owner/doanh-thu-va-ban-hang' : auth?.roles?.includes('cskh_staff') ? '/cskh/workspace-cskh-da-kenh' : '/login'} replace />} />
    </Routes>
  );
}

function getPagePayload(result) {
  if (result?.status !== 'fulfilled' || !result.value) {
    return { items: [], totalElements: 0, totalPages: 0 };
  }

  return {
    items: Array.isArray(result.value) ? result.value : result.value.items || [],
    totalElements: typeof result.value.totalElements === 'number' ? result.value.totalElements : 0,
    totalPages: typeof result.value.totalPages === 'number' ? result.value.totalPages : 0
  };
}

function getListPayload(result) {
  if (result?.status !== 'fulfilled' || !result.value) {
    return [];
  }

  if (Array.isArray(result.value)) {
    return result.value;
  }

  if (Array.isArray(result.value.items)) {
    return result.value.items;
  }

  return [];
}

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${number.toFixed(1)}%`;
}

function OverviewPage({ title, description, stats, leftTitle, leftItems, rightTitle, rightItems }) {
  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <div className="page-kicker">{description}</div>
          <h1>{title}</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button">Làm mới: <strong>15 giây trước</strong></button>
          <button type="button" className="secondary-button">Tải lại</button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-header">
              <span>{stat.label}</span>
              <span className="icon-wrap">✦</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-meta">{stat.caption}</div>
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <div className="panel-card">
          <h3>{leftTitle}</h3>
          <ul>
            {leftItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="panel-card accent">
          <h3>{rightTitle}</h3>
          {rightItems.map((item) => (
            <div className="status-row" key={item}>
              <span className="status-dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminOverviewPage() {
  const defaultStats = [
    { label: 'Tổng người dùng hệ thống', value: 'Đang tải...', caption: 'Đang đồng bộ từ backend' },
    { label: 'Chi nhánh đang hoạt động', value: '01', caption: 'ET.TEE Flagship #01' },
    { label: 'Feature flag hiện có', value: 'Đang tải...', caption: 'Đang đọc từ API' },
    { label: 'Lỗi hệ thống gần nhất', value: 'Đang tải...', caption: 'Đang kiểm tra audit logs' }
  ];

  const [stats, setStats] = useState(defaultStats);
  const [leftItems, setLeftItems] = useState([
    'Đang tải dữ liệu từ backend Spring API...',
    'Danh mục quyền và tài khoản sẽ được đồng bộ khi API phản hồi.',
    'Mọi chi tiết sẽ được hiển thị ở các card thống kê dưới đây.'
  ]);
  const [rightItems, setRightItems] = useState([
    'Backend API: đang kết nối...',
    'Feature flags: đang tải...',
    'Audit logs: đang tải...'
  ]);

  useEffect(() => {
    let active = true;

    async function load() {
      const [usersResult, flagsResult, auditResult, errorResult] = await Promise.allSettled([
        EtteeApi.get('/api/admin/users?size=5'),
        EtteeApi.get('/api/admin/feature-flags'),
        EtteeApi.get('/api/admin/audit-logs?size=5'),
        EtteeApi.get('/api/admin/error-logs?size=5')
      ]);

      const usersPage = getPagePayload(usersResult);
      const flags = getListPayload(flagsResult);
      const auditPage = getPagePayload(auditResult);
      const errorPage = getPagePayload(errorResult);

      if (!active) {
        return;
      }

      setStats([
        { label: 'Tổng người dùng hệ thống', value: formatNumber(usersPage.totalElements), caption: 'Từ endpoint /api/admin/users' },
        { label: 'Chi nhánh đang hoạt động', value: '01', caption: 'ET.TEE Flagship #01' },
        { label: 'Feature flag hiện có', value: formatNumber(flags.length), caption: 'Từ endpoint /api/admin/feature-flags' },
        { label: 'Lỗi hệ thống gần nhất', value: formatNumber(errorPage.totalElements), caption: 'Từ endpoint /api/admin/error-logs' }
      ]);

      setLeftItems([
        `Tài khoản hệ thống: ${formatNumber(usersPage.totalElements)} bản ghi`,
        `Feature flags đang hoạt động: ${formatNumber(flags.length)} mục`,
        `Audit logs gần đây: ${formatNumber(auditPage.totalElements)} sự kiện`,
        `Lỗi chưa xử lý: ${formatNumber(errorPage.totalElements)} mục`
      ]);

      setRightItems([
        'Backend API: đang hoạt động',
        `Feature flags: ${flags.length > 0 ? 'đã tải dữ liệu thực từ backend' : 'chưa có dữ liệu trong DB hiện tại'}`,
        `Audit logs: ${auditPage.totalElements > 0 ? 'đã có dữ liệu phản hồi' : 'hiện đang rỗng do chưa có bản ghi'}`,
        `Error logs: ${errorPage.totalElements > 0 ? 'đã đồng bộ thành công' : 'không có lỗi được ghi nhận'}`
      ]);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <OverviewPage
      title="Tổng quan Hệ thống & Hiệu năng"
      description="Hệ thống lõi • Cụm Máy chủ VN-North"
      stats={stats}
      leftTitle="Thông tin nhanh từ backend"
      leftItems={leftItems}
      rightTitle="Trạng thái hệ thống"
      rightItems={rightItems}
    />
  );
}

function StoreOwnerOverviewPage() {
  const defaultStats = [
    { label: 'Doanh thu 30 ngày', value: 'Đang tải...', caption: 'Đang đọc dashboard summary' },
    { label: 'Tổng đơn hàng', value: 'Đang tải...', caption: 'Đang gọi /api/store-owner/dashboard/summary' },
    { label: 'Low stock', value: 'Đang tải...', caption: 'Đang kiểm tra tồn kho' },
    { label: 'Tỷ lệ hủy/hoàn', value: 'Đang tải...', caption: 'Đang tính từ dữ liệu thực' }
  ];

  const [stats, setStats] = useState(defaultStats);
  const [leftItems, setLeftItems] = useState([
    'Đang tải dữ liệu store owner từ backend...',
    'Bộ dữ liệu sản phẩm, tồn kho và dashboard sẽ được đồng bộ ngay khi API phản hồi.'
  ]);
  const [rightItems, setRightItems] = useState([
    'Dashboard API: đang kết nối...',
    'Sản phẩm: đang tải...',
    'Tồn kho: đang tải...'
  ]);

  useEffect(() => {
    let active = true;

    async function load() {
      const [summaryResult, productsResult, lowStockResult, staffResult] = await Promise.allSettled([
        EtteeApi.get('/api/store-owner/dashboard/summary'),
        EtteeApi.get('/api/store-owner/products?size=5'),
        EtteeApi.get('/api/store-owner/inventory/low-stock?size=5'),
        EtteeApi.get('/api/store-owner/staff?size=5')
      ]);

      const summary = summaryResult?.status === 'fulfilled' ? summaryResult.value : null;
      const productsPage = getPagePayload(productsResult);
      const lowStockPage = getPagePayload(lowStockResult);
      const staffPage = getPagePayload(staffResult);

      if (!active) {
        return;
      }

      const totalOrders = Number(summary?.totalOrders || 0);
      const lowStockCount = Number(summary?.lowStockVariantCount || lowStockPage.totalElements || 0);
      const orderStatusTotal = Object.values(summary?.ordersByStatus || {}).reduce((sum, value) => sum + Number(value || 0), 0);

      setStats([
        { label: 'Doanh thu 30 ngày', value: formatCurrency(summary?.revenue || 0), caption: `${formatNumber(totalOrders)} đơn hàng ghi nhận` },
        { label: 'Tổng đơn hàng', value: formatNumber(totalOrders), caption: `Hủy ${formatPercent(summary?.cancelRate || 0)} • Hoàn ${formatPercent(summary?.returnRate || 0)}` },
        { label: 'Low stock', value: formatNumber(lowStockCount), caption: 'Từ inventory/low-stock' },
        { label: 'Nhân sự chi nhánh', value: formatNumber(staffPage.totalElements), caption: 'Từ endpoint /api/store-owner/staff' }
      ]);

      setLeftItems([
        `Sản phẩm đang có trong hệ thống: ${formatNumber(productsPage.totalElements)} bản ghi`,
        `Low stock variants: ${formatNumber(lowStockCount)} SKU`,
        `Nhân sự chi nhánh: ${formatNumber(staffPage.totalElements)} người`,
        `Tổng trạng thái đơn hàng được đếm: ${formatNumber(orderStatusTotal)}`
      ]);

      setRightItems([
        'Dashboard API: đã tải dữ liệu thực từ backend',
        `Sản phẩm: ${productsPage.totalElements > 0 ? 'đã đồng bộ dữ liệu' : 'hiện chưa có dữ liệu trong DB'}`,
        `Tồn kho: ${lowStockPage.totalElements > 0 ? 'đã có low stock items' : 'hiện không có SKU nào dưới ngưỡng'}`,
        `Nhân sự: ${staffPage.totalElements > 0 ? 'đã tải thành công' : 'chưa có nhân sự trong hệ thống'}`
      ]);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <OverviewPage
      title="Doanh thu & Bán hàng"
      description="Tổng quan doanh thu, kênh bán hàng và hiệu suất cửa hàng"
      stats={stats}
      leftTitle="Dữ liệu store owner từ backend"
      leftItems={leftItems}
      rightTitle="Trạng thái cửa hàng"
      rightItems={rightItems}
    />
  );
}

function CskhOverviewPage() {
  const defaultStats = [
    { label: 'Đơn cần tra cứu', value: 'Đang tải...', caption: 'Đang đọc CSKH orders' },
    { label: 'Ticket đang mở', value: 'Đang tải...', caption: 'Đang đọc ticket data' },
    { label: 'Mã hỗ trợ', value: 'Đang tải...', caption: 'Đang lấy support code' },
    { label: 'Phản hồi trung bình', value: '2.1h', caption: 'Mức chuẩn hiện tại' }
  ];

  const [stats, setStats] = useState(defaultStats);
  const [leftItems, setLeftItems] = useState([
    'Đang tải dữ liệu CSKH từ backend...',
    'Các đơn hàng, ticket và mã hỗ trợ sẽ được hiển thị khi API trả về dữ liệu.'
  ]);
  const [rightItems, setRightItems] = useState([
    'Order API: đang kết nối...',
    'Ticket API: đang tải...',
    'Support code API: đang tải...'
  ]);

  useEffect(() => {
    let active = true;

    async function load() {
      const [ordersResult, ticketsResult, supportCodesResult] = await Promise.allSettled([
        EtteeApi.get('/api/cskh/orders?size=5'),
        EtteeApi.get('/api/cskh/tickets?size=5'),
        EtteeApi.get('/api/cskh/support-codes?size=5')
      ]);

      const ordersPage = getPagePayload(ordersResult);
      const ticketsPage = getPagePayload(ticketsResult);
      const supportCodesPage = getPagePayload(supportCodesResult);

      if (!active) {
        return;
      }

      setStats([
        { label: 'Đơn cần tra cứu', value: formatNumber(ordersPage.totalElements), caption: 'Từ endpoint /api/cskh/orders' },
        { label: 'Ticket đang mở', value: formatNumber(ticketsPage.totalElements), caption: 'Từ endpoint /api/cskh/tickets' },
        { label: 'Mã hỗ trợ', value: formatNumber(supportCodesPage.totalElements), caption: 'Từ endpoint /api/cskh/support-codes' },
        { label: 'Phản hồi trung bình', value: '2.1h', caption: 'Mức chuẩn hiện tại' }
      ]);

      setLeftItems([
        `Đơn hàng CSKH: ${formatNumber(ordersPage.totalElements)} bản ghi`,
        `Ticket hiện có: ${formatNumber(ticketsPage.totalElements)} mục`,
        `Support code đã phát hành: ${formatNumber(supportCodesPage.totalElements)} mã`,
        'Các chỉ số này đang được lấy trực tiếp từ backend Spring API.'
      ]);

      setRightItems([
        'Order API: đã phản hồi',
        `Tickets: ${ticketsPage.totalElements > 0 ? 'đã có dữ liệu thực' : 'hiện chưa có bản ghi'}`,
        `Support codes: ${supportCodesPage.totalElements > 0 ? 'đã đồng bộ dữ liệu' : 'hiện chưa có mã nào'}`,
        'CSKH workspace đã được sẵn sàng cho việc tích hợp tiếp theo.'
      ]);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <OverviewPage
      title="Workspace CSKH đa kênh"
      description="Xem tổng quan inbox, ticket, hotline và tình trạng xử lý hỗ trợ"
      stats={stats}
      leftTitle="Dữ liệu CSKH từ backend"
      leftItems={leftItems}
      rightTitle="Trạng thái kênh hỗ trợ"
      rightItems={rightItems}
    />
  );
}

function AdminUsersPage() {
  const defaultStats = [
    { label: 'Tổng tài khoản', value: 'Đang tải...', caption: 'Đang đọc từ /api/admin/users' },
    { label: 'Đang hoạt động', value: 'Đang tải...', caption: 'Đang tính từ trạng thái tài khoản' },
    { label: 'Nhân sự', value: 'Đang tải...', caption: 'Từ is_staff = true' },
    { label: 'Bị khóa', value: 'Đang tải...', caption: 'Theo trạng thái locked' }
  ];

  const [stats, setStats] = useState(defaultStats);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await Promise.allSettled([
        EtteeApi.get('/api/admin/users?size=50'),
        EtteeApi.get('/api/store-owner/staff?size=50')
      ]);

      const usersPage = getPagePayload(result[0]);
      const staffPage = getPagePayload(result[1]);

      if (!active) {
        return;
      }

      const items = usersPage.items || [];
      const activeUsers = items.filter((user) => user.status === 'active').length;
      const lockedUsers = items.filter((user) => user.status === 'locked').length;

      setStats([
        { label: 'Tổng tài khoản', value: formatNumber(usersPage.totalElements), caption: 'Từ endpoint /api/admin/users' },
        { label: 'Đang hoạt động', value: formatNumber(activeUsers), caption: `${formatNumber(usersPage.totalElements)} tài khoản tổng` },
        { label: 'Nhân sự', value: formatNumber(staffPage.totalElements), caption: 'Từ endpoint /api/store-owner/staff' },
        { label: 'Bị khóa', value: formatNumber(lockedUsers), caption: 'Tài khoản đang bị khóa' }
      ]);
      setRows(items);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <div className="page-kicker">Quản lý tài khoản nhân sự, phân quyền và khóa/mở khóa người dùng</div>
          <h1>Tài khoản & Khóa user</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button">Làm mới: <strong>15 giây trước</strong></button>
          <button type="button" className="secondary-button">Tải lại</button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-header">
              <span>{stat.label}</span>
              <span className="icon-wrap">✦</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-meta">{stat.caption}</div>
          </div>
        ))}
      </div>

      <div className="panel-card table-card">
        <h3>Danh sách tài khoản hệ thống</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Nhân sự</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">Đang tải dữ liệu từ backend...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">Không có tài khoản nào được trả về từ API.</td>
                </tr>
              ) : (
                rows.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName || '—'}</td>
                    <td>{user.email || '—'}</td>
                    <td>{user.phone || '—'}</td>
                    <td>{(user.roleCodes || []).join(', ') || '—'}</td>
                    <td><span className={`status-badge ${user.status}`}>{user.status || 'unknown'}</span></td>
                    <td>{user.isStaff ? 'Có' : 'Không'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StoreProductsPage() {
  const defaultStats = [
    { label: 'Sản phẩm', value: 'Đang tải...', caption: 'Đang đọc /api/store-owner/products' },
    { label: 'Đang hoạt động', value: 'Đang tải...', caption: 'Từ product.status' },
    { label: 'Bản ghi variants', value: 'Đang tải...', caption: 'Đếm biến thể đã có' },
    { label: 'Giá trị trung bình', value: 'Đang tải...', caption: 'Dựa trên base price' }
  ];

  const [stats, setStats] = useState(defaultStats);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await EtteeApi.get('/api/store-owner/products?size=50');
      const page = getPagePayload({ status: 'fulfilled', value: result });

      if (!active) {
        return;
      }

      const items = page.items || [];
      const activeProducts = items.filter((item) => item.status === 'active').length;
      const totalVariants = items.reduce((sum, item) => sum + (item.variants || []).length, 0);
      const avgPrice = items.length
        ? items.reduce((sum, item) => sum + Number(item.basePrice || 0), 0) / items.length
        : 0;

      setStats([
        { label: 'Sản phẩm', value: formatNumber(items.length), caption: 'Từ endpoint /api/store-owner/products' },
        { label: 'Đang hoạt động', value: formatNumber(activeProducts), caption: 'Sản phẩm đang publish' },
        { label: 'Bản ghi variants', value: formatNumber(totalVariants), caption: 'Tổng biến thể hiện có' },
        { label: 'Giá trị trung bình', value: formatCurrency(avgPrice), caption: 'Base price trung bình' }
      ]);
      setRows(items);
      setLoading(false);
    }

    load().catch(() => {
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <div className="page-kicker">Quản lý sản phẩm, bảng giá và trạng thái bán</div>
          <h1>Sản phẩm & Bảng giá</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button">Làm mới: <strong>15 giây trước</strong></button>
          <button type="button" className="secondary-button">Tải lại</button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-header">
              <span>{stat.label}</span>
              <span className="icon-wrap">✦</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-meta">{stat.caption}</div>
          </div>
        ))}
      </div>

      <div className="panel-card table-card">
        <h3>Danh sách sản phẩm</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Brand</th>
                <th>Giá gốc</th>
                <th>Trạng thái</th>
                <th>Variants</th>
                <th>Slug</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">Đang tải dữ liệu từ backend...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">Chưa có sản phẩm nào trong hệ thống.</td>
                </tr>
              ) : (
                rows.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.brand || '—'}</td>
                    <td>{formatCurrency(product.basePrice)}</td>
                    <td><span className={`status-badge ${product.status}`}>{product.status}</span></td>
                    <td>{(product.variants || []).length}</td>
                    <td>{product.slug}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CskhTicketsPage() {
  const defaultStats = [
    { label: 'Ticket', value: 'Đang tải...', caption: 'Đang đọc từ /api/cskh/tickets' },
    { label: 'Mở', value: 'Đang tải...', caption: 'Trạng thái open' },
    { label: 'Đang xử lý', value: 'Đang tải...', caption: 'Trạng thái in_progress' },
    { label: 'Đã giải quyết', value: 'Đang tải...', caption: 'Trạng thái resolved' }
  ];

  const [stats, setStats] = useState(defaultStats);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await EtteeApi.get('/api/cskh/tickets?size=50');
      const page = getPagePayload({ status: 'fulfilled', value: result });

      if (!active) {
        return;
      }

      const items = page.items || [];
      const openCount = items.filter((item) => item.status === 'open').length;
      const inProgressCount = items.filter((item) => item.status === 'in_progress').length;
      const resolvedCount = items.filter((item) => item.status === 'resolved').length;

      setStats([
        { label: 'Ticket', value: formatNumber(items.length), caption: 'Từ endpoint /api/cskh/tickets' },
        { label: 'Mở', value: formatNumber(openCount), caption: 'Ticket chưa xử lý' },
        { label: 'Đang xử lý', value: formatNumber(inProgressCount), caption: 'Ticket đang được xử lý' },
        { label: 'Đã giải quyết', value: formatNumber(resolvedCount), caption: 'Ticket đã đóng' }
      ]);
      setRows(items);
      setLoading(false);
    }

    load().catch(() => {
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <div className="page-kicker">Quản lý ticket, khiếu nại và luồng hỗ trợ khách hàng</div>
          <h1>Quản lý ticket & Khiếu nại</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button">Làm mới: <strong>15 giây trước</strong></button>
          <button type="button" className="secondary-button">Tải lại</button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-header">
              <span>{stat.label}</span>
              <span className="icon-wrap">✦</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-meta">{stat.caption}</div>
          </div>
        ))}
      </div>

      <div className="panel-card table-card">
        <h3>Danh sách ticket</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chủ đề</th>
                <th>Kênh</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th>Assigned to</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">Đang tải dữ liệu từ backend...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">Chưa có ticket nào trong hệ thống.</td>
                </tr>
              ) : (
                rows.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.subject}</td>
                    <td>{ticket.channel}</td>
                    <td>{ticket.priority}</td>
                    <td><span className={`status-badge ${ticket.status}`}>{ticket.status}</span></td>
                    <td>{ticket.assignedTo || 'Chưa giao'}</td>
                    <td>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('vi-VN') : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProtectedRoute({ children, requireRole }) {
  const auth = getStoredAuth();

  if (!auth?.accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && !auth.roles?.includes(requireRole)) {
    return <Navigate to={roleConfig[auth.roles?.[0]]?.landing || '/login'} replace />;
  }

  return children;
}

function LoginPage({ auth, setAuth }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin@ettee.vn');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth?.accessToken) {
      const primaryRole = auth.roles?.[0] || 'admin';
      navigate(roleConfig[primaryRole]?.landing || '/login', { replace: true });
    }
  }, [auth, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await EtteeApi.login(username.trim(), password);
      setAuth(data);
      const primaryRole = data.roles?.[0] || 'admin';
      navigate(roleConfig[primaryRole]?.landing || '/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="brand-mark">ET</div>
          <div>
            <h1>ET.TEE</h1>
            <p>OPERATIONS CORE</p>
          </div>
        </div>

        <h2>Đăng nhập nội bộ</h2>
        <p className="subtitle">Dành cho Admin / Chủ cửa hàng / CSKH</p>

        {error && <div className="error-box">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Email hoặc số điện thoại</label>
          <input id="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />

          <label htmlFor="password">Mật khẩu</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />

          <button type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="hint">Chưa có tài khoản? Liên hệ Admin để được cấp quyền truy cập.</p>
      </div>
    </div>
  );
}

function AppShell({ role, auth, setAuth, children }) {
  const navigate = useNavigate();
  const menu = roleConfig[role]?.menu || [];

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="brand-row">
            <div className="brand-mark small">ET</div>
            <div className="brand-copy">
              <div className="brand-name">ET.TEE</div>
              <div className="brand-sub">OPERATIONS CORE</div>
            </div>
          </div>

          <div className="role-label">{roleConfig[role]?.label?.toUpperCase()}</div>

          <nav className="nav-menu">
            {menu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="nav-footer">
            <button type="button" className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input type="text" placeholder="Tìm kiếm logs, tài khoản, cấu hình, mã đơn..." />
          </div>

          <div className="topbar-actions">
            <button type="button" className="icon-button" aria-label="Thông báo">◉</button>
            <div className="user-badge">
              <div className="avatar">L</div>
              <div className="user-info">
                <div className="user-name">Linh Nguyen</div>
                <div className="user-role">{roleConfig[role]?.label}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="page-body">
          {children}
        </div>
      </main>
    </div>
  );
}

function PageShell({ title, description, stats }) {
  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <div className="page-kicker">{description}</div>
          <h1>{title}</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button">Làm mới: <strong>15 giây trước</strong></button>
          <button type="button" className="secondary-button">Tải lại</button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-header">
              <span>{stat.label}</span>
              <span className="icon-wrap">✦</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-meta">{stat.caption}</div>
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <div className="panel-card">
          <h3>Thông tin nhanh</h3>
          <ul>
            <li>Đã sẵn sàng kết nối với backend Spring API.</li>
            <li>Layout và sidebar đã được tổ chức theo role.</li>
            <li>Đây là phiên bản SPA hiện đại hóa giai đoạn đầu.</li>
          </ul>
        </div>

        <div className="panel-card accent">
          <h3>Trạng thái hệ thống</h3>
          <div className="status-row">
            <span className="status-dot" />
            <span>Backend API: đang hoạt động</span>
          </div>
          <div className="status-row">
            <span className="status-dot" />
            <span>Frontend SPA: đang chạy trên Vite</span>
          </div>
          <div className="status-row">
            <span className="status-dot" />
            <span>Auth: lưu vào localStorage</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default App;
