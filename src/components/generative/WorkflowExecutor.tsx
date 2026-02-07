// components/generative/WorkflowExecutor.tsx
// REDESIGNED: Cream/Sage palette, sage gradient header, unified step styling
'use client'

import { z } from 'zod'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTamboStreamStatus } from '@tambo-ai/react'
import {
  Search, Filter, Brain, Layers, FileText, Loader, CheckCircle2, XCircle,
  Clock, Zap, RotateCcw, StopCircle, ChevronDown, ChevronUp, BarChart3, Sparkles,
} from 'lucide-react'

export const WorkflowExecutorPropsSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    workflowId: z.string().nullable().optional().default('').describe('ID of the workflow to track'),
    steps: z.array(z.object({
      index: z.number().nullable().optional().default(0), type: z.string().nullable().optional().default(''), title: z.string().nullable().optional().default(''),
      description: z.string().optional(), status: z.string().optional(),
    })).optional().describe('Initial step definitions from execute_research_workflow tool'),
  })
)

type WorkflowExecutorProps = z.infer<typeof WorkflowExecutorPropsSchema>

interface StepStatus {
  index: number; type: string; title: string; description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string | null; durationMs?: number | null; hasOutput?: boolean;
}

interface WorkflowStatus {
  workflowId: string; title: string; description?: string; query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number; totalSteps: number; progress: number; steps: StepStatus[];
  outputFormat?: string; errorMessage?: string | null; failedStep?: number | null;
  reportId?: string | null; reportTitle?: string | null; createdAt: string; completedAt?: string | null;
}

const stepIcons: Record<string, any> = { search: Search, extract: Filter, analyze: Brain, aggregate: Layers, generate_report: FileText }

// Sage-tinted step type badges (differentiated by intensity)
const stepTypeBadges: Record<string, { bg: string; color: string }> = {
  search:          { bg: 'var(--fs-sage-100)', color: 'var(--fs-sage-700)' },
  extract:         { bg: 'var(--fs-cream-300)', color: 'var(--fs-text-primary)' },
  analyze:         { bg: 'var(--fs-sage-50)',  color: 'var(--fs-sage-600)' },
  aggregate:       { bg: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)' },
  generate_report: { bg: 'var(--fs-sage-200)', color: 'var(--fs-sage-800)' },
}

const statusStyles: Record<string, { bg: string; border: string; iconColor: string; animate?: string }> = {
  pending:   { bg: 'var(--fs-cream-100)', border: 'var(--fs-border-light)', iconColor: 'var(--fs-text-muted)' },
  running:   { bg: 'var(--fs-sage-50)',   border: 'var(--fs-sage-300)',     iconColor: 'var(--fs-sage-600)', animate: 'animate-spin' },
  completed: { bg: 'var(--fs-sage-50)',   border: 'var(--fs-sage-400)',     iconColor: 'var(--fs-sage-600)' },
  failed:    { bg: '#FEF2F2',            border: '#FECACA',                iconColor: '#DC2626' },
}

const statusIcons: Record<string, any> = { pending: Clock, running: Loader, completed: CheckCircle2, failed: XCircle }

