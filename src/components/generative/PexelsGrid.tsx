// components/generative/PexelsGrid.tsx
// REDESIGNED: Cream/Sage palette, polished masonry grid, soft transitions
'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useTamboStreamStatus, useTamboComponentState } from '@tambo-ai/react'
import {
  Edit, Save, ExternalLink, AlertCircle, Download, Heart, Eye, Sparkles,
  Image as ImageIcon, Calendar, FileText, Bookmark
} from 'lucide-react'
import { ImageEditDialog } from '@/components/dialog/ImageEditDialog'
import { QuickActionDialog } from '@/components/dialog/QuickActionDialog'

export const PexelsGridPropsSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    searchRequest: z.object({
      query: z.string().nullable().default('').describe('Search query for images'),
      perPage: z.number().optional().describe('Number of images to fetch'),
    }).nullable().optional().describe('Image search parameters'),
  })
)

type PexelsGridProps = z.infer<typeof PexelsGridPropsSchema>

interface PexelsPhoto {
  id: string; url: string; imageUrl: string; thumbnail: string;
  photographer: string; title: string; width?: number; height?: number; avgColor?: string;
}

interface EditDialogState { isOpen: boolean; image: { imageIndex: number; imageUrl: string; title: string; photographer: string } | null }
interface QuickActionState { isOpen: boolean; action: 'bookmark' | 'schedule' | 'note' | null; item: any }

