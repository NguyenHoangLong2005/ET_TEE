"use client";
import { useState, useEffect } from 'react';
import { mockDB, Order } from '@/lib/mockDB';

export function useMockOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = () => {
    setOrders(mockDB.getOrders());
  };

  useEffect(() => {
    load();
    window.addEventListener('mock_orders_changed', load);
    return () => window.removeEventListener('mock_orders_changed', load);
  }, []);

  return {
    orders,
    updateOrderStatus: mockDB.updateOrderStatus
  };
}
