// components/interactable/Calendar.tsx
// REDESIGNED: Cream/Sage palette, polished event cards, soft transitions
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
      id: z.string().nullable().default(''),
      title: z.string().nullable().default('').describe("Event title"),
      datetime: z.string().nullable().default('').describe("ISO datetime string"),
      linkedCollection: z.string().optional().describe("ID of linked collection"),
      linkedItems: z.array(z.string()).optional().describe("IDs of linked items"),
      note: z.string().optional().describe("Additional notes"),
      completed: z.boolean().optional().describe("Whether event is completed"),
    })).nullable().optional()
  })

// Tambo-safe: handle undefined props during streaming
const _pCalendar = CalendarPropsSchema.parse.bind(CalendarPropsSchema);
const _spCalendar = CalendarPropsSchema.safeParse.bind(CalendarPropsSchema);
(CalendarPropsSchema as any).parse = (d: unknown, p?: any) => _pCalendar(d ?? {}, p);
(CalendarPropsSchema as any).safeParse = (d: unknown, p?: any) => _spCalendar(d ?? {}, p);

type CalendarProps = z.infer<typeof CalendarPropsSchema>

interface EditingEvent {
  id: string
  title: string
  datetime: string
  note: string
}

function Calendar({ events: initialEvents }: CalendarProps) {
  const [events, setEvents] = useTamboComponentState("events", initialEvents || [], initialEvents || [])
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; eventId: string; eventTitle: string } | null>(null)
  const [editingEvent, setEditingEvent] = useState<EditingEvent | null>(null)

  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) loadEvents()
  }, [])

  const loadEvents = async () => {
    if (isLoadingRef.current) return
    try {
      isLoadingRef.current = true
      setLoading(true)
      const response = await fetch('/api/calendar')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
        hasLoadedRef.current = true
      }
    } catch (error) { console.error('Failed to load events:', error) }
    finally { setLoading(false); isLoadingRef.current = false }
  }

  const handleRefresh = () => { hasLoadedRef.current = false; loadEvents() }
  const safeEvents = events ?? []

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar/${eventId}`, { method: 'DELETE' })
      if (response.ok) setEvents(safeEvents.filter(e => e.id !== eventId))
    } catch (error) { console.error('Delete event error:', error) }
  }

  const handleToggleComplete = async (eventId: string) => {
    const event = safeEvents.find(e => e.id === eventId)
    if (!event) return
    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !event.completed }),
      })
      if (response.ok) setEvents(safeEvents.map(e => e.id === eventId ? { ...e, completed: !e.completed } : e))
    } catch (error) { console.error('Toggle complete error:', error) }
  }

  const handleUpdateEvent = async (eventId: string, updates: Partial<EditingEvent>) => {
    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: updates.title, datetime: updates.datetime, note: updates.note }),
      })
      if (response.ok) {
        setEvents(safeEvents.map(e => e.id === eventId ? {
          ...e,
          title: updates.title || e.title,
          datetime: updates.datetime || e.datetime,
          note: updates.note !== undefined ? updates.note : e.note,
        } : e))
        setEditingEvent(null)
      }
    } catch (error) { console.error('Update event error:', error) }
  }

  const sortedEvents = [...safeEvents].sort((a, b) => new Date(a.datetime || 0).getTime() - new Date(b.datetime || 0).getTime())
  const upcomingEvents = sortedEvents.filter(e => !e.completed)
  const completedEvents = sortedEvents.filter(e => e.completed)

  // ─── Loading ───
  if (loading && safeEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4"
            style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--fs-text-muted)' }}>Loading events...</p>
        </div>
      </div>
    )
  }

  // ─── Empty ───
  if (safeEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in" style={{ maxWidth: 320 }}>
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--fs-sage-50)' }}>
            <CalendarIcon size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
            No Events Scheduled
          </p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--fs-text-muted)' }}>
            Ask AI to schedule reminders or events
          </p>
          <button onClick={handleRefresh}
            className="mt-5 px-5 py-2.5 text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-all"
            style={{ background: 'var(--fs-sage-600)', color: 'var(--fs-text-on-green)', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 md:p-8 overflow-y-auto h-full fs-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fs-animate-in">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
              My Calendar
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              {upcomingEvents.length} upcoming · {completedEvents.length} completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton tooltip="Edit calendar with AI" description="Reschedule, modify, or manage your events and reminders using natural language" />
            <RefreshBtn loading={loading} onClick={handleRefresh} />
          </div>
        </div>

        {/* Upcoming */}
        {upcomingEvents.length > 0 && (
          <section className="mb-8 fs-animate-in">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: 'var(--fs-text-muted)', letterSpacing: '0.08em' }}>
              Upcoming
            </h3>
            <div className="space-y-3 fs-stagger">
              {upcomingEvents.map((event, idx) => (
                <EventCard key={event.id || idx} event={event} editingEvent={editingEvent}
                  onEditChange={setEditingEvent} onCancelEdit={() => setEditingEvent(null)}
                  onSaveEdit={handleUpdateEvent}
                  onDelete={(id, title) => setConfirmDialog({ isOpen: true, eventId: id, eventTitle: title })}
                  onToggleComplete={handleToggleComplete} />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completedEvents.length > 0 && (
          <section className="fs-animate-in" style={{ animationDelay: '100ms' }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: 'var(--fs-text-muted)', letterSpacing: '0.08em' }}>
              Completed
            </h3>
            <div className="space-y-3 fs-stagger">
              {completedEvents.map((event, idx) => (
                <EventCard key={event.id || idx} event={event} editingEvent={editingEvent}
                  onEditChange={setEditingEvent} onCancelEdit={() => setEditingEvent(null)}
                  onSaveEdit={handleUpdateEvent}
                  onDelete={(id, title) => setConfirmDialog({ isOpen: true, eventId: id, eventTitle: title })}
                  onToggleComplete={handleToggleComplete} />
              ))}
            </div>
          </section>
        )}
      </div>

      {confirmDialog && (
        <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog(null)}
          onConfirm={() => handleDeleteEvent(confirmDialog.eventId)} title="Delete Event"
          message={`Are you sure you want to delete "${confirmDialog.eventTitle}"? This action cannot be undone.`}
          confirmText="Delete" confirmStyle="danger" />
      )}
    </>
  )
}

// ─── Event Card ───
function EventCard({ event, editingEvent, onEditChange, onCancelEdit, onSaveEdit, onDelete, onToggleComplete }: {
  event: any; editingEvent: EditingEvent | null;
  onEditChange: (e: EditingEvent | null) => void; onCancelEdit: () => void;
  onSaveEdit: (id: string, updates: Partial<EditingEvent>) => void;
  onDelete: (id: string, title: string) => void; onToggleComplete: (id: string) => void;
}) {
  const eventDate = new Date(event.datetime || '')
  const isToday = eventDate.toDateString() === new Date().toDateString()
  const isEditing = editingEvent?.id === event.id

  const formatDatetimeForInput = (isoString: string) => {
    const d = new Date(isoString)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // Choose card accent
  let borderColor = 'var(--fs-border-light)'
  let accentBg = 'var(--fs-cream-50)'
  if (event.completed) { borderColor = 'var(--fs-sage-200)'; accentBg = 'var(--fs-sage-50)' }
  else if (isToday) { borderColor = 'var(--fs-sage-400)'; accentBg = 'var(--fs-sage-50)' }

  return (
    <div
      className="rounded-2xl p-5 transition-all fs-animate-in group"
      style={{
        background: accentBg,
        border: `1px solid ${borderColor}`,
        boxShadow: 'var(--fs-shadow-sm)',
        transitionDuration: 'var(--fs-duration-normal)',
        transitionTimingFunction: 'var(--fs-ease-out)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}
    >
      {isEditing && editingEvent ? (
        /* ── Edit Mode ── */
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fs-text-muted)' }}>Title</label>
            <input type="text" value={editingEvent.title}
              onChange={(e) => onEditChange({ ...editingEvent, title: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: 'var(--fs-cream-100)', border: '2px solid var(--fs-sage-400)', color: 'var(--fs-text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fs-text-muted)' }}>Date & Time</label>
            <input type="datetime-local" value={formatDatetimeForInput(editingEvent.datetime)}
              onChange={(e) => onEditChange({ ...editingEvent, datetime: new Date(e.target.value).toISOString() })}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: 'var(--fs-cream-100)', border: '2px solid var(--fs-sage-400)', color: 'var(--fs-text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fs-text-muted)' }}>Note</label>
            <textarea value={editingEvent.note}
              onChange={(e) => onEditChange({ ...editingEvent, note: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-y min-h-[60px] transition-all"
              style={{ background: 'var(--fs-cream-100)', border: '2px solid var(--fs-sage-400)', color: 'var(--fs-text-primary)' }}
              placeholder="Add a note..." />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => { if (editingEvent.title.trim()) onSaveEdit(event.id || '', { title: editingEvent.title.trim(), datetime: editingEvent.datetime, note: editingEvent.note }) }}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-xl transition-all"
              style={{ background: 'var(--fs-sage-600)', color: 'white', transitionDuration: 'var(--fs-duration-fast)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}>
              <Check size={14} /> Save
            </button>
            <button onClick={onCancelEdit}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-xl transition-all"
              style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-300)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <h4 className="font-semibold truncate" style={{
                color: event.completed ? 'var(--fs-text-muted)' : 'var(--fs-text-primary)',
                textDecoration: event.completed ? 'line-through' : 'none',
              }}>
                {event.title || 'Untitled'}
              </h4>
              {isToday && !event.completed && (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                  style={{ background: 'var(--fs-sage-500)', color: 'white' }}>
                  Today
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs mb-2" style={{ color: 'var(--fs-text-muted)' }}>
              <span className="inline-flex items-center gap-1">
                <CalendarIcon size={12} strokeWidth={1.8} />
                {eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={12} strokeWidth={1.8} />
                {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {event.note && (
              <p className="text-sm leading-relaxed mt-1" style={{ color: 'var(--fs-text-secondary)' }}>{event.note}</p>
            )}

            {event.linkedCollection && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg mt-3"
                style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)' }}>
                📚 Linked to collection
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ transitionDuration: 'var(--fs-duration-normal)' }}>
            <ActionBtn icon={Edit2} tooltip="Edit"
              onClick={() => onEditChange({ id: event.id || '', title: event.title || '', datetime: event.datetime || '', note: event.note || '' })}
              hoverColor="var(--fs-sage-600)" hoverBg="var(--fs-sage-50)" />
            <ActionBtn icon={CheckCircle} tooltip={event.completed ? 'Mark incomplete' : 'Mark complete'}
              onClick={() => onToggleComplete(event.id || '')}
              baseColor={event.completed ? 'var(--fs-sage-600)' : undefined}
              hoverColor="var(--fs-sage-600)" hoverBg="var(--fs-sage-50)" />
            <ActionBtn icon={Trash2} tooltip="Delete"
              onClick={() => onDelete(event.id || '', event.title || '')}
              hoverColor="#DC2626" hoverBg="#FEF2F2" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared Buttons ───
function ActionBtn({ icon: Icon, tooltip, onClick, hoverColor, hoverBg, baseColor }: {
  icon: any; tooltip: string; onClick: () => void;
  hoverColor: string; hoverBg: string; baseColor?: string;
}) {
  return (
    <button onClick={onClick} title={tooltip}
      className="p-2 rounded-xl transition-all"
      style={{ color: baseColor || 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = hoverColor; e.currentTarget.style.background = hoverBg }}
      onMouseLeave={(e) => { e.currentTarget.style.color = baseColor || 'var(--fs-text-muted)'; e.currentTarget.style.background = 'transparent' }}>
      <Icon size={16} strokeWidth={1.8} />
    </button>
  )
}

function RefreshBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="p-2.5 rounded-xl transition-all disabled:opacity-50"
      style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-normal)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)'; e.currentTarget.style.color = 'var(--fs-text-primary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fs-text-muted)' }}
      title="Refresh">
      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
    </button>
  )
}

export const InteractableCalendar = withInteractable(Calendar, {
  componentName: "Calendar",
  description: "Scheduled events and reminders. AI can create events, link them to collections, reschedule, or mark as complete. Each event can have notes and linked items.",
  propsSchema: CalendarPropsSchema,
})