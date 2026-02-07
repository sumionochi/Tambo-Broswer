// components/generative/DynamicReport.tsx
'use client'

import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useTamboStreamStatus } from '@tambo-ai/react'
import {
  FileText,
  Loader,
  Download,
  Bookmark,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Table2,
  List,
  Type,
  Calendar,
  ExternalLink,
  Copy,
  CheckCircle2,
} from 'lucide-react'

// ─── Zod Schema ───
export const DynamicReportPropsSchema = z.object({
  reportId: z.string().describe('ID of the report to display'),
})

type DynamicReportProps = z.infer<typeof DynamicReportPropsSchema>

// Section types
interface TextSection {
  id: string
  type: 'text'
  title: string
  content: string
}

interface TableSection {
  id: string
  type: 'table'
  title: string
  content: {
    headers: string[]
    rows: string[][]
  }
}

interface ChartSection {
  id: string
  type: 'chart'
  title: string
  content: {
    chartType: 'bar' | 'line' | 'pie'
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      backgroundColor?: string
    }>
  }
}

interface ListSection {
  id: string
  type: 'list'
  title: string
  content: {
    items: string[]
  }
}

type ReportSection = TextSection | TableSection | ChartSection | ListSection

interface ReportData {
  id: string
  title: string
  summary: string
  format: string
  sections: ReportSection[]
  sourceData: any
  createdAt: string
  updatedAt: string
  workflowId?: string
  sourceCollectionId?: string
}

// Section type → icon mapping
const sectionIcons: Record<string, any> = {
  text: Type,
  table: Table2,
  chart: BarChart3,
  list: List,
}

// Chart colors
const chartColors = [
  'rgba(59, 130, 246, 0.7)',   // blue
  'rgba(168, 85, 247, 0.7)',   // purple
  'rgba(34, 197, 94, 0.7)',    // green
  'rgba(249, 115, 22, 0.7)',   // orange
  'rgba(236, 72, 153, 0.7)',   // pink
  'rgba(20, 184, 166, 0.7)',   // teal
  'rgba(245, 158, 11, 0.7)',   // amber
  'rgba(99, 102, 241, 0.7)',   // indigo
]

// Format badge colors
const formatBadgeColors: Record<string, { bg: string; text: string }> = {
  comparison: { bg: 'bg-blue-100', text: 'text-blue-800' },
  analysis: { bg: 'bg-purple-100', text: 'text-purple-800' },
  timeline: { bg: 'bg-amber-100', text: 'text-amber-800' },
  summary: { bg: 'bg-green-100', text: 'text-green-800' },
}

