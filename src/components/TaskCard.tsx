import { useEffect, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { Task } from '../storage'
import { TaskLog } from './TaskLog'

const WORDS = ['GRRRRR!', 'AHHHHH!', 'WHY?!', 'NOOOO!', 'UGH!', 'ARGH!', 'COME ON!', 'SERIOUSLY?!', 'NO NO NO!', 'WHYYY!', 'AAARRGH!', 'FFS!', 'HELP!', 'I GIVE UP!', 'STAAAHP!']
const COLORS = ['#ff1744', '#ff6d00', '#ffd600', '#d500f9', '#00e5ff', '#76ff03', '#ff4081', '#ff3d00']
const LIGHTNING_COLORS = ['#ffd600', '#ffffff', '#00e5ff', '#ffe57f']

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randBetween = (min: number, max: number) => Math.random() * (max - min) + min

interface Bolt { id: number; x: number; y: number; rot: number; scale: number; color: string }

function LightningBolt({ x, y, rot, scale, color, id }: Bolt) {
  return (
    <Box
      key={id}
      sx={{
        position: 'absolute', left: `${x}%`, top: `${y}%`,
        transform: `rotate(${rot}deg) scale(${scale})`,
        transformOrigin: 'center',
        '@keyframes flash': {
          '0%':   { opacity: 0, transform: `rotate(${rot}deg) scale(${scale * 0.6})` },
          '15%':  { opacity: 1, transform: `rotate(${rot}deg) scale(${scale * 1.1})` },
          '70%':  { opacity: 0.8 },
          '100%': { opacity: 0, transform: `rotate(${rot}deg) scale(${scale * 0.8})` },
        },
        animation: 'flash 0.35s ease-out forwards',
        pointerEvents: 'none',
        filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`,
      }}
    >
      <svg width="36" height="64" viewBox="0 0 9 18" fill={color}>
        <path d="M 7 0 L 3 8 L 6 8 L 1 18 L 8.5 7 L 5.5 7 Z" />
      </svg>
    </Box>
  )
}

interface Props {
  task: Task
  isTagDropTarget: boolean
  onRemove: (id: string) => void
  onUpdate: (id: string, changes: Partial<Omit<Task, 'id'>>) => void
}

export function TaskCard({ task, isTagDropTarget, onRemove, onUpdate }: Props) {
  const [editingText, setEditingText] = useState(false)
  const [textDraft, setTextDraft] = useState(task.text)
  const [expanded, setExpanded] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(task.description)
  const [frustrated, setFrustrated] = useState(false)
  const [burst, setBurst] = useState({ word: WORDS[0], color: COLORS[0], size: 6, rotate: 0, key: 0 })
  const [bolts, setBolts] = useState<Bolt[]>([])

  const level = task.frustrationLevel
  const t = (level - 1) / 9
  const lerp = (a: number, b: number) => a + t * (b - a)
  const sliderColor = `hsl(${Math.round(lerp(120, 0))}, 100%, 55%)`

  const nextBurst = () => {
    setBurst({
      word: rand(WORDS),
      color: rand(COLORS),
      size: randBetween(lerp(1.2, 2), lerp(1.8, 3)),
      rotate: randBetween(-lerp(2, 10), lerp(2, 10)),
      key: Math.random(),
    })
    setBolts(Array.from({ length: Math.floor(randBetween(0, lerp(1, 3))) }, () => ({
      id: Math.random(), x: randBetween(2, 88), y: randBetween(2, 85),
      rot: randBetween(-60, 60), scale: randBetween(lerp(0.2, 0.4), lerp(0.4, 1)), color: rand(LIGHTNING_COLORS),
    })))
  }

  const invokeFrustration = () => {
    if (frustrated) return
    setFrustrated(true)
    nextBurst()
    setTimeout(() => setFrustrated(false), lerp(600, 1500))
  }

  useEffect(() => {
    if (!frustrated) return
    const id = setInterval(nextBurst, randBetween(lerp(500, 300), lerp(650, 400)))
    return () => clearInterval(id)
  }, [frustrated])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task' },
  })

  const commitText = () => {
    const trimmed = textDraft.trim()
    if (trimmed && trimmed !== task.text) onUpdate(task.id, { text: trimmed })
    else setTextDraft(task.text)
    setEditingText(false)
  }

  const commitDesc = () => {
    onUpdate(task.id, { description: descDraft.trim() })
    setEditingDesc(false)
  }

  const removeTag = (tag: string) =>
    onUpdate(task.id, { tags: task.tags.filter(t => t !== tag) })

  const borderColor = isTagDropTarget ? 'success.main' : 'divider'
  const borderWidth = isTagDropTarget ? '2px' : '1px'

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      sx={{ mb: 1, border: `${borderWidth} solid`, borderColor, position: 'relative', overflow: 'hidden' }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Main row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            {...attributes}
            {...listeners}
            sx={{ cursor: isDragging ? 'grabbing' : 'grab', color: 'text.disabled', fontSize: '1.2rem', lineHeight: 1, userSelect: 'none', px: 0.5, flexShrink: 0 }}
          >
            ⠿
          </Box>

          {editingText ? (
            <TextField
              fullWidth
              autoFocus
              value={textDraft}
              onChange={e => setTextDraft(e.target.value)}
              onBlur={commitText}
              onKeyDown={e => {
                if (e.key === 'Enter') commitText()
                if (e.key === 'Escape') { setTextDraft(task.text); setEditingText(false) }
              }}
              inputProps={{ style: { fontSize: '1.1rem' } }}
              variant="standard"
            />
          ) : (
            <Typography
              onClick={() => setExpanded(e => !e)}
              sx={{ flex: 1, fontSize: '1.1rem', cursor: 'pointer', userSelect: 'none' }}
            >
              {task.text}
            </Typography>
          )}

          <IconButton onClick={invokeFrustration} size="small" sx={{ flexShrink: 0, filter: `drop-shadow(0 0 ${lerp(0, 8).toFixed(1)}px ${sliderColor})` }} title="Invoke frustration">
            😤
          </IconButton>
          <IconButton onClick={() => setEditingText(true)} size="small" sx={{ color: 'text.secondary', flexShrink: 0 }} title="Edit">
            ✎
          </IconButton>
          <IconButton onClick={() => onRemove(task.id)} size="small" color="error" sx={{ flexShrink: 0 }} title="Remove">
            ✕
          </IconButton>
        </Box>

        {frustrated && (
          <Box sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, pointerEvents: 'none',
            backgroundColor: `rgba(0,0,0,${lerp(0.05, 0.25).toFixed(2)})`,
          }}>
            {bolts.map(bolt => <LightningBolt key={bolt.id} {...bolt} />)}
            <Typography
              key={burst.key}
              sx={{
                '@keyframes burst': {
                  '0%':   { transform: `scale(0.2) rotate(${burst.rotate}deg)`, opacity: 0 },
                  '35%':  { transform: `scale(1.4) rotate(${burst.rotate}deg)`, opacity: 1 },
                  '70%':  { transform: `scale(1.1) rotate(${burst.rotate}deg)`, opacity: 1 },
                  '100%': { transform: `scale(0.6) rotate(${burst.rotate}deg)`, opacity: 0 },
                },
                animation: 'burst 0.38s ease-out forwards',
                fontSize: `${burst.size}rem`,
                fontWeight: 900,
                color: burst.color,
                textShadow: `0 0 12px ${burst.color}99`,
                letterSpacing: '0.05em',
                userSelect: 'none',
              }}
            >
              {burst.word}
            </Typography>
          </Box>
        )}

        {/* Tags + slider row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, ml: 4, mr: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1 }}>
            {task.tags.map(tag => (
              <Chip key={tag} label={tag} size="small" onDelete={() => removeTag(tag)} />
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.6rem', lineHeight: 1 }}>😐</Typography>
            <Slider
              min={1} max={10} step={1}
              value={level}
              onChange={(_, v) => onUpdate(task.id, { frustrationLevel: v as number })}
              size="small"
              sx={{ width: 80, color: sliderColor, '& .MuiSlider-thumb': { width: 8, height: 8 }, '& .MuiSlider-rail': { height: 2 }, '& .MuiSlider-track': { height: 2 } }}
            />
            <Typography sx={{ fontSize: '0.6rem', lineHeight: 1 }}>🤬</Typography>
          </Box>
        </Box>

        {isTagDropTarget && (
          <Box sx={{ ml: 4, mt: 1, color: 'success.main', fontSize: '0.8rem' }}>
            Drop to add tag
          </Box>
        )}

        {/* Description + Log */}
        {expanded && (
          <Box sx={{ ml: 4, mt: 1, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {/* Description */}
            <Box sx={{ flex: 1 }}>
              {editingDesc ? (
                <TextField
                  fullWidth
                  multiline
                  autoFocus
                  minRows={2}
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  onBlur={commitDesc}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setDescDraft(task.description); setEditingDesc(false) }
                  }}
                  variant="outlined"
                  size="small"
                />
              ) : (
                <Typography
                  onClick={() => setEditingDesc(true)}
                  sx={{
                    cursor: 'text',
                    fontSize: '0.9rem',
                    color: task.description ? 'text.primary' : 'text.disabled',
                    whiteSpace: 'pre-wrap',
                    minHeight: 32,
                  }}
                >
                  {task.description || 'Click to add description…'}
                </Typography>
              )}
            </Box>

            <TaskLog
              log={task.log}
              onChange={log => onUpdate(task.id, { log })}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
