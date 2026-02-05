// components/interactable/Notes.tsx
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { FileText, Trash2, Link as LinkIcon, RefreshCw, ExternalLink, Edit2, Check, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { SearchHistoryDialog } from '@/components/dialog/SearchHistoryDialog'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

// Zod Schema
export const NotesPropsSchema = z.object({
  notes: z.array(z.object({
    id: z.string(),
    content: z.string().describe("Note content"),
    sourceSearch: z.string().optional().describe("Search query that created this note"),
    linkedCollection: z.string().optional().describe("ID of linked collection"),
    createdAt: z.string().describe("ISO datetime when note was created"),
  }))
})

type NotesProps = z.infer<typeof NotesPropsSchema>

function Notes({ notes: initialNotes }: NotesProps) {
  const [notes, setNotes] = useTamboComponentState(
    "notes",
    initialNotes || [],
    initialNotes || []
  )

  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSearchQuery, setSelectedSearchQuery] = useState('')

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    noteId: string
    notePreview: string
  } | null>(null)

  const [editingNote, setEditingNote] = useState<{
    id: string
    content: string
  } | null>(null)

  // Load notes from database on mount
  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadNotes()
    }
  }, [])

  const loadNotes = async () => {
    if (isLoadingRef.current) {
      console.log('⏭️ Skipping duplicate notes load')
      return
    }

    try {
      isLoadingRef.current = true
      setLoading(true)
      
      console.log('📝 Fetching notes...')
      const response = await fetch('/api/notes')
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Loaded', data.notes.length, 'notes')
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

  const handleRefresh = () => {
    hasLoadedRef.current = false
    loadNotes()
  }

  const handleOpenSearchDialog = (searchQuery: string) => {
    setSelectedSearchQuery(searchQuery)
    setDialogOpen(true)
  }

  const safeNotes = notes ?? []

  const handleDeleteNote = async (noteId: string) => {
    try {
      console.log('🗑️ Deleting note:', noteId)
      
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotes(safeNotes.filter(n => n.id !== noteId))
        console.log('✅ Note deleted')
      } else {
        console.error('❌ Failed to delete note')
      }
    } catch (error) {
      console.error('Delete note error:', error)
    }
  }

  const handleUpdateNote = async (noteId: string, newContent: string) => {
    try {
      console.log('✏️ Updating note:', noteId)
      
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })

      if (response.ok) {
        setNotes(safeNotes.map(n =>
          n.id === noteId ? { ...n, content: newContent } : n
        ))
        setEditingNote(null)
        console.log('✅ Note updated')
      } else {
        console.error('❌ Failed to update note')
      }
    } catch (error) {
      console.error('Update note error:', error)
    }
  }

  const sortedNotes = [...safeNotes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  if (loading && safeNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading notes...</p>
        </div>
      </div>
    )
  }

  if (safeNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Notes Yet</p>
          <p className="text-sm mt-2">Ask AI to save information as notes</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 space-y-4 overflow-y-auto h-full">
        {/* Header with EditWithTamboButton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Notes</h2>
            <p className="text-sm text-gray-500 mt-1">{safeNotes.length} notes</p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton 
              tooltip="Edit notes with AI"
              description="Summarize, rewrite, organize, or manage your notes using natural language"
            />
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh notes"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedNotes.map((note) => {
            const isExpanded = expandedNote === note.id
            const isEditing = editingNote?.id === note.id
            const preview = note.content.slice(0, 150)
            const needsExpansion = note.content.length > 150

            return (
              <div
                key={note.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FileText size={16} />
                    <span>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <button
                        onClick={() => setEditingNote({ id: note.id, content: note.content })}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit note"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDialog({
                        isOpen: true,
                        noteId: note.id,
                        notePreview: note.content.slice(0, 50) + (note.content.length > 50 ? '...' : ''),
                      })}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingNote.content}
                      onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                      className="w-full text-gray-700 text-sm border-2 border-blue-500 rounded p-2 outline-none min-h-[120px] resize-y"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (editingNote.content.trim()) {
                            handleUpdateNote(note.id, editingNote.content.trim())
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white text-sm py-1.5 rounded hover:bg-blue-700"
                      >
                        <Check size={14} />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="flex-1 flex items-center justify-center gap-1 bg-gray-200 text-gray-700 text-sm py-1.5 rounded hover:bg-gray-300"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3">
                      {isExpanded ? note.content : preview}
                      {needsExpansion && !isExpanded && '...'}
                    </p>

                    {needsExpansion && (
                      <button
                        onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </>
                )}

                {note.sourceSearch && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleOpenSearchDialog(note.sourceSearch!)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline group"
                    >
                      <LinkIcon size={12} />
                      <span>From search: "{note.sourceSearch}"</span>
                      <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                )}

                {note.linkedCollection && (
                  <div className="mt-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      📚 Linked to collection
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Search History Dialog */}
      <SearchHistoryDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        searchQuery={selectedSearchQuery}
      />

      {/* Confirm Delete Dialog */}
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

export const InteractableNotes = withInteractable(Notes, {
  componentName: "Notes",
  description: "Quick text notes. AI can create notes from summaries, link them to searches or collections, or edit content. Each note can track its source and be linked to collections.",
  propsSchema: NotesPropsSchema,
})