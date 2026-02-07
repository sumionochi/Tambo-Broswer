// components/generative/WorkflowExecutor.tsx
'use client'

import { z } from 'zod'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTamboStreamStatus } from '@tambo-ai/react'
import {
  Search,
  Filter,
  Brain,
  Layers,
  FileText,
  Loader,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  RotateCcw,
  StopCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BarChart3,
} from 'lucide-react'

// ─── Zod Schema ───
export const WorkflowExecutorPropsSchema = z.object({
  workflowId: z.string().describe('ID of the workflow to track'),
  steps: z
    .array(
      z.object({
        index: z.number(),
        type: z.string(),
        title: z.string(),
        description: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .optional()
    .describe('Initial step definitions from execute_research_workflow tool'),
})

type WorkflowExecutorProps = z.infer<typeof WorkflowExecutorPropsSchema>

interface StepStatus {
  index: number
  type: string
  title: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string | null
  durationMs?: number | null
  hasOutput?: boolean
}

interface WorkflowStatus {
  workflowId: string
  title: string
  description?: string
  query: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  progress: number
  steps: StepStatus[]
  outputFormat?: string
  errorMessage?: string | null
  failedStep?: number | null
  reportId?: string | null
  reportTitle?: string | null
  createdAt: string
  completedAt?: string | null
}

// Step type → icon mapping
const stepIcons: Record<string, any> = {
  search: Search,
  extract: Filter,
  analyze: Brain,
  aggregate: Layers,
  generate_report: FileText,
}

// Step type → color mapping
const stepTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  search: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  extract: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  analyze: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  aggregate: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  generate_report: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
}

// Status → icon mapping
const statusIcons: Record<string, { icon: any; color: string; animate?: string }> = {
  pending: { icon: Clock, color: 'text-gray-400' },
  running: { icon: Loader, color: 'text-blue-600', animate: 'animate-spin' },
  completed: { icon: CheckCircle2, color: 'text-green-600' },
  failed: { icon: XCircle, color: 'text-red-600' },
}

export function WorkflowExecutor({ workflowId, steps: initialSteps }: WorkflowExecutorProps) {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [polling, setPolling] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { streamStatus } = useTamboStreamStatus()
  const isStreaming = !streamStatus.isSuccess && !streamStatus.isError

  // ─── Poll for workflow status ───
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/status`)
      if (!response.ok) throw new Error('Failed to fetch status')

      const data: WorkflowStatus = await response.json()
      setWorkflowStatus(data)
      setError(null)

      // Stop polling when workflow is done
      if (data.status === 'completed' || data.status === 'failed') {
        setPolling(false)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }, [workflowId])

  // Start polling after streaming completes
  useEffect(() => {
    if (isStreaming || !workflowId) return

    // Initial fetch
    fetchStatus()

    // Poll every 2.5 seconds
    if (polling) {
      intervalRef.current = setInterval(fetchStatus, 2500)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isStreaming, workflowId, polling, fetchStatus])

  // ─── Action handlers ───
  const handleCancel = async () => {
    try {
      await fetch(`/api/workflows/${workflowId}/cancel`, { method: 'POST' })
      fetchStatus()
    } catch (err: any) {
      console.error('Cancel failed:', err)
    }
  }

  const handleRetry = async () => {
    try {
      await fetch(`/api/workflows/${workflowId}/retry`, { method: 'POST' })
      setPolling(true)
      fetchStatus()
    } catch (err: any) {
      console.error('Retry failed:', err)
    }
  }

  // ─── Derive display data ───
  const steps: StepStatus[] = workflowStatus?.steps ||
    initialSteps?.map((s) => ({
      index: s.index,
      type: s.type,
      title: s.title,
      description: s.description,
      status: (s.status as StepStatus['status']) || 'pending',
    })) ||
    []

  const status = workflowStatus?.status || 'pending'
  const progress = workflowStatus?.progress || 0
  const title = workflowStatus?.title || 'Research Workflow'
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const totalSteps = steps.length

  // ─── Streaming state ───
  if (isStreaming) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Preparing workflow...</p>
        </div>
      </div>
    )
  }

  // ─── Error state ───
  if (error && !workflowStatus) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
        <XCircle size={32} className="text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-medium">Failed to load workflow</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchStatus}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // ─── Main UI ───
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{title}</h3>
              {workflowStatus?.description && (
                <p className="text-white/80 text-sm mt-0.5">{workflowStatus.description}</p>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3">
            {status === 'running' && (
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
              >
                <StopCircle size={14} />
                Cancel
              </button>
            )}
            {status === 'failed' && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
              >
                <RotateCcw size={14} />
                Retry
              </button>
            )}
            <span
              className={`
                px-3 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm
                ${status === 'completed' ? 'bg-green-400/30 text-green-100' : ''}
                ${status === 'running' ? 'bg-blue-400/30 text-blue-100' : ''}
                ${status === 'pending' ? 'bg-gray-400/30 text-gray-100' : ''}
                ${status === 'failed' ? 'bg-red-400/30 text-red-100' : ''}
              `}
            >
              {status === 'running' && '🔄 Running'}
              {status === 'completed' && '✅ Completed'}
              {status === 'pending' && '⏳ Starting'}
              {status === 'failed' && '❌ Failed'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-white/80 mb-2">
            <span>
              Step {Math.min(completedCount + 1, totalSteps)} of {totalSteps}
            </span>
            <span>{progress}% complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5 backdrop-blur-sm">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ease-out ${
                status === 'failed'
                  ? 'bg-red-400'
                  : status === 'completed'
                  ? 'bg-green-400'
                  : 'bg-white'
              }`}
              style={{ width: `${Math.max(progress, status === 'running' ? 5 : 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Steps list ── */}
      <div className="divide-y divide-gray-100">
        {steps.map((step) => {
          const StepIcon = stepIcons[step.type] || FileText
          const StatusInfo = statusIcons[step.status] || statusIcons.pending
          const StatusIcon = StatusInfo.icon
          const typeColors = stepTypeColors[step.type] || stepTypeColors.search
          const isExpanded = expandedStep === step.index

          return (
            <div
              key={step.index}
              className={`
                px-6 py-4 transition-colors
                ${step.status === 'running' ? 'bg-blue-50/50' : ''}
                ${step.status === 'failed' ? 'bg-red-50/50' : ''}
              `}
            >
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => setExpandedStep(isExpanded ? null : step.index)}
              >
                {/* Step number + status icon */}
                <div className="relative">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2
                      ${step.status === 'completed' ? 'bg-green-50 border-green-300' : ''}
                      ${step.status === 'running' ? 'bg-blue-50 border-blue-300' : ''}
                      ${step.status === 'failed' ? 'bg-red-50 border-red-300' : ''}
                      ${step.status === 'pending' ? 'bg-gray-50 border-gray-200' : ''}
                    `}
                  >
                    <StatusIcon
                      size={18}
                      className={`${StatusInfo.color} ${StatusInfo.animate || ''}`}
                    />
                  </div>
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-semibold text-sm ${
                        step.status === 'pending' ? 'text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeColors.bg} ${typeColors.text}`}
                    >
                      <StepIcon size={10} />
                      {step.type}
                    </span>
                  </div>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{step.description}</p>
                  )}
                </div>

                {/* Duration */}
                {step.durationMs != null && step.status === 'completed' && (
                  <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                    {step.durationMs < 1000
                      ? `${step.durationMs}ms`
                      : `${(step.durationMs / 1000).toFixed(1)}s`}
                  </span>
                )}

                {/* Expand toggle */}
                <div className="text-gray-400">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 ml-14 space-y-2">
                  {step.description && (
                    <p className="text-sm text-gray-600">{step.description}</p>
                  )}
                  {step.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700 font-medium">Error:</p>
                      <p className="text-sm text-red-600 mt-1">{step.error}</p>
                    </div>
                  )}
                  {step.hasOutput && step.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <CheckCircle2 size={12} />
                      <span>Data collected successfully</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        {/* Completed: show report link */}
        {status === 'completed' && workflowStatus?.reportId && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={18} />
              <span className="font-medium text-sm">
                Research complete! Report generated.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Report: {workflowStatus.reportTitle || 'View Report'}
              </span>
              <BarChart3 size={16} className="text-blue-600" />
            </div>
          </div>
        )}

        {/* Completed without report */}
        {status === 'completed' && !workflowStatus?.reportId && (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 size={18} />
            <span className="font-medium text-sm">All steps completed successfully!</span>
          </div>
        )}

        {/* Running: show time info */}
        {status === 'running' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm font-medium">Executing research steps...</span>
            </div>
            <span className="text-xs text-gray-500">
              {completedCount}/{totalSteps} steps done
            </span>
          </div>
        )}

        {/* Pending */}
        {status === 'pending' && (
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={16} />
            <span className="text-sm">Workflow queued, starting shortly...</span>
          </div>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle size={16} />
              <span className="text-sm font-medium">
                {workflowStatus?.errorMessage || 'Workflow failed'}
              </span>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
            >
              <RotateCcw size={12} />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export const workflowExecutorComponent = {
  name: 'WorkflowExecutor',
  description:
    'Displays real-time progress of an AI research workflow with step-by-step status updates, progress bar, and action buttons. Shows live polling updates as each step executes. Use this after calling execute_research_workflow tool.',
  component: WorkflowExecutor,
  propsSchema: WorkflowExecutorPropsSchema,
}