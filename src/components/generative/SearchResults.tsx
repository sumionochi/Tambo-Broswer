// components/generative/SearchResults.tsx
// REDESIGNED: Cream/Sage palette, polished result cards, soft transitions
'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useTamboStreamStatus } from '@tambo-ai/react'
import { ExternalLink, Bookmark, Calendar, FileText, Clock, TrendingUp, Sparkles, Search as SearchIcon } from 'lucide-react'
import { QuickActionDialog } from '@/components/dialog/QuickActionDialog'

export const SearchResultsPropsSchema = z.object({
    searchRequest: z.object({
      query: z.string().nullable().default('').describe("Search query text"),
      filters: z.object({
        num: z.number().optional().describe("Number of results"),
        freshness: z.enum(['day', 'week', 'month']).optional().describe("Freshness filter"),
      }).optional(),
    }).nullable().optional().describe("Search parameters - component will fetch data"),
  })

// Tambo-safe: handle undefined props during streaming
const _pSearchResults = SearchResultsPropsSchema.parse.bind(SearchResultsPropsSchema);
const _spSearchResults = SearchResultsPropsSchema.safeParse.bind(SearchResultsPropsSchema);
(SearchResultsPropsSchema as any).parse = (d: unknown, p?: any) => _pSearchResults(d ?? {}, p);
(SearchResultsPropsSchema as any).safeParse = (d: unknown, p?: any) => _spSearchResults(d ?? {}, p);

type SearchResultsProps = z.infer<typeof SearchResultsPropsSchema>

interface SearchResult {
  id: string; title: string; url: string; snippet: string; thumbnail?: string;
  source: string; position?: number; date?: string; domain?: string;
}

interface QuickActionState {
  isOpen: boolean; action: 'bookmark' | 'schedule' | 'note' | null; item: any;
}

