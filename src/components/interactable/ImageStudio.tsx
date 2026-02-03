// components/interactable/ImageStudio.tsx
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { Palette, Download, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'

// Zod Schema
export const ImageStudioPropsSchema = z.object({
  originalImage: z.object({
    url: z.string().describe("URL of the original image"),
    source: z.string().describe("Source of the image (e.g., 'Pexels', 'Google Images')"),
  }).optional(),
  variations: z.array(z.object({
    url: z.string().describe("URL of the generated variation"),
    prompt: z.string().describe("Prompt used to generate this variation"),
  })),
  currentPrompt: z.string().describe("Current editing prompt"),
})

type ImageStudioProps = z.infer<typeof ImageStudioPropsSchema>

function ImageStudio({ 
  originalImage: initialOriginal, 
  variations: initialVariations,
  currentPrompt: initialPrompt 
}: ImageStudioProps) {
  const [originalImage, setOriginalImage] = useTamboComponentState(
    "originalImage",
    initialOriginal,
    initialOriginal
  )
  const [variations, setVariations] = useTamboComponentState(
    "variations",
    initialVariations || [],
    initialVariations || []
  )
  const [currentPrompt, setCurrentPrompt] = useTamboComponentState(
    "currentPrompt",
    initialPrompt || "",
    initialPrompt || ""
  )

  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)

  // Safe array with null check
  const safeVariations = variations ?? []

  const handleClearStudio = () => {
    setOriginalImage(undefined)
    setVariations([])
    setCurrentPrompt("")
    setSelectedVariation(null)
  }

  const handleRemoveVariation = (url: string) => {
    setVariations(safeVariations.filter(v => v.url !== url))
    if (selectedVariation === url) {
      setSelectedVariation(null)
    }
  }

  if (!originalImage && safeVariations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <Palette size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Image Studio</p>
          <p className="text-sm mt-2">Search for images and ask AI to edit them</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Image Studio</h2>
        <button
          onClick={handleClearStudio}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
          Clear Studio
        </button>
      </div>

      {/* Original Image */}
      {originalImage && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Original Image</h3>
          <div className="relative group">
            <img
              src={originalImage.url}
              alt="Original"
              className="w-full rounded-lg"
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={originalImage.url}
                download
                className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                title="Download"
              >
                <Download size={16} />
              </a>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Source: {originalImage.source}</p>
        </div>
      )}

      {/* Current Prompt */}
      {currentPrompt && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Current Editing Prompt</h4>
          <p className="text-sm text-blue-700">{currentPrompt}</p>
        </div>
      )}

      {/* Variations */}
      {safeVariations.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            Generated Variations ({safeVariations.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeVariations.map((variation, index) => (
              <div
                key={variation.url}
                className={`
                  bg-white rounded-lg border p-3 cursor-pointer transition-all
                  ${selectedVariation === variation.url
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => setSelectedVariation(variation.url)}
              >
                <div className="relative group">
                  <img
                    src={variation.url}
                    alt={`Variation ${index + 1}`}
                    className="w-full rounded-lg"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <a
                      href={variation.url}
                      download
                      className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                      title="Download"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveVariation(variation.url)
                      }}
                      className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50 text-red-600"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                  {variation.prompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedVariation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700">
              Selected variation - Ask AI to save this to a collection
            </p>
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const InteractableImageStudio = withInteractable(ImageStudio, {
  componentName: "ImageStudio",
  description: "Image editing workspace. AI can set the original image, generate variations with prompts, and manage the gallery. Users can download variations and select favorites to save to collections.",
  propsSchema: ImageStudioPropsSchema,
})