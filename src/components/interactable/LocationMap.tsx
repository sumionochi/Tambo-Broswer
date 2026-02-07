// components/interactable/LocationMap.tsx
// REDESIGNED: Cream/Sage palette, polished mode selector, soft transitions
'use client'

import { z } from 'zod'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { TamboComponent } from '@tambo-ai/react'
import { Search, MapPin, Navigation, Bookmark, Loader, Sparkles } from 'lucide-react'
import { EditWithTamboButton } from '@/components/tambo/edit-with-tambo-button'

const Map = dynamic(
  () => import('@/components/tambo/map').then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full flex items-center justify-center rounded-xl" style={{ background: 'var(--fs-cream-200)' }}>
        <div className="flex flex-col items-center gap-2">
          <Loader size={22} className="animate-spin" style={{ color: 'var(--fs-sage-500)' }} />
          <span className="text-sm" style={{ color: 'var(--fs-text-muted)' }}>Loading map...</span>
        </div>
      </div>
    ),
  }
)

export const LocationMapPropsSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    mode: z.enum(['place-search', 'city-explorer', 'saved-places', 'route-planner']).optional().nullable().describe("Type of map mode"),
    searchQuery: z.string().optional().nullable().describe("Initial search query"),
  })
)

type LocationMapProps = z.infer<typeof LocationMapPropsSchema>
type MapMode = 'place-search' | 'city-explorer' | 'saved-places' | 'route-planner'

interface MapData {
  title: string
  center: { lat: number; lng: number }
  zoom: number
  markers: Array<{ lat: number; lng: number; label: string; id?: string }>
}

