import { apiClient } from '../api-client';

export type OrderItem = {
  id: string;
  orderId: string;
  productId: number;
  variantId: string;
  size: string;
  color: string;
  quantity: number;
  reviewed: boolean;
};

export type Order = {
  id: string;
  userId: string;
  orderCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  items: OrderItem[];
  createdAt: string;
};

export const OrderService = {
  async getUserOrders(): Promise<Order[]> {
    try {
      const response = await apiClient.get<Order[]>('/api/orders/me');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch user orders', error);
      return [];
    }
  },

  async getOrderDetails(orderCode: string): Promise<Order | null> {
    try {
      return await apiClient.get<Order>(`/api/orders/${orderCode}`);
    } catch (error) {
      console.error('Failed to fetch order details', error);
      return null;
    }
  },

  async getDeliveredOrderItemsForProduct(productId: number): Promise<OrderItem[]> {
    const orders = await this.getUserOrders();
    const validOrders = orders.filter(o => o.status === 'DELIVERED');
    
    const items: OrderItem[] = [];
    validOrders.forEach(o => {
      o.items?.forEach(item => {
        if (item.productId === productId) {
          items.push(item);
        }
      });
    });
    
    return items;
  },
  
  async cancelOrder(orderCode: string, reason?: string): Promise<boolean> {
    try {
      await apiClient.post(`/api/orders/${orderCode}/cancel`, { reason: reason || 'Khách hàng hủy đơn hàng' });
      return true;
    } catch (error) {
      console.error('Failed to cancel order', error);
      return false;
    }
  },

  // Note: Backend might not have this specific endpoint, but we leave the signature 
  // and make it a no-op or actual API call if it exists.
  async markItemAsReviewed(orderItemId: string): Promise<void> {
    try {
      // Assuming a patch endpoint might exist, else just silent no-op for now.
      // await apiClient.patch(`/api/orders/items/${orderItemId}/review`, { reviewed: true });
    } catch (error) {
      console.error('Failed to mark item as reviewed', error);
    }
  }
};
