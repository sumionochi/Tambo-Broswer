// components/generative/GitHubArchitectureDiagram.tsx
// REDESIGNED: Cream/Sage palette, sage-tinted node styling, polished layout
'use client'

import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useTamboStreamStatus } from '@tambo-ai/react'
import {
  Code, Server, Database, Layers, GitBranch, Zap, FileText, Loader, ExternalLink, Sparkles
} from 'lucide-react'

export const GitHubArchitectureDiagramPropsSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    repoOwner: z.string().nullable().optional().default('').describe('Repository owner username'),
    repoName: z.string().nullable().optional().default('').describe('Repository name'),
    diagramType: z.enum(['architecture', 'file-tree', 'dependencies']).optional().nullable().describe('Type of diagram'),
  })
)

type GitHubArchitectureDiagramProps = z.infer<typeof GitHubArchitectureDiagramPropsSchema>

interface ArchNode {
  id: string
  type: 'frontend' | 'backend' | 'database' | 'api' | 'service' | 'component' | 'file'
  label: string
  description?: string
  language?: string
  path?: string
  connections: string[]
}

interface RepoStructure {
  name: string; fullName: string; description: string; language: string; url: string; nodes: ArchNode[]
}

const nodeIcons: Record<ArchNode['type'], any> = {
  frontend: Code, backend: Server, database: Database, api: Zap,
  service: Layers, component: FileText, file: FileText,
}

// Sage-tinted node color palette
const nodeStyles: Record<ArchNode['type'], { bg: string; border: string; iconBg: string; iconColor: string }> = {
  frontend: { bg: 'var(--fs-sage-50)',  border: 'var(--fs-sage-300)', iconBg: 'var(--fs-sage-100)', iconColor: 'var(--fs-sage-600)' },
  backend:  { bg: 'var(--fs-cream-50)', border: 'var(--fs-sage-400)', iconBg: 'var(--fs-sage-100)', iconColor: 'var(--fs-sage-700)' },
  database: { bg: 'var(--fs-cream-100)', border: 'var(--fs-sage-300)', iconBg: 'var(--fs-sage-200)', iconColor: 'var(--fs-sage-700)' },
  api:      { bg: 'var(--fs-sage-50)',  border: 'var(--fs-sage-400)', iconBg: 'var(--fs-sage-100)', iconColor: 'var(--fs-sage-600)' },
  service:  { bg: 'var(--fs-cream-50)', border: 'var(--fs-sage-300)', iconBg: 'var(--fs-sage-100)', iconColor: 'var(--fs-sage-600)' },
  component:{ bg: 'var(--fs-cream-100)', border: 'var(--fs-sage-200)', iconBg: 'var(--fs-cream-200)', iconColor: 'var(--fs-sage-500)' },
  file:     { bg: 'var(--fs-cream-50)', border: 'var(--fs-border-light)', iconBg: 'var(--fs-cream-200)', iconColor: 'var(--fs-text-muted)' },
}

