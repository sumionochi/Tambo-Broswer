// components/interactable/Collections.tsx
// REDESIGNED: Cream/Sage palette, polished cards, soft transitions
'use client'

import { withInteractable, useTamboComponentState } from '@tambo-ai/react'
import { z } from 'zod'
import { BookMarked, Trash2, ExternalLink, RefreshCw, Edit2, ChevronDown, ChevronUp, FolderOpen } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '@/components/dialog/ConfirmDialog'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

// Zod Schema
export const CollectionsPropsSchema = z.object({
    collections: z.array(z.object({
      id: z.string().nullable().default(''),
      name: z.string().nullable().default('').describe("Name of the collection"),
      items: z.array(z.object({
        id: z.string().nullable().default(''),
        type: z.enum(["article", "pin", "repo", "image"]).nullable().describe("Type of saved item"),
        url: z.string().nullable().default('').describe("URL of the item"),
        thumbnail: z.string().optional().describe("Thumbnail image URL"),
        title: z.string().nullable().default('').describe("Title of the item"),
      }))
    })).nullable().optional()
  })

// Tambo-safe: handle undefined props during streaming
const _pCollections = CollectionsPropsSchema.parse.bind(CollectionsPropsSchema);
const _spCollections = CollectionsPropsSchema.safeParse.bind(CollectionsPropsSchema);
(CollectionsPropsSchema as any).parse = (d: unknown, p?: any) => _pCollections(d ?? {}, p);
(CollectionsPropsSchema as any).safeParse = (d: unknown, p?: any) => _spCollections(d ?? {}, p);

type CollectionsProps = z.infer<typeof CollectionsPropsSchema>

