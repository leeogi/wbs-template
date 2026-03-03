import { useState, useMemo, useCallback } from 'react';
import type { Task, Status } from '../types';
import { isDelayed } from '../utils/dateUtils';

interface FilterState {
  owner: string;
  status: Status | '';
  delayedOnly: boolean;
  collapsedIds: Set<string>;
}

export function useFilters(tasks: Task[]) {
  const [filters, setFilters] = useState<FilterState>({
    owner: '',
    status: '',
    delayedOnly: false,
    collapsedIds: new Set(),
  });

  const toggleCollapse = useCallback((taskId: string) => {
    setFilters(prev => {
      const next = new Set(prev.collapsedIds);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return { ...prev, collapsedIds: next };
    });
  }, []);

  const setOwnerFilter = useCallback((owner: string) => {
    setFilters(prev => ({ ...prev, owner }));
  }, []);

  const setStatusFilter = useCallback((status: Status | '') => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const setDelayedOnly = useCallback((delayedOnly: boolean) => {
    setFilters(prev => ({ ...prev, delayedOnly }));
  }, []);

  const visibleTasks = useMemo(() => {
    let result: Task[] = [];

    // Apply collapse
    let skipUntilGroup: string | null = null;
    const hierarchy = ['Phase', 'Category', 'Epic', 'Task', 'Milestone'];

    for (const task of tasks) {
      if (skipUntilGroup) {
        const taskLevel = hierarchy.indexOf(task.group);
        const skipLevel = hierarchy.indexOf(skipUntilGroup);
        if (taskLevel <= skipLevel) {
          skipUntilGroup = null;
        } else {
          continue;
        }
      }

      result.push(task);

      const taskKey = task.id || `${task.group}-${task.category}-${task.epic}`;
      if (filters.collapsedIds.has(taskKey) && (task.group === 'Phase' || task.group === 'Category')) {
        skipUntilGroup = task.group;
      }
    }

    // Apply filters
    if (filters.owner || filters.status || filters.delayedOnly) {
      result = result.filter(task => {
        if (task.group === 'Phase' || task.group === 'Category') return true;
        if (filters.owner && !task.owner.includes(filters.owner)) return false;
        if (filters.status && task.status !== filters.status) return false;
        if (filters.delayedOnly && !isDelayed(task.planEnd, task.status)) return false;
        return true;
      });
    }

    return result;
  }, [tasks, filters]);

  return {
    filters,
    visibleTasks,
    toggleCollapse,
    setOwnerFilter,
    setStatusFilter,
    setDelayedOnly,
  };
}
