import { useState, useMemo, useCallback } from 'react';
import { generateDays, getTotalDays, getTodayOffset } from '../utils/dateUtils';
import { DAY_WIDTH } from '../constants';

export function useGanttConfig() {
  const [ganttStart, setGanttStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const [ganttEnd, setGanttEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });

  const days = useMemo(() => generateDays(ganttStart, ganttEnd), [ganttStart, ganttEnd]);
  const totalDays = useMemo(() => getTotalDays(ganttStart, ganttEnd), [ganttStart, ganttEnd]);
  const totalWidth = totalDays * DAY_WIDTH;
  const todayOffset = useMemo(() => getTodayOffset(ganttStart), [ganttStart]);

  const ganttStartStr = useMemo(() => {
    const y = ganttStart.getFullYear();
    const m = String(ganttStart.getMonth() + 1).padStart(2, '0');
    const d = String(ganttStart.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [ganttStart]);

  const ganttEndStr = useMemo(() => {
    const y = ganttEnd.getFullYear();
    const m = String(ganttEnd.getMonth() + 1).padStart(2, '0');
    const d = String(ganttEnd.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [ganttEnd]);

  const setGanttStartStr = useCallback((s: string) => {
    if (s) setGanttStart(new Date(s + 'T00:00:00'));
  }, []);

  const setGanttEndStr = useCallback((s: string) => {
    if (s) setGanttEnd(new Date(s + 'T00:00:00'));
  }, []);

  return {
    days, totalDays, totalWidth, todayOffset, dayWidth: DAY_WIDTH,
    ganttStart, ganttEnd,
    ganttStartStr, ganttEndStr,
    setGanttStartStr, setGanttEndStr,
  };
}
