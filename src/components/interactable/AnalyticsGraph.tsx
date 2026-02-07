// components/interactable/AnalyticsGraph.tsx
// REDESIGNED: Cream/Sage palette, polished mode cards, soft transitions
'use client'

import { z } from 'zod'
import { useState } from 'react'
import { Graph } from '@/components/tambo/graph'
import { BarChart3, TrendingUp, Code, Search, Loader, Sparkles } from 'lucide-react'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'
import type { TamboComponent } from '@tambo-ai/react'

export const AnalyticsGraphPropsSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    analysisType: z.enum(['search-trends', 'github-comparison', 'language-trends', 'source-analysis']).optional().nullable().describe("Type of analysis to perform"),
    queries: z.array(z.string().nullable().default('')).optional().nullable().describe("Topics or repositories to analyze"),
  })
)

type AnalyticsGraphProps = z.infer<typeof AnalyticsGraphPropsSchema>
type AnalysisMode = 'search-trends' | 'github-comparison' | 'language-trends' | 'source-analysis'

interface ChartData {
  title: string
  data: { type: 'bar' | 'line' | 'pie'; labels: string[]; datasets: Array<{ label: string; data: number[]; color?: string }> }
}

export function AnalyticsGraph({ analysisType: initialType, queries: initialQueries }: AnalyticsGraphProps) {
  const [mode, setMode] = useState<AnalysisMode>(initialType || 'github-comparison')
  const [inputValue, setInputValue] = useState('')
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateColors = (count: number): string[] => {
    const colors = [
      'rgba(91, 143, 91, 0.75)', 'rgba(116, 168, 116, 0.75)', 'rgba(61, 100, 61, 0.75)',
      'rgba(212, 204, 188, 0.85)', 'rgba(157, 195, 157, 0.75)', 'rgba(74, 122, 74, 0.75)',
      'rgba(196, 219, 196, 0.75)', 'rgba(51, 82, 51, 0.75)',
    ]
    return colors.slice(0, count)
  }

  const analyzeSearchTrends = async (topics: string[]) => {
    const results = []
    for (const topic of topics) {
      try {
        const response = await fetch('/api/search/web', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: topic, filters: { num: 10 } }) })
        if (!response.ok) throw new Error('Search failed')
        const data = await response.json()
        results.push({ topic: topic.trim(), count: data.results?.length || 0 })
      } catch { results.push({ topic: topic.trim(), count: 0 }) }
    }
    setChartData({ title: 'Search Interest Comparison', data: { type: 'bar', labels: results.map(r => r.topic), datasets: [{ label: 'Search Results', data: results.map(r => r.count), color: generateColors(1)[0] }] } })
  }

  const compareGitHubRepos = async (queries: string[]) => {
    const repos = []
    for (const query of queries) {
      try {
        const response = await fetch('/api/search/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim(), sort: 'stars' }) })
        if (!response.ok) throw new Error('GitHub search failed')
        const data = await response.json()
        const topRepo = data.repos?.[0]
        if (topRepo) repos.push({ name: topRepo.name, stars: topRepo.stars, forks: topRepo.forks, watchers: topRepo.watchers || 0 })
      } catch { /* skip */ }
    }
    if (repos.length === 0) throw new Error('No repositories found')
    setChartData({ title: 'GitHub Repository Comparison', data: { type: 'bar', labels: repos.map(r => r.name), datasets: [
      { label: 'Stars', data: repos.map(r => r.stars), color: 'rgba(91, 143, 91, 0.7)' },
      { label: 'Forks', data: repos.map(r => r.forks), color: 'rgba(157, 195, 157, 0.7)' },
      { label: 'Watchers', data: repos.map(r => r.watchers), color: 'rgba(212, 204, 188, 0.8)' },
    ] } })
  }

  const analyzeLanguageTrends = async (topic: string) => {
    const response = await fetch('/api/search/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: topic, sort: 'stars' }) })
    if (!response.ok) throw new Error('GitHub search failed')
    const data = await response.json()
    const repos = data.repos || []
    if (repos.length === 0) throw new Error('No repositories found')
    const languageCounts: Record<string, number> = {}
    repos.forEach((repo: any) => { if (repo.language) languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1 })
    const sorted = Object.entries(languageCounts).sort(([, a], [, b]) => b - a).slice(0, 8)
    setChartData({ title: `Programming Languages in "${topic}"`, data: { type: 'pie', labels: sorted.map(([l]) => l), datasets: [{ label: 'Repositories', data: sorted.map(([, c]) => c), color: 'rgba(91, 143, 91, 0.8)' }] } })
  }

  const analyzeSearchSources = async (query: string) => {
    const response = await fetch('/api/search/web', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, filters: { num: 10 } }) })
    if (!response.ok) throw new Error('Search failed')
    const data = await response.json()
    const results = data.results || []
    if (results.length === 0) throw new Error('No search results found')
    const categories: Record<string, number> = { News: 0, Academic: 0, Blogs: 0, Commercial: 0, Other: 0 }
    results.forEach((result: any) => {
      const source = result.source?.toLowerCase() || ''; const url = result.url?.toLowerCase() || ''
      if (source.includes('news') || source.includes('times') || source.includes('post')) categories.News++
      else if (url.includes('.edu') || source.includes('arxiv')) categories.Academic++
      else if (source.includes('blog') || source.includes('medium') || url.includes('blog')) categories.Blogs++
      else if (url.includes('.com') || url.includes('.io')) categories.Commercial++
      else categories.Other++
    })
    const filtered = Object.entries(categories).filter(([, c]) => c > 0)
    setChartData({ title: `Source Analysis: "${query}"`, data: { type: 'bar', labels: filtered.map(([c]) => c), datasets: [{ label: 'Sources', data: filtered.map(([, c]) => c), color: generateColors(1)[0] }] } })
  }

  const handleAnalyze = async () => {
    if (!inputValue.trim()) { setError('Please enter topics to analyze'); return }
    setLoading(true); setError(null); setChartData(null)
    try {
      const queries = inputValue.split(',').map(q => q.trim()).filter(Boolean)
      if (queries.length === 0) throw new Error('Please enter valid topics')
      switch (mode) {
        case 'search-trends': await analyzeSearchTrends(queries); break
        case 'github-comparison': await compareGitHubRepos(queries); break
        case 'language-trends': await analyzeLanguageTrends(queries[0]); break
        case 'source-analysis': await analyzeSearchSources(queries[0]); break
      }
    } catch (err: any) { setError(err.message || 'Analysis failed') }
    finally { setLoading(false) }
  }

  const modes = [
    { id: 'github-comparison' as const, label: 'GitHub Compare', icon: Code, description: 'Compare repo statistics', placeholder: 'e.g., react, vue, svelte' },
    { id: 'search-trends' as const, label: 'Search Trends', icon: TrendingUp, description: 'Compare search interest', placeholder: 'e.g., AI startups, ML companies' },
    { id: 'language-trends' as const, label: 'Language Trends', icon: BarChart3, description: 'Analyze programming languages', placeholder: 'e.g., machine learning' },
    { id: 'source-analysis' as const, label: 'Source Analysis', icon: Search, description: 'Categorize search sources', placeholder: 'e.g., quantum computing' },
  ]
  const currentMode = modes.find(m => m.id === mode)

  return (
    <div className="p-6 md:p-8 h-full overflow-auto fs-scrollbar" style={{ background: 'var(--fs-cream-100)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between fs-animate-in">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>Analytics Dashboard</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>Analyze search trends, GitHub repos, and more</p>
          </div>
          <EditWithTamboButton tooltip="Modify analysis with AI" description="Change analysis parameters or request different comparisons using natural language" />
        </div>

        {/* Mode Selector */}
        <ModeSelector modes={modes} active={mode} onSelect={(id) => { setMode(id); setChartData(null); setError(null) }} />

        {/* Input */}
        <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', animationDelay: '50ms' }}>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fs-text-muted)' }}>
                {mode === 'github-comparison' ? 'Repositories to Compare' : mode === 'search-trends' ? 'Topics to Compare' : mode === 'language-trends' ? 'Topic to Analyze' : 'Search Query'}
              </label>
              <StyledInput value={inputValue} onChange={setInputValue} onEnter={handleAnalyze}
                placeholder={currentMode?.placeholder || ''} />
              <p className="text-xs mt-2" style={{ color: 'var(--fs-text-muted)' }}>
                {mode === 'github-comparison' || mode === 'search-trends' ? 'Separate multiple items with commas' : 'Enter a single topic to analyze'}
              </p>
            </div>
            <PrimaryButton onClick={handleAnalyze} disabled={loading || !inputValue.trim()} loading={loading}
              icon={BarChart3} label="Analyze" loadingLabel="Analyzing..." className="mt-7" />
          </div>
        </div>

        {error && <ErrorBanner message={error} />}
        {loading && <LoadingCard message="Analyzing data..." sub="This may take a few moments" />}

        {chartData && !loading && (
          <div className="rounded-2xl p-6 fs-animate-scale-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', boxShadow: 'var(--fs-shadow-sm)' }}>
            <Graph title={chartData.title} data={chartData.data} variant="bordered" size="lg" showLegend={true} />
          </div>
        )}

        {!chartData && !loading && !error && <EmptyState icon={BarChart3} title="Ready to Analyze" description="Select an analysis mode, enter your topics, and click Analyze to generate insights" />}

        <TipBanner text="This analytics dashboard uses real data from Google Search and GitHub APIs for instant market research and competitive analysis." />
      </div>
    </div>
  )
}

