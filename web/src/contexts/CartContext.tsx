'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartService, CartData } from '@/lib/services/cartService';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface CartContextType {
  cart: CartData | null;
  isDrawerOpen: boolean;
  isLoading: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  fetchCart: () => Promise<void>;
  addToCart: (variantId: number, quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  cart: null,
  isDrawerOpen: false,
  isLoading: true,
  openDrawer: () => {},
  closeDrawer: () => {},
  fetchCart: async () => {},
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {}
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCart = async () => {
    setIsLoading(true);
    try {
      const data = await CartService.getCart();
      setCart(data || { id: 0, items: [], subtotal: 0, totalQuantity: 0 });
    } catch (error) {
      console.warn("Failed to fetch cart:", error);
      setCart({ id: 0, items: [], subtotal: 0, totalQuantity: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const addToCart = async (variantId: number, quantity: number) => {
    const newCart = await CartService.addToCart(variantId, quantity);
    setCart(newCart);
    openDrawer();
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      const newCart = await CartService.updateQuantity(itemId, quantity);
      setCart(newCart);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật số lượng');
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      const newCart = await CartService.removeItem(itemId);
      setCart(newCart);
      toast.success('Đã xóa sản phẩm khỏi giỏ');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa sản phẩm');
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      isDrawerOpen,
      isLoading,
      openDrawer,
      closeDrawer,
      fetchCart,
      addToCart,
      updateQuantity,
      removeItem
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