export function DynamicReport({ reportId }: DynamicReportProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const { streamStatus } = useTamboStreamStatus()
  const isStreaming = !streamStatus.isSuccess && !streamStatus.isError

  // ─── Fetch report data ───
  useEffect(() => {
    if (isStreaming || !reportId) return

    const fetchReport = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/reports/${reportId}`)
        if (!response.ok) throw new Error('Failed to load report')

        const data = await response.json()
        setReport(data.report)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [reportId, isStreaming])

  // ─── Toggle section collapse ───
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // ─── Copy report as text ───
  const handleCopyReport = async () => {
    if (!report) return

    const textContent = [
      `# ${report.title}`,
      '',
      report.summary,
      '',
      ...report.sections.map((section) => {
        let content = `## ${section.title}\n`
        switch (section.type) {
          case 'text':
            content += section.content
            break
          case 'table': {
            const { headers, rows } = section.content
            content += `| ${headers.join(' | ')} |\n`
            content += `| ${headers.map(() => '---').join(' | ')} |\n`
            rows.forEach((row) => {
              content += `| ${row.join(' | ')} |\n`
            })
            break
          }
          case 'list':
            section.content.items.forEach((item) => {
              content += `- ${item}\n`
            })
            break
          case 'chart':
            content += `[Chart: ${section.content.chartType}]\n`
            section.content.labels.forEach((label, i) => {
              const values = section.content.datasets
                .map((ds) => `${ds.label}: ${ds.data[i]}`)
                .join(', ')
              content += `${label}: ${values}\n`
            })
            break
        }
        return content
      }),
    ].join('\n')

    await navigator.clipboard.writeText(textContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Streaming state ───
  if (isStreaming) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Preparing report...</p>
        </div>
      </div>
    )
  }

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Loading report...</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Error state ───
  if (error || !report) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
        <FileText size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-red-700 font-medium">Failed to load report</p>
        <p className="text-red-600 text-sm mt-1">{error || 'Report not found'}</p>
      </div>
    )
  }

  const formatBadge = formatBadgeColors[report.format] || formatBadgeColors.summary

  // ─── Report display ───
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-linear-to-r from-gray-50 to-white px-6 py-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={22} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{report.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${formatBadge.bg} ${formatBadge.text}`}
                  >
                    {report.format}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(report.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-xs text-gray-400">
                    {report.sections.length} sections
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={14} className="text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">Executive Summary</p>
          <p className="text-sm text-blue-800 leading-relaxed">{report.summary}</p>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="divide-y divide-gray-100">
        {report.sections.map((section) => {
          const SectionIcon = sectionIcons[section.type] || FileText
          const isCollapsed = collapsedSections.has(section.id)

          return (
            <div key={section.id} className="px-6 py-5">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <SectionIcon size={16} className="text-gray-500" />
                  <h3 className="font-semibold text-gray-900 text-base">{section.title}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {section.type}
                  </span>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                  {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
              </button>

              {/* Section content */}
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
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {report.sourceData?.workflowQuery && (
              <span>Research: "{report.sourceData.workflowQuery}"</span>
            )}
            {report.sourceData?.collectionName && (
              <span>Collection: "{report.sourceData.collectionName}"</span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            Report ID: {report.id.slice(0, 8)}...
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Section Renderers
// ─────────────────────────────────────────────────────────

function TextContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      {content.split('\n').map((paragraph, i) => (
        <p key={i} className="text-gray-700 leading-relaxed mb-3 last:mb-0">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function TableContent({ content }: { content: { headers: string[]; rows: string[][] } }) {
  if (!content?.headers || !content?.rows) {
    return <p className="text-gray-500 text-sm italic">No table data available</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {content.headers.map((header, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {content.rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="hover:bg-gray-50 transition-colors"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className={`px-4 py-3 text-sm ${
                    cellIdx === 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {/* Check if cell looks like a URL */}
                  {typeof cell === 'string' && cell.startsWith('http') ? (
                    <a
                      href={cell}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      Link <ExternalLink size={10} />
                    </a>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChartContent({
  content,
}: {
  content: {
    chartType: string
    labels: string[]
    datasets: Array<{ label: string; data: number[]; backgroundColor?: string }>
  }
}) {
  if (!content?.labels || !content?.datasets) {
    return <p className="text-gray-500 text-sm italic">No chart data available</p>
  }

  // Find max value for scaling
  const allValues = content.datasets.flatMap((ds) => ds.data)
  const maxValue = Math.max(...allValues, 1)

  if (content.chartType === 'bar') {
    return (
      <div className="space-y-4">
        {/* Legend */}
        {content.datasets.length > 1 && (
          <div className="flex items-center gap-4 flex-wrap">
            {content.datasets.map((ds, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: ds.backgroundColor || chartColors[i % chartColors.length] }}
                />
                <span className="text-xs text-gray-600">{ds.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bars */}
        <div className="space-y-3">
          {content.labels.map((label, labelIdx) => (
            <div key={labelIdx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                  {label}
                </span>
                <div className="flex items-center gap-3">
                  {content.datasets.map((ds, dsIdx) => (
                    <span key={dsIdx} className="text-xs text-gray-500 font-mono">
                      {typeof ds.data[labelIdx] === 'number'
                        ? ds.data[labelIdx].toLocaleString()
                        : ds.data[labelIdx]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {content.datasets.map((ds, dsIdx) => {
                  const value = ds.data[labelIdx] || 0
                  const width = maxValue > 0 ? (value / maxValue) * 100 : 0
                  return (
                    <div
                      key={dsIdx}
                      className="h-6 rounded transition-all duration-500"
                      style={{
                        width: `${Math.max(width, 1)}%`,
                        backgroundColor:
                          ds.backgroundColor || chartColors[dsIdx % chartColors.length],
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Fallback: render as a simple data table for other chart types
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Label
            </th>
            {content.datasets.map((ds, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                {ds.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {content.labels.map((label, labelIdx) => (
            <tr key={labelIdx} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{label}</td>
              {content.datasets.map((ds, dsIdx) => (
                <td key={dsIdx} className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {typeof ds.data[labelIdx] === 'number'
                    ? ds.data[labelIdx].toLocaleString()
                    : ds.data[labelIdx]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListContent({ content }: { content: { items: string[] } }) {
  if (!content?.items || content.items.length === 0) {
    return <p className="text-gray-500 text-sm italic">No items available</p>
  }

  return (
    <ul className="space-y-2">
      {content.items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
          <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold">{i + 1}</span>
          </div>
          <p className="leading-relaxed">{item}</p>
        </li>
      ))}
    </ul>
  )
}

// ─── Component export ───
export const dynamicReportComponent = {
  name: 'DynamicReport',
  description:
    'Renders an AI-generated research report with structured sections including text, tables, charts, and lists. Fetches report data by ID and displays it with professional formatting. Use this after a workflow completes or after calling generate_report_from_collection.',
  component: DynamicReport,
  propsSchema: DynamicReportPropsSchema,
}