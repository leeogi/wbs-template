import { useState, useRef, useEffect } from 'react';
import { formatDateShort } from '../../utils/dateUtils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  isOverdue?: boolean;
}

export function DateCell({ value, onChange, isOverdue }: Props) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        className="w-full px-0.5 py-0.5 text-xs border border-blue-400 rounded outline-none bg-white"
        value={value}
        onChange={e => { onChange(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={`w-full truncate cursor-pointer px-1 py-0.5 text-xs text-center rounded min-h-[20px] hover:bg-blue-50 ${isOverdue ? 'bg-red-200 text-red-800 font-bold' : ''}`}
      onClick={() => setEditing(true)}
      title={value}
    >
      {formatDateShort(value) || '\u00A0'}
    </div>
  );
}
