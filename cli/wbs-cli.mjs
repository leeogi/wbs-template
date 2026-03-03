#!/usr/bin/env node

// WBS CLI - Supabase直接操作ツール
// Usage: node cli/wbs-cli.mjs <command> [options]

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Environment loading ---
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  let content;
  try {
    content = readFileSync(envPath, 'utf-8');
  } catch (err) {
    console.error(`Error: Cannot read ${envPath}`);
    console.error('Make sure .env.local exists in the wbs-app project root.');
    process.exit(1);
  }
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }

  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local');
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// --- Validation constants ---
const VALID_STATUSES = ['未着手', '対応中', '確認中', '完了', '保留', ''];
const VALID_PRIORITIES = ['高', '中', '低', ''];
const VALID_GROUPS = ['Phase', 'Category', 'Epic', 'Task', 'Milestone'];
const VALID_FIELDS = new Set([
  'id', 'group', 'category', 'epic', 'title', 'priority', 'owner',
  'status', 'progress', 'planStart', 'planEnd', 'actualStart', 'actualEnd',
  'link', 'source', 'notes',
]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- Data access layer ---
async function fetchTasks() {
  const { data, error } = await supabase
    .from('wbs_data')
    .select('tasks, updated_at')
    .eq('id', 'main')
    .single();
  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return { tasks: data.tasks, updatedAt: data.updated_at };
}

// applyChanges: (tasks: Task[]) => Task[] — re-applies pending changes on fresh data
async function saveTasksWithRetry(applyChanges, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { tasks, updatedAt } = await fetchTasks();
    const updatedTasks = applyChanges(tasks);

    // Optimistic lock: check updated_at hasn't changed since our read
    const { data: current, error: checkErr } = await supabase
      .from('wbs_data')
      .select('updated_at')
      .eq('id', 'main')
      .single();

    if (checkErr) throw new Error(`Lock check failed: ${checkErr.message}`);

    if (current.updated_at !== updatedAt) {
      if (attempt === retries) {
        throw new Error(
          'CONFLICT: Data was modified by another client after 3 retries. ' +
          'Please re-fetch and try again.'
        );
      }
      console.error(`Conflict detected (attempt ${attempt}/${retries}), retrying with fresh data...`);
      continue;
    }

    const newUpdatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('wbs_data')
      .update({ tasks: updatedTasks, updated_at: newUpdatedAt })
      .eq('id', 'main');

    if (error) throw new Error(`Save failed: ${error.message}`);
    return newUpdatedAt;
  }
}

// --- Validation ---
function validateUpdates(updates) {
  const errors = [];

  // Reject unknown fields
  for (const key of Object.keys(updates)) {
    if (!VALID_FIELDS.has(key)) {
      errors.push(`Unknown field: "${key}". Valid fields: ${[...VALID_FIELDS].join(', ')}`);
    }
  }

  if ('status' in updates && !VALID_STATUSES.includes(updates.status)) {
    errors.push(`Invalid status: "${updates.status}". Valid: ${VALID_STATUSES.filter(Boolean).join(', ')}`);
  }
  if ('priority' in updates && !VALID_PRIORITIES.includes(updates.priority)) {
    errors.push(`Invalid priority: "${updates.priority}". Valid: ${VALID_PRIORITIES.filter(Boolean).join(', ')}`);
  }
  if ('group' in updates && !VALID_GROUPS.includes(updates.group)) {
    errors.push(`Invalid group: "${updates.group}". Valid: ${VALID_GROUPS.join(', ')}`);
  }
  if ('progress' in updates) {
    const p = Number(updates.progress);
    if (isNaN(p) || p < 0 || p > 100) {
      errors.push(`Invalid progress: "${updates.progress}". Must be 0-100.`);
    }
  }
  for (const field of ['planStart', 'planEnd', 'actualStart', 'actualEnd']) {
    if (field in updates && updates[field] !== '' && !DATE_RE.test(updates[field])) {
      errors.push(`Invalid ${field}: "${updates[field]}". Format: YYYY-MM-DD or empty.`);
    }
  }

  return errors;
}

