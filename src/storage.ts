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

const TASKS_KEY = 'stuck-stack-tasks'
const TAGS_KEY = 'stuck-stack-tags'

export function loadTasks(): Task[] {
  const stored = localStorage.getItem(TASKS_KEY)
  if (!stored) return []
  return (JSON.parse(stored) as Task[]).map(t => ({ ...t, tags: t.tags ?? [], description: t.description ?? '', frustrationLevel: t.frustrationLevel ?? 5, log: t.log ?? [] }))
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function loadGlobalTags(): string[] {
  const stored = localStorage.getItem(TAGS_KEY)
  return stored ? (JSON.parse(stored) as string[]) : []
}

export function saveGlobalTags(tags: string[]): void {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
}
