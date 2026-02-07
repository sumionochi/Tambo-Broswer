// components/interactable/ReportsList.tsx
// REDESIGNED: Cream/Sage palette, polished report cards, sage-tinted badges
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import {
  FileText, Trash2, RefreshCw, Clock, BarChart3, Copy, CheckCircle2,
  Zap, BookMarked, Table2, Type, List, Sparkles,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

export const ReportsListPropsSchema = z.object({
    reports: z.array(
      z.object({
        id: z.string().nullable().default(''),
        title: z.string().nullable().default('').describe('Report title'),
        summary: z.string().nullable().default('').describe('Executive summary'),
        format: z.string().nullable().default('summary').describe('comparison | analysis | timeline | summary'),
        sectionCount: z.number().nullable().default(0).describe('Number of sections'),
        createdAt: z.string().nullable().default('').describe('ISO datetime'),
        workflowId: z.string().optional().nullable(),
        sourceCollectionId: z.string().optional().nullable(),
      })
    ).nullable().optional(),
  })

// Tambo-safe: handle undefined props during streaming
const _pReportsList = ReportsListPropsSchema.parse.bind(ReportsListPropsSchema);
const _spReportsList = ReportsListPropsSchema.safeParse.bind(ReportsListPropsSchema);
(ReportsListPropsSchema as any).parse = (d: unknown, p?: any) => _pReportsList(d ?? {}, p);
(ReportsListPropsSchema as any).safeParse = (d: unknown, p?: any) => _spReportsList(d ?? {}, p);

type ReportsListProps = z.infer<typeof ReportsListPropsSchema>

// Sage-tinted format config (differentiated by opacity/weight rather than hue)
const formatConfig: Record<string, { icon: any; label: string; badgeBg: string; badgeColor: string }> = {
  comparison: { icon: Table2, label: 'Comparison', badgeBg: 'var(--fs-sage-100)', badgeColor: 'var(--fs-sage-800)' },
  analysis:   { icon: BarChart3, label: 'Analysis', badgeBg: 'var(--fs-sage-50)', badgeColor: 'var(--fs-sage-700)' },
  timeline:   { icon: Clock, label: 'Timeline', badgeBg: 'var(--fs-cream-300)', badgeColor: 'var(--fs-text-primary)' },
  summary:    { icon: Type, label: 'Summary', badgeBg: 'var(--fs-cream-200)', badgeColor: 'var(--fs-text-secondary)' },
}

function ReportsList({ reports: initialReports }: ReportsListProps) {
  const [reports, setReports] = useTamboComponentState('reports', initialReports || [], initialReports || [])
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; reportId: string; reportTitle: string } | null>(null)

  useEffect(() => { if (!hasLoadedRef.current && !isLoadingRef.current) loadReports() }, [])

  const loadReports = async () => {
    if (isLoadingRef.current) return
    try {
      isLoadingRef.current = true; setLoading(true)
      const response = await fetch('/api/reports')
      if (response.ok) { const data = await response.json(); setReports(data.reports || []); hasLoadedRef.current = true }
    } catch (error) { console.error('Failed to load reports:', error) }
    finally { setLoading(false); isLoadingRef.current = false }
  }

  const handleRefresh = () => { hasLoadedRef.current = false; loadReports() }

  const handleDeleteReport = async (reportId: string) => {
    try { const response = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' }); if (response.ok) setReports(safeReports.filter((r) => r.id !== reportId)) }
    catch (error) { console.error('Delete report error:', error) }
  }

  const handleCopySummary = async (report: any) => {
    await navigator.clipboard.writeText(`${report.title || ''}\n\n${report.summary || ''}`)
    setCopiedId(report.id || ''); setTimeout(() => setCopiedId(null), 2000)
  }

  const safeReports = reports ?? []
  const groupedReports = safeReports.reduce((acc, report) => {
    const format = (report.format || 'summary')
    if (!acc[format]) acc[format] = []
    acc[format].push(report)
    return acc
  }, {} as Record<string, typeof safeReports>)

  if (loading && safeReports.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--fs-text-secondary)' }}>Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 overflow-y-auto h-full fs-scrollbar" style={{ background: 'var(--fs-cream-100)' }}>
        {/* Header */}
        <div className="flex items-center justify-between fs-animate-in">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>Research Reports</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>AI-generated reports from workflows and collections</p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton tooltip="Manage reports with AI" description="Generate new reports from collections, view existing reports, or delete old ones" />
            <button onClick={handleRefresh} disabled={loading}
              className="p-2 rounded-xl transition-all disabled:opacity-50"
              style={{ transitionDuration: 'var(--fs-duration-fast)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
              <RefreshCw size={18} strokeWidth={1.8} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--fs-text-muted)' }} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {safeReports.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fs-animate-in" style={{ animationDelay: '50ms' }}>
            {Object.entries(formatConfig).map(([format, config]) => {
              const count = groupedReports[format]?.length || 0
              const Icon = config.icon
              return (
                <div key={format} className="p-3 rounded-2xl transition-all"
                  style={{
                    background: count > 0 ? 'var(--fs-cream-50)' : 'var(--fs-cream-100)',
                    border: '1px solid var(--fs-border-light)',
                    opacity: count > 0 ? 1 : 0.55,
                  }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: config.badgeBg }}>
                      <Icon size={16} strokeWidth={1.8} style={{ color: config.badgeColor }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: 'var(--fs-text-primary)' }}>{count}</p>
                      <p className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>{config.label}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Report Cards ── */}
        {safeReports.length > 0 && (
          <div className="space-y-3 fs-stagger">
            {safeReports.map((report, index) => {
              const format = formatConfig[(report.format || 'summary')] || formatConfig.summary
              const FormatIcon = format.icon

              return (
                <div key={report.id || index} className="rounded-2xl p-5 transition-all group fs-animate-in"
                  style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', transitionDuration: 'var(--fs-duration-normal)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)'; e.currentTarget.style.borderColor = 'var(--fs-sage-200)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--fs-border-light)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: format.badgeBg }}>
                        <FormatIcon size={18} strokeWidth={1.8} style={{ color: format.badgeColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate" style={{ color: 'var(--fs-text-primary)' }}>{report.title || 'Untitled'}</h4>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg shrink-0"
                            style={{ background: format.badgeBg, color: format.badgeColor }}>{format.label}</span>
                        </div>
                        <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--fs-text-secondary)' }}>{report.summary || ''}</p>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fs-text-muted)' }}>
                            <Clock size={10} strokeWidth={1.8} />
                            {new Date(report.createdAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fs-text-muted)' }}>
                            <List size={10} strokeWidth={1.8} />
                            {report.sectionCount || 0} sections
                          </span>
                          {report.workflowId && (
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fs-sage-600)' }}>
                              <Zap size={10} /> From workflow
                            </span>
                          )}
                          {report.sourceCollectionId && (
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fs-sage-600)' }}>
                              <BookMarked size={10} /> From collection
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ transitionDuration: 'var(--fs-duration-fast)' }}>
                      <button onClick={() => handleCopySummary(report)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        {copiedId === report.id
                          ? <CheckCircle2 size={14} style={{ color: 'var(--fs-sage-600)' }} />
                          : <Copy size={14} style={{ color: 'var(--fs-text-muted)' }} />}
                      </button>
                      <button onClick={() => setConfirmDialog({ isOpen: true, reportId: report.id || '', reportTitle: report.title || '' })}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        <Trash2 size={14} style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Empty ── */}
        {safeReports.length === 0 && !loading && (
          <div className="flex items-center justify-center py-12 fs-animate-in">
            <div className="text-center">
              <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
                <FileText size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
              </div>
              <p className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>No Reports Yet</p>
              <p className="text-sm mt-2" style={{ color: 'var(--fs-text-muted)', maxWidth: 360, margin: '0 auto' }}>
                Reports are automatically generated when workflows complete. You can also generate reports from your collections.
              </p>
              <p className="text-sm mt-3" style={{ color: 'var(--fs-text-muted)' }}>
                Try: &ldquo;Create a comparison report from my collection&rdquo;
              </p>
              <button onClick={handleRefresh}
                className="mt-4 px-4 py-2.5 text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-all"
                style={{ background: 'var(--fs-sage-600)', color: 'white', transitionDuration: 'var(--fs-duration-normal)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="rounded-2xl p-4 flex items-start gap-3 fs-animate-in" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)', animationDelay: '150ms' }}>
          <Sparkles size={18} style={{ color: 'var(--fs-sage-600)' }} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--fs-sage-800)' }}>
            <span className="font-semibold">Tip:</span> Generate reports from collections: &ldquo;Summarize my AI Tools collection as a comparison report&rdquo;
          </p>
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog(null)} onConfirm={() => handleDeleteReport(confirmDialog.reportId)}
          title="Delete Report" message={`Are you sure you want to delete "${confirmDialog.reportTitle}"? This action cannot be undone.`}
          confirmText="Delete" confirmStyle="danger" />
      )}
    </>
  )
}

export const InteractableReportsList = withInteractable(ReportsList, {
  componentName: 'ReportsList',
  description: 'Displays and manages AI-generated research reports. Shows report summaries, formats, and metadata. AI can generate new reports from collections or delete existing ones.',
  propsSchema: ReportsListPropsSchema,
})