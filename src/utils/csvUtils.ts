import type { Task, TaskGroup, Priority, Status } from '../types';
import { parseShortDate } from './dateUtils';

export function tasksToCSV(tasks: Task[]): string {
  const header = 'ID,Group,大分類,中分類,タスク内容,優先度,担当者,ステータス,進捗%,予定開始,予定終了,実施開始,実施終了,根拠ソース,備考';
  const rows = tasks.map(t => {
    const fields = [
      t.id, t.group, t.category, t.epic, t.title,
      t.priority, t.owner, t.status, t.progress ? `${t.progress}%` : '',
      t.planStart, t.planEnd, t.actualStart, t.actualEnd,
      t.source, t.notes,
    ];
    return fields.map(f => {
      const s = String(f ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(',');
  });
  return [header, ...rows].join('\n');
}

export function csvToTasks(csvText: string): Task[] {
  const lines = parseCSVLines(csvText);
  if (lines.length < 2) return [];

  const tasks: Task[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.every(c => !c.trim())) continue;

    const group = (row[1] || '').trim() as TaskGroup;
    if (!group) continue;

    tasks.push({
      id: (row[0] || '').trim(),
      group,
      category: (row[2] || '').trim(),
      epic: (row[3] || '').trim(),
      title: (row[4] || '').trim(),
      priority: (row[5] || '').trim() as Priority | '',
      owner: (row[6] || '').trim(),
      status: (row[7] || '').trim() as Status | '',
      progress: parseProgress(row[8]),
      planStart: parseShortDate((row[9] || '').trim()),
      planEnd: parseShortDate((row[10] || '').trim()),
      actualStart: parseShortDate((row[11] || '').trim()),
      actualEnd: parseShortDate((row[12] || '').trim()),
      source: (row[13] || '').trim(),
      notes: (row[14] || '').trim(),
    });
  }
  return tasks;
}

function parseProgress(val: string | undefined): number {
  if (!val) return 0;
  const n = parseInt(val.replace('%', ''), 10);
  return isNaN(n) ? 0 : n;
}

function parseCSVLines(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        currentRow.push(currentField.trim());
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}
