export const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const endOfDay = (value: unknown): Date | null => {
  const d = toDate(value);
  if (!d) return null;
  // A plain calendar date (YYYY-MM-DD) means "the whole day" for an end-of-range filter
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  return d;
};

export const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 86_400_000);

export const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60_000);

export const hoursBetween = (a: Date, b: Date): number => (b.getTime() - a.getTime()) / 3_600_000;

export const thaiDate = (value: Date | string | null | undefined, era: 'buddhist' | 'christian' = 'buddhist'): string => {
  const d = toDate(value);
  if (!d) return '';
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const year = era === 'buddhist' ? d.getFullYear() + 543 : d.getFullYear();
  return `${d.getDate()} ${months[d.getMonth()]} ${year}`;
};

export const formatDateTime = (value: Date | string | null | undefined): string => {
  const d = toDate(value);
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDuration = (from: Date | string | null, to: Date | string | null): string => {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return '';
  const minutes = Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return days > 0 ? `${days} วัน ${hours} ชม. ${mins} นาที` : `${hours} ชม. ${mins} นาที`;
};
