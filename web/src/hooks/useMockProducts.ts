"use client";
import { useState, useEffect } from 'react';
import { mockDB, Product } from '@/lib/mockDB';

export function useMockProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  const load = () => {
    setProducts(mockDB.getProducts());
  };

  useEffect(() => {
    load();
    window.addEventListener('mock_products_changed', load);
    return () => window.removeEventListener('mock_products_changed', load);
  }, []);

  return {
    products,
    updateProductPrice: mockDB.updateProductPrice,
    updateProductStock: mockDB.updateProductStock
  };
}
