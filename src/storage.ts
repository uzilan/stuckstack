export interface LogEntry {
  id: string
  date: string
  text: string
}

export interface Task {
  id: string
  text: string
  tags: string[]
  description: string
  frustrationLevel: number
  log: LogEntry[]
}

export interface Stack {
  id: string
  name: string
  tasks: Task[]
}

const TASKS_KEY = 'stuck-stack-tasks'
const STACKS_KEY = 'stuck-stack-stacks'
const TAGS_KEY = 'stuck-stack-tags'

function migrateTask(t: Task): Task {
  return { ...t, tags: t.tags ?? [], description: t.description ?? '', frustrationLevel: t.frustrationLevel ?? 5, log: t.log ?? [] }
}

export function loadStacks(): Stack[] {
  const stored = localStorage.getItem(STACKS_KEY)
  if (stored) {
    return (JSON.parse(stored) as Stack[]).map(s => ({ ...s, tasks: s.tasks.map(migrateTask) }))
  }
  const oldTasks = localStorage.getItem(TASKS_KEY)
  const tasks = oldTasks ? (JSON.parse(oldTasks) as Task[]).map(migrateTask) : []
  return [{ id: crypto.randomUUID(), name: 'Stack 1', tasks }]
}

export function saveStacks(stacks: Stack[]): void {
  localStorage.setItem(STACKS_KEY, JSON.stringify(stacks))
}

export function loadGlobalTags(): string[] {
  const stored = localStorage.getItem(TAGS_KEY)
  return stored ? (JSON.parse(stored) as string[]) : []
}

export function saveGlobalTags(tags: string[]): void {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
}