export function PexelsGrid({ searchRequest }: PexelsGridProps) {
  const [photos, setPhotos] = useState<PexelsPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editDialog, setEditDialog] = useState<EditDialogState>({ isOpen: false, image: null })
  const [quickAction, setQuickAction] = useState<QuickActionState>({ isOpen: false, action: null, item: null })
  const [searchSessionId, setSearchSessionId] = useTamboComponentState("pexels_search_session_id", "", "")

  const { streamStatus } = useTamboStreamStatus()
  const isStreaming = !streamStatus.isSuccess && !streamStatus.isError

  useEffect(() => {
    if (!searchRequest?.query || isStreaming) return
    const fetchPhotos = async () => {
      setLoading(true); setError(null); setImageErrors(new Set())
      try {
        const response = await fetch('/api/search/pexels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(searchRequest) })
        if (!response.ok) throw new Error('Image search failed')
        const data = await response.json()
        setPhotos(data.photos ?? [])
        setSearchSessionId(data.searchSessionId || '')
      } catch (err: any) { setError(err.message ?? 'Unknown error') }
      finally { setLoading(false) }
    }
    fetchPhotos()
  }, [searchRequest?.query, isStreaming])

  const handleImageError = (photoId: string) => { setImageErrors(prev => new Set(prev).add(photoId)) }

  const handleEdit = (photo: PexelsPhoto, index: number) => {
    setEditDialog({ isOpen: true, image: { imageIndex: index, imageUrl: photo.imageUrl, title: photo.title, photographer: photo.photographer } })
  }

  const handleSave = (photo: PexelsPhoto) => {
    setQuickAction({ isOpen: true, action: 'bookmark', item: { title: photo.title, url: photo.url, type: 'image' as const, thumbnail: photo.imageUrl } })
  }

  const handleDownload = async (photo: PexelsPhoto) => {
    try {
      const response = await fetch(photo.imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `${photo.title.replace(/\s+/g, '-')}.jpg`
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) { console.error('Download error:', error) }
  }

  /* ── Streaming ── */
  if (isStreaming) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--fs-text-primary)' }}>Searching images...</p>
          <p className="text-xs mt-1" style={{ color: 'var(--fs-text-muted)' }}>Finding beautiful photos on Pexels</p>
        </div>
      </div>
    )
  }

  /* ── Loading Skeleton ── */
  if (loading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <div className="rounded-xl animate-pulse" style={{ height: `${Math.random() * 200 + 200}px`, background: 'var(--fs-cream-200)' }} />
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
          <AlertCircle size={22} style={{ color: '#DC2626' }} />
        </div>
        <p className="font-medium" style={{ color: '#B91C1C' }}>Image Search Error</p>
        <p className="text-sm mt-1" style={{ color: '#DC2626' }}>{error}</p>
      </div>
    )
  }

  /* ── Empty ── */
  if (photos.length === 0) {
    return (
      <div className="text-center py-12 fs-animate-in">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
          <ImageIcon size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
        </div>
        <p className="font-semibold text-lg" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>No images found</p>
        <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>Try a different search for &ldquo;{searchRequest?.query}&rdquo;</p>
      </div>
    )
  }

  /* ── Gallery ── */
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between fs-animate-in">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2.5" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
              <div className="p-1.5 rounded-xl" style={{ background: 'var(--fs-sage-100)' }}>
                <ImageIcon size={16} style={{ color: 'var(--fs-sage-600)' }} strokeWidth={1.8} />
              </div>
              Image Gallery
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{photos.length}</span> photos for{' '}
              <span className="font-semibold" style={{ color: 'var(--fs-sage-600)' }}>&ldquo;{searchRequest?.query}&rdquo;</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fs-text-muted)' }}>
            <Eye size={13} strokeWidth={1.8} />
            <span>Hover to interact</span>
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 fs-stagger">
          {photos.map((photo, index) => {
            const hasError = imageErrors.has(photo.id)
            const isHovered = hoveredId === photo.id
            return (
              <div key={photo.id}
                onMouseEnter={() => setHoveredId(photo.id)} onMouseLeave={() => setHoveredId(null)}
                className="mb-4 break-inside-avoid group fs-animate-in">
                <div className="relative rounded-xl overflow-hidden transition-all"
                  style={{
                    background: 'var(--fs-cream-200)',
                    boxShadow: isHovered ? 'var(--fs-shadow-lg)' : 'var(--fs-shadow-sm)',
                    transitionDuration: 'var(--fs-duration-normal)',
                  }}>

                  {/* Position Badge */}
                  <div className="absolute top-3 left-3 z-20">
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: 'white' }}>
                      #{index + 1}
                    </div>
                  </div>

                  {hasError ? (
                    <div className="w-full aspect-3/4 flex flex-col items-center justify-center" style={{ background: 'var(--fs-cream-200)', color: 'var(--fs-text-muted)' }}>
                      <AlertCircle size={28} className="mb-2" style={{ color: 'var(--fs-text-muted)' }} />
                      <p className="text-xs">Image unavailable</p>
                      <a href={photo.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs mt-2 font-medium" style={{ color: 'var(--fs-sage-600)' }}>View on Pexels</a>
                    </div>
                  ) : (
                    <>
                      <img src={photo.imageUrl} alt={photo.title}
                        className="w-full h-auto object-cover transition-transform group-hover:scale-[1.03]"
                        style={{ transitionDuration: '500ms', backgroundColor: photo.avgColor || 'var(--fs-cream-200)' }}
                        loading="lazy" crossOrigin="anonymous" onError={() => handleImageError(photo.id)} />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 transition-opacity"
                        style={{
                          background: 'linear-gradient(to top, rgba(31,46,31,0.88) 0%, rgba(31,46,31,0.35) 40%, transparent 100%)',
                          opacity: isHovered ? 1 : 0, transitionDuration: 'var(--fs-duration-normal)',
                        }}>
                        <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                          {/* Top Actions */}
                          <div className="flex justify-end gap-1.5">
                            <OverlayBtn icon={Download} tooltip="Download" onClick={() => handleDownload(photo)} />
                            <OverlayBtnLink href={photo.url} icon={ExternalLink} tooltip="Pexels" />
                          </div>

                          {/* Bottom Info */}
                          <div className="space-y-2.5">
                            <div>
                              <p className="text-white font-semibold text-sm line-clamp-2 mb-0.5">{photo.title}</p>
                              <p className="text-white/70 text-xs flex items-center gap-1">
                                <Heart size={9} /> by {photo.photographer}
                              </p>
                            </div>

                            {/* Primary Actions */}
                            <div className="grid grid-cols-2 gap-1.5">
                              <button onClick={() => handleEdit(photo, index)}
                                className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-all"
                                style={{ background: 'var(--fs-sage-500)', color: 'white', transitionDuration: 'var(--fs-duration-fast)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-500)' }}>
                                <Edit size={11} /> Edit
                              </button>
                              <button onClick={() => handleSave(photo)}
                                className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-all"
                                style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'white' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.92)' }}>
                                <Save size={11} /> Save
                              </button>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-1">
                              <button onClick={() => setQuickAction({ isOpen: true, action: 'schedule', item: { title: photo.title, url: photo.url, type: 'image' as const, thumbnail: photo.imageUrl } })}
                                className="flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all"
                                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', transitionDuration: 'var(--fs-duration-fast)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}>
                                <Calendar size={11} className="text-white" />
                              </button>
                              <button onClick={() => setQuickAction({ isOpen: true, action: 'note', item: { title: photo.title, url: photo.url, type: 'image' as const, thumbnail: photo.imageUrl } })}
                                className="flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all"
                                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', transitionDuration: 'var(--fs-duration-fast)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}>
                                <FileText size={11} className="text-white" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tip */}
        <div className="rounded-2xl p-4 flex items-start gap-3 fs-animate-in" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)' }}>
          <Sparkles size={18} style={{ color: 'var(--fs-sage-600)' }} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fs-sage-800)' }}>Pro Tip</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fs-sage-700)' }}>
              Click <span className="font-semibold">Edit</span> to transform images with AI, or{' '}
              <span className="font-semibold">Save</span> to add them to your collections. All edited images appear in the Studio tab!
            </p>
          </div>
        </div>
      </div>

      {editDialog.isOpen && editDialog.image && (
        <ImageEditDialog isOpen={editDialog.isOpen} onClose={() => setEditDialog({ isOpen: false, image: null })} image={editDialog.image} />
      )}
      {quickAction.isOpen && quickAction.action && (
        <QuickActionDialog isOpen={quickAction.isOpen} onClose={() => setQuickAction({ isOpen: false, action: null, item: null })} action={quickAction.action} item={quickAction.item} />
      )}
    </>
  )
}

