// API Types for 42 Bus Grabber
// Based on the original Python CLI

export const BASE_URL = 'https://bus-med.1337.ma/api';

export const ROUTES = {
  '1': { name: 'Martil', id: null as number | null },
  '2': { name: 'Tetouan', id: null as number | null },
  '3': { name: 'Mdiq', id: null as number | null },
} as const;

export const BUSES = {
  '1': { name: 'BUS 01', id: 1 },
  '2': { name: 'BUS 02', id: 2 },
  '3': { name: 'BUS 03', id: 3 },
} as const;

export type RouteKey = keyof typeof ROUTES;
export type BusKey = keyof typeof BUSES;
export type Direction = 'home' | 'campus';

export const VALID_ROUTES = ['martil', 'tetouan', 'mdiq'] as const;
export const VALID_BUSES = ['bus 01', 'bus 02', 'bus 03'] as const;
export const VALID_DIRECTIONS: Direction[] = ['home', 'campus'];

// User types
export interface User {
  id: number;
  login: string;
  first_name: string;
  last_name: string;
  image: string | null;
}

export interface AuthResponse {
  user: User;
}

// Bus types
export interface Bus {
  id: number;
  name: string;
  capacity: number;
}

export interface Route {
  id: number;
  name: string;
  bus: Bus;
}

export interface Departure {
  id: number;
  departure_time: string; // ISO 8601
  route: Route;
  tickets: Ticket[];
  nbr_to_home: number;
  nbr_to_campus: number;
  locked: boolean;
}

// Upcoming departure (slightly different structure from current)
export interface UpcomingDeparture {
  id: number;
  departure_time: string; // HH:MM format
  available_time: string; // HH:MM format
  name: string; // route name
  bus: Bus;
  no_return: boolean;
}

// Ticket types
export interface Ticket {
  id: number;
  hash: string;
  position: number;
  to_campus: boolean;
  created_at: string;
  user: User;
  departure?: Departure;
}

export interface BookingRequest {
  departure_id: number;
  to_campus: boolean;
}

export interface BookingResponse {
  id: number;
  hash: string;
  position: number;
  to_campus: boolean;
  user_id: number;
  departure_id: number;
  created_at: string;
  updated_at: string;
}

// Scheduled booking for the auto-booking feature
export interface ScheduledBooking {
  id: string; // local ID
  route: string;
  bus: string;
  hour: number;
  to_campus: boolean;
  booked: boolean;
  ticket_hash?: string;
  error?: string;
}

// Availability status
export type AvailabilityStatus = 'available' | 'limited' | 'full' | 'locked';

export interface DepartureAvailability {
  departure: Departure;
  totalCapacity: number;
  bookedCount: number;
  availableCount: number;
  status: AvailabilityStatus;
}
