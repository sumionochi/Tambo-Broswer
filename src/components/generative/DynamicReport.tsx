// components/generative/DynamicReport.tsx
// REDESIGNED: Cream/Sage palette, sage-tinted sections, polished layout
'use client'

import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useTamboStreamStatus } from '@tambo-ai/react'
import {
  FileText, Loader, Bookmark, ChevronDown, ChevronUp, BarChart3,
  Table2, List, Type, Calendar, ExternalLink, Copy, CheckCircle2, Sparkles,
} from 'lucide-react'

export const DynamicReportPropsSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    reportId: z.string().nullable().optional().default('').describe('ID of the report to display'),
  })
)

type DynamicReportProps = z.infer<typeof DynamicReportPropsSchema>

interface TextSection { id: string; type: 'text'; title: string; content: string }
interface TableSection { id: string; type: 'table'; title: string; content: { headers: string[]; rows: string[][] } }
interface ChartSection { id: string; type: 'chart'; title: string; content: { chartType: 'bar' | 'line' | 'pie'; labels: string[]; datasets: Array<{ label: string; data: number[]; backgroundColor?: string }> } }
interface ListSection { id: string; type: 'list'; title: string; content: { items: string[] } }
type ReportSection = TextSection | TableSection | ChartSection | ListSection

interface ReportData {
  id: string; title: string; summary: string; format: string; sections: ReportSection[];
  sourceData: any; createdAt: string; updatedAt: string; workflowId?: string; sourceCollectionId?: string;
}

const sectionIcons: Record<string, any> = { text: Type, table: Table2, chart: BarChart3, list: List }

// Sage-tinted chart palette
const chartColors = [
  'rgba(91,143,91,0.75)',  'rgba(120,160,100,0.70)',  'rgba(75,120,75,0.65)',
  'rgba(140,175,120,0.70)', 'rgba(60,100,60,0.60)',   'rgba(110,150,90,0.70)',
  'rgba(85,130,85,0.65)',   'rgba(130,165,110,0.70)',
]

const formatBadgeConfig: Record<string, { bg: string; color: string }> = {
  comparison: { bg: 'var(--fs-sage-100)', color: 'var(--fs-sage-800)' },
  analysis:   { bg: 'var(--fs-sage-50)',  color: 'var(--fs-sage-700)' },
  timeline:   { bg: 'var(--fs-cream-300)', color: 'var(--fs-text-primary)' },
  summary:    { bg: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)' },
}

