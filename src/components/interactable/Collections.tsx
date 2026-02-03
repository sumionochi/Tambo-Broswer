// components/interactable/Collections.tsx
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { BookMarked, Trash2, ExternalLink } from 'lucide-react'
import { useState } from 'react'

// Zod Schema
export const CollectionsPropsSchema = z.object({
  collections: z.array(z.object({
    id: z.string(),
    name: z.string().describe("Name of the collection"),
    items: z.array(z.object({
      id: z.string(),
      type: z.enum(["article", "pin", "repo", "image"]).describe("Type of saved item"),
      url: z.string().describe("URL of the item"),
      thumbnail: z.string().optional().describe("Thumbnail image URL"),
      title: z.string().describe("Title of the item"),
    }))
  }))
})

type CollectionsProps = z.infer<typeof CollectionsPropsSchema>

function Collections({ collections: initialCollections }: CollectionsProps) {
  const [collections, setCollections] = useTamboComponentState(
    "collections",
    initialCollections || [],
    initialCollections || []
  )

  const [expandedCollection, setExpandedCollection] = useState<string | null>(null)

  // Safe array with null check
  const safeCollections = collections ?? []

  const handleDeleteCollection = (collectionId: string) => {
    setCollections((safeCollections).filter(c => c.id !== collectionId))
  }

  const handleDeleteItem = (collectionId: string, itemId: string) => {
    setCollections((safeCollections).map(col => {
      if (col.id === collectionId) {
        return {
          ...col,
          items: col.items.filter(item => item.id !== itemId)
        }
      }
      return col
    }))
  }

  if (safeCollections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <BookMarked size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Collections Yet</p>
          <p className="text-sm mt-2">Start searching and bookmark items to create collections</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Collections</h2>
        <span className="text-sm text-gray-500">{safeCollections.length} collections</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeCollections.map((collection) => (
          <div
            key={collection.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{collection.name}</h3>
                <p className="text-sm text-gray-500">{collection.items.length} items</p>
              </div>
              <button
                onClick={() => handleDeleteCollection(collection.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Delete collection"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Preview items */}
            <div className="space-y-2">
              {collection.items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                >
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-gray-700">{item.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                    title="Open link"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}

              {collection.items.length > 3 && (
                <button
                  onClick={() => setExpandedCollection(
                    expandedCollection === collection.id ? null : collection.id
                  )}
                  className="text-sm text-blue-600 hover:text-blue-700 w-full text-center py-1"
                >
                  {expandedCollection === collection.id
                    ? 'Show less'
                    : `Show ${collection.items.length - 3} more`
                  }
                </button>
              )}

              {/* Expanded items */}
              {expandedCollection === collection.id && (
                <div className="space-y-2 mt-2">
                  {collection.items.slice(3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                    >
                      {item.thumbnail && (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-gray-700">{item.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(collection.id, item.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const InteractableCollections = withInteractable(Collections, {
  componentName: "Collections",
  description: "User's saved items organized into collections. AI can add items, create new collections, or remove items. Each collection contains bookmarked articles, images, repos, or pins.",
  propsSchema: CollectionsPropsSchema,
})