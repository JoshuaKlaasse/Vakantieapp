import { MONTHS_SHORT, MONTHS_LONG } from '../constants';

export function formatShort(date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatLong(date) {
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function defaultSchoolYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

export function getCountdownInfo(holidays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const h of holidays) {
    const start = new Date(h.start); start.setHours(0, 0, 0, 0);
    const end = new Date(h.end); end.setHours(0, 0, 0, 0);
    const dayAfter = new Date(end); dayAfter.setDate(dayAfter.getDate() + 1);

    if (today >= start && today < dayAfter) {
      return { holiday: h, daysUntil: 0, daysLeft: daysBetween(today, dayAfter), isActive: true };
    }
    if (start > today) {
      return { holiday: h, daysUntil: daysBetween(today, start), daysLeft: 0, isActive: false };
    }
  }
  return null;
}

export function getHolidayStatus(holiday) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(holiday.start); start.setHours(0, 0, 0, 0);
  const end = new Date(holiday.end); end.setHours(0, 0, 0, 0);
  const dayAfter = new Date(end); dayAfter.setDate(dayAfter.getDate() + 1);

  if (today < start) return 'upcoming';
  if (today < dayAfter) return 'active';
  return 'past';
}
