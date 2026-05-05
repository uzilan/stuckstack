import { useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { LogEntry } from '../storage'

interface Props {
  log: LogEntry[]
  onChange: (log: LogEntry[]) => void
}

const today = () => new Date().toISOString().slice(0, 10)

const formatDate = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const dateInputStyle = (fontSize: string): React.CSSProperties => ({
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.23)',
  borderRadius: 4,
  color: 'inherit',
  fontSize,
  padding: '4px 8px',
  colorScheme: 'dark',
  width: '100%',
  boxSizing: 'border-box',
})

export function TaskLog({ log, onChange }: Props) {
  const [logInput, setLogInput] = useState('')
  const [logDate, setLogDate] = useState(today)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'date' | 'text' | null>(null)
  const [textDraft, setTextDraft] = useState('')
  const [dateDraft, setDateDraft] = useState('')

  const addEntry = () => {
    const trimmed = logInput.trim()
    if (!trimmed) return
    onChange([{ id: crypto.randomUUID(), date: logDate, text: trimmed }, ...log])
    setLogInput('')
    setLogDate(today())
  }

  const startEdit = (entry: LogEntry, field: 'date' | 'text') => {
    setEditingId(entry.id)
    setEditingField(field)
    if (field === 'text') setTextDraft(entry.text)
    else setDateDraft(entry.date)
  }

  const stopEdit = () => { setEditingId(null); setEditingField(null) }

  const commitText = (id: string) => {
    const trimmed = textDraft.trim()
    if (trimmed) onChange(log.map(e => e.id === id ? { ...e, text: trimmed } : e))
    stopEdit()
  }

  const commitDate = (id: string) => {
    if (dateDraft) onChange(log.map(e => e.id === id ? { ...e, date: dateDraft } : e))
    stopEdit()
  }

  return (
    <Box sx={{ width: 220, flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider', pl: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
        <input
          type="date"
          value={logDate}
          onChange={e => setLogDate(e.target.value)}
          style={dateInputStyle('0.8rem')}
        />
        <TextField
          size="small"
          fullWidth
          value={logInput}
          onChange={e => setLogInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          placeholder="Add log entry…"
          variant="outlined"
          inputProps={{ style: { fontSize: '0.8rem' } }}
        />
      </Box>

      {log.length === 0 && (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.disabled' }}>No log entries yet</Typography>
      )}

      {[...log].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
        <Box key={entry.id} sx={{ mb: 0.75, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
          {editingId === entry.id && editingField === 'date' ? (
            <input
              type="date"
              autoFocus
              value={dateDraft}
              onChange={e => setDateDraft(e.target.value)}
              onBlur={() => commitDate(entry.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitDate(entry.id)
                if (e.key === 'Escape') stopEdit()
              }}
              style={dateInputStyle('0.7rem')}
            />
          ) : (
            <Typography
              onClick={() => startEdit(entry, 'date')}
              sx={{ fontSize: '0.7rem', color: 'text.disabled', lineHeight: 1.2, cursor: 'text' }}
            >
              {formatDate(entry.date)}
            </Typography>
          )}

          {editingId === entry.id && editingField === 'text' ? (
            <TextField
              size="small"
              fullWidth
              autoFocus
              multiline
              value={textDraft}
              onChange={e => setTextDraft(e.target.value)}
              onBlur={() => commitText(entry.id)}
              onKeyDown={e => { if (e.key === 'Escape') stopEdit() }}
              variant="standard"
              inputProps={{ style: { fontSize: '0.85rem' } }}
            />
          ) : (
            <Typography
              onClick={() => startEdit(entry, 'text')}
              sx={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', cursor: 'text' }}
            >
              {entry.text}
            </Typography>
          )}
          </Box>
          <IconButton
            size="small"
            color="error"
            onClick={() => onChange(log.filter(e => e.id !== entry.id))}
            sx={{ flexShrink: 0, opacity: 0.5, '&:hover': { opacity: 1 } }}
          >
            ✕
          </IconButton>
        </Box>
      ))}
    </Box>
  )
}
