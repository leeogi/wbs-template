import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

function isUrl(str: string): boolean {
  return /^https?:\/\/.+/.test(str.trim());
}

export function LinkCell({ value, onChange }: Props) {
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
        placeholder="URLを貼り付け"
      />
    );
  }

  if (value && isUrl(value)) {
    return (
      <div className="flex items-center w-full px-1 py-0.5 text-xs min-h-[20px] gap-0.5">
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline truncate"
          title={value}
          onClick={e => e.stopPropagation()}
        >
          🔗
        </a>
        <button
          className="text-[9px] text-gray-400 hover:text-red-500 shrink-0 leading-none"
          onClick={() => { setDraft(''); onChange(''); }}
          title="リンクを削除"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      className="truncate cursor-pointer px-1 py-0.5 text-xs hover:bg-blue-50 rounded min-h-[20px] w-full text-center"
      onClick={() => { setDraft(value); setEditing(true); }}
      title={value || 'クリックしてリンクを追加'}
    >
      {value || '\u00A0'}
    </div>
  );
}
