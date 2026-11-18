'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isStaffRoute } from '@/lib/utils/is-staff-route';
import { CartService, CartData, CartItem } from '@/lib/services/cartService';
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
  /** Removes several lines with one toast (the cart page's "Xóa đã chọn"). */
  removeItems: (itemIds: number[]) => Promise<void>;
  // ── Which lines go to checkout ──
  /** Lines that are ticked and can be bought as they are. */
  selectedItems: CartItem[];
  isSelected: (itemId: number) => boolean;
  toggleSelected: (itemId: number) => void;
  setAllSelected: (selected: boolean) => void;
  /** "Mua ngay": tick only the line of this variant (in the cart as it is now). */
  selectOnlyVariant: (variantId: number) => void;
  /** After an order: every remaining line is ticked again. */
  resetSelection: () => void;
}

/** A line can be bought only when stock covers its quantity. */
export const isPurchasable = (item: CartItem) =>
  item.availableQuantity > 0 && item.quantity <= item.availableQuantity;

// The lines the customer UNticked are stored, not the ticked ones: everything is selected by
// default, and a line added later starts ticked without extra work.
const EXCLUDED_KEY = 'cart_excluded_items';

const readExcluded = (): number[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem(EXCLUDED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
};

const writeExcluded = (ids: number[]) => {
  try {
    sessionStorage.setItem(EXCLUDED_KEY, JSON.stringify(ids));
  } catch {
    /* private mode: the selection just won't survive a reload */
  }
};

const CartContext = createContext<CartContextType>({
  cart: null,
  isDrawerOpen: false,
  isLoading: true,
  openDrawer: () => {},
  closeDrawer: () => {},
  fetchCart: async () => {},
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  removeItems: async () => {},
  selectedItems: [],
  isSelected: () => true,
  toggleSelected: () => {},
  setAllSelected: () => {},
  selectOnlyVariant: () => {},
  resetSelection: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const skipCustomerApis = isStaffRoute(pathname);
  const [cart, setCart] = useState<CartData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [excluded, setExcluded] = useState<number[]>(readExcluded);
  // The latest cart, for selectOnlyVariant right after an add (state is not updated yet then).
  const cartRef = useRef<CartData | null>(null);

  const applyCart = (data: CartData) => {
    cartRef.current = data;
    setCart(data);
  };

  const updateExcluded = (next: number[]) => {
    setExcluded(next);
    writeExcluded(next);
  };

  const fetchCart = async () => {
    setIsLoading(prev => (cart === null ? true : prev));
    try {
      const data = await CartService.getCart();
      applyCart(data || { id: 0, items: [], subtotal: 0, totalQuantity: 0 });
    } catch (error) {
      console.warn("Failed to fetch cart:", error);
      applyCart({ id: 0, items: [], subtotal: 0, totalQuantity: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Phan he quan tri khong co gio hang -> bo qua request.
    if (skipCustomerApis) {
      setIsLoading(false);
      return;
    }
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, skipCustomerApis]);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const addToCart = async (variantId: number, quantity: number) => {
    try {
      const newCart = await CartService.addToCart(variantId, quantity);
      applyCart(newCart);
      // Adding a line that had been unticked means the customer wants it again.
      const line = newCart.items.find((i) => i.variantId === variantId);
      if (line && excluded.includes(line.id)) updateExcluded(excluded.filter((id) => id !== line.id));
      toast.success('Đã thêm sản phẩm vào giỏ hàng!');
      openDrawer();
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng');
      throw err;
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    // The "+" button used to be disabled at the stock limit, so clicking it did nothing and
    // the customer never learned why. Explain instead of silently ignoring the click.
    const item = cart?.items?.find((i) => i.id === itemId);
    if (item && quantity > item.quantity && quantity > item.availableQuantity) {
      toast.warning(item.availableQuantity <= 0
        ? 'Phân loại này đã hết hàng'
        : `Chỉ còn ${item.availableQuantity} sản phẩm trong kho`);
      return;
    }
    try {
      const newCart = await CartService.updateQuantity(itemId, quantity);
      applyCart(newCart);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || 'Lỗi cập nhật số lượng');
      } else {
        toast.error('Lỗi cập nhật số lượng');
      }
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      const newCart = await CartService.removeItem(itemId);
      applyCart(newCart);
      toast.success('Đã xóa sản phẩm khỏi giỏ');
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || 'Lỗi xóa sản phẩm');
      } else {
        toast.error('Lỗi xóa sản phẩm');
      }
    }
  };

  const removeItems = async (itemIds: number[]) => {
    if (itemIds.length === 0) return;
    let removed = 0;
    try {
      for (const id of itemIds) {
        applyCart(await CartService.removeItem(id));
        removed++;
      }
      toast.success(`Đã xóa ${removed} sản phẩm khỏi giỏ`);
    } catch (err: unknown) {
      toast.error(err instanceof Error && err.message ? err.message : 'Lỗi xóa sản phẩm');
      if (removed > 0) await fetchCart();
    }
  };

  const items = cart?.items || [];
  const isSelected = (itemId: number) => !excluded.includes(itemId);
  const selectedItems = items.filter((i) => isSelected(i.id) && isPurchasable(i));

  const toggleSelected = (itemId: number) =>
    updateExcluded(isSelected(itemId) ? [...excluded, itemId] : excluded.filter((id) => id !== itemId));

  const setAllSelected = (selected: boolean) =>
    updateExcluded(selected ? [] : items.map((i) => i.id));

  const selectOnlyVariant = (variantId: number) => {
    const current = cartRef.current?.items || items;
    updateExcluded(current.filter((i) => i.variantId !== variantId).map((i) => i.id));
  };

  const resetSelection = () => updateExcluded([]);

  // Forget lines that left the cart, so the stored list does not grow forever.
  useEffect(() => {
    if (!cart) return;
    const ids = new Set(cart.items.map((i) => i.id));
    const kept = excluded.filter((id) => ids.has(id));
    if (kept.length !== excluded.length) Promise.resolve().then(() => updateExcluded(kept));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

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
      removeItem,
      removeItems,
      selectedItems,
      isSelected,
      toggleSelected,
      setAllSelected,
      selectOnlyVariant,
      resetSelection,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
