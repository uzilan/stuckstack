import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CssBaseline from '@mui/material/CssBaseline'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { TaskCard } from './components/TaskCard'
import { TagSidebar } from './components/TagSidebar'
import { type Task, type Stack, loadStacks, saveStacks, loadGlobalTags, saveGlobalTags } from './storage'

const darkTheme = createTheme({ palette: { mode: 'dark' } })

interface SortableTabProps {
  stack: Stack
  isActive: boolean
  isRenaming: boolean
  renameValue: string
  showDelete: boolean
  onActivate: () => void
  onStartRename: () => void
  onRenameChange: (v: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  onDelete: () => void
}

function SortableTab({ stack, isActive, isRenaming, renameValue, showDelete, onActivate, onStartRename, onRenameChange, onRenameCommit, onRenameCancel, onDelete }: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stack.id })

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 2, py: 1,
        cursor: isDragging ? 'grabbing' : 'pointer',
        borderBottom: '2px solid',
        borderColor: isActive ? 'primary.main' : 'transparent',
        color: isActive ? 'primary.main' : 'text.secondary',
        '&:hover': { color: isActive ? 'primary.main' : 'text.primary' },
        userSelect: 'none', fontSize: '0.85rem', whiteSpace: 'nowrap',
      }}
      onClick={onActivate}
      {...attributes}
      {...listeners}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={e => {
            if (e.key === 'Enter') onRenameCommit()
            if (e.key === 'Escape') onRenameCancel()
          }}
          onClick={e => e.stopPropagation()}
          style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontSize: 'inherit', width: `${Math.max(4, renameValue.length)}ch` }}
        />
      ) : (
        <span onDoubleClick={e => { e.stopPropagation(); onStartRename() }}>
          {stack.name}
        </span>
      )}
      {showDelete && (
        <Box
          component="span"
          onClick={e => { e.stopPropagation(); onDelete() }}
          sx={{ fontSize: '0.75rem', lineHeight: 1, opacity: 0.7, '&:hover': { opacity: 1, color: 'error.main' }, ml: 0.25, cursor: 'pointer' }}
        >
          ✕
        </Box>
      )}
    </Box>
  )
}

