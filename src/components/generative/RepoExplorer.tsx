// components/generative/RepoExplorer.tsx
// REDESIGNED: Cream/Sage palette, polished repo cards, themed badges & stats
'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useTamboStreamStatus } from '@tambo-ai/react'
import {
  Star, GitFork, Code, ExternalLink, Bookmark, Eye, GitBranch,
  Calendar, FileText, TrendingUp, Award, Clock, Sparkles
} from 'lucide-react'
import { QuickActionDialog } from '@/components/dialog/QuickActionDialog'

export const RepoExplorerPropsSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    searchRequest: z.object({
      query: z.string().nullable().default('').describe('Search query for repositories'),
      language: z.string().optional().describe('Programming language filter'),
      stars: z.number().optional().describe('Minimum stars filter'),
      sort: z.enum(['stars', 'forks', 'updated']).optional().describe('Sort order'),
    }).nullable().optional().describe('GitHub repository search parameters'),
  })
)

type RepoExplorerProps = z.infer<typeof RepoExplorerPropsSchema>

interface GitHubRepo {
  id: string; name: string; fullName: string; description: string; url: string;
  stars: number; forks: number; language: string; updatedAt: string; owner: string;
  watchers?: number; openIssues?: number; topics?: string[]; license?: string; size?: number;
}

interface QuickActionState { isOpen: boolean; action: 'bookmark' | 'schedule' | 'note' | null; item: any }

const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95', 'C++': '#f34b7d',
  C: '#555555', 'C#': '#178600', Swift: '#ffac45', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883', React: '#61dafb',
}

