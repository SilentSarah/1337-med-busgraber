import { format, parseISO } from 'date-fns';

export function formatDepartureTime(isoTime: string): string {
  try {
    const date = parseISO(isoTime.replace('Z', '+00:00'));
    return format(date, 'HH:mm');
  } catch {
    return '??:??';
  }
}

export function formatDateTime(isoTime: string): string {
  try {
    const date = parseISO(isoTime.replace('Z', '+00:00'));
    return format(date, 'MMM d, HH:mm');
  } catch {
    return 'Unknown date';
  }
}

export function getLocalHour(isoTime: string): number {
  try {
    const date = parseISO(isoTime.replace('Z', '+00:00'));
    return date.getHours();
  } catch {
    return 0;
  }
}

export function getTimeUntilDeparture(isoTime: string): string {
  try {
    const departureDate = parseISO(isoTime.replace('Z', '+00:00'));
    const now = new Date();
    const diffMs = departureDate.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Departed';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  } catch {
    return 'Unknown';
  }
}

export function parseHourFromTime(timeStr: string): number {
  const [hour] = timeStr.split(':').map(Number);
  return hour || 0;
}

export function formatHour(hour: number): string {
  return `${hour}:00`;
}
