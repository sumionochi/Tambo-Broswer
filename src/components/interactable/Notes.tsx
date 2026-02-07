// components/interactable/Notes.tsx
// REDESIGNED: Cream/Sage palette, polished note cards, soft transitions
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { FileText, Trash2, Link as LinkIcon, RefreshCw, ExternalLink, Edit2, Check, X, StickyNote } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { SearchHistoryDialog } from '@/components/dialog/SearchHistoryDialog'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

// Zod Schema
export const NotesPropsSchema = z.object({
    notes: z.array(z.object({
      id: z.string().nullable().default(''),
      content: z.string().nullable().default('').describe("Note content"),
      sourceSearch: z.string().optional().describe("Search query that created this note"),
      linkedCollection: z.string().optional().describe("ID of linked collection"),
      createdAt: z.string().nullable().default('').describe("ISO datetime when note was created"),
    })).nullable().optional()
  })

// Tambo-safe: handle undefined props during streaming
const _pNotes = NotesPropsSchema.parse.bind(NotesPropsSchema);
const _spNotes = NotesPropsSchema.safeParse.bind(NotesPropsSchema);
(NotesPropsSchema as any).parse = (d: unknown, p?: any) => _pNotes(d ?? {}, p);
(NotesPropsSchema as any).safeParse = (d: unknown, p?: any) => _spNotes(d ?? {}, p);

type NotesProps = z.infer<typeof NotesPropsSchema>

