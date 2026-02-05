// components/interactable/Calendar.tsx
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { Calendar as CalendarIcon, Clock, Trash2, CheckCircle, RefreshCw, Edit2, Check, X } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

// Zod Schema
export const CalendarPropsSchema = z.object({
  events: z.array(z.object({
    id: z.string(),
    title: z.string().describe("Event title"),
    datetime: z.string().describe("ISO datetime string"),
    linkedCollection: z.string().optional().describe("ID of linked collection"),
    linkedItems: z.array(z.string()).optional().describe("IDs of linked items"),
    note: z.string().optional().describe("Additional notes"),
    completed: z.boolean().optional().describe("Whether event is completed"),
  }))
})

type CalendarProps = z.infer<typeof CalendarPropsSchema>

interface EditingEvent {
  id: string
  title: string
  datetime: string
  note: string
}

function Calendar({ events: initialEvents }: CalendarProps) {
  const [events, setEvents] = useTamboComponentState(
    "events",
    initialEvents || [],
    initialEvents || []
  )

  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    eventId: string
    eventTitle: string
  } | null>(null)

  const [editingEvent, setEditingEvent] = useState<EditingEvent | null>(null)

  // Load events from database on mount
  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadEvents()
    }
  }, [])

  const loadEvents = async () => {
    if (isLoadingRef.current) {
      console.log('⏭️ Skipping duplicate calendar load')
      return
    }

    try {
      isLoadingRef.current = true
      setLoading(true)
      
      console.log('📅 Fetching calendar events...')
      const response = await fetch('/api/calendar')
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Loaded', data.events.length, 'events')
        setEvents(data.events || [])
        hasLoadedRef.current = true
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const handleRefresh = () => {
    hasLoadedRef.current = false
    loadEvents()
  }

  const safeEvents = events ?? []

  const handleDeleteEvent = async (eventId: string) => {
    try {
      console.log('🗑️ Deleting event:', eventId)
      
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setEvents(safeEvents.filter(e => e.id !== eventId))
        console.log('✅ Event deleted')
      } else {
        console.error('❌ Failed to delete event')
      }
    } catch (error) {
      console.error('Delete event error:', error)
    }
  }

  const handleToggleComplete = async (eventId: string) => {
    const event = safeEvents.find(e => e.id === eventId)
    if (!event) return

    try {
      console.log('✓ Toggling complete status:', eventId)
      
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !event.completed }),
      })

      if (response.ok) {
        setEvents(safeEvents.map(e => 
          e.id === eventId ? { ...e, completed: !e.completed } : e
        ))
        console.log('✅ Event status updated')
      } else {
        console.error('❌ Failed to update event')
      }
    } catch (error) {
      console.error('Toggle complete error:', error)
    }
  }

  const handleUpdateEvent = async (eventId: string, updates: Partial<EditingEvent>) => {
    try {
      console.log('✏️ Updating event:', eventId)
      
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updates.title,
          datetime: updates.datetime,
          note: updates.note,
        }),
      })

      if (response.ok) {
        setEvents(safeEvents.map(e =>
          e.id === eventId ? { 
            ...e, 
            title: updates.title || e.title,
            datetime: updates.datetime || e.datetime,
            note: updates.note !== undefined ? updates.note : e.note,
          } : e
        ))
        setEditingEvent(null)
        console.log('✅ Event updated')
      } else {
        console.error('❌ Failed to update event')
      }
    } catch (error) {
      console.error('Update event error:', error)
    }
  }

  const sortedEvents = [...safeEvents].sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  )

  const upcomingEvents = sortedEvents.filter(e => !e.completed)
  const completedEvents = sortedEvents.filter(e => e.completed)

  if (loading && safeEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    )
  }

  if (safeEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <CalendarIcon size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Events Scheduled</p>
          <p className="text-sm mt-2">Ask AI to schedule reminders or events</p>
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
      <div className="p-6 space-y-6 overflow-y-auto h-full">
        {/* Header with EditWithTamboButton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Calendar</h2>
            <p className="text-sm text-gray-500 mt-1">{upcomingEvents.length} upcoming</p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton 
              tooltip="Edit calendar with AI"
              description="Reschedule, modify, or manage your events and reminders using natural language"
            />
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh calendar"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming</h3>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  editingEvent={editingEvent}
                  onEditChange={setEditingEvent}
                  onCancelEdit={() => setEditingEvent(null)}
                  onSaveEdit={handleUpdateEvent}
                  onDelete={(id, title) => setConfirmDialog({ isOpen: true, eventId: id, eventTitle: title })}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Events */}
        {completedEvents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Completed</h3>
            <div className="space-y-3">
              {completedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  editingEvent={editingEvent}
                  onEditChange={setEditingEvent}
                  onCancelEdit={() => setEditingEvent(null)}
                  onSaveEdit={handleUpdateEvent}
                  onDelete={(id, title) => setConfirmDialog({ isOpen: true, eventId: id, eventTitle: title })}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => handleDeleteEvent(confirmDialog.eventId)}
          title="Delete Event"
          message={`Are you sure you want to delete "${confirmDialog.eventTitle}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}
    </>
  )
}

function EventCard({ 
  event, 
  editingEvent,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onDelete, 
  onToggleComplete 
}: { 
  event: any
  editingEvent: EditingEvent | null
  onEditChange: (event: EditingEvent | null) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, updates: Partial<EditingEvent>) => void
  onDelete: (id: string, title: string) => void
  onToggleComplete: (id: string) => void
}) {
  const eventDate = new Date(event.datetime)
  const isToday = eventDate.toDateString() === new Date().toDateString()
  const isEditing = editingEvent?.id === event.id

  // Format datetime for input field (YYYY-MM-DDTHH:mm)
  const formatDatetimeForInput = (isoString: string) => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleStartEdit = () => {
    onEditChange({
      id: event.id,
      title: event.title,
      datetime: event.datetime,
      note: event.note || '',
    })
  }

  return (
    <div 
      className={`
        bg-white rounded-lg border p-4 transition-all
        ${event.completed ? 'border-green-200 bg-green-50' : 'border-gray-200'}
        ${isToday && !event.completed ? 'border-blue-300 bg-blue-50' : ''}
      `}
    >
      {isEditing && editingEvent ? (
        // Edit Mode
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={editingEvent.title}
              onChange={(e) => onEditChange({ ...editingEvent, title: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={formatDatetimeForInput(editingEvent.datetime)}
              onChange={(e) => {
                const newDatetime = new Date(e.target.value).toISOString()
                onEditChange({ ...editingEvent, datetime: newDatetime })
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <textarea
              value={editingEvent.note}
              onChange={(e) => onEditChange({ ...editingEvent, note: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 resize-y min-h-[60px]"
              placeholder="Add a note..."
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                if (editingEvent.title.trim()) {
                  onSaveEdit(event.id, {
                    title: editingEvent.title.trim(),
                    datetime: editingEvent.datetime,
                    note: editingEvent.note,
                  })
                }
              }}
              className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700"
            >
              <Check size={14} />
              Save Changes
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 flex items-center justify-center gap-1 bg-gray-200 text-gray-700 text-sm py-2 rounded hover:bg-gray-300"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // View Mode
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className={`font-semibold ${event.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {event.title}
              </h4>
              {isToday && !event.completed && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                  Today
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <CalendarIcon size={14} />
                <span>{eventDate.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {event.note && (
              <p className="text-sm text-gray-600 mt-2">{event.note}</p>
            )}

            {event.linkedCollection && (
              <div className="mt-2">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  📚 Linked to collection
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartEdit}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit event"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onToggleComplete(event.id)}
              className={`
                p-2 rounded-lg transition-colors
                ${event.completed 
                  ? 'text-green-600 hover:bg-green-100' 
                  : 'text-gray-400 hover:bg-gray-100'
                }
              `}
              title={event.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              <CheckCircle size={18} />
            </button>
            <button
              onClick={() => onDelete(event.id, event.title)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete event"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const InteractableCalendar = withInteractable(Calendar, {
  componentName: "Calendar",
  description: "Scheduled events and reminders. AI can create events, link them to collections, reschedule, or mark as complete. Each event can have notes and linked items.",
  propsSchema: CalendarPropsSchema,
})