export function DynamicReport({ reportId }: DynamicReportProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const { streamStatus } = useTamboStreamStatus()
  const isStreaming = !streamStatus.isSuccess && !streamStatus.isError

  useEffect(() => {
    if (isStreaming || !reportId) return
    const fetchReport = async () => {
      setLoading(true); setError(null)
      try {
        const response = await fetch(`/api/reports/${reportId}`)
        if (!response.ok) throw new Error('Failed to load report')
        const data = await response.json()
        setReport(data.report)
      } catch (err: any) { setError(err.message) }
      finally { setLoading(false) }
    }
    fetchReport()
  }, [reportId, isStreaming])

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => { const next = new Set(prev); next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId); return next })
  }

  const handleCopyReport = async () => {
    if (!report) return
    const textContent = [`# ${report.title}`, '', report.summary, '',
      ...report.sections.map((section) => {
        let content = `## ${section.title}\n`
        switch (section.type) {
          case 'text': content += section.content; break
          case 'table': { const { headers, rows } = section.content; content += `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`; rows.forEach((row) => { content += `| ${row.join(' | ')} |\n` }); break }
          case 'list': section.content.items.forEach((item) => { content += `- ${item}\n` }); break
          case 'chart': content += `[Chart: ${section.content.chartType}]\n`; section.content.labels.forEach((label, i) => { const values = section.content.datasets.map((ds) => `${ds.label}: ${ds.data[i]}`).join(', '); content += `${label}: ${values}\n` }); break
        }
        return content
      }),
    ].join('\n')
    await navigator.clipboard.writeText(textContent)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  /* ── Streaming ── */
  if (isStreaming) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>Preparing report...</p>
        </div>
      </div>
    )
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="rounded-2xl p-8 fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '2px solid var(--fs-border-light)' }}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
            <p className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>Loading report...</p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (error || !report) {
    return (
      <div className="rounded-2xl p-6 text-center fs-animate-in" style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
        <div className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEE2E2' }}>
          <FileText size={22} style={{ color: '#DC2626' }} />
        </div>
        <p className="font-medium" style={{ color: '#B91C1C' }}>Failed to load report</p>
        <p className="text-sm mt-1" style={{ color: '#DC2626' }}>{error || 'Report not found'}</p>
      </div>
    )
  }

  const badge = formatBadgeConfig[report.format] || formatBadgeConfig.summary

  /* ── Report ── */
  return (
    <div className="rounded-2xl overflow-hidden fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '2px solid var(--fs-border-light)' }}>

      {/* ── Header ── */}
      <div className="px-6 py-6" style={{ background: 'var(--fs-cream-100)', borderBottom: '1px solid var(--fs-border-light)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
              <FileText size={20} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>{report.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg" style={{ background: badge.bg, color: badge.color }}>{report.format}</span>
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fs-text-muted)' }}>
                  <Calendar size={10} strokeWidth={1.8} />
                  {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>{report.sections.length} sections</span>
              </div>
            </div>
          </div>
          <button onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl transition-all"
            style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)', transitionDuration: 'var(--fs-duration-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-50)'; e.currentTarget.style.color = 'var(--fs-sage-700)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)'; e.currentTarget.style.color = 'var(--fs-text-secondary)' }}>
            {copied ? <><CheckCircle2 size={14} style={{ color: 'var(--fs-sage-600)' }} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>

        {/* Summary */}
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--fs-sage-700)', letterSpacing: '0.08em' }}>Executive Summary</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fs-sage-800)' }}>{report.summary}</p>
        </div>
      </div>

      {/* ── Sections ── */}
      <div>
        {report.sections.map((section, idx) => {
          const SectionIcon = sectionIcons[section.type] || FileText
          const isCollapsed = collapsedSections.has(section.id)
          return (
            <div key={section.id} className="px-6 py-5" style={{ borderBottom: idx < report.sections.length - 1 ? '1px solid var(--fs-border-light)' : 'none' }}>
              <button onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between group">
                <div className="flex items-center gap-2.5">
                  <SectionIcon size={15} strokeWidth={1.8} style={{ color: 'var(--fs-sage-500)' }} />
                  <h3 className="font-semibold text-base" style={{ color: 'var(--fs-text-primary)' }}>{section.title}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-muted)' }}>{section.type}</span>
                </div>
                <div className="transition-colors" style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }}>
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
              </button>
              {!isCollapsed && (
                <div className="mt-4">
                  {section.type === 'text' && <TextContent content={section.content} />}
                  {section.type === 'table' && <TableContent content={section.content} />}
                  {section.type === 'chart' && <ChartContent content={section.content} />}
                  {section.type === 'list' && <ListContent content={section.content} />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-4" style={{ background: 'var(--fs-cream-100)', borderTop: '1px solid var(--fs-border-light)' }}>
        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>
            {report.sourceData?.workflowQuery && <span>Research: &ldquo;{report.sourceData.workflowQuery}&rdquo;</span>}
            {report.sourceData?.collectionName && <span>Collection: &ldquo;{report.sourceData.collectionName}&rdquo;</span>}
          </div>
          <div className="text-xs font-mono" style={{ color: 'var(--fs-text-muted)' }}>Report ID: {report.id.slice(0, 8)}...</div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ Section Renderers ═══════════ */

function TextContent({ content }: { content: string }) {
  return (
    <div className="space-y-3">
      {content.split('\n').map((paragraph, i) => (
        <p key={i} className="text-sm leading-relaxed last:mb-0" style={{ color: 'var(--fs-text-secondary)' }}>{paragraph}</p>
      ))}
    </div>
  )
}

function TableContent({ content }: { content: { headers: string[]; rows: string[][] } }) {
  if (!content?.headers || !content?.rows) return <p className="text-sm italic" style={{ color: 'var(--fs-text-muted)' }}>No table data available</p>
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--fs-border-light)' }}>
      <table className="min-w-full divide-y" style={{ borderColor: 'var(--fs-border-light)' }}>
        <thead>
          <tr style={{ background: 'var(--fs-cream-100)' }}>
            {content.headers.map((header, i) => (
              <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fs-text-muted)', letterSpacing: '0.08em' }}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="transition-colors" style={{ borderBottom: '1px solid var(--fs-border-light)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-100)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className={`px-4 py-3 text-sm ${cellIdx === 0 ? 'font-medium' : ''}`}
                  style={{ color: cellIdx === 0 ? 'var(--fs-text-primary)' : 'var(--fs-text-secondary)' }}>
                  {typeof cell === 'string' && cell.startsWith('http') ? (
                    <a href={cell} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition-colors"
                      style={{ color: 'var(--fs-sage-600)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fs-sage-700)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-sage-600)' }}>
                      Link <ExternalLink size={10} />
                    </a>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChartContent({ content }: { content: { chartType: string; labels: string[]; datasets: Array<{ label: string; data: number[]; backgroundColor?: string }> } }) {
  if (!content?.labels || !content?.datasets) return <p className="text-sm italic" style={{ color: 'var(--fs-text-muted)' }}>No chart data available</p>
  const allValues = content.datasets.flatMap((ds) => ds.data)
  const maxValue = Math.max(...allValues, 1)

  if (content.chartType === 'bar') {
    return (
      <div className="space-y-4">
        {content.datasets.length > 1 && (
          <div className="flex items-center gap-4 flex-wrap">
            {content.datasets.map((ds, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ds.backgroundColor || chartColors[i % chartColors.length] }} />
                <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>{ds.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-3">
          {content.labels.map((label, labelIdx) => (
            <div key={labelIdx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate max-w-[200px]" style={{ color: 'var(--fs-text-primary)' }}>{label}</span>
                <div className="flex items-center gap-3">
                  {content.datasets.map((ds, dsIdx) => (
                    <span key={dsIdx} className="text-xs font-mono" style={{ color: 'var(--fs-text-muted)' }}>
                      {typeof ds.data[labelIdx] === 'number' ? ds.data[labelIdx].toLocaleString() : ds.data[labelIdx]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {content.datasets.map((ds, dsIdx) => {
                  const value = ds.data[labelIdx] || 0
                  const width = maxValue > 0 ? (value / maxValue) * 100 : 0
                  return <div key={dsIdx} className="h-5 rounded-lg transition-all" style={{ width: `${Math.max(width, 1)}%`, backgroundColor: ds.backgroundColor || chartColors[dsIdx % chartColors.length], transitionDuration: '500ms' }} />
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Fallback table for other chart types
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--fs-border-light)' }}>
      <table className="min-w-full">
        <thead><tr style={{ background: 'var(--fs-cream-100)' }}>
          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fs-text-muted)' }}>Label</th>
          {content.datasets.map((ds, i) => <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fs-text-muted)' }}>{ds.label}</th>)}
        </tr></thead>
        <tbody>
          {content.labels.map((label, labelIdx) => (
            <tr key={labelIdx} style={{ borderBottom: '1px solid var(--fs-border-light)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-100)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
              <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--fs-text-primary)' }}>{label}</td>
              {content.datasets.map((ds, dsIdx) => <td key={dsIdx} className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--fs-text-secondary)' }}>
                {typeof ds.data[labelIdx] === 'number' ? ds.data[labelIdx].toLocaleString() : ds.data[labelIdx]}
              </td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListContent({ content }: { content: { items: string[] } }) {
  if (!content?.items || content.items.length === 0) return <p className="text-sm italic" style={{ color: 'var(--fs-text-muted)' }}>No items available</p>
  return (
    <ul className="space-y-2.5">
      {content.items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' }}>
            <span className="text-[10px] font-bold">{i + 1}</span>
          </div>
          <p className="leading-relaxed" style={{ color: 'var(--fs-text-secondary)' }}>{item}</p>
        </li>
      ))}
    </ul>
  )
}

export const dynamicReportComponent = {
  name: 'DynamicReport',
  description: 'Renders an AI-generated research report with structured sections including text, tables, charts, and lists. Fetches report data by ID and displays it with professional formatting.',
  component: DynamicReport,
  propsSchema: DynamicReportPropsSchema,
}