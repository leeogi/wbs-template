import { useState, type RefObject } from 'react';
import type { Task } from '../../types';
import { GROUP_COLORS, STATUS_COLORS, STATUSES, ROW_HEIGHT } from '../../constants';
import { isDelayed } from '../../utils/dateUtils';
import { TextCell } from './TextCell';
import { SelectCell } from './SelectCell';
import { MultiSelectCell } from './MultiSelectCell';
import { DateCell } from './DateCell';
import { LinkCell } from './LinkCell';

interface Props {
  tasks: Task[];
  allTasks: Task[];
  onUpdateTask: (globalIndex: number, updates: Partial<Task>) => void;
  onToggleCollapse: (taskId: string) => void;
  collapsedIds: Set<string>;
  onContextMenu: (e: React.MouseEvent, globalIndex: number) => void;
  onAddBelow: (globalIndex: number) => void;
  onDelete: (globalIndex: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  bodyRef: RefObject<HTMLDivElement | null>;
  allOwners: string[];
  onDeleteOwner: (name: string) => void;
  onPromote: (globalIndex: number) => void;
  onDemote: (globalIndex: number) => void;
}

function getTaskDisplayTitle(task: Task): string {
  if (task.group === 'Phase') return task.category;
  if (task.group === 'Category') return task.epic;
  return task.title;
}

function getIndent(group: string): number {
  switch (group) {
    case 'Phase': return 0;
    case 'Category': return 12;
    case 'Epic': return 24;
    case 'Task': return 36;
    case 'Milestone': return 0;
    default: return 0;
  }
}

const GROUP_HIERARCHY = ['Phase', 'Category', 'Epic', 'Task'];

export function WbsTable({ tasks, allTasks, onUpdateTask, onToggleCollapse, collapsedIds, onContextMenu, onAddBelow, onDelete, onReorder, bodyRef, allOwners, onDeleteOwner, onPromote, onDemote }: Props) {
  const getGlobalIndex = (task: Task): number => {
    return allTasks.indexOf(task);
  };

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex bg-[#4285F4] text-white text-xs font-bold border-b border-gray-300 shrink-0" style={{ minHeight: ROW_HEIGHT }}>
        <div className="flex-1 min-w-[200px] px-1 flex items-center border-r border-blue-300">タスク名</div>
        <div className="w-[80px] px-1 flex items-center justify-center border-r border-blue-300">担当者</div>
        <div className="w-[70px] px-1 flex items-center justify-center border-r border-blue-300">ステータス</div>
        <div className="w-[40px] px-1 flex items-center justify-center border-r border-blue-300">資料</div>
        <div className="w-[60px] px-1 flex items-center justify-center border-r border-blue-300">開始</div>
        <div className="w-[60px] px-1 flex items-center justify-center">終了</div>
      </div>

      {/* Body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {tasks.map((task) => {
          const gi = getGlobalIndex(task);
          const gc = GROUP_COLORS[task.group] || GROUP_COLORS.Task;
          const delayed = isDelayed(task.planEnd, task.status);
          const taskKey = task.id || `${task.group}-${task.category}-${task.epic}`;
          const isCollapsible = task.group === 'Phase' || task.group === 'Category';
          const isCollapsed = collapsedIds.has(taskKey);

          return (
            <div
              key={`${gi}-${task.id}`}
              className={`group flex border-b border-gray-200 hover:brightness-95 transition-colors ${delayed ? 'border-l-3 border-l-red-500' : ''} ${dragOver === gi ? 'border-t-2 border-t-blue-500' : ''}`}
              style={{
                height: ROW_HEIGHT,
                backgroundColor: gc.bg,
                color: gc.text,
                fontWeight: gc.bold ? 600 : 400,
                opacity: dragFrom === gi ? 0.4 : 1,
              }}
              draggable
              onDragStart={(e) => {
                setDragFrom(gi);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragFrom !== null && gi !== dragFrom) setDragOver(gi);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null && dragFrom !== gi) onReorder(dragFrom, gi);
                setDragFrom(null);
                setDragOver(null);
              }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
              onContextMenu={e => onContextMenu(e, gi)}
            >
              {/* Title + Actions */}
              <div className="flex-1 min-w-[200px] flex items-center border-r border-gray-200 overflow-hidden">
                <div style={{ paddingLeft: getIndent(task.group) }} className="flex items-center w-full gap-1">
                  {isCollapsible && (
                    <button
                      className="text-[10px] w-4 h-4 flex items-center justify-center hover:bg-black/10 rounded shrink-0"
                      onClick={() => onToggleCollapse(taskKey)}
                    >
                      {isCollapsed ? '▶' : '▼'}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <TextCell
                      value={getTaskDisplayTitle(task)}
                      onChange={val => {
                        if (task.group === 'Phase') onUpdateTask(gi, { category: val });
                        else if (task.group === 'Category') onUpdateTask(gi, { epic: val });
                        else onUpdateTask(gi, { title: val });
                      }}
                    />
                  </div>
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 pr-1">
                    {task.group !== 'Milestone' && GROUP_HIERARCHY.indexOf(task.group) > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onPromote(gi); }}
                        className="w-4 h-4 rounded hover:bg-purple-200 text-purple-600 flex items-center justify-center text-[9px] leading-none"
                        title="階層を上げる"
                      >
                        ◀
                      </button>
                    )}
                    {task.group !== 'Milestone' && GROUP_HIERARCHY.indexOf(task.group) < GROUP_HIERARCHY.length - 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDemote(gi); }}
                        className="w-4 h-4 rounded hover:bg-purple-200 text-purple-600 flex items-center justify-center text-[9px] leading-none"
                        title="階層を下げる"
                      >
                        ▶
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddBelow(gi); }}
                      className="w-4 h-4 rounded hover:bg-blue-200 text-blue-600 flex items-center justify-center text-[11px] font-bold leading-none"
                      title="下に行を追加"
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(gi); }}
                      className="w-4 h-4 rounded hover:bg-red-200 text-red-500 flex items-center justify-center text-[11px] leading-none"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              {/* Owner */}
              <div className="w-[80px] border-r border-gray-200 flex items-center shrink-0">
                <MultiSelectCell
                  value={task.owner}
                  options={allOwners}
                  onChange={val => onUpdateTask(gi, { owner: val })}
                  onDeleteOption={onDeleteOwner}
                />
              </div>

              {/* Status */}
              <div className="w-[70px] border-r border-gray-200 flex items-center shrink-0">
                <SelectCell
                  value={task.status}
                  options={STATUSES}
                  onChange={val => onUpdateTask(gi, { status: val as Task['status'] })}
                  colorMap={STATUS_COLORS}
                />
              </div>

              {/* Link */}
              <div className="w-[40px] border-r border-gray-200 flex items-center shrink-0">
                <LinkCell
                  value={task.link || ''}
                  onChange={val => onUpdateTask(gi, { link: val })}
                />
              </div>

              {/* Plan Start */}
              <div className="w-[60px] border-r border-gray-200 flex items-center shrink-0">
                <DateCell
                  value={task.planStart}
                  onChange={val => onUpdateTask(gi, { planStart: val })}
                />
              </div>

              {/* Plan End */}
              <div className="w-[60px] flex items-center shrink-0">
                <DateCell
                  value={task.planEnd}
                  onChange={val => onUpdateTask(gi, { planEnd: val })}
                  isOverdue={delayed}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
