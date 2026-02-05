// components/interactable/ImageStudio.tsx
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { Image as ImageIcon, Download, Trash2, RefreshCw } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

export const ImageStudioPropsSchema = z.object({
  variations: z.array(z.string()).describe("Array of generated image URLs or base64 data"),
  currentPrompt: z.string().optional().describe("The prompt used to generate variations"),
})

type ImageStudioProps = z.infer<typeof ImageStudioPropsSchema>

interface GeneratedImage {
  id: string
  originalUrl: string
  variations: string[]
  createdAt: string
}

function ImageStudio({ variations: initialVariations, currentPrompt }: ImageStudioProps) {
  const [variations, setVariations] = useTamboComponentState(
    "variations",
    initialVariations || [],
    initialVariations || []
  )

  const [prompt, setPrompt] = useTamboComponentState(
    "prompt",
    currentPrompt || "",
    currentPrompt || ""
  )

  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    imageId: string
    variationCount: number
  } | null>(null)

  // Load generated images on mount
  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadImages()
    }
  }, [])

  const loadImages = async () => {
    if (isLoadingRef.current) {
      console.log('⏭️ Skipping duplicate studio load')
      return
    }

    try {
      isLoadingRef.current = true
      setLoading(true)
      
      console.log('🎨 Fetching generated images...')
      const response = await fetch('/api/studio')
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Loaded', data.images.length, 'generated images')
        setImages(data.images || [])
        hasLoadedRef.current = true
      }
    } catch (error) {
      console.error('Failed to load images:', error)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const handleRefresh = () => {
    hasLoadedRef.current = false
    loadImages()
  }

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
      console.log('🗑️ Deleting image:', imageId)
      
      const response = await fetch(`/api/studio/${imageId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setImages(images.filter(img => img.id !== imageId))
        console.log('✅ Image deleted')
      } else {
        console.error('❌ Failed to delete image')
      }
    } catch (error) {
      console.error('Delete image error:', error)
    }
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading studio...</p>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Generated Images Yet</p>
          <p className="text-sm mt-2">Search for images and ask AI to edit them</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 space-y-6 overflow-y-auto h-full">
        {/* Header with EditWithTamboButton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Image Studio</h2>
            <p className="text-sm text-gray-500 mt-1">
              {images.length} generation{images.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton 
              tooltip="Edit images with AI"
              description="Regenerate variations, modify images, or create new edits using natural language"
            />
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh studio"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Current Prompt */}
        {currentPrompt && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-900 mb-1">Current Edit Prompt:</p>
            <p className="text-purple-800">{currentPrompt}</p>
          </div>
        )}

        {/* Image Sessions */}
        <div className="space-y-8">
          {images.map((image) => (
            <div key={image.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Generated Variations</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(image.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmDialog({
                    isOpen: true,
                    imageId: image.id,
                    variationCount: image.variations.length,
                  })}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete all"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Original Image */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Original:</p>
                <img
                  src={image.originalUrl}
                  alt="Original"
                  className="w-48 h-48 object-cover rounded-lg border border-gray-300"
                />
              </div>

              {/* Generated Variations */}
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Variations ({image.variations.length}):
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {image.variations.map((variation, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      onClick={() => setSelectedVariation(variation)}
                    >
                      <img
                        src={variation}
                        alt={`Variation ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(variation, index)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 p-2 rounded-lg hover:bg-gray-100"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                      </div>

                      {/* Image Number Badge */}
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Image Preview Modal */}
        {selectedVariation && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
            onClick={() => setSelectedVariation(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={selectedVariation}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <button
                onClick={() => setSelectedVariation(null)}
                className="absolute top-4 right-4 bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => handleDeleteImage(confirmDialog.imageId)}
          title="Delete Image Set"
          message={`Are you sure you want to delete this image set with ${confirmDialog.variationCount} variation${confirmDialog.variationCount !== 1 ? 's' : ''}? This action cannot be undone.`}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}
    </>
  )
}

export const InteractableImageStudio = withInteractable(ImageStudio, {
  componentName: "ImageStudio",
  description: "Workspace for AI-generated image variations. Shows original images and their edited versions. Users can preview, download, or delete generated images.",
  propsSchema: ImageStudioPropsSchema,
})