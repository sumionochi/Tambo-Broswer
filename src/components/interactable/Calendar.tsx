// components/interactable/Calendar.tsx
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { Calendar as CalendarIcon, Clock, Trash2, CheckCircle } from 'lucide-react'

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

function Calendar({ events: initialEvents }: CalendarProps) {
  const [events, setEvents] = useTamboComponentState(
    "events",
    initialEvents || [],
    initialEvents || []
  )

  // Safe array with null check
  const safeEvents = events ?? []

  const handleDeleteEvent = (eventId: string) => {
    setEvents(safeEvents.filter(e => e.id !== eventId))
  }

  const handleToggleComplete = (eventId: string) => {
    setEvents(safeEvents.map(e => 
      e.id === eventId ? { ...e, completed: !e.completed } : e
    ))
  }

  const sortedEvents = [...safeEvents].sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  )

  const upcomingEvents = sortedEvents.filter(e => !e.completed)
  const completedEvents = sortedEvents.filter(e => e.completed)

  if (safeEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <CalendarIcon size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Events Scheduled</p>
          <p className="text-sm mt-2">Ask AI to schedule reminders or events</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Calendar</h2>
        <span className="text-sm text-gray-500">
          {upcomingEvents.length} upcoming
        </span>
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
                onDelete={handleDeleteEvent}
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
                onDelete={handleDeleteEvent}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({ 
  event, 
  onDelete, 
  onToggleComplete 
}: { 
  event: any
  onDelete: (id: string) => void
  onToggleComplete: (id: string) => void
}) {
  const eventDate = new Date(event.datetime)
  const isToday = eventDate.toDateString() === new Date().toDateString()
  const isPast = eventDate < new Date()

  return (
    <div 
      className={`
        bg-white rounded-lg border p-4 transition-all
        ${event.completed ? 'border-green-200 bg-green-50' : 'border-gray-200'}
        ${isToday && !event.completed ? 'border-blue-300 bg-blue-50' : ''}
      `}
    >
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
            onClick={() => onDelete(event.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete event"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export const InteractableCalendar = withInteractable(Calendar, {
  componentName: "Calendar",
  description: "Scheduled events and reminders. AI can create events, link them to collections, reschedule, or mark as complete. Each event can have notes and linked items.",
  propsSchema: CalendarPropsSchema,
})