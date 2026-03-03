import { type RefObject, useRef, useEffect } from 'react';
import type { Task } from '../../types';
import type { DayInfo } from '../../utils/dateUtils';
import { getBarPosition } from '../../utils/dateUtils';
import { GROUP_COLORS, ROW_HEIGHT, DAY_WIDTH } from '../../constants';
import { GanttBar } from './GanttBar';

interface Props {
  tasks: Task[];
  days: DayInfo[];
  totalWidth: number;
  todayOffset: number;
  bodyRef: RefObject<HTMLDivElement | null>;
  ganttStart: Date;
  ganttEnd: Date;
}

export function GanttChart({ tasks, days, totalWidth, todayOffset, bodyRef, ganttStart, ganttEnd }: Props) {
  const headerRef = useRef<HTMLDivElement>(null);

  // Sync header horizontal scroll with body
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const onScroll = () => {
      if (headerRef.current) {
        headerRef.current.scrollLeft = body.scrollLeft;
      }
    };

    body.addEventListener('scroll', onScroll);
    return () => body.removeEventListener('scroll', onScroll);
  }, [bodyRef]);

  // Group days by month for header
  const months: { label: string; startIndex: number; count: number }[] = [];
  let currentMonth = '';
  for (const day of days) {
    if (day.monthLabel !== currentMonth) {
      currentMonth = day.monthLabel;
      months.push({ label: currentMonth, startIndex: day.index, count: 1 });
    } else {
      months[months.length - 1].count++;
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - synced with body scroll */}
      <div ref={headerRef} className="shrink-0 border-b border-gray-300 overflow-hidden" style={{ minHeight: ROW_HEIGHT }}>
        {/* Month row */}
        <div className="flex" style={{ width: totalWidth, height: ROW_HEIGHT / 2 }}>
          {months.map(m => (
            <div
              key={m.label}
              className="text-[10px] font-bold text-center bg-blue-100 border-r border-blue-200 flex items-center justify-center"
              style={{ width: m.count * DAY_WIDTH }}
            >
              {m.label}
            </div>
          ))}
        </div>
        {/* Day row */}
        <div className="flex" style={{ width: totalWidth, height: ROW_HEIGHT / 2 }}>
          {days.map(day => (
            <div
              key={day.index}
              className={`text-[7px] text-center border-r border-gray-200 flex items-center justify-center ${day.isWeekend ? 'bg-gray-200' : 'bg-gray-50'} ${day.isToday ? '!bg-yellow-200 font-bold' : ''}`}
              style={{ width: DAY_WIDTH }}
            >
              {day.date.getDate() === 1 || day.index === 0 || day.date.getDay() === 1 ? day.label : day.date.getDate()}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div ref={bodyRef} className="flex-1 overflow-auto">
        <div style={{ width: totalWidth, position: 'relative' }}>
          {/* Weekend backgrounds */}
          {days.filter(d => d.isWeekend).map(d => (
            <div
              key={`bg-${d.index}`}
              className="absolute top-0 bg-gray-100"
              style={{ left: d.index * DAY_WIDTH, width: DAY_WIDTH, height: tasks.length * ROW_HEIGHT }}
            />
          ))}

          {/* Today line */}
          {todayOffset >= 0 && todayOffset < days.length && (
            <div
              className="absolute top-0 bg-yellow-400 z-10"
              style={{
                left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 - 1,
                width: 2,
                height: tasks.length * ROW_HEIGHT,
              }}
            />
          )}

          {/* Task rows */}
          {tasks.map((task, idx) => {
            const gc = GROUP_COLORS[task.group] || GROUP_COLORS.Task;
            const bar = getBarPosition(task.planStart, task.planEnd, ganttStart, ganttEnd);

            return (
              <div
                key={`${idx}-${task.id}`}
                className="relative border-b border-gray-200"
                style={{
                  height: ROW_HEIGHT,
                  backgroundColor: task.group === 'Phase' ? gc.bg : undefined,
                }}
              >
                {bar && <GanttBar task={task} left={bar.left} width={bar.width} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
