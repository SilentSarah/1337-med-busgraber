import apiClient from './client';
import { fetchDepartures, fetchDepartureTickets } from './departures';
import { BookingResponse, Ticket } from './types';
import { useAuthStore } from '../stores/authStore';

export async function bookTicket(departureId: number, toCampus: boolean): Promise<BookingResponse> {
  const response = await apiClient.post<BookingResponse>('/tickets/book', {
    departure_id: departureId,
    to_campus: toCampus,
  });
  return response.data;
}

export async function cancelTicket(ticketId: number): Promise<any> {
  const response = await apiClient.patch(`/tickets/${ticketId}/cancel`);
  return response.data;
}

export async function fetchMyTickets(login: string): Promise<Ticket[]> {
  const departures = await fetchDepartures();
  const ticketsById = new Map<number, Ticket>();

  for (const departure of departures) {
    try {
      if (departure.tickets && Array.isArray(departure.tickets)) {
        for (const rawTicket of departure.tickets) {
          const raw = rawTicket as Record<string, any>;
          const ticket = {
            ...rawTicket,
            hash: raw.hash || raw.ticket_hash || raw.hashCode || null,
          } as Ticket;
          if (ticket.user?.login?.toLowerCase() === login.toLowerCase()) {
            const existing = ticketsById.get(ticket.id);
            if (!existing || (!existing.hash && ticket.hash)) {
              ticketsById.set(ticket.id, { ...ticket, departure });
            }
          }
        }
      }

      const tickets = await fetchDepartureTickets(departure.id);

      for (const rawTicket of tickets) {
        const raw = rawTicket as Record<string, any>;
        const ticket = {
          ...rawTicket,
          hash: raw.hash || raw.ticket_hash || raw.hashCode || null,
        } as Ticket;

        if (ticket.user?.login?.toLowerCase() === login.toLowerCase()) {
          const existing = ticketsById.get(ticket.id);
          if (!existing) {
            ticketsById.set(ticket.id, { ...ticket, departure });
          } else {
            if (ticket.hash && !existing.hash) {
              existing.hash = ticket.hash;
            } else if (ticket.hash && ticket.hash.length > (existing.hash?.length || 0)) {
              existing.hash = ticket.hash;
            }
          }
        }
      }
    } catch (e) {
      // Continue to next departure if one fails
    }
  }

  return Array.from(ticketsById.values());
}
