import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskStore } from './hooks/useTaskStore';
import { useFilters } from './hooks/useFilters';
import { useGanttConfig } from './hooks/useGanttConfig';
import { Toolbar } from './components/Toolbar';
import { WbsTable } from './components/table/WbsTable';
import { GanttChart } from './components/gantt/GanttChart';
import { ContextMenu } from './components/shared/ContextMenu';
import { PasswordGate } from './components/PasswordGate';
import type { Task } from './types';

function App() {
  const { tasks, loading, canUndo, canRedo, allOwners, lastUpdated, updateTask, addTask, addTaskBelow, deleteTask, reorderTask, importTasks, undo, redo, removeOwner, promoteTask, demoteTask } = useTaskStore();
  const { filters, visibleTasks, toggleCollapse, setOwnerFilter, setStatusFilter, setDelayedOnly } = useFilters(tasks);
  const { days, totalWidth, todayOffset, ganttStart, ganttEnd, ganttStartStr, ganttEndStr, setGanttStartStr, setGanttEndStr } = useGanttConfig();

  // Set document title from env
  useEffect(() => {
    const title = (import.meta.env.VITE_APP_TITLE as string) || 'WBS';
    document.title = title;
  }, []);

  const tableBodyRef = useRef<HTMLDivElement>(null);
  const ganttBodyRef = useRef<HTMLDivElement>(null);

  // Scroll sync
  const isSyncing = useRef(false);
  const scrollCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const trySetup = () => {
      const tableEl = tableBodyRef.current;
      const ganttEl = ganttBodyRef.current;
      if (!tableEl || !ganttEl) {
        if (!cancelled) requestAnimationFrame(trySetup);
        return;
      }

      const syncTable = () => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        ganttEl.scrollTop = tableEl.scrollTop;
        requestAnimationFrame(() => { isSyncing.current = false; });
      };

      const syncGantt = () => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        tableEl.scrollTop = ganttEl.scrollTop;
        requestAnimationFrame(() => { isSyncing.current = false; });
      };

      tableEl.addEventListener('scroll', syncTable);
      ganttEl.addEventListener('scroll', syncGantt);
      scrollCleanup.current = () => {
        tableEl.removeEventListener('scroll', syncTable);
        ganttEl.removeEventListener('scroll', syncGantt);
      };
    };

    trySetup();
    return () => {
      cancelled = true;
      scrollCleanup.current?.();
    };
  }, []);

  // Split pane
  const [splitRatio, setSplitRatio] = useState(0.45);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const onDividerMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, index });
  }, []);

  // Export JSON
  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wbs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tasks]);

  // Import JSON
  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as Task[];
          if (Array.isArray(parsed) && parsed.length > 0 && 'group' in parsed[0]) {
            if (confirm(`${parsed.length}件のタスクをインポートしますか？既存データは上書きされます。`)) {
              importTasks(parsed);
            }
          } else {
            alert('無効なJSONファイルです。');
          }
        } catch {
          alert('JSONの解析に失敗しました。');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importTasks]);

  const handleAddTask = useCallback(() => {
    addTask(tasks.length - 1, 'Task');
  }, [addTask, tasks.length]);

  const handleAddPhase = useCallback(() => {
    addTask(tasks.length - 1, 'Phase');
  }, [addTask, tasks.length]);

  const handleAddCategory = useCallback(() => {
    addTask(tasks.length - 1, 'Category');
  }, [addTask, tasks.length]);

  if (loading) {
    return (
      <PasswordGate>
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-gray-500 text-sm">読み込み中...</div>
        </div>
      </PasswordGate>
    );
  }

  return (
    <PasswordGate>
    <div className="h-full p-3 bg-gray-100">
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <Toolbar
        ownerFilter={filters.owner}
        statusFilter={filters.status}
        delayedOnly={filters.delayedOnly}
        onOwnerChange={setOwnerFilter}
        onStatusChange={setStatusFilter}
        onDelayedChange={setDelayedOnly}
        onAddTask={handleAddTask}
        onAddPhase={handleAddPhase}
        onAddCategory={handleAddCategory}
        onExport={handleExportJSON}
        onImport={handleImportJSON}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        ganttStart={ganttStartStr}
        ganttEnd={ganttEndStr}
        onGanttStartChange={setGanttStartStr}
        onGanttEndChange={setGanttEndStr}
        allOwners={allOwners}
        lastUpdated={lastUpdated}
      />

      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* Left: WBS Table */}
        <div style={{ width: `${splitRatio * 100}%` }} className="flex flex-col min-w-0">
          <WbsTable
            tasks={visibleTasks}
            allTasks={tasks}
            onUpdateTask={updateTask}
            onToggleCollapse={toggleCollapse}
            collapsedIds={filters.collapsedIds}
            onContextMenu={handleContextMenu}
            onAddBelow={addTaskBelow}
            onDelete={deleteTask}
            onReorder={reorderTask}
            bodyRef={tableBodyRef}
            allOwners={allOwners}
            onDeleteOwner={removeOwner}
            onPromote={promoteTask}
            onDemote={demoteTask}
          />
        </div>

        {/* Divider */}
        <div
          className="w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize shrink-0 transition-colors"
          onMouseDown={onDividerMouseDown}
        />

        {/* Right: Gantt Chart */}
        <div style={{ width: `${(1 - splitRatio) * 100}%` }} className="flex flex-col min-w-0">
          <GanttChart
            tasks={visibleTasks}
            days={days}
            totalWidth={totalWidth}
            todayOffset={todayOffset}
            bodyRef={ganttBodyRef}
            ganttStart={ganttStart}
            ganttEnd={ganttEnd}
          />
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && (() => {
        const ctxTask = tasks[ctxMenu.index];
        const GROUP_HIERARCHY = ['Phase', 'Category', 'Epic', 'Task'];
        const groupIdx = ctxTask ? GROUP_HIERARCHY.indexOf(ctxTask.group) : -1;
        return (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            onClose={() => setCtxMenu(null)}
            onAddGroup={(group) => addTask(ctxMenu.index, group)}
            onDelete={() => deleteTask(ctxMenu.index)}
            onPromote={() => promoteTask(ctxMenu.index)}
            onDemote={() => demoteTask(ctxMenu.index)}
            canPromote={groupIdx > 0}
            canDemote={groupIdx >= 0 && groupIdx < GROUP_HIERARCHY.length - 1}
          />
        );
      })()}
    </div>
    </div>
    </PasswordGate>
  );
}

export default App;
