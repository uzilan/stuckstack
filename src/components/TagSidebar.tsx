import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

function DraggableTag({ tag, onDelete }: { tag: string; onDelete?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tag::${tag}`,
    data: { type: 'tag', tag },
  })

  return (
    <Chip
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      label={tag}
      onDelete={onDelete}
      sx={{
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative',
        fontSize: '1rem',
        userSelect: 'none',
      }}
    />
  )
}

interface Props {
  tags: string[]
  usedTags: Set<string>
  onCreateTag: (name: string) => void
  onDeleteTag: (name: string) => void
}

export function TagSidebar({ tags, usedTags, onCreateTag, onDeleteTag }: Props) {
  const [input, setInput] = useState('')

  const create = () => {
    const trimmed = input.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onCreateTag(trimmed.toLowerCase())
    setInput('')
  }

  return (
    <Paper elevation={2} sx={{ width: 200, p: 2, position: 'sticky', top: 16, flexShrink: 0 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Tags</Typography>

      {tags.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem' }}>
          No tags yet — create one below
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {[...tags].sort((a, b) => a.localeCompare(b)).map(tag => (
            <DraggableTag
              key={tag}
              tag={tag}
              onDelete={usedTags.has(tag) ? undefined : () => onDeleteTag(tag)}
            />
          ))}
        </Box>
      )}

      <Divider sx={{ mb: 1.5 }} />

      <TextField
        fullWidth
        size="small"
        value={input}
        onChange={e => setInput(e.target.value.toLowerCase())}
        onBlur={create}
        onKeyDown={e => e.key === 'Enter' && create()}
        placeholder="New tag name"
      />
    </Paper>
  )
}
