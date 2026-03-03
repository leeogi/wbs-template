import { differenceInCalendarDays, parseISO, format, isWeekend, isSameDay, addDays, isPast } from 'date-fns';
import { DAY_WIDTH } from '../constants';

export function getTotalDays(ganttStart: Date, ganttEnd: Date): number {
  return differenceInCalendarDays(ganttEnd, ganttStart) + 1;
}

export interface DayInfo {
  index: number;
  date: Date;
  isWeekend: boolean;
  isToday: boolean;
  label: string;
  monthLabel: string;
  weekIndex: number;
}

export function generateDays(ganttStart: Date, ganttEnd: Date): DayInfo[] {
  const total = getTotalDays(ganttStart, ganttEnd);
  const today = new Date();
  return Array.from({ length: total }, (_, i) => {
    const date = addDays(ganttStart, i);
    return {
      index: i,
      date,
      isWeekend: isWeekend(date),
      isToday: isSameDay(date, today),
      label: format(date, 'M/d'),
      monthLabel: format(date, 'M月'),
      weekIndex: Math.floor(i / 7),
    };
  });
}

export function getBarPosition(planStart: string, planEnd: string, ganttStart?: Date, ganttEnd?: Date): { left: number; width: number } | null {
  if (!planStart && !planEnd) return null;

  const now = new Date();
  const gStart = ganttStart || new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);
  const total = ganttEnd ? getTotalDays(gStart, ganttEnd) : getTotalDays(gStart, defaultEnd);

  const start = planStart ? parseISO(planStart) : null;
  const end = planEnd ? parseISO(planEnd) : null;

  if (start && end) {
    const startCol = Math.max(0, differenceInCalendarDays(start, gStart));
    const endCol = Math.min(total - 1, differenceInCalendarDays(end, gStart));
    if (endCol < 0 || startCol >= total) return null;
    return {
      left: startCol * DAY_WIDTH,
      width: Math.max(DAY_WIDTH, (endCol - startCol + 1) * DAY_WIDTH),
    };
  }

  if (end && !start) {
    const endCol = differenceInCalendarDays(end, gStart);
    if (endCol < 0 || endCol >= total) return null;
    return { left: endCol * DAY_WIDTH, width: DAY_WIDTH };
  }

  if (start && !end) {
    const startCol = differenceInCalendarDays(start, gStart);
    if (startCol < 0 || startCol >= total) return null;
    return { left: startCol * DAY_WIDTH, width: DAY_WIDTH };
  }

  return null;
}

export function getTodayOffset(ganttStart: Date): number {
  return differenceInCalendarDays(new Date(), ganttStart);
}

export function isDelayed(planEnd: string, status: string): boolean {
  if (!planEnd || planEnd === '継続' || status === '完了') return false;
  try {
    return isPast(parseISO(planEnd));
  } catch {
    return false;
  }
}

export function parseShortDate(str: string): string {
  if (!str || str === '継続') return '';
  const match = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const m = match[1].padStart(2, '0');
    const d = match[2].padStart(2, '0');
    return `${new Date().getFullYear()}-${m}-${d}`;
  }
  return str;
}

export function formatDateShort(iso: string): string {
  if (!iso) return '';
  try {
    const d = parseISO(iso);
    return format(d, 'M/d');
  } catch {
    return iso;
  }
}
