import { useEffect, useRef } from 'react';
import type { TaskGroup } from '../../types';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onAddGroup: (group: TaskGroup) => void;
  onDelete: () => void;
  onPromote: () => void;
  onDemote: () => void;
  canPromote: boolean;
  canDemote: boolean;
}

export function ContextMenu({ x, y, onClose, onAddGroup, onDelete, onPromote, onDemote, canPromote, canDemote }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed bg-white border border-gray-300 shadow-lg rounded py-1 z-50 text-xs min-w-[160px]"
      style={{ top: y, left: x }}
    >
      <button className="w-full text-left px-3 py-1.5 hover:bg-blue-50" onClick={() => { onAddGroup('Phase'); onClose(); }}>
        フェーズを追加
      </button>
      <button className="w-full text-left px-3 py-1.5 hover:bg-blue-50" onClick={() => { onAddGroup('Category'); onClose(); }}>
        カテゴリーを追加
      </button>
      <button className="w-full text-left px-3 py-1.5 hover:bg-blue-50" onClick={() => { onAddGroup('Task'); onClose(); }}>
        タスクを追加
      </button>
      <div className="border-t border-gray-200 my-1" />
      <button
        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => { onPromote(); onClose(); }}
        disabled={!canPromote}
      >
        ◀ 階層を上げる
      </button>
      <button
        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => { onDemote(); onClose(); }}
        disabled={!canDemote}
      >
        ▶ 階層を下げる
      </button>
      <div className="border-t border-gray-200 my-1" />
      <button className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600" onClick={() => { onDelete(); onClose(); }}>
        行を削除
      </button>
    </div>
  );
}
