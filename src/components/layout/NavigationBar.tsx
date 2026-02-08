// components/layout/NavigationBar.tsx
// Redesigned: Vertical sidebar (desktop) + Bottom tabs (mobile)
// Palette: Cream + Sage Green with soft transitions
'use client'

import {
  Search,
  BookMarked,
  Calendar,
  FileText,
  Palette,
  LogOut,
  BarChart3,
  MapPin,
  Layout,
  Workflow,
  FileBarChart,
  PanelLeftClose,
  PanelLeftOpen,
  Leaf,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type WorkspaceView =
  | 'search'
  | 'collections'
  | 'calendar'
  | 'notes'
  | 'studio'
  | 'analytics'
  | 'map'
  | 'canvas'
  | 'workflows'
  | 'reports'

interface NavigationBarProps {
  activeView: WorkspaceView
  onViewChange: (view: WorkspaceView) => void
  userEmail: string
}

const navSections = [
  {
    label: 'Core',
    items: [
      { id: 'search' as const, label: 'Search', icon: Search },
      { id: 'workflows' as const, label: 'Workflows', icon: Workflow },
      { id: 'reports' as const, label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    label: 'Visualize',
    items: [
      { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
      { id: 'map' as const, label: 'Map', icon: MapPin },
      { id: 'canvas' as const, label: 'Canvas', icon: Layout },
    ],
  },
  {
    label: 'Organize',
    items: [
      { id: 'collections' as const, label: 'Collections', icon: BookMarked },
      { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
      { id: 'notes' as const, label: 'Notes', icon: FileText },
      { id: 'studio' as const, label: 'Studio', icon: Palette },
    ],
  },
]

// Flat list for mobile bottom bar — show most important tabs
const mobileNavItems = [
  { id: 'search' as const, label: 'Search', icon: Search },
  { id: 'workflows' as const, label: 'Workflows', icon: Workflow },
  { id: 'collections' as const, label: 'Collections', icon: BookMarked },
  { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'notes' as const, label: 'Notes', icon: FileText },
]

export function NavigationBar({ activeView, onViewChange, userEmail }: NavigationBarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  // ─── MOBILE: Bottom Tab Bar ───
  if (isMobile) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 fs-glass"
        style={{
          borderTop: '1px solid var(--fs-border-light)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className="fs-focus-ring flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
                style={{
                  color: isActive ? 'var(--fs-sage-600)' : 'var(--fs-text-muted)',
                  background: isActive ? 'var(--fs-sage-50)' : 'transparent',
                  transitionDuration: 'var(--fs-duration-normal)',
                  transitionTimingFunction: 'var(--fs-ease-out)',
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{
                    transition: 'transform var(--fs-duration-normal) var(--fs-ease-spring)',
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{
                    transition: 'color var(--fs-duration-normal) var(--fs-ease-out)',
                  }}
                >
                  {item.label}
                </span>
                {/* Active dot indicator */}
                <div
                  className="w-1 h-1 rounded-full transition-all"
                  style={{
                    background: isActive ? 'var(--fs-sage-500)' : 'transparent',
                    transitionDuration: 'var(--fs-duration-normal)',
                  }}
                />
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  // ─── DESKTOP: Vertical Sidebar ───
  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all fs-scrollbar"
      style={{
        width: collapsed ? 'var(--fs-sidebar-collapsed)' : 'var(--fs-sidebar-width)',
        background: 'var(--fs-cream-50)',
        borderRight: '1px solid var(--fs-border-light)',
        transitionDuration: 'var(--fs-duration-slow)',
        transitionTimingFunction: 'var(--fs-ease-out)',
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="flex items-center shrink-0 px-4 overflow-hidden"
        style={{
          height: 'var(--fs-header-height)',
          borderBottom: '1px solid var(--fs-border-light)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo Mark */}
          <div
            className="shrink-0 flex items-center justify-center rounded-xl"
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, var(--fs-sage-500), var(--fs-sage-700))',
              boxShadow: '0 2px 8px rgba(91, 143, 91, 0.3)',
            }}
          >
            <Leaf size={18} className="text-white" strokeWidth={2.2} />
          </div>

          {/* Brand text — hidden when collapsed */}
          {!collapsed && (
            <div className="min-w-0 fs-animate-in">
              <h1
                className="text-base font-bold tracking-tight truncate"
                style={{
                  fontFamily: "'Fraunces', serif",
                  color: 'var(--fs-text-primary)',
                }}
              >
                Tambo Browser
              </h1>
              <p
                className="text-[10px] font-medium uppercase tracking-widest truncate"
                style={{ color: 'var(--fs-text-muted)' }}
              >
                Search Engine
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation Sections ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 fs-scrollbar">
        <div className="space-y-6 fs-stagger">
          {navSections.map((section) => (
            <div key={section.label}>
              {/* Section Label */}
              {!collapsed && (
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 fs-animate-in"
                  style={{ color: 'var(--fs-text-muted)' }}
                >
                  {section.label}
                </p>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeView === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      title={collapsed ? item.label : undefined}
                      className="fs-focus-ring group w-full flex items-center gap-3 rounded-xl transition-all relative overflow-hidden"
                      style={{
                        padding: collapsed ? '10px' : '10px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        color: isActive ? 'var(--fs-sage-700)' : 'var(--fs-text-secondary)',
                        background: isActive ? 'var(--fs-sage-100)' : 'transparent',
                        transitionDuration: 'var(--fs-duration-normal)',
                        transitionTimingFunction: 'var(--fs-ease-out)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--fs-cream-200)'
                          e.currentTarget.style.color = 'var(--fs-text-primary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--fs-text-secondary)'
                        }
                      }}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full fs-animate-scale-in"
                          style={{
                            height: '60%',
                            background: 'var(--fs-sage-500)',
                          }}
                        />
                      )}

                      <Icon
                        size={19}
                        strokeWidth={isActive ? 2.2 : 1.7}
                        className="shrink-0 transition-transform"
                        style={{
                          transitionDuration: 'var(--fs-duration-normal)',
                          transitionTimingFunction: 'var(--fs-ease-spring)',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                        }}
                      />

                      {!collapsed && (
                        <span
                          className="text-sm truncate transition-all"
                          style={{
                            fontWeight: isActive ? 600 : 400,
                            transitionDuration: 'var(--fs-duration-normal)',
                          }}
                        >
                          {item.label}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Collapse Toggle ── */}
      <div
        className="px-3 py-2"
        style={{ borderTop: '1px solid var(--fs-border-light)' }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="fs-focus-ring w-full flex items-center gap-3 rounded-xl transition-all"
          style={{
            padding: collapsed ? '10px' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'var(--fs-text-muted)',
            transitionDuration: 'var(--fs-duration-normal)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--fs-cream-200)'
            e.currentTarget.style.color = 'var(--fs-text-secondary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--fs-text-muted)'
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} strokeWidth={1.7} />
          ) : (
            <>
              <PanelLeftClose size={18} strokeWidth={1.7} />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* ── User Profile ── */}
      <div
        className="px-3 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--fs-border-light)' }}
      >
        <div
          className="flex items-center gap-3 rounded-xl transition-all"
          style={{
            padding: collapsed ? '8px' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {/* Avatar */}
          <div
            className="shrink-0 flex items-center justify-center rounded-full text-xs font-semibold"
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, var(--fs-sage-200), var(--fs-sage-300))',
              color: 'var(--fs-sage-800)',
            }}
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0 fs-animate-in">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--fs-text-primary)' }}
              >
                {userEmail.split('@')[0]}
              </p>
              <p
                className="text-[11px] truncate"
                style={{ color: 'var(--fs-text-muted)' }}
              >
                {userEmail}
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="fs-focus-ring shrink-0 p-1.5 rounded-lg transition-all"
              style={{
                color: 'var(--fs-text-muted)',
                transitionDuration: 'var(--fs-duration-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--fs-cream-300)'
                e.currentTarget.style.color = 'var(--fs-text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--fs-text-muted)'
              }}
              title="Sign out"
            >
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}