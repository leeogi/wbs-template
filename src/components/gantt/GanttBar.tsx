import type { Task } from '../../types';
import { GANTT_BAR_COLORS } from '../../constants';
import { isDelayed } from '../../utils/dateUtils';

interface Props {
  task: Task;
  left: number;
  width: number;
}

export function GanttBar({ task, left, width }: Props) {
  let color = GANTT_BAR_COLORS.PLANNED;
  if (task.status === '完了') color = GANTT_BAR_COLORS.ACTUAL;
  else if (isDelayed(task.planEnd, task.status)) color = GANTT_BAR_COLORS.OVERDUE;

  return (
    <div
      className="absolute top-1.5 rounded-sm shadow-sm"
      style={{
        left,
        width: Math.max(width, 4),
        height: 20,
        backgroundColor: color,
        opacity: 0.9,
      }}
      title={`${task.title || task.epic || task.category} (${task.planStart} ~ ${task.planEnd})`}
    >
      {width > 40 && task.progress > 0 && (
        <div
          className="h-full rounded-sm"
          style={{
            width: `${task.progress}%`,
            backgroundColor: task.status === '完了' ? GANTT_BAR_COLORS.ACTUAL : '#8FBC8F',
            opacity: 0.7,
          }}
        />
      )}
    </div>
  );
}
