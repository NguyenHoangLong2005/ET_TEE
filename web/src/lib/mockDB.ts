export type UserRole = 'ADMIN' | 'SHOP_OWNER' | 'MARKETING_STAFF' | 'SALES_STAFF' | 'WAREHOUSE_STAFF' | 'SHIPPING_STAFF' | 'STAFF';

export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: 'ACTIVE' | 'HIDDEN';
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: 'NEW' | 'CONFIRMED' | 'PACKING' | 'PACKED' | 'SHIPPING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
}

export interface Ticket {
  id: string;
  customer: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Voucher {
  id: string;
  code: string;
  discountPercent: number;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface Approval {
  id: string;
  type: 'VOUCHER' | 'STOCK_ADJUSTMENT';
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'HIDDEN';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Nguyễn Văn Admin', email: 'admin@et-tee.com', role: 'ADMIN', status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: '2', name: 'Trần Cửa Hàng', email: 'manager@et-tee.com', role: 'SHOP_OWNER', status: 'ACTIVE', createdAt: new Date().toISOString() }
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Áo Thun Basic Đen', sku: 'TSHIRT-BLK-M', price: 250000, stock: 45, status: 'ACTIVE' },
  { id: 'p2', name: 'Áo Khoác Hoodie Xám', sku: 'HOOD-GRY-L', price: 550000, stock: 12, status: 'ACTIVE' },
];

const INITIAL_ORDERS: Order[] = [
  { id: 'ORD-001', customerName: 'Lê Minh', customerPhone: '0901234567', total: 550000, status: 'NEW', createdAt: new Date().toISOString() },
  { id: 'ORD-002', customerName: 'Trần Hoa', customerPhone: '0987654321', total: 250000, status: 'CONFIRMED', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'ORD-003', customerName: 'Nguyễn Kiên', customerPhone: '0912223334', total: 850000, status: 'PACKED', createdAt: new Date(Date.now() - 7200000).toISOString() }
];

const INITIAL_TICKETS: Ticket[] = [
  { id: 'TCK-101', customer: 'Lê Minh', subject: 'Hỏi về thời gian giao hàng', status: 'OPEN', priority: 'MEDIUM' },
  { id: 'TCK-102', customer: 'Trần Hoa', subject: 'Sản phẩm lỗi', status: 'IN_PROGRESS', priority: 'HIGH' }
];

const INITIAL_BANNERS: Banner[] = [
  { id: 'BAN-1', title: 'Sale Hè Sôi Động', imageUrl: 'https://via.placeholder.com/800x400?text=Summer+Sale', status: 'ACTIVE' }
];

const INITIAL_VOUCHERS: Voucher[] = [
  { id: 'VOU-1', code: 'SUMMER20', discountPercent: 20, status: 'ACTIVE' }
];

const INITIAL_APPROVALS: Approval[] = [
  { id: 'APP-1', type: 'VOUCHER', description: 'Yêu cầu duyệt mã giảm giá SUMMER20 (20%)', status: 'PENDING' }
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'CAT-1', name: 'Áo Thun', slug: 'ao-thun', status: 'ACTIVE' },
  { id: 'CAT-2', name: 'Áo Khoác', slug: 'ao-khoac', status: 'ACTIVE' },
  { id: 'CAT-3', name: 'Quần Jeans', slug: 'quan-jeans', status: 'ACTIVE' }
];

export const mockDB = {
  getUsers: (): User[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('mock_users');
    if (!data) {
      localStorage.setItem('mock_users', JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(data);
  },
  
  saveUsers: (users: User[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mock_users', JSON.stringify(users));
    window.dispatchEvent(new Event('mock_users_changed'));
  },

  addUser: (user: Omit<User, 'id' | 'createdAt'>) => {
    const users = mockDB.getUsers();
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    mockDB.saveUsers([...users, newUser]);
  },

  updateUserStatus: (id: string, status: UserStatus) => {
    const users = mockDB.getUsers();
    const updated = users.map(u => u.id === id ? { ...u, status } : u);
    mockDB.saveUsers(updated);
  },

  getProducts: (): Product[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('mock_products');
    if (!data) {
      localStorage.setItem('mock_products', JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(data);
  },

  saveProducts: (products: Product[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mock_products', JSON.stringify(products));
    window.dispatchEvent(new Event('mock_products_changed'));
  },

  updateProductPrice: (id: string, newPrice: number) => {
    const products = mockDB.getProducts();
    const updated = products.map(p => p.id === id ? { ...p, price: newPrice } : p);
    mockDB.saveProducts(updated);
  },

  updateProductStock: (id: string, additionalStock: number) => {
    const products = mockDB.getProducts();
    const updated = products.map(p => p.id === id ? { ...p, stock: p.stock + additionalStock } : p);
    mockDB.saveProducts(updated);
  },

  getOrders: (): Order[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('mock_orders');
    if (!data) {
      localStorage.setItem('mock_orders', JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return JSON.parse(data);
  },

  saveOrders: (orders: Order[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mock_orders', JSON.stringify(orders));
    window.dispatchEvent(new Event('mock_orders_changed'));
  },

  updateOrderStatus: (id: string, status: Order['status']) => {
    const orders = mockDB.getOrders();
    const updated = orders.map(o => o.id === id ? { ...o, status } : o);
    mockDB.saveOrders(updated);
  },

  getTickets: (): Ticket[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('mock_tickets');
    if (!data) {
      localStorage.setItem('mock_tickets', JSON.stringify(INITIAL_TICKETS));
      return INITIAL_TICKETS;
    }
    return JSON.parse(data);
  },

  saveTickets: (tickets: Ticket[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mock_tickets', JSON.stringify(tickets));
    window.dispatchEvent(new Event('mock_tickets_changed'));
  },

  updateTicketStatus: (id: string, status: Ticket['status']) => {
    const tickets = mockDB.getTickets();
    const updated = tickets.map(t => t.id === id ? { ...t, status } : t);
    mockDB.saveTickets(updated);
  },

  getBanners: (): Banner[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('mock_banners');
    return data ? JSON.parse(data) : INITIAL_BANNERS;
  },
  saveBanners: (banners: Banner[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mock_banners', JSON.stringify(banners));
    window.dispatchEvent(new Event('mock_marketing_changed'));
  },
  
  getVouchers: (): Voucher[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('mock_vouchers');
    return data ? JSON.parse(data) : INITIAL_VOUCHERS;
  },
  saveVouchers: (vouchers: Voucher[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mock_vouchers', JSON.stringify(vouchers));
    window.dispatchEvent(new Event('mock_marketing_changed'));
  },

  getApprovals: (): Approval[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('mock_approvals');
    return data ? JSON.parse(data) : INITIAL_APPROVALS;
  },
  updateApprovalStatus: (id: string, status: Approval['status']) => {
    const approvals = mockDB.getApprovals();
    const updated = approvals.map(a => a.id === id ? { ...a, status } : a);
    localStorage.setItem('mock_approvals', JSON.stringify(updated));
    window.dispatchEvent(new Event('mock_approvals_changed'));
  },

  getCategories: (): Category[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('mock_categories');
    return data ? JSON.parse(data) : INITIAL_CATEGORIES;
  },
  saveCategories: (categories: Category[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mock_categories', JSON.stringify(categories));
    window.dispatchEvent(new Event('mock_categories_changed'));
  }
};
