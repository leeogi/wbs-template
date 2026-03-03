import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Task, TaskGroup } from '../types';
import { supabase } from '../lib/supabase';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseTaskId(id: string): { prefix: string; num: number } | null {
  // "A1.5" → { prefix: "A1.", num: 5 }
  const dotMatch = id.match(/^(.+\.)(\d+)$/);
  if (dotMatch) return { prefix: dotMatch[1], num: parseInt(dotMatch[2]) };

  // "A1" or "M1" → { prefix: "A" or "M", num: 1 }
  const simpleMatch = id.match(/^([A-Z]+)(\d+)$/);
  if (simpleMatch) return { prefix: simpleMatch[1], num: parseInt(simpleMatch[2]) };

  return null;
}

const HISTORY_LIMIT = 50;

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isRemoteUpdate = useRef(false);
  const isUndoRedo = useRef(false);
  const undoStack = useRef<Task[][]>([]);
  const redoStack = useRef<Task[][]>([]);
  const tasksRef = useRef<Task[]>([]);

  // Keep tasksRef in sync
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const pushUndo = useCallback((snapshot: Task[]) => {
    undoStack.current.push(snapshot);
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const setTasksWithHistory = useCallback((updater: Task[] | ((prev: Task[]) => Task[])) => {
    if (isUndoRedo.current || isRemoteUpdate.current) {
      setTasks(updater);
      return;
    }
    setTasks(prev => {
      pushUndo([...prev]);
      return typeof updater === 'function' ? updater(prev) : updater;
    });
  }, [pushUndo]);

  // Load from Supabase on mount
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('wbs_data')
        .select('tasks, updated_at')
        .eq('id', 'main')
        .single();

      if (error) {
        console.error('Supabase load error:', error);
        setTasks([]);
      } else {
        const loaded = data.tasks as Task[];
        setTasks(loaded.length > 0 ? loaded : []);
        if (data.updated_at) setLastUpdated(data.updated_at);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('wbs-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wbs_data', filter: 'id=eq.main' },
        (payload) => {
          const remoteTasks = payload.new.tasks as Task[];
          if (remoteTasks && remoteTasks.length > 0) {
            isRemoteUpdate.current = true;
            setTasks(remoteTasks);
          }
          if (payload.new.updated_at) setLastUpdated(payload.new.updated_at);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Debounced save to Supabase
  useEffect(() => {
    if (loading) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const now = new Date().toISOString();
      await supabase
        .from('wbs_data')
        .update({ tasks: tasks as unknown as Record<string, unknown>[], updated_at: now })
        .eq('id', 'main');
      setLastUpdated(now);
    }, 500);

    return () => clearTimeout(saveTimer.current);
  }, [tasks, loading]);

  const updateTask = useCallback((index: number, updates: Partial<Task>) => {
    setTasksWithHistory(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  }, [setTasksWithHistory]);

  const [hiddenOwners, setHiddenOwners] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('wbs_hidden_owners');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const allOwners = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.owner) {
        for (const name of t.owner.split(',')) {
          const trimmed = name.trim();
          if (trimmed) set.add(trimmed);
        }
      }
    }
    return Array.from(set).filter(name => !hiddenOwners.has(name));
  }, [tasks, hiddenOwners]);

  const removeOwner = useCallback((name: string) => {
    // Remove from all tasks
    setTasksWithHistory(prev => prev.map(t => {
      if (!t.owner) return t;
      const owners = t.owner.split(',').map(s => s.trim()).filter(s => s && s !== name);
      const newOwner = owners.join(', ');
      return newOwner !== t.owner ? { ...t, owner: newOwner } : t;
    }));
    // Hide from the options list
    setHiddenOwners(prev => {
      const next = new Set(prev);
      next.add(name);
      localStorage.setItem('wbs_hidden_owners', JSON.stringify([...next]));
      return next;
    });
  }, [setTasksWithHistory]);

  const addTask = useCallback((afterIndex: number, group: TaskGroup) => {
    const defaults: Record<string, Partial<Task>> = {
      Phase: { category: '新規フェーズ', title: '', status: '' },
      Category: { epic: '新規カテゴリー', title: '', status: '' },
      Task: { title: '新規タスク', status: '未着手' },
      Milestone: { title: '新規マイルストーン', status: '未着手' },
      Epic: { title: '新規エピック', status: '未着手' },
    };
    const d = defaults[group] || defaults.Task;
    const newTask: Task = {
      id: '', group, category: '', epic: '', title: '',
      priority: '', owner: '', status: '', progress: 0,
      planStart: '', planEnd: '', actualStart: '', actualEnd: '',
      link: '', source: '', notes: '', ...d,
    };
    setTasksWithHistory(prev => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newTask);
      return next;
    });
  }, [setTasksWithHistory]);

  const addTaskBelow = useCallback((index: number) => {
    setTasksWithHistory(prev => {
      const task = prev[index];
      const id = task.id;

      // 1. Task/Epic with dotted ID (e.g., "A1.5") → add sibling, renumber
      if (id.includes('.')) {
        const parsed = parseTaskId(id);
        if (parsed) {
          const { prefix, num } = parsed;
          const newNum = num + 1;
          const prefixRegex = new RegExp(`^${escapeRegex(prefix)}(\\d+)$`);

          const next = prev.map((t, i) => {
            if (i <= index) return t;
            const m = t.id.match(prefixRegex);
            if (m && parseInt(m[1]) >= newNum) {
              return { ...t, id: `${prefix}${parseInt(m[1]) + 1}` };
            }
            return t;
          });

          const newTask: Task = {
            id: `${prefix}${newNum}`,
            group: task.group,
            category: task.category,
            epic: '',
            title: '新規タスク',
            priority: '', owner: '', status: '未着手', progress: 0,
            planStart: '', planEnd: '', actualStart: '', actualEnd: '',
            link: '', source: '', notes: '',
          };

          next.splice(index + 1, 0, newTask);
          return next;
        }
      }

      // 2. Category with simple ID (e.g., "A1") → add child Task at end of category
      if (task.group === 'Category' && id) {
        const categoryId = id;
        const childRegex = new RegExp(`^${escapeRegex(categoryId)}\\.(\\d+)$`);

        let lastChildIndex = index;
        let maxNum = 0;
        for (let i = index + 1; i < prev.length; i++) {
          if (prev[i].group === 'Phase' || prev[i].group === 'Category') break;
          lastChildIndex = i;
          const m = prev[i].id.match(childRegex);
          if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
        }

        const newTask: Task = {
          id: `${categoryId}.${maxNum + 1}`,
          group: 'Task',
          category: '',
          epic: '',
          title: '新規タスク',
          priority: '', owner: '', status: '未着手', progress: 0,
          planStart: '', planEnd: '', actualStart: '', actualEnd: '',
          link: '', source: '', notes: '',
        };

        const next = [...prev];
        next.splice(lastChildIndex + 1, 0, newTask);
        return next;
      }

      // 3. Phase (no ID) → add Category at end of phase children
      if (task.group === 'Phase') {
        let letter = '';
        let maxCatNum = 0;
        let lastPhaseChildIndex = index;

        for (let i = index + 1; i < prev.length; i++) {
          if (prev[i].group === 'Phase') break;
          lastPhaseChildIndex = i;

          const m = prev[i].id.match(/^([A-Z]+)(\d+)$/);
          if (m && prev[i].group === 'Category') {
            if (!letter) letter = m[1];
            maxCatNum = Math.max(maxCatNum, parseInt(m[2]));
          }
        }

        const newTask: Task = {
          id: letter ? `${letter}${maxCatNum + 1}` : '',
          group: 'Category',
          category: '',
          epic: '新規カテゴリー',
          title: '',
          priority: '', owner: '', status: '', progress: 0,
          planStart: '', planEnd: '', actualStart: '', actualEnd: '',
          link: '', source: '', notes: '',
        };

        const next = [...prev];
        next.splice(lastPhaseChildIndex + 1, 0, newTask);
        return next;
      }

      // 4. Milestone or other → add same-type row below
      const newTask: Task = {
        id: '',
        group: task.group,
        category: '',
        epic: '',
        title: '新規タスク',
        priority: '', owner: '', status: '未着手', progress: 0,
        planStart: '', planEnd: '', actualStart: '', actualEnd: '',
        link: '', source: '', notes: '',
      };
      const next = [...prev];
      next.splice(index + 1, 0, newTask);
      return next;
    });
  }, [setTasksWithHistory]);

  const deleteTask = useCallback((index: number) => {
    setTasksWithHistory(prev => {
      const task = prev[index];
      const group = task.group;

      // Cascade: determine which group levels end the cascade
      const endGroupsMap: Record<string, string[]> = {
        'Phase': ['Phase'],
        'Category': ['Phase', 'Category'],
        'Epic': ['Phase', 'Category', 'Epic'],
      };

      const endGroups = endGroupsMap[group];

      if (!endGroups) {
        // Task or Milestone: single row delete
        return prev.filter((_, i) => i !== index);
      }

      // Find end of cascade (next row of same-or-higher level)
      let endIndex = index + 1;
      while (endIndex < prev.length && !endGroups.includes(prev[endIndex].group)) {
        endIndex++;
      }

      return [...prev.slice(0, index), ...prev.slice(endIndex)];
    });
  }, [setTasksWithHistory]);

  const GROUP_HIERARCHY: TaskGroup[] = ['Phase', 'Category', 'Epic', 'Task'];

  const changeTaskGroup = useCallback((index: number, newGroup: TaskGroup) => {
    setTasksWithHistory(prev => prev.map((t, i) => {
      if (i !== index) return t;

      // Get current display title
      let displayTitle = '';
      if (t.group === 'Phase') displayTitle = t.category;
      else if (t.group === 'Category') displayTitle = t.epic;
      else displayTitle = t.title;

      // Set display title for new group
      const updates: Partial<Task> = {
        group: newGroup,
        id: '',
        status: newGroup === 'Phase' || newGroup === 'Category' ? '' : (t.status || '未着手'),
      };
      if (newGroup === 'Phase') {
        updates.category = displayTitle;
        updates.epic = '';
        updates.title = '';
      } else if (newGroup === 'Category') {
        updates.category = '';
        updates.epic = displayTitle;
        updates.title = '';
      } else {
        updates.category = '';
        updates.epic = '';
        updates.title = displayTitle;
      }

      return { ...t, ...updates };
    }));
  }, [setTasksWithHistory]);

  const promoteTask = useCallback((index: number) => {
    const task = tasksRef.current[index];
    if (!task || task.group === 'Milestone') return;
    const idx = GROUP_HIERARCHY.indexOf(task.group);
    if (idx <= 0) return; // Already Phase
    changeTaskGroup(index, GROUP_HIERARCHY[idx - 1]);
  }, [changeTaskGroup]);

  const demoteTask = useCallback((index: number) => {
    const task = tasksRef.current[index];
    if (!task || task.group === 'Milestone') return;
    const idx = GROUP_HIERARCHY.indexOf(task.group);
    if (idx >= GROUP_HIERARCHY.length - 1) return; // Already Task
    changeTaskGroup(index, GROUP_HIERARCHY[idx + 1]);
  }, [changeTaskGroup]);

  const reorderTask = useCallback((fromIndex: number, toIndex: number) => {
    setTasksWithHistory(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
      next.splice(insertAt, 0, moved);
      return next;
    });
  }, [setTasksWithHistory]);

  const importTasks = useCallback((newTasks: Task[]) => {
    setTasksWithHistory(newTasks);
  }, [setTasksWithHistory]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push([...tasksRef.current]);
    isUndoRedo.current = true;
    setTasks(prev);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
    // Reset flag after state update
    requestAnimationFrame(() => { isUndoRedo.current = false; });
  }, []);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push([...tasksRef.current]);
    isUndoRedo.current = true;
    setTasks(next);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
    requestAnimationFrame(() => { isUndoRedo.current = false; });
  }, []);

  return { tasks, loading, canUndo, canRedo, allOwners, lastUpdated, updateTask, addTask, addTaskBelow, deleteTask, reorderTask, importTasks, undo, redo, removeOwner, promoteTask, demoteTask };
}