export function GitHubArchitectureDiagram({
  repoOwner, repoName, diagramType = 'architecture',
}: GitHubArchitectureDiagramProps) {
  const [structure, setStructure] = useState<RepoStructure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const { streamStatus } = useTamboStreamStatus()
  const isStreaming = !streamStatus.isSuccess && !streamStatus.isError

  useEffect(() => {
    if (isStreaming || !repoOwner || !repoName) return
    const fetchRepoStructure = async () => {
      setLoading(true); setError(null)
      try {
        const response = await fetch('/api/github/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner: repoOwner, repo: repoName, analysisType: diagramType }),
        })
        if (!response.ok) throw new Error('Failed to analyze repository')
        const data = await response.json()
        setStructure(data)
      } catch (err: any) {
        setError(err.message || 'Analysis failed')
        setStructure(generateMockStructure(repoOwner || '', repoName || ''))
      } finally { setLoading(false) }
    }
    fetchRepoStructure()
  }, [repoOwner, repoName, diagramType, isStreaming])

  const generateMockStructure = (owner: string, name: string): RepoStructure => ({
    name, fullName: `${owner}/${name}`,
    description: `Architecture diagram for ${owner}/${name}`,
    language: 'TypeScript', url: `https://github.com/${owner}/${name}`,
    nodes: [
      { id: 'frontend', type: 'frontend', label: 'Frontend (React)', description: 'User interface components', language: 'TypeScript', path: '/src/components', connections: ['api'] },
      { id: 'api', type: 'api', label: 'REST API', description: 'API endpoints and routing', language: 'TypeScript', path: '/src/api', connections: ['backend', 'database'] },
      { id: 'backend', type: 'backend', label: 'Backend Services', description: 'Business logic and services', language: 'TypeScript', path: '/src/services', connections: ['database'] },
      { id: 'database', type: 'database', label: 'PostgreSQL', description: 'Data persistence layer', language: 'SQL', path: '/prisma', connections: [] },
    ],
  })

  /* ── Streaming ── */
  if (isStreaming) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>Analyzing repository...</p>
        </div>
      </div>
    )
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>Fetching repository structure...</p>
          <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>{repoOwner || '...'}/{repoName || '...'}</p>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (error || !structure) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center rounded-2xl p-8 max-w-md fs-animate-in" style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
          <div className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEE2E2' }}>
            <span className="text-lg">⚠️</span>
          </div>
          <p className="font-medium" style={{ color: '#B91C1C' }}>Failed to analyze repository</p>
          <p className="text-sm mt-1" style={{ color: '#DC2626' }}>{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  /* ── Diagram ── */
  return (
    <div className="h-full flex flex-col p-6 md:p-8" style={{ background: 'var(--fs-cream-100)' }}>
      {/* Header */}
      <div className="mb-8 fs-animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
              <GitBranch size={22} strokeWidth={1.8} style={{ color: 'var(--fs-sage-600)' }} />
              {structure.fullName}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>{structure.description}</p>
          </div>
          <a href={structure.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
            style={{ background: 'var(--fs-sage-600)', color: 'white', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}>
            <ExternalLink size={15} /> View on GitHub
          </a>
        </div>
      </div>

      {/* Architecture Nodes */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center overflow-auto fs-scrollbar">
          <div className="relative w-full max-w-4xl">
            <div className="space-y-8 fs-stagger">
              {structure.nodes.map((node, index) => {
                const Icon = nodeIcons[node.type]
                const style = nodeStyles[node.type]
                const isHovered = hoveredNode === node.id

                return (
                  <div key={node.id}
                    className={`relative ${index % 2 === 0 ? 'ml-0 mr-auto' : 'ml-auto mr-0'} w-full max-w-104 fs-animate-in`}
                    style={{ animationDelay: `${index * 80}ms` }}>
                    <div
                      onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
                      className="rounded-2xl p-6 transition-all"
                      style={{
                        background: style.bg,
                        border: `2px solid ${isHovered ? 'var(--fs-sage-500)' : style.border}`,
                        boxShadow: isHovered ? 'var(--fs-shadow-lg)' : 'var(--fs-shadow-sm)',
                        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                        transitionDuration: 'var(--fs-duration-normal)', transitionTimingFunction: 'var(--fs-ease-out)',
                      }}>
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: style.iconBg }}>
                          <Icon size={22} strokeWidth={1.8} style={{ color: style.iconColor }} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-base" style={{ color: 'var(--fs-text-primary)' }}>{node.label}</h3>
                          {node.description && (
                            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-secondary)' }}>{node.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2.5">
                            {node.language && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                                style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-secondary)' }}>
                                {node.language}
                              </span>
                            )}
                            {node.path && (
                              <span className="text-xs font-mono" style={{ color: 'var(--fs-text-muted)' }}>{node.path}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Connections */}
                      {node.connections.length > 0 && (
                        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--fs-border-light)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fs-text-muted)' }}>Connects to</p>
                          <div className="flex flex-wrap gap-1.5">
                            {node.connections.map((connId) => {
                              const connNode = structure.nodes.find((n) => n.id === connId)
                              return connNode ? (
                                <span key={connId} className="text-xs font-medium px-2.5 py-1 rounded-lg"
                                  style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', color: 'var(--fs-text-secondary)' }}>
                                  {connNode.label}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    {node.connections.length > 0 && index < structure.nodes.length - 1 && (
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-4" style={{ color: 'var(--fs-sage-300)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-8 rounded-2xl p-4 flex items-start gap-3 fs-animate-in" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)' }}>
        <Sparkles size={18} style={{ color: 'var(--fs-sage-600)' }} className="shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: 'var(--fs-sage-800)' }}>
          <span className="font-semibold">Tip:</span> Ask Claude to modify this diagram: &ldquo;Add authentication layer&rdquo; or &ldquo;Show database relationships&rdquo;
        </p>
      </div>
    </div>
  )
}

export const gitHubArchitectureDiagramComponent = {
  name: 'GitHubArchitectureDiagram',
  description: 'Visualizes GitHub repository architecture with interactive node-based diagrams showing frontend, backend, database, API, and service layers with their connections.',
  component: GitHubArchitectureDiagram,
  propsSchema: GitHubArchitectureDiagramPropsSchema,
}