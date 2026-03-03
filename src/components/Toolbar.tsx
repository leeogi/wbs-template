import { useState, useRef, useEffect } from 'react';
import type { Status } from '../types';
import { STATUSES } from '../constants';

interface Props {
  ownerFilter: string;
  statusFilter: Status | '';
  delayedOnly: boolean;
  onOwnerChange: (owner: string) => void;
  onStatusChange: (status: Status | '') => void;
  onDelayedChange: (delayed: boolean) => void;
  onAddTask: () => void;
  onAddPhase: () => void;
  onAddCategory: () => void;
  onExport: () => void;
  onImport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  ganttStart: string;
  ganttEnd: string;
  onGanttStartChange: (date: string) => void;
  onGanttEndChange: (date: string) => void;
  allOwners: string[];
  lastUpdated: string | null;
}

export function Toolbar({
  ownerFilter, statusFilter, delayedOnly,
  onOwnerChange, onStatusChange, onDelayedChange,
  onAddTask, onAddPhase, onAddCategory, onExport, onImport,
  canUndo, canRedo, onUndo, onRedo,
  ganttStart, ganttEnd, onGanttStartChange, onGanttEndChange,
  allOwners, lastUpdated,
}: Props) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addMenuOpen]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white border-b border-gray-300 text-xs shrink-0 flex-wrap">
      <div className="font-bold text-sm text-blue-700">{(import.meta.env.VITE_APP_TITLE as string) || 'WBS'}</div>

      <div className="h-4 w-px bg-gray-300" />

      {/* Filters */}
      <div className="flex items-center gap-1">
        <label className="text-gray-500">担当者:</label>
        <select
          className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
          value={ownerFilter}
          onChange={e => onOwnerChange(e.target.value)}
        >
          <option value="">全員</option>
          {allOwners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <label className="text-gray-500">ステータス:</label>
        <select
          className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
          value={statusFilter}
          onChange={e => onStatusChange(e.target.value as Status | '')}
        >
          <option value="">全て</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={delayedOnly}
          onChange={e => onDelayedChange(e.target.checked)}
          className="rounded"
        />
        <span className="text-red-600">遅延のみ</span>
      </label>

      <div className="h-4 w-px bg-gray-300" />

      {/* Gantt period */}
      <div className="flex items-center gap-1">
        <label className="text-gray-500">期間:</label>
        <input
          type="date"
          className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
          value={ganttStart}
          onChange={e => onGanttStartChange(e.target.value)}
        />
        <span className="text-gray-400">〜</span>
        <input
          type="date"
          className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white"
          value={ganttEnd}
          onChange={e => onGanttEndChange(e.target.value)}
        />
      </div>

      <div className="h-4 w-px bg-gray-300" />

      {/* Actions */}
      <button
        className="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={onUndo}
        disabled={!canUndo}
        title="元に戻す (⌘Z)"
      >
        ↩
      </button>
      <button
        className="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={onRedo}
        disabled={!canRedo}
        title="やり直す (⌘⇧Z)"
      >
        ↪
      </button>

      <div className="h-4 w-px bg-gray-300" />

      {/* Add Row Dropdown */}
      <div ref={addMenuRef} className="relative">
        <div className="flex">
          <button
            className="px-2 py-1 bg-blue-600 text-white rounded-l hover:bg-blue-700 transition-colors"
            onClick={onAddTask}
            title="タスクを追加"
          >
            + 行追加
          </button>
          <button
            className="px-1 py-1 bg-blue-600 text-white rounded-r border-l border-blue-500 hover:bg-blue-700 transition-colors"
            onClick={() => setAddMenuOpen(!addMenuOpen)}
          >
            ▾
          </button>
        </div>
        {addMenuOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 shadow-lg rounded py-1 z-50 min-w-[140px]">
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
              onClick={() => { onAddPhase(); setAddMenuOpen(false); }}
            >
              フェーズを追加
            </button>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
              onClick={() => { onAddCategory(); setAddMenuOpen(false); }}
            >
              カテゴリーを追加
            </button>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
              onClick={() => { onAddTask(); setAddMenuOpen(false); }}
            >
              タスクを追加
            </button>
          </div>
        )}
      </div>

      <button
        className="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
        onClick={onExport}
      >
        JSON出力
      </button>

      <button
        className="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
        onClick={onImport}
      >
        JSONインポート
      </button>

      {lastUpdated && (
        <>
          <div className="ml-auto" />
          <span className="text-gray-400 whitespace-nowrap" title={lastUpdated}>
            最終更新: {new Date(lastUpdated).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </>
      )}
    </div>
  );
}
