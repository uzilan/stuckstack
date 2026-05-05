import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CssBaseline from '@mui/material/CssBaseline'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { TaskCard } from './components/TaskCard'
import { TagSidebar } from './components/TagSidebar'
import { type Task, loadTasks, saveTasks, loadGlobalTags, saveGlobalTags } from './storage'

const darkTheme = createTheme({ palette: { mode: 'dark' } })

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [allTags, setAllTags] = useState<string[]>(loadGlobalTags)
  const [input, setInput] = useState('')
  const [tagDropTargetId, setTagDropTargetId] = useState<string | null>(null)
  const [undoState, setUndoState] = useState<{ task: Task; index: number; label: string } | null>(null)
  const [sortField, setSortField] = useState<'name' | 'frustration' | 'random' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [randomSeed, setRandomSeed] = useState(() => Math.random())

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

  useEffect(() => saveTasks(tasks), [tasks])
  useEffect(() => saveGlobalTags(allTags), [allTags])

  const push = () => {
    if (!input.trim()) return
    setTasks(prev => [{ id: crypto.randomUUID(), text: input.trim(), tags: [], description: '', frustrationLevel: 5, log: [] }, ...prev])
    setInput('')
  }

  const pop = () => setTasks(prev => {
    setUndoState({ task: prev[0], index: 0, label: `Popped: ${prev[0].text}` })
    return prev.slice(1)
  })

  const remove = (id: string) => setTasks(prev => {
    const index = prev.findIndex(t => t.id === id)
    setUndoState({ task: prev[index], index, label: `Deleted: ${prev[index].text}` })
    return prev.filter(t => t.id !== id)
  })

  const undo = () => {
    if (!undoState) return
    setTasks(prev => { const t = [...prev]; t.splice(undoState.index, 0, undoState.task); return t })
    setUndoState(null)
  }

  const update = (id: string, changes: Partial<Omit<Task, 'id'>>) =>
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...changes } : t)))

  const usedTags = useMemo(() => new Set(tasks.flatMap(t => t.tags)), [tasks])

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
      setTasks(() => {
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