// --- Command: list ---
async function cmdList(args) {
  const { tasks } = await fetchTasks();
  const summary = args.includes('--summary');

  if (summary) {
    const header = ['ID', 'Group', 'Title', 'Status', 'Progress', 'Owner'];
    const widths = [10, 10, 40, 8, 8, 15];

    console.log(header.map((h, i) => h.padEnd(widths[i])).join(' | '));
    console.log(widths.map(w => '-'.repeat(w)).join('-+-'));

    for (const t of tasks) {
      const title = t.group === 'Phase' ? t.category : t.group === 'Category' ? t.epic : t.title;
      const row = [
        (t.id || '-').padEnd(widths[0]),
        t.group.padEnd(widths[1]),
        (title || '').slice(0, widths[2]).padEnd(widths[2]),
        (t.status || '-').padEnd(widths[3]),
        (`${t.progress}%`).padEnd(widths[4]),
        (t.owner || '-').slice(0, widths[5]).padEnd(widths[5]),
      ];
      console.log(row.join(' | '));
    }
    console.log(`\nTotal: ${tasks.length} tasks`);
  } else {
    console.log(JSON.stringify(tasks, null, 2));
  }
}

// --- Command: get ---
async function cmdGet(taskId) {
  if (!taskId) {
    console.error('Usage: wbs-cli.mjs get <task-id>');
    process.exit(1);
  }

  const { tasks } = await fetchTasks();
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    const validIds = tasks.filter(t => t.id).map(t => t.id);
    console.error(`Task "${taskId}" not found.`);
    console.error(`Valid IDs: ${validIds.join(', ')}`);
    process.exit(1);
  }

  console.log(JSON.stringify(task, null, 2));
}

// --- Command: update ---
async function cmdUpdate(taskId, flagArgs) {
  if (!taskId) {
    console.error('Usage: wbs-cli.mjs update <task-id> --field value [--field value ...]');
    process.exit(1);
  }

  // Parse --field value pairs
  const updates = {};
  for (let i = 0; i < flagArgs.length; i += 2) {
    const flag = flagArgs[i];
    const value = flagArgs[i + 1];
    if (!flag.startsWith('--') || value === undefined) {
      console.error(`Invalid flag pair: ${flag} ${value || '(missing)'}`);
      process.exit(1);
    }
    const field = flag.slice(2);
    updates[field] = field === 'progress' ? Number(value) : value;
  }

  if (Object.keys(updates).length === 0) {
    console.error('No updates specified. Use --field value pairs.');
    process.exit(1);
  }

  const errors = validateUpdates(updates);
  if (errors.length > 0) {
    console.error('Validation errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  // Pre-check: verify task exists before attempting save
  const { tasks: currentTasks } = await fetchTasks();
  const checkIdx = currentTasks.findIndex(t => t.id === taskId);
  if (checkIdx === -1) {
    const validIds = currentTasks.filter(t => t.id).map(t => t.id);
    console.error(`Task "${taskId}" not found.`);
    console.error(`Valid IDs: ${validIds.join(', ')}`);
    process.exit(1);
  }

  const oldTask = { ...currentTasks[checkIdx] };

  await saveTasksWithRetry((tasks) => {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) throw new Error(`Task "${taskId}" disappeared during save.`);
    tasks[idx] = { ...tasks[idx], ...updates };
    return tasks;
  });

  // Show changes
  console.log(`Updated task ${taskId}:`);
  for (const [key, newVal] of Object.entries(updates)) {
    const oldVal = oldTask[key];
    if (oldVal !== newVal) {
      console.log(`  ${key}: "${oldVal}" -> "${newVal}"`);
    }
  }
}

// --- Command: batch-update ---
async function cmdBatchUpdate(filePath, dryRun = false) {
  if (!filePath) {
    console.error('Usage: wbs-cli.mjs batch-update --file <path>');
    process.exit(1);
  }

  const changesJson = readFileSync(filePath, 'utf-8');
  const { changes = [] } = JSON.parse(changesJson);

  // Validate all changes first (read-only snapshot for validation/diff display)
  const { tasks } = await fetchTasks();
  const allErrors = [];
  const diffs = [];

  for (const { taskId, updates } of changes) {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) {
      allErrors.push(`Task "${taskId}" not found.`);
      continue;
    }

    const fieldErrors = validateUpdates(updates);
    if (fieldErrors.length > 0) {
      allErrors.push(`Task "${taskId}": ${fieldErrors.join('; ')}`);
      continue;
    }

    // Compute diff
    const taskDiff = { taskId, fields: [] };
    for (const [key, newVal] of Object.entries(updates)) {
      const oldVal = tasks[idx][key];
      if (oldVal !== newVal) {
        taskDiff.fields.push({ field: key, oldVal, newVal });
      }
    }
    if (taskDiff.fields.length > 0) {
      diffs.push(taskDiff);
    }
  }

  if (allErrors.length > 0) {
    console.error('Validation errors:');
    allErrors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  // Print diff
  if (diffs.length === 0) {
    console.log('No changes detected.');
    return;
  }

  console.log(`=== WBS Changes ${dryRun ? '(Dry Run)' : ''} ===\n`);
  for (const { taskId, fields } of diffs) {
    const task = tasks.find(t => t.id === taskId);
    const title = task.group === 'Phase' ? task.category : task.group === 'Category' ? task.epic : task.title;
    console.log(`[UPDATE] ${taskId}: ${title}`);
    for (const { field, oldVal, newVal } of fields) {
      console.log(`  ${field}: "${oldVal}" -> "${newVal}"`);
    }
    console.log('');
  }
  console.log(`${diffs.length} task(s) to update.`);

  if (dryRun) {
    console.log('\nDry run complete. Use "batch-update" to apply.');
    return;
  }

  // Apply changes with retry on conflict
  await saveTasksWithRetry((tasks) => {
    for (const { taskId, updates } of changes) {
      const idx = tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        // Normalize progress to number
        const normalized = { ...updates };
        if ('progress' in normalized) normalized.progress = Number(normalized.progress);
        tasks[idx] = { ...tasks[idx], ...normalized };
      }
    }
    return tasks;
  });
  console.log('\nChanges applied successfully.');
}