function Notes({ notes: initialNotes }: NotesProps) {
  const [notes, setNotes] = useTamboComponentState("notes", initialNotes || [], initialNotes || [])
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSearchQuery, setSelectedSearchQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; noteId: string; notePreview: string } | null>(null)
  const [editingNote, setEditingNote] = useState<{ id: string; content: string } | null>(null)

  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) loadNotes()
  }, [])

  const loadNotes = async () => {
    if (isLoadingRef.current) return
    try {
      isLoadingRef.current = true
      setLoading(true)
      const response = await fetch('/api/notes')
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
        hasLoadedRef.current = true
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const handleRefresh = () => { hasLoadedRef.current = false; loadNotes() }
  const handleOpenSearchDialog = (q: string) => { setSelectedSearchQuery(q); setDialogOpen(true) }
  const safeNotes = notes ?? []

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
      if (response.ok) setNotes(safeNotes.filter(n => n.id !== noteId))
    } catch (error) { console.error('Delete note error:', error) }
  }

  const handleUpdateNote = async (noteId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })
      if (response.ok) {
        setNotes(safeNotes.map(n => n.id === noteId ? { ...n, content: newContent } : n))
        setEditingNote(null)
      }
    } catch (error) { console.error('Update note error:', error) }
  }

  const sortedNotes = [...safeNotes].sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )

  // ─── Loading ───
  if (loading && safeNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in">
          <div
            className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4"
            style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--fs-text-muted)' }}>Loading notes...</p>
        </div>
      </div>
    )
  }

  // ─── Empty ───
  if (safeNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in" style={{ maxWidth: 320 }}>
          <div
            className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--fs-sage-50)' }}
          >
            <StickyNote size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
            No Notes Yet
          </p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--fs-text-muted)' }}>
            Ask AI to save information as notes
          </p>
          <button
            onClick={handleRefresh}
            className="mt-5 px-5 py-2.5 text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-all"
            style={{
              background: 'var(--fs-sage-600)', color: 'var(--fs-text-on-green)',
              boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  // ─── Main ───
  return (
    <>
      <div className="p-6 md:p-8 overflow-y-auto h-full fs-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fs-animate-in">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
              My Notes
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              {safeNotes.length} note{safeNotes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton tooltip="Edit notes with AI" description="Summarize, rewrite, organize, or manage your notes using natural language" />
            <RefreshButton loading={loading} onClick={handleRefresh} />
          </div>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 fs-stagger">
          {sortedNotes.map((note, index) => {
            const isExpanded = expandedNote === note.id
            const isEditing = editingNote?.id === note.id
            const preview = (note.content || '').slice(0, 150)
            const needsExpansion = (note.content || '').length > 150

            return (
              <div
                key={note.id || index}
                className="rounded-2xl p-5 transition-all fs-animate-in group"
                style={{
                  background: 'var(--fs-cream-50)',
                  border: '1px solid var(--fs-border-light)',
                  boxShadow: 'var(--fs-shadow-sm)',
                  transitionDuration: 'var(--fs-duration-normal)',
                  transitionTimingFunction: 'var(--fs-ease-out)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)'; e.currentTarget.style.borderColor = 'var(--fs-sage-200)' }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)'; e.currentTarget.style.borderColor = 'var(--fs-border-light)' }}
              >
                {/* Meta Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--fs-text-muted)' }}>
                    <FileText size={13} strokeWidth={1.8} />
                    <span>{new Date(note.createdAt || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ transitionDuration: 'var(--fs-duration-normal)' }}>
                    {!isEditing && (
                      <button
                        onClick={() => setEditingNote({ id: note.id || '', content: note.content || '' })}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fs-sage-600)'; e.currentTarget.style.background = 'var(--fs-sage-50)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                        title="Edit note"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDialog({
                        isOpen: true, noteId: note.id || '',
                        notePreview: (note.content || '').slice(0, 50) + ((note.content || '').length > 50 ? '...' : ''),
                      })}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = '#FEF2F2' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                      title="Delete note"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Content / Editor */}
                {isEditing && editingNote ? (
                  <div className="space-y-3">
                    <textarea
                      value={editingNote.content}
                      onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                      className="w-full text-sm rounded-xl p-3 outline-none resize-y min-h-[120px]"
                      style={{
                        color: 'var(--fs-text-primary)',
                        background: 'var(--fs-cream-100)',
                        border: '2px solid var(--fs-sage-400)',
                      }}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { if (editingNote.content.trim()) handleUpdateNote(note.id || '', editingNote.content.trim()) }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-all"
                        style={{ background: 'var(--fs-sage-600)', color: 'white', transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}
                      >
                        <Check size={14} /> Save
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-all"
                        style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-300)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed mb-3" style={{ color: 'var(--fs-text-secondary)' }}>
                      {isExpanded ? (note.content || '') : preview}
                      {needsExpansion && !isExpanded && '...'}
                    </p>
                    {needsExpansion && (
                      <button
                        onClick={() => setExpandedNote(isExpanded ? null : (note.id || ''))}
                        className="text-sm font-medium transition-all"
                        style={{ color: 'var(--fs-sage-600)', transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fs-sage-700)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-sage-600)' }}
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </>
                )}

                {/* Source / Linked badges */}
                {(note.sourceSearch || note.linkedCollection) && (
                  <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '1px solid var(--fs-border-light)' }}>
                    {note.sourceSearch && (
                      <button
                        onClick={() => handleOpenSearchDialog(note.sourceSearch!)}
                        className="flex items-center gap-1.5 text-xs font-medium group/link transition-all"
                        style={{ color: 'var(--fs-sage-600)', transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fs-sage-700)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-sage-600)' }}
                      >
                        <LinkIcon size={11} />
                        <span>From: &ldquo;{note.sourceSearch}&rdquo;</span>
                        <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </button>
                    )}
                    {note.linkedCollection && (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
                        style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)' }}
                      >
                        📚 Linked to collection
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <SearchHistoryDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} searchQuery={selectedSearchQuery} />
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => handleDeleteNote(confirmDialog.noteId)}
          title="Delete Note"
          message={`Are you sure you want to delete this note: "${confirmDialog.notePreview}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}
    </>
  )
}

function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="p-2.5 rounded-xl transition-all disabled:opacity-50"
      style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-normal)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)'; e.currentTarget.style.color = 'var(--fs-text-primary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fs-text-muted)' }}
      title="Refresh"
    >
      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
    </button>
  )
}

export const InteractableNotes = withInteractable(Notes, {
  componentName: "Notes",
  description: "Quick text notes. AI can create notes from summaries, link them to searches or collections, or edit content. Each note can track its source and be linked to collections.",
  propsSchema: NotesPropsSchema,
})