// components/layout/ThreadCollapsible.tsx
// REDESIGNED: Cream/Sage palette, polished sidebar, soft transitions
'use client'

import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ThreadCollapsibleProps {
  collapsed: boolean
  onToggle: () => void
  userId: string
}

interface SearchHistoryItem {
  id: string
  query: string
  source: string
  createdAt: string
  resultsCount: number | null
}

export function ThreadCollapsible({ collapsed, onToggle, userId }: ThreadCollapsibleProps) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadSearchHistory() }, [userId])

  const loadSearchHistory = async () => {
    try {
      const response = await fetch('/api/search-history')
      if (response.ok) {
        const data = await response.json()
        setSearchHistory(data.history || [])
      }
    } catch (error) { console.error('Failed to load search history:', error) }
    finally { setLoading(false) }
  }

  /* ── Collapsed Rail ── */
  if (collapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-4 transition-all"
        style={{ background: 'var(--fs-cream-50)', borderRight: '1px solid var(--fs-border-light)', transitionDuration: 'var(--fs-duration-normal)' }}>
        <button onClick={onToggle}
          className="p-2 rounded-xl transition-all"
          style={{ transitionDuration: 'var(--fs-duration-fast)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
          <ChevronRight size={18} strokeWidth={1.8} style={{ color: 'var(--fs-text-muted)' }} />
        </button>
      </div>
    )
  }

  /* ── Expanded Sidebar ── */
  return (
    <div className="w-64 flex flex-col transition-all"
      style={{ background: 'var(--fs-cream-50)', borderRight: '1px solid var(--fs-border-light)', transitionDuration: 'var(--fs-duration-normal)' }}>

      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4"
        style={{ borderBottom: '1px solid var(--fs-border-light)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--fs-text-primary)' }}>Recent Searches</h2>
        <button onClick={onToggle}
          className="p-1.5 rounded-lg transition-all"
          style={{ transitionDuration: 'var(--fs-duration-fast)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
          <ChevronLeft size={18} strokeWidth={1.8} style={{ color: 'var(--fs-text-muted)' }} />
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 fs-scrollbar">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-3"
              style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
            <p className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>Loading...</p>
          </div>
        ) : searchHistory.length === 0 ? (
          <div className="text-center py-8 fs-animate-in">
            <div className="mx-auto mb-3 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
              <SearchIcon size={18} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--fs-text-secondary)' }}>No searches yet</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>Start searching to see history</p>
          </div>
        ) : (
          searchHistory.map((item) => (
            <button key={item.id}
              className="w-full text-left p-2.5 rounded-xl transition-all group"
              style={{ transitionDuration: 'var(--fs-duration-fast)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
              <div className="flex items-start gap-2">
                <SearchIcon size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" style={{ color: 'var(--fs-sage-400)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--fs-text-primary)' }}>{item.query}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)' }}>
                      {item.source}
                    </span>
                    {item.resultsCount && (
                      <span className="text-[10px]" style={{ color: 'var(--fs-text-muted)' }}>{item.resultsCount} results</span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--fs-text-muted)' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}