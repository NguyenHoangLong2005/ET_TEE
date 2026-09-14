export type OrderItem = {
  id: string;
  orderId: string;
  productId: number; // Changed to number to match product.id in products.ts
  variantId: string;
  size: string;
  color: string;
  quantity: number;
  reviewed: boolean;
};

export type Order = {
  id: string;
  userId: string;
  status: 'pending' | 'shipping' | 'delivered' | 'completed' | 'cancelled';
  items: OrderItem[];
  createdAt: string;
};

// Mock data
const mockOrders: Order[] = [
  {
    id: 'ord_1',
    userId: 'user_1',
    status: 'delivered',
    createdAt: '2023-10-01T10:00:00Z',
    items: [
      {
        id: 'item_1',
        orderId: 'ord_1',
        productId: 1, // Áo phông nam Cotton USA basic cổ tròn
        variantId: 'AO-PHONG-NAM-COTTON-USA-BASIC-CO-TRON-SW001-M',
        size: 'M',
        color: '#000000',
        quantity: 1,
        reviewed: false,
      }
    ]
  },
  {
    id: 'ord_2',
    userId: 'user_1',
    status: 'shipping',
    createdAt: '2023-10-15T10:00:00Z',
    items: [
      {
        id: 'item_2',
        orderId: 'ord_2',
        productId: 2, // Quần khaki nam
        variantId: 'QUAN-KHAKI-NAM-M',
        size: 'M',
        color: '#FFFFFF',
        quantity: 1,
        reviewed: false,
      }
    ]
  }
];

export const OrderService = {
  getUserOrders(userId: string): Order[] {
    return mockOrders.filter(o => o.userId === userId);
  },

  getDeliveredOrderItemsForProduct(userId: string, productId: number): OrderItem[] {
    const orders = this.getUserOrders(userId);
    const validOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    
    const items: OrderItem[] = [];
    validOrders.forEach(o => {
      o.items.forEach(item => {
        if (item.productId === productId) {
          items.push(item);
        }
      });
    });
    
    return items;
  },
  
  markItemAsReviewed(orderItemId: string) {
    for (const order of mockOrders) {
      for (const item of order.items) {
        if (item.id === orderItemId) {
          item.reviewed = true;
          return;
        }
      }
    }
  }
};