export default function App() {
  const [stacks, setStacks] = useState<Stack[]>(loadStacks)
  const [activeStackId, setActiveStackId] = useState<string>(() => loadStacks()[0]?.id ?? '')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [allTags, setAllTags] = useState<string[]>(loadGlobalTags)
  const [input, setInput] = useState('')
  const [tagDropTargetId, setTagDropTargetId] = useState<string | null>(null)
  const [undoState, setUndoState] = useState<
    | { kind: 'task'; task: Task; index: number; label: string }
    | { kind: 'stack'; stack: Stack; index: number; label: string }
    | null
  >(null)
  const [sortField, setSortField] = useState<'name' | 'frustration' | 'random' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [randomSeed, setRandomSeed] = useState(() => Math.random())

  const tabSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const activeStack = stacks.find(s => s.id === activeStackId) ?? stacks[0]
  const tasks = activeStack?.tasks ?? []

  const updateTasks = (updater: (prev: Task[]) => Task[]) => {
    setStacks(prev => prev.map(s => s.id === activeStack?.id ? { ...s, tasks: updater(s.tasks) } : s))
  }

  const displayedTasks = useMemo(() => {
    if (sortField === 'name')
      return [...tasks].sort((a, b) => sortDir === 'asc' ? a.text.localeCompare(b.text) : b.text.localeCompare(a.text))
    if (sortField === 'frustration')
      return [...tasks].sort((a, b) => sortDir === 'asc' ? a.frustrationLevel - b.frustrationLevel : b.frustrationLevel - a.frustrationLevel)
    if (sortField === 'random') {
      return [...tasks].sort((a, b) => {
        const ha = Math.sin(randomSeed + a.id.charCodeAt(0)) * 10000
        const hb = Math.sin(randomSeed + b.id.charCodeAt(0)) * 10000
        return (ha - Math.floor(ha)) - (hb - Math.floor(hb))
      })
    }
    return tasks
  }, [tasks, sortField, sortDir, randomSeed])

  const handleSortClick = (field: 'name' | 'frustration' | 'random') => {
    if (field === 'random') { setSortField('random'); setRandomSeed(Math.random()); return }
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir(field === 'frustration' ? 'desc' : 'asc') }
  }

  useEffect(() => saveStacks(stacks), [stacks])
  useEffect(() => saveGlobalTags(allTags), [allTags])

  const switchStack = (id: string) => {
    setActiveStackId(id)
    setSortField(null)
    setUndoState(null)
  }

  const addStack = () => {
    const id = crypto.randomUUID()
    setStacks(prev => [...prev, { id, name: `Stack ${prev.length + 1}`, tasks: [] }])
    switchStack(id)
  }

  const deleteStack = (id: string) => {
    setStacks(prev => {
      const index = prev.findIndex(s => s.id === id)
      const stack = prev[index]
      setUndoState({ kind: 'stack', stack, index, label: `Deleted tab: ${stack.name}` })
      const next = prev.filter(s => s.id !== id)
      if (activeStackId === id) switchStack(next[0]?.id ?? '')
      return next
    })
  }

  const commitRename = (id: string) => {
    const trimmed = renameValue.trim()
    if (trimmed) setStacks(prev => prev.map(s => s.id === id ? { ...s, name: trimmed } : s))
    setRenamingId(null)
  }

  const handleTabDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setStacks(prev => {
      const from = prev.findIndex(s => s.id === active.id)
      const to = prev.findIndex(s => s.id === over.id)
      return arrayMove(prev, from, to)
    })
  }

  const push = () => {
    if (!input.trim()) return
    updateTasks(prev => [{ id: crypto.randomUUID(), text: input.trim(), tags: [], description: '', frustrationLevel: 5, log: [] }, ...prev])
    setInput('')
  }

  const pop = () => updateTasks(prev => {
    setUndoState({ kind: 'task', task: prev[0], index: 0, label: `Popped: ${prev[0].text}` })
    return prev.slice(1)
  })

  const remove = (id: string) => updateTasks(prev => {
    const index = prev.findIndex(t => t.id === id)
    setUndoState({ kind: 'task', task: prev[index], index, label: `Deleted: ${prev[index].text}` })
    return prev.filter(t => t.id !== id)
  })

  const undo = () => {
    if (!undoState) return
    if (undoState.kind === 'task') {
      updateTasks(prev => { const t = [...prev]; t.splice(undoState.index, 0, undoState.task); return t })
    } else {
      setStacks(prev => { const s = [...prev]; s.splice(undoState.index, 0, undoState.stack); return s })
      switchStack(undoState.stack.id)
    }
    setUndoState(null)
  }

  const update = (id: string, changes: Partial<Omit<Task, 'id'>>) =>
    updateTasks(prev => prev.map(t => (t.id === id ? { ...t, ...changes } : t)))

  const usedTags = useMemo(() => new Set(stacks.flatMap(s => s.tasks.flatMap(t => t.tags))), [stacks])

  const createTag = (name: string) => {
    if (!allTags.includes(name)) setAllTags(prev => [...prev, name])
  }

  const deleteTag = (name: string) => {
    setAllTags(prev => prev.filter(t => t !== name))
  }

  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (args.active.data.current?.type === 'tag') return pointerWithin(args)
    return closestCenter(args)
  }, [])

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (active.data.current?.type === 'tag') {
      setTagDropTargetId(over ? String(over.id) : null)
    }
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setTagDropTargetId(null)
    if (!over) return

    if (active.data.current?.type === 'tag') {
      const tag = active.data.current.tag as string
      const taskId = String(over.id)
      const task = tasks.find(t => t.id === taskId)
      if (task && !task.tags.includes(tag)) {
        update(taskId, { tags: [...task.tags, tag] })
      }
    } else {
      if (active.id === over.id) return
      setSortField(null)
      updateTasks(() => {
        const from = displayedTasks.findIndex(t => t.id === active.id)
        const to = displayedTasks.findIndex(t => t.id === over.id)
        return arrayMove(displayedTasks, from, to)
      })
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <DndContext
        collisionDetection={collisionDetection}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Title + sort */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h5">Stuck Stack</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Sort by:</Typography>
                  {(['name', 'frustration', 'random'] as const).map(field => {
                    const isActive = sortField === field
                    const chevron = isActive && field !== 'random' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
                    return (
                      <Button
                        key={field}
                        size="small"
                        variant={isActive ? 'contained' : 'outlined'}
                        onClick={() => handleSortClick(field)}
                        sx={{ minWidth: 0, fontSize: '0.75rem', py: 0.3, px: 1.5, textTransform: 'none' }}
                      >
                        {field === 'name' ? 'Name' : field === 'frustration' ? 'Frustration Level' : 'Random'}{chevron}
                      </Button>
                    )
                  })}
                </Box>
              </Box>

              {/* Tabs */}
              <DndContext sensors={tabSensors} collisionDetection={closestCenter} onDragEnd={handleTabDragEnd}>
                <SortableContext items={stacks.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                  <Box sx={{ display: 'flex', alignItems: 'stretch', borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                    {stacks.map(stack => (
                      <SortableTab
                        key={stack.id}
                        stack={stack}
                        isActive={stack.id === activeStack?.id}
                        isRenaming={renamingId === stack.id}
                        renameValue={renameValue}
                        showDelete={stacks.length > 1}
                        onActivate={() => switchStack(stack.id)}
                        onStartRename={() => { setRenamingId(stack.id); setRenameValue(stack.name) }}
                        onRenameChange={setRenameValue}
                        onRenameCommit={() => commitRename(stack.id)}
                        onRenameCancel={() => setRenamingId(null)}
                        onDelete={() => deleteStack(stack.id)}
                      />
                    ))}
                    <IconButton size="small" onClick={addStack} sx={{ ml: 0.5, alignSelf: 'center' }} title="New stack">
                      +
                    </IconButton>
                  </Box>
                </SortableContext>
              </DndContext>

              {/* Push input */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && push()}
                  placeholder="What are you stuck on?"
                />
                <Button variant="contained" onClick={push} sx={{ whiteSpace: 'nowrap' }}>
                  Push
                </Button>
                {tasks.length > 0 && (
                  <Button variant="outlined" color="error" onClick={pop} sx={{ whiteSpace: 'nowrap' }}>
                    Pop
                  </Button>
                )}
              </Box>

              <SortableContext items={displayedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {displayedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isTagDropTarget={tagDropTargetId === task.id}
                    onRemove={remove}
                    onUpdate={update}
                  />
                ))}
              </SortableContext>

              {tasks.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 12 }}>
                  <Typography variant="h5" color="text.secondary">Stack is empty. Push something!</Typography>
                </Box>
              )}
            </Box>

            <TagSidebar tags={allTags} usedTags={usedTags} onCreateTag={createTag} onDeleteTag={deleteTag} />
          </Box>
        </Box>
      </DndContext>

      <Snackbar
        open={!!undoState}
        autoHideDuration={5000}
        onClose={() => setUndoState(null)}
        ContentProps={{ sx: { backgroundColor: '#111', color: '#fff' } }}
        message={undoState?.label}
        action={
          <Button color="secondary" size="small" onClick={undo}>
            UNDO
          </Button>
        }
      />
    </ThemeProvider>
  )
}