/* ─────── Shared Sub-Components ─────── */

function ModeSelector<T extends string>({ modes, active, onSelect }: {
  modes: Array<{ id: T; label: string; icon: any; description: string }>; active: T; onSelect: (id: T) => void;
}) {
  return (
    <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--fs-text-muted)', letterSpacing: '0.08em' }}>Analysis Mode</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {modes.map((m) => {
          const Icon = m.icon; const isActive = active === m.id
          return (
            <button key={m.id} onClick={() => onSelect(m.id)} className="p-4 rounded-xl text-left transition-all"
              style={{
                border: isActive ? '2px solid var(--fs-sage-500)' : '2px solid var(--fs-border-light)',
                background: isActive ? 'var(--fs-sage-50)' : 'var(--fs-cream-50)',
                transitionDuration: 'var(--fs-duration-normal)', transitionTimingFunction: 'var(--fs-ease-out)',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--fs-sage-300)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--fs-border-light)' }}>
              <Icon size={18} strokeWidth={1.8} style={{ color: isActive ? 'var(--fs-sage-600)' : 'var(--fs-text-muted)' }} />
              <p className="font-medium mt-2 text-sm" style={{ color: isActive ? 'var(--fs-sage-800)' : 'var(--fs-text-primary)' }}>{m.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>{m.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StyledInput({ value, onChange, onEnter, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; onEnter: () => void; placeholder: string; disabled?: boolean;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter()} placeholder={placeholder} disabled={disabled}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all disabled:opacity-60"
      style={{ background: 'var(--fs-cream-100)', border: '2px solid var(--fs-border-light)', color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--fs-sage-400)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)' }} />
  )
}

function PrimaryButton({ onClick, disabled, loading, icon: Icon, label, loadingLabel, className }: {
  onClick: () => void; disabled: boolean; loading: boolean; icon: any; label: string; loadingLabel: string; className?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className || ''}`}
      style={{ background: 'var(--fs-sage-600)', color: 'white', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)' }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = 'var(--fs-sage-700)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}>
      {loading ? <><Loader size={16} className="animate-spin" /> {loadingLabel}</> : <><Icon size={16} /> {label}</>}
    </button>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-2xl p-4 fs-animate-in" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}><p className="text-sm font-medium" style={{ color: '#B91C1C' }}>⚠️ {message}</p></div>
}

function LoadingCard({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="rounded-2xl p-12 text-center fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
      <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
      <p className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>{message}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>{sub}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-2xl p-12 text-center fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
      <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
        <Icon size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>{title}</h3>
      <p className="text-sm" style={{ color: 'var(--fs-text-muted)', maxWidth: 360, margin: '0 auto' }}>{description}</p>
    </div>
  )
}

function TipBanner({ text }: { text: string }) {
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3 fs-animate-in" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)', animationDelay: '150ms' }}>
      <Sparkles size={18} style={{ color: 'var(--fs-sage-600)' }} className="shrink-0 mt-0.5" />
      <p className="text-sm" style={{ color: 'var(--fs-sage-800)' }}><span className="font-semibold">Tip:</span> {text}</p>
    </div>
  )
}

export const analyticsGraphComponent: TamboComponent = {
  name: 'AnalyticsGraph',
  description: 'Advanced analytics dashboard for comparing search trends, GitHub repositories, programming languages, and source types using real-time data from Google and GitHub APIs.',
  component: AnalyticsGraph,
  propsSchema: AnalyticsGraphPropsSchema,
}