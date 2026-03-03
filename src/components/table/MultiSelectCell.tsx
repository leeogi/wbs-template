import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onDeleteOption?: (name: string) => void;
}

export function MultiSelectCell({ value, options, onChange, onDeleteOption }: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (name: string) => {
    const next = selected.includes(name)
      ? selected.filter(s => s !== name)
      : [...selected, name];
    onChange(next.join(', '));
  };

  const addNew = () => {
    const trimmed = newName.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed].join(', '));
    setNewName('');
    inputRef.current?.focus();
  };

  if (!open) {
    return (
      <div
        className="truncate cursor-pointer px-1 py-0.5 text-xs text-center min-h-[20px] hover:opacity-80 w-full"
        onClick={() => setOpen(true)}
        title={value}
      >
        {value || '\u00A0'}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full">
      <div
        className="truncate px-1 py-0.5 text-xs text-center min-h-[20px] border border-blue-400 rounded bg-white"
      >
        {value || '\u00A0'}
      </div>
      <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[160px] max-h-[240px] overflow-y-auto">
        {options.map(name => (
          <div
            key={name}
            className="group/opt flex items-center hover:bg-blue-50 text-xs"
          >
            <label className="flex items-center gap-1.5 px-2 py-1 cursor-pointer flex-1 min-w-0">
              <input
                type="checkbox"
                checked={selected.includes(name)}
                onChange={() => toggle(name)}
                className="rounded"
              />
              <span className="truncate">{name}</span>
            </label>
            {onDeleteOption && (
              <button
                className="hidden group-hover/opt:flex items-center justify-center w-4 h-4 mr-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded shrink-0 text-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOption(name);
                }}
                title={`${name}を削除`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <div className="border-t border-gray-200 px-2 py-1.5 flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 outline-none focus:border-blue-400"
            placeholder="+ 新しい担当者"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } }}
          />
          <button
            className="text-xs text-blue-600 font-bold hover:text-blue-800 px-1"
            onClick={addNew}
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
