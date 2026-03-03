import { useState, useRef, useEffect } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function ProgressCell({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-0.5">
        <input
          ref={inputRef}
          type="range"
          min="0"
          max="100"
          step="5"
          className="w-14 h-3"
          value={draft}
          onChange={e => setDraft(Number(e.target.value))}
          onMouseUp={() => { onChange(draft); setEditing(false); }}
          onBlur={() => { onChange(draft); setEditing(false); }}
        />
        <span className="text-[10px] w-7 text-right">{draft}%</span>
      </div>
    );
  }

  const barColor = value === 100 ? '#6AA84F' : value > 0 ? '#B7D7A8' : '#E5E7EB';

  return (
    <div
      className="cursor-pointer px-1 py-1 hover:bg-blue-50 rounded"
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      <div className="flex items-center gap-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: barColor }} />
        </div>
        <span className="text-[10px] w-7 text-right text-gray-600">{value}%</span>
      </div>
    </div>
  );
}