export function SearchResults({ searchRequest }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [quickAction, setQuickAction] = useState<QuickActionState>({ isOpen: false, action: null, item: null })

  const { streamStatus } = useTamboStreamStatus()
  const isStreaming = !streamStatus.isSuccess && !streamStatus.isError

  useEffect(() => {
    if (!searchRequest?.query || isStreaming) return
    const fetchResults = async () => {
      setLoading(true); setError(null)
      try {
        const response = await fetch('/api/search/web', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(searchRequest) })
        if (!response.ok) throw new Error('Search failed')
        const data = await response.json()
        const enhanced = (data.results || []).map((r: SearchResult, i: number) => ({ ...r, position: i + 1, domain: new URL(r.url).hostname.replace('www.', '') }))
        setResults(enhanced)
      } catch (err: any) { setError(err.message) }
      finally { setLoading(false) }
    }
    fetchResults()
  }, [searchRequest?.query, isStreaming])

  const handleQuickAction = (action: 'bookmark' | 'schedule' | 'note', result: SearchResult) => {
    setQuickAction({ isOpen: true, action, item: { title: result.title, url: result.url, snippet: result.snippet, type: 'article' as const, thumbnail: result.thumbnail } })
  }

  /* ── Streaming ── */
  if (isStreaming) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--fs-text-primary)' }}>Searching the web...</p>
          <p className="text-xs mt-1" style={{ color: 'var(--fs-text-muted)' }}>Fetching results from Google</p>
        </div>
      </div>
    )
  }

  /* ── Loading Skeleton ── */
  if (loading) {
    return (
      <div className="space-y-4 fs-stagger">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl p-5 animate-pulse fs-animate-in"
            style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-xl shrink-0" style={{ background: 'var(--fs-cream-300)' }} />
              <div className="flex-1 space-y-3">
                <div className="h-5 rounded-lg w-3/4" style={{ background: 'var(--fs-cream-300)' }} />
                <div className="h-3 rounded-lg w-full" style={{ background: 'var(--fs-cream-200)' }} />
                <div className="h-3 rounded-lg w-5/6" style={{ background: 'var(--fs-cream-200)' }} />
                <div className="flex gap-2 mt-3">
                  <div className="h-7 rounded-lg w-20" style={{ background: 'var(--fs-cream-300)' }} />
                  <div className="h-7 rounded-lg w-20" style={{ background: 'var(--fs-cream-300)' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="rounded-2xl p-6 text-center fs-animate-in" style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
        <div className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEE2E2' }}>
          <span className="text-lg">⚠️</span>
        </div>
        <p className="font-medium" style={{ color: '#B91C1C' }}>Search Error</p>
        <p className="text-sm mt-1" style={{ color: '#DC2626' }}>{error}</p>
      </div>
    )
  }

  /* ── Empty ── */
  if (results.length === 0) {
    return (
      <div className="text-center py-12 fs-animate-in">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
          <SearchIcon size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
        </div>
        <p className="font-semibold text-lg" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>No results found</p>
        <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>Try a different search query for &ldquo;{searchRequest?.query}&rdquo;</p>
      </div>
    )
  }

  /* ── Results ── */
  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 fs-animate-in">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
              <Sparkles size={18} style={{ color: 'var(--fs-sage-500)' }} />
              Search Results
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              Found <span className="font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{results.length}</span> results for{' '}
              <span className="font-semibold" style={{ color: 'var(--fs-sage-600)' }}>&ldquo;{searchRequest?.query}&rdquo;</span>
            </p>
          </div>
        </div>

        {/* Result Cards */}
        <div className="space-y-3 fs-stagger">
          {results.map((result) => {
            const isHovered = hoveredId === result.id
            const isTopResult = result.position && result.position <= 3
            return (
              <div key={result.id}
                onMouseEnter={() => setHoveredId(result.id)} onMouseLeave={() => setHoveredId(null)}
                className="group relative rounded-2xl transition-all fs-animate-in overflow-hidden"
                style={{
                  background: 'var(--fs-cream-50)',
                  border: isHovered ? '2px solid var(--fs-sage-400)' : '2px solid var(--fs-border-light)',
                  boxShadow: isHovered ? 'var(--fs-shadow-md)' : 'var(--fs-shadow-sm)',
                  transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                  transitionDuration: 'var(--fs-duration-normal)', transitionTimingFunction: 'var(--fs-ease-out)',
                }}>

                {/* Top Result Badge */}
                {isTopResult && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-bl-xl flex items-center gap-1"
                      style={{ background: 'var(--fs-sage-600)', color: 'white' }}>
                      <TrendingUp size={10} /> Top {result.position}
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    {result.thumbnail && (
                      <div className="shrink-0">
                        <div className="w-24 h-24 rounded-xl overflow-hidden" style={{ border: '1px solid var(--fs-border-light)' }}>
                          <img src={result.thumbnail} alt={result.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            style={{ transitionDuration: 'var(--fs-duration-slow)' }} />
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Meta */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                          style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)' }}>
                          #{result.position}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>{result.domain}</span>
                        {result.date && (
                          <>
                            <span style={{ color: 'var(--fs-border-light)' }}>·</span>
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fs-text-muted)' }}>
                              <Clock size={10} strokeWidth={1.8} /> {result.date}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Title */}
                      <a href={result.url} target="_blank" rel="noopener noreferrer"
                        className="group/link inline-flex items-start gap-2 mb-2">
                        <h4 className="font-semibold line-clamp-2 transition-colors"
                          style={{ color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fs-sage-700)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-text-primary)' }}>
                          {result.title}
                        </h4>
                        <ExternalLink size={13} className="shrink-0 mt-1 opacity-0 group-hover/link:opacity-100 transition-opacity" style={{ color: 'var(--fs-sage-500)' }} />
                      </a>

                      {/* Snippet */}
                      <p className="text-sm line-clamp-2 leading-relaxed mb-3" style={{ color: 'var(--fs-text-secondary)' }}>{result.snippet}</p>

                      {/* Source */}
                      <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--fs-text-muted)' }}>
                        <span className="font-medium">{result.source}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <ActionPill icon={Bookmark} label="Bookmark" onClick={() => handleQuickAction('bookmark', result)}
                          hoverBg="var(--fs-sage-50)" hoverColor="var(--fs-sage-700)" />
                        <ActionPill icon={Calendar} label="Schedule" onClick={() => handleQuickAction('schedule', result)}
                          hoverBg="var(--fs-sage-50)" hoverColor="var(--fs-sage-700)" />
                        <ActionPill icon={FileText} label="Save Note" onClick={() => handleQuickAction('note', result)}
                          hoverBg="var(--fs-sage-50)" hoverColor="var(--fs-sage-700)" />
                        <a href={result.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
                          style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)', transitionDuration: 'var(--fs-duration-fast)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-100)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-50)' }}>
                          <ExternalLink size={12} /> Visit
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {quickAction.isOpen && quickAction.action && (
        <QuickActionDialog isOpen={quickAction.isOpen} onClose={() => setQuickAction({ isOpen: false, action: null, item: null })} action={quickAction.action} item={quickAction.item} />
      )}
    </>
  )
}

function ActionPill({ icon: Icon, label, onClick, hoverBg, hoverColor }: {
  icon: any; label: string; onClick: () => void; hoverBg: string; hoverColor: string;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
      style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)'; e.currentTarget.style.color = 'var(--fs-text-secondary)' }}>
      <Icon size={12} strokeWidth={1.8} /> {label}
    </button>
  )
}

export const searchResultsComponent = {
  name: 'SearchResults',
  description: 'Displays web search results from Google with rich metadata, thumbnails, and quick actions. Features include bookmarking, scheduling, and note-taking for each result.',
  component: SearchResults,
  propsSchema: SearchResultsPropsSchema,
}