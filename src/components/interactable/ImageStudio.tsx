// components/interactable/ImageStudio.tsx
// REDESIGNED: Cream/Sage palette, polished image cards, soft transitions
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { Image as ImageIcon, Download, Trash2, RefreshCw, X as XIcon, Sparkles } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

export const ImageStudioPropsSchema = z.object({
    variations: z.array(z.string().nullable().default('')).nullable().optional().default([]).describe("Array of generated image URLs or base64 data"),
    currentPrompt: z.string().optional().nullable().describe("The prompt used to generate variations"),
  })

// Tambo-safe: handle undefined props during streaming
const _pImageStudio = ImageStudioPropsSchema.parse.bind(ImageStudioPropsSchema);
const _spImageStudio = ImageStudioPropsSchema.safeParse.bind(ImageStudioPropsSchema);
(ImageStudioPropsSchema as any).parse = (d: unknown, p?: any) => _pImageStudio(d ?? {}, p);
(ImageStudioPropsSchema as any).safeParse = (d: unknown, p?: any) => _spImageStudio(d ?? {}, p);

type ImageStudioProps = z.infer<typeof ImageStudioPropsSchema>

interface GeneratedImage {
  id: string
  originalUrl: string
  variations: string[]
  createdAt: string
}

function ImageStudio({ variations: initialVariations, currentPrompt }: ImageStudioProps) {
  const [variations, setVariations] = useTamboComponentState("variations", initialVariations || [], initialVariations || [])
  const [prompt, setPrompt] = useTamboComponentState("prompt", currentPrompt || "", currentPrompt || "")
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; imageId: string; variationCount: number } | null>(null)

  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) loadImages()
  }, [])

  const loadImages = async () => {
    if (isLoadingRef.current) return
    try {
      isLoadingRef.current = true
      setLoading(true)
      const response = await fetch('/api/studio')
      if (response.ok) {
        const data = await response.json()
        setImages(data.images || [])
        hasLoadedRef.current = true
      }
    } catch (error) { console.error('Failed to load images:', error) }
    finally { setLoading(false); isLoadingRef.current = false }
  }

  const handleRefresh = () => { hasLoadedRef.current = false; loadImages() }

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `variation-${index + 1}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/studio/${imageId}`, { method: 'DELETE' })
      if (response.ok) setImages(images.filter(img => img.id !== imageId))
    } catch (error) { console.error('Delete image error:', error) }
  }

  // ─── Loading ───
  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in">
          <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4"
            style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--fs-text-muted)' }}>Loading studio...</p>
        </div>
      </div>
    )
  }

  // ─── Empty ───
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in" style={{ maxWidth: 320 }}>
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--fs-sage-50)' }}>
            <Sparkles size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
            No Generated Images Yet
          </p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--fs-text-muted)' }}>
            Search for images and ask AI to edit them
          </p>
          <button onClick={handleRefresh}
            className="mt-5 px-5 py-2.5 text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-all"
            style={{ background: 'var(--fs-sage-600)', color: 'var(--fs-text-on-green)', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)' }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 md:p-8 overflow-y-auto h-full fs-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fs-animate-in">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
              Image Studio
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              {images.length} generation{images.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton tooltip="Edit images with AI" description="Regenerate variations, modify images, or create new edits using natural language" />
            <RefreshBtn loading={loading} onClick={handleRefresh} />
          </div>
        </div>

        {/* Current Prompt Banner */}
        {currentPrompt && (
          <div className="rounded-2xl p-4 mb-6 fs-animate-in"
            style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--fs-sage-600)' }}>
              Current Edit Prompt
            </p>
            <p className="text-sm" style={{ color: 'var(--fs-sage-800)' }}>{currentPrompt}</p>
          </div>
        )}

        {/* Image Sessions */}
        <div className="space-y-8 fs-stagger">
          {images.map((image) => (
            <div key={image.id}
              className="rounded-2xl p-6 transition-all fs-animate-in"
              style={{
                background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)',
                boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}>

              {/* Session Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--fs-text-primary)' }}>Generated Variations</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>
                    {new Date(image.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmDialog({ isOpen: true, imageId: image.id, variationCount: image.variations.length })}
                  className="p-2 rounded-xl transition-all"
                  style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = '#FEF2F2' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                  title="Delete all">
                  <Trash2 size={16} strokeWidth={1.8} />
                </button>
              </div>

              {/* Original */}
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fs-text-muted)' }}>Original</p>
                <img src={image.originalUrl} alt="Original"
                  className="w-44 h-44 object-cover rounded-xl"
                  style={{ border: '1px solid var(--fs-border-light)' }} />
              </div>

              {/* Variations Grid */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fs-text-muted)' }}>
                  Variations ({image.variations.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {image.variations.map((variation, index) => (
                    <div key={index}
                      className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer transition-all"
                      style={{
                        background: 'var(--fs-cream-200)',
                        border: '1px solid var(--fs-border-light)',
                        transitionDuration: 'var(--fs-duration-normal)',
                      }}
                      onClick={() => setSelectedVariation(variation)}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--fs-sage-300)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)'; e.currentTarget.style.boxShadow = 'none' }}>
                      <img src={variation} alt={`Variation ${index + 1}`} className="w-full h-full object-cover" />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"
                        style={{ transitionDuration: 'var(--fs-duration-normal)' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(variation, index) }}
                          className="opacity-0 group-hover:opacity-100 transition-all p-2.5 rounded-xl"
                          style={{
                            background: 'rgba(255,255,255,0.95)', color: 'var(--fs-text-primary)',
                            boxShadow: 'var(--fs-shadow-md)', transitionDuration: 'var(--fs-duration-normal)',
                          }}
                          title="Download">
                          <Download size={16} strokeWidth={1.8} />
                        </button>
                      </div>

                      {/* Badge */}
                      <div className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Preview Modal ── */}
        {selectedVariation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(31, 46, 31, 0.80)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedVariation(null)}>
            <div className="relative max-w-4xl max-h-[90vh] fs-animate-scale-in">
              <img src={selectedVariation} alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-2xl"
                style={{ boxShadow: 'var(--fs-shadow-lg)' }} />
              <button onClick={() => setSelectedVariation(null)}
                className="absolute top-3 right-3 p-2 rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.9)', color: 'var(--fs-text-primary)',
                  boxShadow: 'var(--fs-shadow-md)', transitionDuration: 'var(--fs-duration-fast)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'white' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)' }}>
                <XIcon size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmDialog && (
        <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog(null)}
          onConfirm={() => handleDeleteImage(confirmDialog.imageId)} title="Delete Image Set"
          message={`Are you sure you want to delete this image set with ${confirmDialog.variationCount} variation${confirmDialog.variationCount !== 1 ? 's' : ''}? This action cannot be undone.`}
          confirmText="Delete" confirmStyle="danger" />
      )}
    </>
  )
}

function RefreshBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="p-2.5 rounded-xl transition-all disabled:opacity-50"
      style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-normal)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)'; e.currentTarget.style.color = 'var(--fs-text-primary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fs-text-muted)' }}
      title="Refresh">
      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
    </button>
  )
}

export const InteractableImageStudio = withInteractable(ImageStudio, {
  componentName: "ImageStudio",
  description: "Workspace for AI-generated image variations. Shows original images and their edited versions. Users can preview, download, or delete generated images.",
  propsSchema: ImageStudioPropsSchema,
})