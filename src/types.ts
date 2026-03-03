export type TaskGroup = 'Phase' | 'Category' | 'Epic' | 'Task' | 'Milestone';
export type Priority = '高' | '中' | '低';
export type Status = '未着手' | '対応中' | '確認中' | '完了' | '保留';

export interface Task {
  id: string;
  group: TaskGroup;
  category: string;
  epic: string;
  title: string;
  priority: Priority | '';
  owner: string;
  status: Status | '';
  progress: number;
  planStart: string;
  planEnd: string;
  actualStart: string;
  actualEnd: string;
  link?: string;
  source: string;
  notes: string;
}
