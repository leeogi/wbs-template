export const STATUSES = ['未着手', '対応中', '確認中', '完了', '保留'] as const;
export const PRIORITIES = ['高', '中', '低'] as const;
export const GROUPS = ['Phase', 'Category', 'Epic', 'Task', 'Milestone'] as const;

export const STATUS_COLORS: Record<string, string> = {
  '未着手': '#F4CCCC',
  '対応中': '#D9EAD3',
  '確認中': '#FFF2CC',
  '完了':   '#D0E0F0',
  '保留':   '#D9D9D9',
};

export const GROUP_COLORS: Record<string, { bg: string; text: string; bold: boolean }> = {
  'Phase':     { bg: '#4285F4', text: '#FFFFFF', bold: true },
  'Category':  { bg: '#E8F0FE', text: '#1A1A1A', bold: true },
  'Epic':      { bg: '#F8F9FA', text: '#1A1A1A', bold: true },
  'Milestone': { bg: '#FCE8E6', text: '#1A1A1A', bold: true },
  'Task':      { bg: '#FFFFFF', text: '#1A1A1A', bold: false },
};

export const GANTT_BAR_COLORS = {
  PLANNED: '#B7D7A8',
  ACTUAL:  '#6AA84F',
  OVERDUE: '#E06666',
  TODAY:   '#FFD966',
};

export const PRIORITY_COLORS: Record<string, string> = {
  '高': '#EA4335',
  '中': '#FBBC04',
  '低': '#34A853',
};

export const DAY_WIDTH = 24;

export const ROW_HEIGHT = 36;