export function WorkflowExecutor({ workflowId, steps: initialSteps }: WorkflowExecutorProps) {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [polling, setPolling] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { streamStatus } = useTamboStreamStatus()
  const isStreaming = !streamStatus.isSuccess && !streamStatus.isError

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/status`)
      if (!response.ok) throw new Error('Failed to fetch status')
      const data: WorkflowStatus = await response.json()
      setWorkflowStatus(data); setError(null)
      if (data.status === 'completed' || data.status === 'failed') setPolling(false)
    } catch (err: any) { setError(err.message) }
  }, [workflowId])

  useEffect(() => {
    if (isStreaming || !workflowId) return
    fetchStatus()
    if (polling) intervalRef.current = setInterval(fetchStatus, 2500)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isStreaming, workflowId, polling, fetchStatus])

  const handleCancel = async () => { if (!workflowId) return; try { await fetch(`/api/workflows/${workflowId}/cancel`, { method: 'POST' }); fetchStatus() } catch {} }
  const handleRetry = async () => { if (!workflowId) return; try { await fetch(`/api/workflows/${workflowId}/retry`, { method: 'POST' }); setPolling(true); fetchStatus() } catch {} }

  const steps: StepStatus[] = workflowStatus?.steps || initialSteps?.map((s) => ({ index: s.index ?? 0, type: s.type ?? '', title: s.title ?? '', description: s.description, status: (s.status as StepStatus['status']) || 'pending' })) || []
  const status = workflowStatus?.status || 'pending'
  const progress = workflowStatus?.progress || 0
  const title = workflowStatus?.title || 'Research Workflow'
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const totalSteps = steps.length

  /* ── Streaming ── */
  if (isStreaming) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>Preparing workflow...</p>
        </div>
      </div>
    )
  }

  /* ── Error (no data) ── */
  if (error && !workflowStatus) {
    return (
      <div className="rounded-2xl p-6 text-center fs-animate-in" style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
        <div className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEE2E2' }}>
          <XCircle size={22} style={{ color: '#DC2626' }} />
        </div>
        <p className="font-medium" style={{ color: '#B91C1C' }}>Failed to load workflow</p>
        <p className="text-sm mt-1" style={{ color: '#DC2626' }}>{error}</p>
        <button onClick={fetchStatus}
          className="mt-4 px-4 py-2 text-sm font-medium rounded-xl transition-all"
          style={{ background: '#DC2626', color: 'white' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#B91C1C' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#DC2626' }}>
          Retry
        </button>
      </div>
    )
  }

  /* ── Main ── */
  return (
    <div className="rounded-2xl overflow-hidden fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '2px solid var(--fs-border-light)' }}>

      {/* ── Header (sage gradient) ── */}
      <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, var(--fs-sage-700) 0%, var(--fs-sage-800) 100%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
              <Zap size={20} style={{ color: 'white' }} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{title}</h3>
              {workflowStatus?.description && <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{workflowStatus.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status === 'running' && (
              <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}>
                <StopCircle size={14} /> Cancel
              </button>
            )}
            {status === 'failed' && (
              <button onClick={handleRetry} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}>
                <RotateCcw size={14} /> Retry
              </button>
            )}
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <span>Step {Math.min(completedCount + 1, totalSteps)} of {totalSteps}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.max(progress, status === 'running' ? 5 : 0)}%`,
                background: status === 'failed' ? '#FCA5A5' : status === 'completed' ? 'rgba(255,255,255,0.9)' : 'white',
                transitionDuration: '700ms', transitionTimingFunction: 'ease-out',
              }} />
          </div>
        </div>
      </div>

      {/* ── Steps ── */}
      <div>
        {steps.map((step, idx) => {
          const StepIcon = stepIcons[step.type] || FileText
          const StatusIcon = statusIcons[step.status] || statusIcons.pending
          const sStatus = statusStyles[step.status] || statusStyles.pending
          const badge = stepTypeBadges[step.type] || stepTypeBadges.search
          const isExpanded = expandedStep === step.index

          return (
            <div key={step.index}
              className="px-6 py-4 transition-colors"
              style={{
                background: step.status === 'running' ? 'var(--fs-sage-50)' : step.status === 'failed' ? '#FEF2F2' : 'transparent',
                borderBottom: idx < steps.length - 1 ? '1px solid var(--fs-border-light)' : 'none',
                transitionDuration: 'var(--fs-duration-fast)',
              }}>
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedStep(isExpanded ? null : step.index)}>
                {/* Status circle */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: sStatus.bg, border: `2px solid ${sStatus.border}` }}>
                  <StatusIcon size={16} className={sStatus.animate || ''} style={{ color: sStatus.iconColor }} />
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm" style={{ color: step.status === 'pending' ? 'var(--fs-text-muted)' : 'var(--fs-text-primary)' }}>{step.title}</h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                      style={{ background: badge.bg, color: badge.color }}>
                      <StepIcon size={9} /> {step.type}
                    </span>
                  </div>
                  {step.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--fs-text-muted)' }}>{step.description}</p>}
                </div>

                {/* Duration */}
                {step.durationMs != null && step.status === 'completed' && (
                  <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--fs-text-muted)' }}>
                    {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
                  </span>
                )}

                <div style={{ color: 'var(--fs-text-muted)' }}>
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="mt-3 ml-14 space-y-2">
                  {step.description && <p className="text-sm" style={{ color: 'var(--fs-text-secondary)' }}>{step.description}</p>}
                  {step.error && (
                    <div className="rounded-xl p-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                      <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>Error:</p>
                      <p className="text-sm mt-1" style={{ color: '#DC2626' }}>{step.error}</p>
                    </div>
                  )}
                  {step.hasOutput && step.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fs-sage-600)' }}>
                      <CheckCircle2 size={12} /> Data collected successfully
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-4" style={{ background: 'var(--fs-cream-100)', borderTop: '1px solid var(--fs-border-light)' }}>
        {status === 'completed' && workflowStatus?.reportId && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color: 'var(--fs-sage-700)' }}>
              <CheckCircle2 size={16} /> <span className="font-medium text-sm">Research complete! Report generated.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>{workflowStatus.reportTitle || 'View Report'}</span>
              <BarChart3 size={15} style={{ color: 'var(--fs-sage-600)' }} />
            </div>
          </div>
        )}
        {status === 'completed' && !workflowStatus?.reportId && (
          <div className="flex items-center gap-2" style={{ color: 'var(--fs-sage-700)' }}>
            <CheckCircle2 size={16} /> <span className="font-medium text-sm">All steps completed successfully!</span>
          </div>
        )}
        {status === 'running' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color: 'var(--fs-sage-600)' }}>
              <Loader size={15} className="animate-spin" /> <span className="text-sm font-medium">Executing research steps...</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>{completedCount}/{totalSteps} steps done</span>
          </div>
        )}
        {status === 'pending' && (
          <div className="flex items-center gap-2" style={{ color: 'var(--fs-text-muted)' }}>
            <Clock size={15} /> <span className="text-sm">Workflow queued, starting shortly...</span>
          </div>
        )}
        {status === 'failed' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color: '#DC2626' }}>
              <XCircle size={15} /> <span className="text-sm font-medium">{workflowStatus?.errorMessage || 'Workflow failed'}</span>
            </div>
            <button onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-white transition-all"
              style={{ background: '#DC2626' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#B91C1C' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#DC2626' }}>
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; label: string }> = {
    running:   { bg: 'rgba(255,255,255,0.2)', label: '🔄 Running' },
    completed: { bg: 'rgba(255,255,255,0.25)', label: '✅ Completed' },
    pending:   { bg: 'rgba(255,255,255,0.15)', label: '⏳ Starting' },
    failed:    { bg: 'rgba(220,38,38,0.3)',    label: '❌ Failed' },
  }
  const cfg = configs[status] || configs.pending
  return (
    <span className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white"
      style={{ background: cfg.bg, backdropFilter: 'blur(4px)' }}>
      {cfg.label}
    </span>
  )
}

export const workflowExecutorComponent = {
  name: 'WorkflowExecutor',
  description: 'Displays real-time progress of an AI research workflow with step-by-step status updates, progress bar, and action buttons. Shows live polling updates as each step executes.',
  component: WorkflowExecutor,
  propsSchema: WorkflowExecutorPropsSchema,
}