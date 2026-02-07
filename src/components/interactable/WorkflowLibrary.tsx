// components/interactable/WorkflowLibrary.tsx
// REDESIGNED: Cream/Sage palette, polished template cards, themed progress, soft transitions
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import {
  Zap, Trash2, RefreshCw, Play, Clock, CheckCircle2, XCircle, Loader,
  FileText, BarChart3, Search, GitBranch, Image, ArrowRight, RotateCcw, Sparkles,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

export const WorkflowLibraryPropsSchema = z.object({
    workflows: z.array(
      z.object({
        id: z.string().nullable().default(''),
        title: z.string().nullable().default('').describe('Workflow title'),
        description: z.string().optional().describe('Brief description'),
        query: z.string().nullable().default('').describe('Original research query'),
        status: z.string().nullable().default('pending').describe('pending | running | completed | failed'),
        currentStep: z.number().nullable().default(0).describe('Current step index'),
        totalSteps: z.number().nullable().default(0).describe('Total number of steps'),
        sources: z.array(z.string()).nullable().default([]).describe('Search sources used'),
        outputFormat: z.string().nullable().default('summary').describe('Report output format'),
        errorMessage: z.string().optional().nullable(),
        createdAt: z.string().nullable().default('').describe('ISO datetime'),
        completedAt: z.string().optional().nullable(),
        report: z.object({ id: z.string().nullable().default(''), title: z.string().nullable().default('') }).optional().nullable(),
      })
    ).nullable().optional(),
  })

// Tambo-safe: handle undefined props during streaming
const _pWorkflowLibrary = WorkflowLibraryPropsSchema.parse.bind(WorkflowLibraryPropsSchema);
const _spWorkflowLibrary = WorkflowLibraryPropsSchema.safeParse.bind(WorkflowLibraryPropsSchema);
(WorkflowLibraryPropsSchema as any).parse = (d: unknown, p?: any) => _pWorkflowLibrary(d ?? {}, p);
(WorkflowLibraryPropsSchema as any).safeParse = (d: unknown, p?: any) => _spWorkflowLibrary(d ?? {}, p);

type WorkflowLibraryProps = z.infer<typeof WorkflowLibraryPropsSchema>

const workflowTemplates = [
  { id: 'tech-comparison', name: 'Tech Comparison', description: 'Compare technologies by GitHub stats, features, and community', icon: GitBranch, prompt: 'Compare the top 5 {topic} by GitHub stars, community activity, and features. Create a comparison report.', defaultSources: ['google', 'github'], defaultFormat: 'comparison' },
  { id: 'market-research', name: 'Market Research', description: 'Research products, competitors, and market trends', icon: Search, prompt: 'Research {topic}, find competitors, analyze reviews, and create a market analysis report.', defaultSources: ['google'], defaultFormat: 'analysis' },
  { id: 'image-research', name: 'Visual Research', description: 'Find and organize images with analysis', icon: Image, prompt: 'Find high-quality images of {topic}, categorize them, and create a visual research summary.', defaultSources: ['google', 'pexels'], defaultFormat: 'summary' },
]

function WorkflowLibrary({ workflows: initialWorkflows }: WorkflowLibraryProps) {
  const [workflows, setWorkflows] = useTamboComponentState('workflows', initialWorkflows || [], initialWorkflows || [])
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; workflowId: string; workflowTitle: string } | null>(null)

  useEffect(() => { if (!hasLoadedRef.current && !isLoadingRef.current) loadWorkflows() }, [])

  const loadWorkflows = async () => {
    if (isLoadingRef.current) return
    try {
      isLoadingRef.current = true; setLoading(true)
      const response = await fetch('/api/workflows')
      if (response.ok) { const data = await response.json(); setWorkflows(data.workflows || []); hasLoadedRef.current = true }
    } catch (error) { console.error('Failed to load workflows:', error) }
    finally { setLoading(false); isLoadingRef.current = false }
  }

  const handleRefresh = () => { hasLoadedRef.current = false; loadWorkflows() }

  const handleDeleteWorkflow = async (workflowId: string) => {
    try { const response = await fetch(`/api/workflows/${workflowId}`, { method: 'DELETE' }); if (response.ok) setWorkflows(safeWorkflows.filter((w) => w.id !== workflowId)) }
    catch (error) { console.error('Delete workflow error:', error) }
  }

  const handleCancelWorkflow = async (workflowId: string) => {
    try { await fetch(`/api/workflows/${workflowId}/cancel`, { method: 'POST' }); handleRefresh() } catch (error) { console.error('Cancel workflow error:', error) }
  }

  const handleRetryWorkflow = async (workflowId: string) => {
    try { await fetch(`/api/workflows/${workflowId}/retry`, { method: 'POST' }); handleRefresh() } catch (error) { console.error('Retry workflow error:', error) }
  }

  const safeWorkflows = workflows ?? []
  const activeWorkflows = safeWorkflows.filter((w) => w.status === 'running' || w.status === 'pending')
  const completedWorkflows = safeWorkflows.filter((w) => w.status === 'completed')
  const failedWorkflows = safeWorkflows.filter((w) => w.status === 'failed')

  if (loading && safeWorkflows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--fs-text-secondary)' }}>Loading workflows...</p>
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
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>Research Workflows</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>Automate multi-step research with AI</p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton tooltip="Manage workflows with AI" description="Start new workflows, check status, or manage existing ones using natural language" />
            <button onClick={handleRefresh} disabled={loading}
              className="p-2 rounded-xl transition-all disabled:opacity-50"
              style={{ transitionDuration: 'var(--fs-duration-fast)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
              <RefreshCw size={18} strokeWidth={1.8} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--fs-text-muted)' }} />
            </button>
          </div>
        </div>

        {/* ── Active Workflows ── */}
        {activeWorkflows.length > 0 && (
          <div className="fs-animate-in">
            <SectionHeader icon={Loader} iconClass="animate-spin" label={`Active Workflows (${activeWorkflows.length})`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeWorkflows.map((workflow, idx) => {
                const progress = (workflow.totalSteps || 0) > 0 ? Math.round(((workflow.currentStep || 0) / (workflow.totalSteps || 0)) * 100) : 0
                return (
                  <div key={workflow.id || idx} className="rounded-2xl p-5 relative overflow-hidden"
                    style={{ background: 'var(--fs-cream-50)', border: '2px solid var(--fs-sage-300)' }}>
                    <div className="absolute inset-0 transition-all" style={{ width: `${progress}%`, background: 'var(--fs-sage-50)', transitionDuration: '500ms' }} />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--fs-sage-100)' }}>
                            <Zap size={15} style={{ color: 'var(--fs-sage-600)' }} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm" style={{ color: 'var(--fs-text-primary)' }}>{workflow.title || 'Untitled'}</h4>
                            <p className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>Step {(workflow.currentStep || 0) + 1} of {workflow.totalSteps || 0}</p>
                          </div>
                        </div>
                        <button onClick={() => handleCancelWorkflow(workflow.id || '')} className="text-xs font-medium transition-colors" style={{ color: '#DC2626' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#B91C1C' }} onMouseLeave={(e) => { e.currentTarget.style.color = '#DC2626' }}>Cancel</button>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--fs-cream-300)' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--fs-sage-500)', transitionDuration: '500ms' }} />
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'var(--fs-text-muted)' }}>{progress}% complete</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Templates ── */}
        <div className="fs-animate-in" style={{ animationDelay: '50ms' }}>
          <SectionHeader icon={Sparkles} label="Quick Start Templates" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workflowTemplates.map((template) => {
              const Icon = template.icon
              return (
                <div key={template.id} className="rounded-2xl p-5 transition-all cursor-pointer group"
                  style={{ background: 'var(--fs-cream-50)', border: '2px solid var(--fs-border-light)', transitionDuration: 'var(--fs-duration-normal)', transitionTimingFunction: 'var(--fs-ease-out)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--fs-sage-300)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--fs-sage-100)' }}>
                      <Icon size={18} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm" style={{ color: 'var(--fs-text-primary)' }}>{template.name}</h4>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>{template.description}</p>
                      <div className="flex items-center gap-1.5 mt-2.5">
                        {template.defaultSources.map((source) => (
                          <span key={source} className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-lg"
                            style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-muted)' }}>{source}</span>
                        ))}
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-lg"
                          style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)' }}>{template.defaultFormat}</span>
                      </div>
                    </div>
                    <ArrowRight size={15} className="mt-1 transition-colors" style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }} />
                  </div>
                  <p className="text-xs italic mt-3" style={{ color: 'var(--fs-text-muted)' }}>
                    Try: &ldquo;{template.prompt.replace('{topic}', 'React frameworks')}&rdquo;
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Completed ── */}
        {completedWorkflows.length > 0 && (
          <div className="fs-animate-in" style={{ animationDelay: '100ms' }}>
            <SectionHeader icon={CheckCircle2} label={`Completed (${completedWorkflows.length})`} />
            <div className="space-y-3">
              {completedWorkflows.map((workflow, idx) => (
                <div key={workflow.id || idx} className="rounded-2xl p-4 transition-all group"
                  style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', transitionDuration: 'var(--fs-duration-normal)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)'; e.currentTarget.style.borderColor = 'var(--fs-sage-200)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--fs-border-light)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--fs-sage-100)' }}>
                        <CheckCircle2 size={15} style={{ color: 'var(--fs-sage-600)' }} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate" style={{ color: 'var(--fs-text-primary)' }}>{workflow.title || 'Untitled'}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>{workflow.totalSteps || 0} steps</span>
                          <span style={{ color: 'var(--fs-border-light)' }}>·</span>
                          <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>{new Date(workflow.createdAt || '').toLocaleDateString()}</span>
                          {workflow.report && (
                            <>
                              <span style={{ color: 'var(--fs-border-light)' }}>·</span>
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fs-sage-600)' }}>
                                <FileText size={10} /> Report ready
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {(workflow.sources || []).map((source) => (
                          <span key={source} className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-muted)' }}>{source}</span>
                        ))}
                      </div>
                      <button onClick={() => setConfirmDialog({ isOpen: true, workflowId: workflow.id || '', workflowTitle: workflow.title || '' })}
                        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        style={{ transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        <Trash2 size={14} style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Failed ── */}
        {failedWorkflows.length > 0 && (
          <div className="fs-animate-in" style={{ animationDelay: '150ms' }}>
            <SectionHeader icon={XCircle} label={`Failed (${failedWorkflows.length})`} iconColor="#DC2626" />
            <div className="space-y-3">
              {failedWorkflows.map((workflow, idx) => (
                <div key={workflow.id || idx} className="rounded-2xl p-4" style={{ background: 'var(--fs-cream-50)', border: '1px solid #FECACA' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FEE2E2' }}>
                        <XCircle size={15} style={{ color: '#DC2626' }} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate" style={{ color: 'var(--fs-text-primary)' }}>{workflow.title || 'Untitled'}</h4>
                        <p className="text-xs truncate mt-0.5" style={{ color: '#DC2626' }}>{workflow.errorMessage || 'Execution failed'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleRetryWorkflow(workflow.id || '')}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl transition-all"
                        style={{ background: 'var(--fs-sage-50)', color: 'var(--fs-sage-700)', transitionDuration: 'var(--fs-duration-fast)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-100)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-50)' }}>
                        <RotateCcw size={11} /> Retry
                      </button>
                      <button onClick={() => setConfirmDialog({ isOpen: true, workflowId: workflow.id || '', workflowTitle: workflow.title || '' })}
                        className="p-1 rounded-lg transition-all"
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        <Trash2 size={14} style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty ── */}
        {safeWorkflows.length === 0 && !loading && (
          <div className="flex items-center justify-center py-12 fs-animate-in">
            <div className="text-center">
              <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
                <Zap size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
              </div>
              <p className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>No Workflows Yet</p>
              <p className="text-sm mt-2" style={{ color: 'var(--fs-text-muted)', maxWidth: 360, margin: '0 auto' }}>
                Start a research workflow by asking AI to research, compare, or analyze topics. Try: &ldquo;Compare the top 5 JavaScript frameworks&rdquo;
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
        <div className="rounded-2xl p-4 flex items-start gap-3 fs-animate-in" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)', animationDelay: '200ms' }}>
          <Sparkles size={18} style={{ color: 'var(--fs-sage-600)' }} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--fs-sage-800)' }}>
            <span className="font-semibold">Tip:</span> Ask AI to start a workflow: &ldquo;Research top 5 AI coding tools and create a comparison report&rdquo;
          </p>
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog(null)} onConfirm={() => handleDeleteWorkflow(confirmDialog.workflowId)}
          title="Delete Workflow" message={`Are you sure you want to delete "${confirmDialog.workflowTitle}"? This will remove all execution data and any linked reports. This action cannot be undone.`}
          confirmText="Delete" confirmStyle="danger" />
      )}
    </>
  )
}

/* ── Shared ── */
function SectionHeader({ icon: Icon, label, iconClass, iconColor }: { icon: any; label: string; iconClass?: string; iconColor?: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
      style={{ color: 'var(--fs-text-muted)', letterSpacing: '0.08em' }}>
      <Icon size={13} className={iconClass || ''} strokeWidth={1.8} style={{ color: iconColor || 'var(--fs-sage-500)' }} />
      {label}
    </h3>
  )
}

export const InteractableWorkflowLibrary = withInteractable(WorkflowLibrary, {
  componentName: 'WorkflowLibrary',
  description: 'Manages AI research workflows. Shows active/completed/failed workflows, provides quick-start templates, and allows cancellation/retry/deletion. AI can start new workflows or check status.',
  propsSchema: WorkflowLibraryPropsSchema,
})