const typeColors: Record<string, { bg: string; text: string }> = {
  article: { bg: 'var(--fs-sage-50)', text: 'var(--fs-sage-700)' },
  pin:     { bg: '#FFF7ED', text: '#9A3412' },
  repo:    { bg: '#EFF6FF', text: '#1D4ED8' },
  image:   { bg: '#FDF2F8', text: '#BE185D' },
}

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

  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadCollections()
    }
  }, [])

  const loadCollections = async () => {
    if (isLoadingRef.current) return
    try {
      isLoadingRef.current = true
      setLoading(true)
      const response = await fetch('/api/collections')
      if (response.ok) {
        const data = await response.json()
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
      const response = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' })
      if (response.ok) {
        setCollections(safeCollections.filter(c => c.id !== collectionId))
      }
    } catch (error) {
      console.error('Delete collection error:', error)
    }
  }

  const handleDeleteItem = async (collectionId: string, itemId: string) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/items/${itemId}`, { method: 'DELETE' })
      if (response.ok) {
        setCollections(safeCollections.map(col => {
          if (col.id === collectionId) {
            return { ...col, items: col.items.filter(item => item.id !== itemId) }
          }
          return col
        }))
      }
    } catch (error) {
      console.error('Delete item error:', error)
    }
  }

  const handleRenameCollection = async (collectionId: string, newName: string) => {
    try {
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
      }
    } catch (error) {
      console.error('Rename collection error:', error)
    }
  }

  // ─── Loading State ───
  if (loading && safeCollections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in">
          <div
            className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4"
            style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--fs-text-muted)' }}>Loading collections...</p>
        </div>
      </div>
    )
  }

  // ─── Empty State ───
  if (safeCollections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center fs-animate-in" style={{ maxWidth: 320 }}>
          <div
            className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--fs-sage-50)' }}
          >
            <BookMarked size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>
            No Collections Yet
          </p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--fs-text-muted)' }}>
            Start searching and bookmark items to create collections
          </p>
          <button
            onClick={handleRefresh}
            className="mt-5 px-5 py-2.5 text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-all"
            style={{
              background: 'var(--fs-sage-600)',
              color: 'var(--fs-text-on-green)',
              boxShadow: 'var(--fs-shadow-sm)',
              transitionDuration: 'var(--fs-duration-normal)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-700)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  // ─── Main View ───
  return (
    <>
      <div className="p-6 md:p-8 overflow-y-auto h-full fs-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fs-animate-in">
          <div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}
            >
              My Collections
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>
              {safeCollections.length} collection{safeCollections.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EditWithTamboButton
              tooltip="Edit collections with AI"
              description="Organize, rename, merge, or manage your collections using natural language commands"
            />
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl transition-all disabled:opacity-50"
              style={{
                color: 'var(--fs-text-muted)',
                transitionDuration: 'var(--fs-duration-normal)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)'; e.currentTarget.style.color = 'var(--fs-text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fs-text-muted)' }}
              title="Refresh collections"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Collection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 fs-stagger">
          {safeCollections.map((collection, index) => {
            const isExpanded = expandedCollection === collection.id
            return (
              <div
                key={collection.id || index}
                className="rounded-2xl p-5 transition-all fs-animate-in"
                style={{
                  background: 'var(--fs-cream-50)',
                  border: '1px solid var(--fs-border-light)',
                  boxShadow: 'var(--fs-shadow-sm)',
                  transitionDuration: 'var(--fs-duration-normal)',
                  transitionTimingFunction: 'var(--fs-ease-out)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)'; e.currentTarget.style.borderColor = 'var(--fs-sage-200)' }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)'; e.currentTarget.style.borderColor = 'var(--fs-border-light)' }}
              >
                {/* Collection Header */}
                <div className="flex items-start justify-between mb-4">
                  {editingCollection?.id === collection.id ? (
                    <input
                      type="text"
                      value={editingCollection.name}
                      onChange={(e) => setEditingCollection({ ...editingCollection, name: e.target.value })}
                      onBlur={() => {
                        if (editingCollection.name.trim() && editingCollection.name !== collection.name) {
                          handleRenameCollection(collection.id || '', editingCollection.name.trim())
                        } else {
                          setEditingCollection(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingCollection.name.trim()) {
                          handleRenameCollection(collection.id || '', editingCollection.name.trim())
                        } else if (e.key === 'Escape') {
                          setEditingCollection(null)
                        }
                      }}
                      className="flex-1 font-semibold bg-transparent outline-none px-1 pb-1"
                      style={{
                        color: 'var(--fs-text-primary)',
                        borderBottom: '2px solid var(--fs-sage-500)',
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 flex items-center gap-3 group min-w-0">
                      <div
                        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--fs-sage-100)' }}
                      >
                        <FolderOpen size={16} style={{ color: 'var(--fs-sage-600)' }} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate" style={{ color: 'var(--fs-text-primary)' }}>
                          {collection.name}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--fs-text-muted)' }}>
                          {collection.items.length} item{collection.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingCollection({ id: collection.id || '', name: collection.name || '' })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
                        style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-normal)' }}
                        title="Rename collection"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setConfirmDialog({
                      isOpen: true,
                      collectionId: collection.id || '',
                      collectionName: collection.name || '',
                    })}
                    className="p-1.5 rounded-lg transition-all ml-2"
                    style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = '#FEF2F2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                    title="Delete collection"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Preview Items */}
                <div className="space-y-2">
                  {collection.items.slice(0, 3).map((item, idx) => (
                    <CollectionItem key={item.id || idx} item={item} />
                  ))}

                  {collection.items.length > 3 && (
                    <button
                      onClick={() => setExpandedCollection(isExpanded ? null : collection.id)}
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-all"
                      style={{
                        color: 'var(--fs-sage-600)',
                        transitionDuration: 'var(--fs-duration-normal)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-sage-50)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {isExpanded ? (
                        <>Show less <ChevronUp size={14} /></>
                      ) : (
                        <>Show {collection.items.length - 3} more <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="space-y-2 pt-1 fs-animate-in">
                      {collection.items.slice(3).map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center gap-2">
                          <div className="flex-1">
                            <CollectionItem item={item} />
                          </div>
                          <button
                            onClick={() => handleDeleteItem(collection.id || '', item.id || '')}
                            className="shrink-0 p-1 rounded-lg transition-all"
                            style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fs-text-muted)' }}
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
            )
          })}
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

/** Single collection item row */
function CollectionItem({ item }: { item: { id: string | null; type: string | null; url: string | null; thumbnail?: string; title: string | null } }) {
  const safeType = item.type || 'article'
  const safeTitle = item.title || 'Untitled'
  const safeUrl = item.url || '#'
  const colors = typeColors[safeType] || typeColors.article
  return (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-xl text-sm transition-all group"
      style={{
        background: 'var(--fs-cream-100)',
        transitionDuration: 'var(--fs-duration-fast)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fs-cream-200)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-cream-100)' }}
    >
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={safeTitle}
          className="w-8 h-8 rounded-lg object-cover shrink-0"
          style={{ border: '1px solid var(--fs-border-light)' }}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold uppercase"
          style={{ background: colors.bg, color: colors.text }}
        >
          {safeType.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium" style={{ color: 'var(--fs-text-primary)', fontSize: 13 }}>{safeTitle}</p>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: colors.text }}
        >
          {safeType}
        </span>
      </div>
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        style={{ color: 'var(--fs-sage-600)', transitionDuration: 'var(--fs-duration-fast)' }}
        title="Open link"
      >
        <ExternalLink size={13} />
      </a>
    </div>
  )
}

export const InteractableCollections = withInteractable(Collections, {
  componentName: "Collections",
  description: "User's saved items organized into collections. AI can add items, create new collections, or remove items. Each collection contains bookmarked articles, images, repos, or pins.",
  propsSchema: CollectionsPropsSchema,
})