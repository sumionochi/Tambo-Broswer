// components/interactable/Notes.tsx
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { FileText, Trash2, Link as LinkIcon } from 'lucide-react'
import { useState } from 'react'

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

  // Safe array with null check
  const safeNotes = notes ?? []

  const handleDeleteNote = (noteId: string) => {
    setNotes(safeNotes.filter(n => n.id !== noteId))
  }

  const sortedNotes = [...safeNotes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  if (safeNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Notes Yet</p>
          <p className="text-sm mt-2">Ask AI to save information as notes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Notes</h2>
        <span className="text-sm text-gray-500">{safeNotes.length} notes</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedNotes.map((note) => {
          const isExpanded = expandedNote === note.id
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
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete note"
                >
                  <Trash2 size={16} />
                </button>
              </div>

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

              {note.sourceSearch && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <LinkIcon size={12} />
                    <span>From search: "{note.sourceSearch}"</span>
                  </div>
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
  )
}

export const InteractableNotes = withInteractable(Notes, {
  componentName: "Notes",
  description: "Quick text notes. AI can create notes from summaries, link them to searches or collections, or edit content. Each note can track its source and be linked to collections.",
  propsSchema: NotesPropsSchema,
})