function LocationMap({ mode: initialMode, searchQuery }: LocationMapProps) {
  const [mode, setMode] = useState<MapMode>(initialMode || 'place-search')
  const [inputValue, setInputValue] = useState(searchQuery || '')
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchPlaces = async (query: string) => {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`, { headers: { 'User-Agent': 'CodeFlow-LocationSearch/1.0' } })
    if (!response.ok) throw new Error('Search failed')
    const data = await response.json()
    if (data.length === 0) throw new Error('No locations found')
    const markers = data.map((place: any, i: number) => ({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), label: place.display_name?.split(',')[0] || 'Unknown', id: `marker-${i}` }))
    if (markers.length === 0) throw new Error('No locations found')
    setMapData({ title: `Search Results: "${query}"`, center: { lat: markers[0].lat, lng: markers[0].lng }, zoom: 12, markers })
  }

  const exploreCity = async (cityName: string) => {
    const landmarks = ['museum', 'park', 'monument', 'church', 'square']
    const allMarkers: any[] = []
    for (const landmark of landmarks) {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${landmark}+in+${encodeURIComponent(cityName)}&limit=5`, { headers: { 'User-Agent': 'CodeFlow-LocationSearch/1.0' } })
      const data = await response.json()
      allMarkers.push(...data.slice(0, 2))
    }
    if (allMarkers.length === 0) throw new Error('No landmarks found')
    const markers = allMarkers.map((place: any, i: number) => ({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), label: place.display_name.split(',')[0], id: `landmark-${i}` }))
    setMapData({ title: `Exploring ${cityName}`, center: { lat: markers[0].lat, lng: markers[0].lng }, zoom: 11, markers })
  }

  const loadSavedPlaces = async () => {
    const response = await fetch('/api/collections')
    const data = await response.json()
    const locationItems = data.collections.flatMap((c: any) => c.items || []).filter((item: any) => item.metadata?.location)
    if (locationItems.length === 0) throw new Error('No saved locations found')
    const markers = locationItems.map((item: any, i: number) => ({ lat: item.metadata.location.coordinates.lat, lng: item.metadata.location.coordinates.lng, label: item.title, id: `saved-${i}` }))
    setMapData({ title: 'Your Saved Places', center: { lat: markers[0].lat, lng: markers[0].lng }, zoom: 10, markers })
  }

  const planRoute = async (locations: string[]) => {
    const allMarkers: any[] = []
    for (const location of locations) {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`, { headers: { 'User-Agent': 'CodeFlow-LocationSearch/1.0' } })
      const data = await response.json()
      if (data[0]) allMarkers.push(data[0])
    }
    if (allMarkers.length === 0) throw new Error('No locations found')
    const markers = allMarkers.map((place: any, i: number) => ({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), label: `Stop ${i + 1}: ${place.display_name.split(',')[0]}`, id: `route-${i}` }))
    const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length
    const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length
    setMapData({ title: 'Route Plan', center: { lat: avgLat, lng: avgLng }, zoom: 10, markers })
  }

  const handleSearch = async () => {
    if (!inputValue.trim() && mode !== 'saved-places') { setError('Please enter a search query'); return }
    setLoading(true); setError(null); setMapData(null)
    try {
      switch (mode) {
        case 'place-search': await searchPlaces(inputValue); break
        case 'city-explorer': await exploreCity(inputValue); break
        case 'saved-places': await loadSavedPlaces(); break
        case 'route-planner': await planRoute(inputValue.split(',').map(l => l.trim())); break
      }
    } catch (err: any) { setError(err.message || 'Search failed') }
    finally { setLoading(false) }
  }

  const modes = [
    { id: 'place-search' as const, label: 'Place Search', icon: Search, description: 'Search for any location', placeholder: 'e.g., coffee shops in Seattle' },
    { id: 'city-explorer' as const, label: 'City Explorer', icon: MapPin, description: 'Discover city landmarks', placeholder: 'e.g., Paris, Tokyo, New York' },
    { id: 'saved-places' as const, label: 'Saved Places', icon: Bookmark, description: 'View saved locations', placeholder: 'Click search to load saved places' },
    { id: 'route-planner' as const, label: 'Route Planner', icon: Navigation, description: 'Plan a multi-stop route', placeholder: 'e.g., Eiffel Tower, Louvre' },
  ]
  const currentMode = modes.find(m => m.id === mode)

  return (
    <div className="p-6 md:p-8 h-full overflow-auto fs-scrollbar" style={{ background: 'var(--fs-cream-100)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between fs-animate-in">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>Location Explorer</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>Search, explore, and save locations around the world</p>
          </div>
          <EditWithTamboButton tooltip="Modify search with AI" description="Change location search or explore different places" />
        </div>

        {/* Mode Selector */}
        <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--fs-text-muted)', letterSpacing: '0.08em' }}>Exploration Mode</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modes.map((m) => {
              const Icon = m.icon; const isActive = mode === m.id
              return (
                <button key={m.id} onClick={() => { setMode(m.id); setMapData(null); setError(null) }}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{
                    border: isActive ? '2px solid var(--fs-sage-500)' : '2px solid var(--fs-border-light)',
                    background: isActive ? 'var(--fs-sage-50)' : 'var(--fs-cream-50)',
                    transitionDuration: 'var(--fs-duration-normal)', transitionTimingFunction: 'var(--fs-ease-out)',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--fs-sage-300)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--fs-border-light)' }}>
                  <Icon size={18} strokeWidth={1.8} style={{ color: isActive ? 'var(--fs-sage-600)' : 'var(--fs-text-muted)' }} />
                  <p className="font-medium mt-2 text-sm" style={{ color: isActive ? 'var(--fs-sage-800)' : 'var(--fs-text-primary)' }}>{m.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>{m.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="rounded-2xl p-6 fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', animationDelay: '50ms' }}>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fs-text-muted)' }}>
                {mode === 'place-search' ? 'Search Location' : mode === 'city-explorer' ? 'City to Explore' : mode === 'saved-places' ? 'Saved Places' : 'Route Stops (comma-separated)'}
              </label>
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={currentMode?.placeholder}
                disabled={mode === 'saved-places'}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all disabled:opacity-60"
                style={{ background: 'var(--fs-cream-100)', border: '2px solid var(--fs-border-light)', color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--fs-sage-400)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)' }} />
              <p className="text-xs mt-2" style={{ color: 'var(--fs-text-muted)' }}>
                {mode === 'route-planner' ? 'Enter locations separated by commas' : mode === 'saved-places' ? 'Click search to load saved locations' : 'Press Enter to search'}
              </p>
            </div>
            <button onClick={handleSearch} disabled={loading || (!inputValue.trim() && mode !== 'saved-places')}
              className="mt-7 px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: 'var(--fs-sage-600)', color: 'white', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)' }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'var(--fs-sage-700)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fs-sage-600)'; e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}>
              {loading ? <><Loader size={16} className="animate-spin" /> Searching...</> : <><Search size={16} /> Search</>}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && <div className="rounded-2xl p-4 fs-animate-in" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}><p className="text-sm font-medium" style={{ color: '#B91C1C' }}>⚠️ {error}</p></div>}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl p-12 text-center fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
            <div className="inline-block w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin mb-4" style={{ borderColor: 'var(--fs-sage-200)', borderTopColor: 'transparent' }} />
            <p className="font-medium" style={{ color: 'var(--fs-text-primary)' }}>Searching locations...</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fs-text-muted)' }}>This may take a moment</p>
          </div>
        )}

        {/* Map */}
        {mapData && !loading && (
          <div className="rounded-2xl overflow-hidden fs-animate-scale-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)', boxShadow: 'var(--fs-shadow-sm)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--fs-border-light)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{mapData.title}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fs-text-muted)' }}>{mapData.markers.length} location{mapData.markers.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="p-4"><Map center={mapData.center} zoom={mapData.zoom} markers={mapData.markers} zoomControl={true} size="lg" /></div>
          </div>
        )}

        {/* Empty */}
        {!mapData && !loading && !error && (
          <div className="rounded-2xl p-12 text-center fs-animate-in" style={{ background: 'var(--fs-cream-50)', border: '1px solid var(--fs-border-light)' }}>
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--fs-sage-50)' }}>
              <MapPin size={28} style={{ color: 'var(--fs-sage-400)' }} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--fs-text-primary)', fontFamily: "'Fraunces', serif" }}>Ready to Explore</h3>
            <p className="text-sm" style={{ color: 'var(--fs-text-muted)', maxWidth: 360, margin: '0 auto' }}>Select a mode and search for locations to get started</p>
          </div>
        )}

        {/* Tip */}
        <div className="rounded-2xl p-4 flex items-start gap-3 fs-animate-in" style={{ background: 'var(--fs-sage-50)', border: '1px solid var(--fs-sage-200)', animationDelay: '100ms' }}>
          <Sparkles size={18} style={{ color: 'var(--fs-sage-600)' }} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--fs-sage-800)' }}>
            <span className="font-semibold">Tip:</span> This map uses OpenStreetMap data for free, worldwide location search and visualization.
          </p>
        </div>
      </div>
    </div>
  )
}

export { LocationMap }

export const locationMapComponent: TamboComponent = {
  name: 'LocationMap',
  description: 'Interactive location search and map visualization with place search, city exploration, saved places, and route planning powered by OpenStreetMap.',
  component: LocationMap,
  propsSchema: LocationMapPropsSchema,
}