/* ── Overlay Button Helpers ── */
function OverlayBtn({ icon: Icon, tooltip, onClick }: { icon: any; tooltip: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={tooltip}
      className="p-2 rounded-lg transition-all"
      style={{ background: 'rgba(255,255,255,0.88)', color: 'var(--fs-text-primary)', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-fast)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'scale(1.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.88)'; e.currentTarget.style.transform = 'scale(1)' }}>
      <Icon size={14} strokeWidth={1.8} />
    </button>
  )
}

function OverlayBtnLink({ href, icon: Icon, tooltip }: { href: string; icon: any; tooltip: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={tooltip}
      className="p-2 rounded-lg transition-all"
      style={{ background: 'rgba(255,255,255,0.88)', color: 'var(--fs-text-primary)', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-fast)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'scale(1.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.88)'; e.currentTarget.style.transform = 'scale(1)' }}>
      <Icon size={14} strokeWidth={1.8} />
    </a>
  )
}

export const pexelsGridComponent = {
  name: 'PexelsGrid',
  description: `Pinterest-style image gallery with AI editing capabilities. Features include:
  - Masonry grid layout for beautiful presentation
  - AI-powered image editing with GPT-Image-1.5
  - Quick save to collections
  - Download and share functionality
  - Schedule reminders and create notes
  
  All edited images are saved to the Studio tab for later viewing.`,
  component: PexelsGrid,
  propsSchema: PexelsGridPropsSchema,
}