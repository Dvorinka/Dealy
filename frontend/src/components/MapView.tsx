'use client'

import { useEffect, useRef, useState } from 'react'
import { Map, Marker, Popup, NavigationControl, GeolocateControl, ScaleControl } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Navigation, AlertTriangle, Home, Package, Eye, Crosshair } from 'lucide-react'
import type { Location } from '../types'

// Mapbox configuration
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGVzdCIsImFfU3lFOUlTTnJnIn0.K8xF8R4gQ6K8R4gQ6K8xF8'

const typeIcons: Record<string, any> = {
  lab: Home,
  stash: Package,
  dead_drop: Eye,
  safe_house: Home,
  meeting_spot: Crosshair,
}

const typeColors: Record<string, string> = {
  lab: '#10b981',      // green
  stash: '#f59e0b',    // amber
  dead_drop: '#ef4444', // red
  safe_house: '#3b82f6', // blue
  meeting_spot: '#8b5cf6', // purple
}

const statusColors: Record<string, string> = {
  active: '#10b981',    // green
  busted: '#ef4444',    // red
  abandoned: '#6b7280', // gray
}

export interface MapViewProps {
  locations: Location[]
  onLocationSelect?: (location: Location) => void
  selectedLocation?: Location | null
  filterType?: string
  filterStatus?: string
}

export default function MapView({
  locations,
  onLocationSelect,
  selectedLocation,
  filterType,
  filterStatus,
}: MapViewProps) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<MapRef | null>(null)
  const [selectedPopup, setSelectedPopup] = useState<Location | null>(null)

  const filtered = locations.filter(l => {
    const matchesType = !filterType || l.type === filterType
    const matchesStatus = !filterStatus || l.status === filterStatus
    return matchesType && matchesStatus
  })

  const activeLocations = filtered.filter(l => l.lat && l.lng)

  useEffect(() => {
    if (!mapLoaded) {
      mapboxgl.accessToken = MAPBOX_TOKEN
      setMapLoaded(true)
    }
  }, [mapLoaded])

  const center = activeLocations.length > 0
    ? [activeLocations[0].lng, activeLocations[0].lat] as [number, number]
    : [-106.5, 35.5] // Albuquerque center

  const zoom = activeLocations.length > 0 ? 10 : 8

  const handleMarkerClick = (location: Location) => {
    setSelectedPopup(location)
    onLocationSelect?.(location)
  }

  if (!mapLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: zoom,
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: '100%', height: '100%' }}
        interactive={true}
        pitchWithRotate={true}
        dragRotate={true}
        touchZoomRotate={true}
        doubleClickZoom={true}
        scrollZoom={true}
        keyboard={true}
        attributionControl={false}
      >
        <NavigationControl position="top-right" visualizePitch={true} />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-left" />

        {/* Location markers */}
        {activeLocations.map(location => (
          <Marker
            key={location.id}
            longitude={location.lng}
            latitude={location.lat}
            anchor="bottom"
            onClick={() => handleMarkerClick(location)}
          >
            <div
              className="relative cursor-pointer transition-transform hover:scale-110"
              style={{
                width: selectedPopup?.id === location.id ? '32px' : '24px',
                height: selectedPopup?.id === location.id ? '32px' : '24px',
              }}
            >
              <div
                className="rounded-full border-2 border-white shadow-lg"
                style={{
                  backgroundColor: typeColors[location.type] || '#6b7280',
                  width: '100%',
                  height: '100%',
                }}
              />
              {selectedPopup?.id === location.id && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white rounded-lg shadow-xl px-3 py-1.5 text-xs font-medium text-gray-800 border border-gray-200">
                    {location.name}
                  </div>
                </div>
              )}
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {selectedPopup && (
          <Popup
            longitude={selectedPopup.lng}
            latitude={selectedPopup.lat}
            anchor="bottom"
            onClose={() => {
              setSelectedPopup(null)
              if (selectedLocation?.id === selectedPopup.id) {
                // This is a bit hacky but works for the parent component to know
                onLocationSelect?.(selectedPopup)
              }
            }}
            closeOnClick={false}
            className="map-popup"
          >
            <div className="bg-white rounded-lg shadow-xl p-4 max-w-xs border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: typeColors[selectedPopup.type] || '#6b7280' }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{selectedPopup.name}</h3>
                    <div
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium mt-1 inline-block"
                      style={{ backgroundColor: statusColors[selectedPopup.status] || '#6b7280' }}
                    >
                      {selectedPopup.status}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{selectedPopup.address}</p>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Home size={12} />
                  <span className="capitalize">{selectedPopup.type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Navigation size={12} />
                  <span>{selectedPopup.lat?.toFixed(4)}, {selectedPopup.lng?.toFixed(4)}</span>
                </div>
              </div>

              {selectedPopup.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} className="text-amber-600" />
                    <span className="text-xs font-medium text-amber-800">Intel</span>
                  </div>
                  <p className="text-xs text-amber-700">{selectedPopup.notes}</p>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedPopup(null)
                  onLocationSelect?.(selectedPopup)
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <Navigation size={12} />
                Open in Maps
              </button>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="text-xs font-semibold text-gray-900 mb-2">Location Types</div>
        <div className="space-y-1.5">
          {Object.entries(typeColors).map(([type, color]) => {
            const Icon = typeIcons[type] || MapPin
            return (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full border border-white shadow"
                  style={{ backgroundColor: color }}
                />
                <Icon size={12} className="text-gray-600" />
                <span className="text-gray-700 capitalize">{type.replace('_', ' ')}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Status Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="text-xs font-semibold text-gray-900 mb-2">Status</div>
        <div className="space-y-1.5">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full border border-white shadow"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-700 capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Modern white-styled map component for reuse throughout the app
export function ModernMap({ locations, selectedLocation, onLocationSelect, filterType, filterStatus }: MapViewProps) {
  return (
    <div className="relative w-full h-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md border border-gray-200 p-3">
        <div className="text-sm font-semibold text-gray-900 mb-2">Location Statistics</div>
        <div className="space-y-1 text-xs text-gray-600">
          <div>Total Locations: {locations.length}</div>
          <div>Active Markers: {locations.filter(l => l.lat && l.lng).length}</div>
          <div>Filtered: {locations.filter(l => {
            const typeMatch = !filterType || l.type === filterType
            const statusMatch = !filterStatus || l.status === filterStatus
            return typeMatch && statusMatch
          }).length}</div>
        </div>
      </div>

      <MapView
        locations={locations}
        onLocationSelect={onLocationSelect}
        selectedLocation={selectedLocation}
        filterType={filterType}
        filterStatus={filterStatus}
      />
    </div>
  )
}
