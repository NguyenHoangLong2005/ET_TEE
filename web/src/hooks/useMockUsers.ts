"use client";
import { useState, useEffect } from 'react';
import { mockDB, User } from '@/lib/mockDB';

export function useMockUsers() {
  const [users, setUsers] = useState<User[]>([]);

  const load = () => {
    setUsers(mockDB.getUsers());
  };

  useEffect(() => {
    load();
    window.addEventListener('mock_users_changed', load);
    return () => window.removeEventListener('mock_users_changed', load);
  }, []);

  return {
    users,
    addUser: mockDB.addUser,
    updateUserStatus: mockDB.updateUserStatus
  };
}
