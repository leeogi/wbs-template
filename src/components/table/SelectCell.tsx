import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  colorMap?: Record<string, string>;
  allowFreeText?: boolean;
}

export function SelectCell({ value, options, onChange, colorMap, allowFreeText }: Props) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const bgColor = colorMap?.[value];

  if (editing) {
    return (
      <select
        ref={selectRef}
        className="w-full px-0.5 py-0.5 text-xs border border-blue-400 rounded outline-none bg-white"
        value={value}
        onChange={e => { onChange(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
      >
        <option value="">-</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        {allowFreeText && value && !options.includes(value) && (
          <option value={value}>{value}</option>
        )}
      </select>
    );
  }

  return (
    <div
      className="truncate cursor-pointer px-1 py-0.5 text-xs text-center rounded min-h-[20px] hover:opacity-80"
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      onClick={() => setEditing(true)}
      title={value}
    >
      {value || '\u00A0'}
    </div>
  );
}
