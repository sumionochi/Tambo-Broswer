// components/interactable/Collections.tsx
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { BookMarked, Trash2, ExternalLink, RefreshCw, Edit2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

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
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    collectionId: string
    collectionName: string
  } | null>(null)

  const [editingCollection, setEditingCollection] = useState<{
    id: string
    name: string
  } | null>(null)

  // Load collections from database on mount
  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadCollections()
    }
  }, [])

  const loadCollections = async () => {
    if (isLoadingRef.current) {
      console.log('⏭️ Skipping duplicate load request')
      return
    }

    try {
      isLoadingRef.current = true
      setLoading(true)
      
      console.log('📚 Fetching collections...')
      const response = await fetch('/api/collections')
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Loaded', data.collections.length, 'collections')
        setCollections(data.collections || [])
        hasLoadedRef.current = true
      }
    } catch (error) {
      console.error('Failed to load collections:', error)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const handleRefresh = () => {
    hasLoadedRef.current = false
    loadCollections()
  }

  const safeCollections = collections ?? []

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      console.log('🗑️ Deleting collection:', collectionId)
      
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCollections(safeCollections.filter(c => c.id !== collectionId))
        console.log('✅ Collection deleted')
      } else {
        console.error('❌ Failed to delete collection')
      }
    } catch (error) {
      console.error('Delete collection error:', error)
    }
  }

  const handleDeleteItem = async (collectionId: string, itemId: string) => {
    try {
      console.log('🗑️ Deleting item:', itemId, 'from collection:', collectionId)
      
      const response = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCollections(safeCollections.map(col => {
          if (col.id === collectionId) {
            return {
              ...col,
              items: col.items.filter(item => item.id !== itemId)
            }
          }
          return col
        }))
        console.log('✅ Item deleted')
      } else {
        console.error('❌ Failed to delete item')
      }
    } catch (error) {
      console.error('Delete item error:', error)
    }
  }

  const handleRenameCollection = async (collectionId: string, newName: string) => {
    try {
      console.log('✏️ Renaming collection:', collectionId, 'to:', newName)
      
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
  
      if (response.ok) {
        setCollections(safeCollections.map(c =>
          c.id === collectionId ? { ...c, name: newName } : c
        ))
        setEditingCollection(null)
        console.log('✅ Collection renamed')
      } else {
        console.error('❌ Failed to rename collection')
      }
    } catch (error) {
      console.error('Rename collection error:', error)
    }
  }

  if (loading && safeCollections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading collections...</p>
        </div>
      </div>
    )
  }

  if (safeCollections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <BookMarked size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Collections Yet</p>
          <p className="text-sm mt-2">Start searching and bookmark items to create collections</p>
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
      <div className="p-6 space-y-4 overflow-y-auto h-full">
        {/* Header with EditWithTamboButton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Collections</h2>
            <p className="text-sm text-gray-500 mt-1">{safeCollections.length} collections</p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton 
              tooltip="Edit collections with AI"
              description="Organize, rename, merge, or manage your collections using natural language commands"
            />
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh collections"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeCollections.map((collection) => (
            <div
              key={collection.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                {editingCollection?.id === collection.id ? (
                  <input
                    type="text"
                    value={editingCollection.name}
                    onChange={(e) => setEditingCollection({ ...editingCollection, name: e.target.value })}
                    onBlur={() => {
                      if (editingCollection.name.trim() && editingCollection.name !== collection.name) {
                        handleRenameCollection(collection.id, editingCollection.name.trim())
                      } else {
                        setEditingCollection(null)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingCollection.name.trim()) {
                          handleRenameCollection(collection.id, editingCollection.name.trim())
                        }
                      } else if (e.key === 'Escape') {
                        setEditingCollection(null)
                      }
                    }}
                    className="flex-1 font-semibold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent px-1"
                    autoFocus
                  />
                ) : (
                  <div className="flex-1 flex items-center gap-2 group">
                    <div>
                      <h3 className="font-semibold text-gray-900">{collection.name}</h3>
                      <p className="text-sm text-gray-500">{collection.items.length} items</p>
                    </div>
                    <button
                      onClick={() => setEditingCollection({ id: collection.id, name: collection.name })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600 p-1"
                      title="Rename collection"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setConfirmDialog({
                    isOpen: true,
                    collectionId: collection.id,
                    collectionName: collection.name,
                  })}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-2"
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

      {/* Confirm Delete Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => handleDeleteCollection(confirmDialog.collectionId)}
          title="Delete Collection"
          message={`Are you sure you want to delete "${confirmDialog.collectionName}"? This will remove all ${safeCollections.find(c => c.id === confirmDialog.collectionId)?.items.length || 0} items in this collection. This action cannot be undone.`}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}
    </>
  )
}

export const InteractableCollections = withInteractable(Collections, {
  componentName: "Collections",
  description: "User's saved items organized into collections. AI can add items, create new collections, or remove items. Each collection contains bookmarked articles, images, repos, or pins.",
  propsSchema: CollectionsPropsSchema,
})