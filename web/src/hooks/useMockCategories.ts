"use client";
import { useState, useEffect } from 'react';
import { mockDB, Category } from '@/lib/mockDB';

export function useMockCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  const load = () => {
    setCategories(mockDB.getCategories());
  };

  useEffect(() => {
    load();
    window.addEventListener('mock_categories_changed', load);
    return () => window.removeEventListener('mock_categories_changed', load);
  }, []);

  const addCategory = (name: string, slug: string) => {
    const current = mockDB.getCategories();
    const newCategory: Category = { id: `CAT-${Date.now()}`, name, slug, status: 'ACTIVE' };
    mockDB.saveCategories([...current, newCategory]);
  };

  return {
    categories,
    addCategory
  };
}