export function RepoExplorer({ searchRequest }: RepoExplorerProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [quickAction, setQuickAction] = useState<QuickActionState>({ isOpen: false, action: null, item: null })

  const { streamStatus } = useTamboStreamStatus()
  const isStreaming = !streamStatus.isSuccess && !streamStatus.isError

  useEffect(() => {
    if (!searchRequest?.query || isStreaming) return
    const fetchRepos = async () => {
      setLoading(true); setError(null)
      try {
        const response = await fetch('/api/search/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(searchRequest) })
        if (!response.ok) throw new Error('GitHub search failed')
        const data = await response.json()
        setRepos(data.repos ?? [])
      } catch (err: any) { setError(err.message ?? 'Unknown error') }
      finally { setLoading(false) }
    }
    fetchRepos()
  }, [searchRequest?.query, isStreaming])

  const handleQuickAction = (action: 'bookmark' | 'schedule' | 'note', repo: GitHubRepo) => {
    setQuickAction({ isOpen: true, action, item: { title: repo.fullName, url: repo.url, snippet: repo.description, type: 'repo' as const } })
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDate = (dateString: string): string => {
    const diffDays = Math.ceil(Math.abs(Date.now() - new Date(dateString).getTime()) / 86400000)
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  /* ── Streaming ── */
  if (isStreaming) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--fs-text-primary)' }}>Searching GitHub...</p>
          <p className="text-xs mt-1" style={{ color: 'var(--fs-text-muted)' }}>Finding the best repositories</p>
        </div>
      </div>
    )
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-4 fs-stagger">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl p-6 animate-pulse fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl" style={{ background: 'var(--fs-cream-300)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-5 rounded-lg w-48" style={{ background: 'var(--fs-cream-300)' }} />
                <div className="h-3 rounded-lg w-32" style={{ background: 'var(--fs-cream-200)' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded-lg w-full" style={{ background: 'var(--fs-cream-200)' }} />
              <div className="h-3 rounded-lg w-5/6" style={{ background: 'var(--fs-cream-200)' }} />
            </div>
            <div className="flex gap-4 mt-4">
              <div className="h-4 rounded-lg w-16" style={{ background: 'var(--fs-cream-300)' }} />
              <div className="h-4 rounded-lg w-16" style={{ background: 'var(--fs-cream-300)' }} />
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
        <p className="font-medium" style={{ color: '#B91C1C' }}>GitHub Search Error</p>
        <p className="text-sm mt-1" style={{ color: '#DC2626' }}>{error}</p>
      </div>
    )
  }

  /* ── Empty ── */
  if (repos.length === 0) {
    return (
      <div className="text-center py-12 fs-animate-in">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
          <Code size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
        </div>
        <p className="font-semibold text-lg" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>No repositories found</p>
        <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>Try a different search for &ldquo;{searchRequest?.query}&rdquo;</p>
      </div>
    )
  }

  /* ── Results ── */
  const isTopRepoTrending = repos[0] && repos[0].stars > 1000

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 fs-animate-in">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
              <Code size={18} style={{ color: 'var(--fs-sage-600)' }} strokeWidth={1.8} />
              GitHub Repositories
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              Found <span className="font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{repos.length}</span> repositories for{' '}
              <span className="font-semibold" style={{ color: 'var(--fs-sage-600)' }}>&ldquo;{searchRequest?.query}&rdquo;</span>
              {searchRequest?.language && <span className="ml-1">in <span className="font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{searchRequest?.language}</span></span>}
            </p>
          </div>
        </div>

        {/* Repo Cards */}
        <div className="space-y-3 fs-stagger">
          {repos.map((repo, index) => {
            const isHovered = hoveredId === repo.id
            const isTop = index === 0
            const languageColor = languageColors[repo.language] || '#858585'
            const isTrending = repo.stars > 5000

            return (
              <div key={repo.id}
                onMouseEnter={() => setHoveredId(repo.id)} onMouseLeave={() => setHoveredId(null)}
                className="group relative rounded-2xl transition-all fs-animate-in overflow-hidden"
                style={{
                  background: 'var(--fs-cream-50)',
                  border: isHovered ? '2px solid var(--fs-sage-400)' : '2px solid var(--fs-border-light)',
                  boxShadow: isHovered ? 'var(--fs-shadow-md)' : 'var(--fs-shadow-sm)',
                  transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                  transitionDuration: 'var(--fs-duration-normal)', transitionTimingFunction: 'var(--fs-ease-out)',
                }}>

                {/* Trending Badge */}
                {isTrending && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-bl-xl flex items-center gap-1"
                      style={{ background: 'var(--fs-sage-600)', color: 'white' }}>
                      <TrendingUp size={10} /> Trending
                    </div>
                  </div>
                )}

                {/* Top Match Badge */}
                {isTop && (
                  <div className="absolute top-0 left-0 z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-br-xl flex items-center gap-1"
                      style={{ background: 'var(--fs-sage-800)', color: 'white' }}>
                      <Award size={10} /> Top Match
                    </div>
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="shrink-0">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base"
                          style={{ background: 'var(--fs-sage-700)', boxShadow: 'var(--fs-shadow-sm)' }}>
                          {repo.owner.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="group/link inline-flex items-center gap-2 mb-0.5">
                          <h4 className="font-bold text-base truncate transition-colors"
                            style={{ color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fs-sage-700)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-text-primary)' }}>
                            {repo.fullName}
                          </h4>
                          <ExternalLink size={14} className="shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" style={{ color: 'var(--fs-sage-500)' }} />
                        </a>
                        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--fs-text-muted)' }}>
                          <span>by {repo.owner}</span>
                          {repo.license && <><span style={{ color: 'var(--fs-border-light)' }}>·</span><span>{repo.license}</span></>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {repo.description && (
                    <p className="text-sm leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--fs-text-secondary)' }}>{repo.description}</p>
                  )}

                  {/* Topics */}
                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {repo.topics.slice(0, 5).map((topic) => (
                        <span key={topic} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                          style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)', border: '1px solid var(--fs-sage-200)' }}>
                          {topic}
                        </span>
                      ))}
                      {repo.topics.length > 5 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg"
                          style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-muted)' }}>
                          +{repo.topics.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-4 pb-4"
                    style={{ borderBottom: '1px solid var(--fs-border-light)' }}>
                    {repo.language && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: languageColor }} />
                        <span className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>{repo.language}</span>
                      </div>
                    )}
                    <StatBadge icon={Star} value={formatNumber(repo.stars)} color="var(--fs-sage-600)" fill />
                    <StatBadge icon={GitFork} value={formatNumber(repo.forks)} color="var(--fs-sage-500)" />
                    {repo.watchers !== undefined && <StatBadge icon={Eye} value={formatNumber(repo.watchers)} color="var(--fs-text-muted)" />}
                    {repo.openIssues !== undefined && repo.openIssues > 0 && <StatBadge icon={GitBranch} value={`${formatNumber(repo.openIssues)} issues`} color="var(--fs-sage-500)" />}
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--fs-text-muted)' }}>
                      <Clock size={13} strokeWidth={1.8} />
                      <span className="text-xs">Updated {formatDate(repo.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <ActionPill icon={Bookmark} label="Bookmark" onClick={() => handleQuickAction('bookmark', repo)} />
                    <ActionPill icon={Calendar} label="Schedule" onClick={() => handleQuickAction('schedule', repo)} />
                    <ActionPill icon={FileText} label="Save Note" onClick={() => handleQuickAction('note', repo)} />
                    <a href={repo.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
                      style={{ background: 'var(--fs-sage-600)', color: 'white', transitionDuration: 'var(--fs-duration-fast)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}>
                      <Code size={12} /> View Code
                    </a>
                    <a href={`${repo.url}/fork`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
                      style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-300)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}>
                      <GitFork size={12} /> Fork
                    </a>
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

/* ── Helpers ── */
function StatBadge({ icon: Icon, value, color, fill }: { icon: any; value: string; color: string; fill?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} strokeWidth={1.8} style={{ color, fill: fill ? color : 'none' }} />
      <span className="font-semibold text-sm" style={{ color: 'var(--fs-text-primary)' }}>{value}</span>
    </div>
  )
}

function ActionPill({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
      style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-50)'; e.currentTarget.style.color = 'var(--fs-sage-700)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)'; e.currentTarget.style.color = 'var(--fs-text-secondary)' }}>
      <Icon size={12} strokeWidth={1.8} /> {label}
    </button>
  )
}

export const repoExplorerComponent = {
  name: 'RepoExplorer',
  description: 'Displays GitHub repositories with comprehensive metadata including stars, forks, language, topics, and activity. Features quick actions for bookmarking, scheduling, and note-taking.',
  component: RepoExplorer,
  propsSchema: RepoExplorerPropsSchema,
}