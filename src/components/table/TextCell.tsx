import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function TextCell({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded outline-none bg-white"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onChange(draft); setEditing(false); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <div
      className="truncate cursor-pointer px-1 py-0.5 text-xs hover:bg-blue-50 rounded min-h-[20px]"
      onClick={() => { setDraft(value); setEditing(true); }}
      title={value}
    >
      {value || '\u00A0'}
    </div>
  );
}
