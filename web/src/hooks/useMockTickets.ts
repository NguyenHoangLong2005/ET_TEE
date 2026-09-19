"use client";
import { useState, useEffect } from 'react';
import { mockDB, Ticket } from '@/lib/mockDB';

export function useMockTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const load = () => {
    setTickets(mockDB.getTickets());
  };

  useEffect(() => {
    load();
    window.addEventListener('mock_tickets_changed', load);
    return () => window.removeEventListener('mock_tickets_changed', load);
  }, []);

  return {
    tickets,
    updateTicketStatus: mockDB.updateTicketStatus
  };
}
