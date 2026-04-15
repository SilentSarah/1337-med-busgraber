import apiClient from './client';
import { Departure, UpcomingDeparture } from './types';

export async function fetchDepartures(): Promise<Departure[]> {
  const response = await apiClient.get<Departure[]>('/departure/current');
  return response.data;
}

export async function fetchUpcomingDepartures(): Promise<UpcomingDeparture[]> {
  const response = await apiClient.get<UpcomingDeparture[]>('/departure/upcoming');
  return response.data;
}

export async function fetchDepartureTickets(departureId: number): Promise<any[]> {
  const response = await apiClient.get(`/tickets/booked/departure/${departureId}`);
  return response.data;
}
