export const clip = (value: string | null | undefined, max: number): string | null =>
  value ? value.slice(0, max) : null;

export const slug = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export const padNumber = (value: number, width: number): string => String(value).padStart(width, '0');

export const money = (value: number): number => Math.round(value * 100) / 100;