// --- Command: diff (dry-run alias) ---
async function cmdDiff(filePath) {
  return cmdBatchUpdate(filePath, true);
}

// --- Command: search ---
async function cmdSearch(args) {
  const { tasks } = await fetchTasks();
  const query = args.join(' ').toLowerCase();

  if (!query) {
    console.error('Usage: wbs-cli.mjs search <keyword>');
    process.exit(1);
  }

  const results = tasks.filter(t => {
    const searchable = [t.id, t.title, t.category, t.epic, t.owner, t.notes, t.status].join(' ').toLowerCase();
    return searchable.includes(query);
  });

  if (results.length === 0) {
    console.log(`No tasks found matching "${query}".`);
    return;
  }

  console.log(`Found ${results.length} task(s) matching "${query}":\n`);
  for (const t of results) {
    const title = t.group === 'Phase' ? t.category : t.group === 'Category' ? t.epic : t.title;
    console.log(`  ${(t.id || '-').padEnd(10)} [${t.group}] ${title} (${t.status || '-'}, ${t.progress}%)`);
  }
}

// --- Main ---
const [,, command, ...args] = process.argv;

const HELP = `
WBS CLI - Supabase直接操作ツール

Usage: node cli/wbs-cli.mjs <command> [options]

Commands:
  list [--summary]                     List all tasks (JSON or summary table)
  get <task-id>                        Get a specific task by ID
  update <task-id> --field value ...   Update a single task
  batch-update --file <path>           Apply changes from a JSON file
  diff --file <path>                   Preview changes (dry run)
  search <keyword>                     Search tasks by keyword

Update flags:
  --status, --progress, --priority, --owner
  --planStart, --planEnd, --actualStart, --actualEnd
  --title, --notes, --link

batch-update JSON format:
  {
    "changes": [
      { "taskId": "A1.3", "updates": { "status": "対応中", "progress": 30 } }
    ]
  }
`;

async function main() {
  try {
    switch (command) {
      case 'list':
        await cmdList(args);
        break;
      case 'get':
        await cmdGet(args[0]);
        break;
      case 'update':
        await cmdUpdate(args[0], args.slice(1));
        break;
      case 'batch-update': {
        const fileIdx = args.indexOf('--file');
        await cmdBatchUpdate(fileIdx !== -1 ? args[fileIdx + 1] : null);
        break;
      }
      case 'diff': {
        const fileIdx = args.indexOf('--file');
        await cmdDiff(fileIdx !== -1 ? args[fileIdx + 1] : null);
        break;
      }
      case 'search':
        await cmdSearch(args);
        break;
      default:
        console.log(HELP);
        process.exit(command ? 1 : 0);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  // Ensure process exits (Supabase client may keep event loop alive)
  process.exit(0);
}

main();
