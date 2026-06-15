'use client'

import { useEffect, useState } from 'react'
import { MapPin, Navigation, AlertTriangle, X, FlaskConical, Home, Package, Eye, Crosshair } from 'lucide-react'
import { api } from '../api'
import type { Location } from '../types'
import { ModernMap } from './MapView'

const typeIcons: Record<string, any> = {
  lab: FlaskConical,
  stash: Package,
  dead_drop: Eye,
  safe_house: Home,
  meeting_spot: Crosshair,
}

const typeColors: Record<string, string> = {
  lab: 'text-primary border-primary/30 bg-primary/10',
  stash: 'text-accent border-accent/30 bg-accent/10',
  dead_drop: 'text-warning border-warning/30 bg-warning/10',
  safe_house: 'text-info border-info/30 bg-info/10',
  meeting_spot: 'text-destructive border-destructive/30 bg-destructive/10',
}

const statusColors: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/30',
  busted: 'bg-destructive/15 text-destructive border-destructive/30',
  abandoned: 'bg-muted text-muted-foreground',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[status] || statusColors.active}`}>
      {status}
    </span>
  )
}

export default function MapPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Location | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listLocations()
      .then(l => { setLocations(l); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = locations.filter(l => {
    const matchesType = !filterType || l.type === filterType
    const matchesStatus = !filterStatus || l.status === filterStatus
    return matchesType && matchesStatus
  })

  const activeLocations = filtered.filter(l => l.lat && l.lng)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-primary font-display text-xl">Loading coordinates...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display text-foreground mb-1">Meetup Grid</h2>
          <p className="text-sm text-muted-foreground">Operational locations across Albuquerque territory</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Types</option>
          <option value="lab">Lab</option>
          <option value="stash">Stash</option>
          <option value="dead_drop">Dead Drop</option>
          <option value="safe_house">Safe House</option>
          <option value="meeting_spot">Meeting Spot</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="busted">Busted</option>
          <option value="abandoned">Abandoned</option>
        </select>
        {(filterType || filterStatus) && (
          <button
            onClick={() => { setFilterType(''); setFilterStatus('') }}
            className="px-3 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Map + Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modern Map */}
        <div className="lg:col-span-2">
          <ModernMap
            locations={locations}
            selectedLocation={selected}
            onLocationSelect={setSelected}
            filterType={filterType}
            filterStatus={filterStatus}
          />
          
          {/* Quick Location Buttons */}
          <div className="mt-4 bg-card border border-border rounded-xl p-4">
            <div className="text-sm font-semibold text-foreground mb-3">Quick Access</div>
            <div className="flex flex-wrap gap-2">
              {activeLocations.slice(0, 5).map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelected(loc)}
                  className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full border border-white shadow"
                    style={{ backgroundColor: typeColors[loc.type] ? typeColors[loc.type].split(' ')[0] : '#6b7280' }}
                  />
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[600px]">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Locations ({filtered.length})</h3>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {filtered.map(loc => {
              const Icon = typeIcons[loc.type] || MapPin
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelected(loc)}
                  className="w-full text-left px-4 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${typeColors[loc.type] || typeColors.meeting_spot}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-foreground truncate">{loc.name}</span>
                        <StatusBadge status={loc.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">{loc.address}</div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                        <span>{loc.type.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>{loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Location Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg border ${typeColors[selected.type] || typeColors.meeting_spot}`}>
                  {(typeIcons[selected.type] || MapPin)({ size: 20 })}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selected.name}</h3>
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-muted-foreground">{selected.address}</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Type</div>
                  <div className="text-sm font-bold text-foreground capitalize">{selected.type.replace('_', ' ')}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Coordinates</div>
                  <div className="text-sm font-mono text-foreground">{selected.lat?.toFixed(4)}, {selected.lng?.toFixed(4)}</div>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-warning/5 border border-warning/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-warning" />
                    <span className="text-xs uppercase tracking-wider text-warning font-semibold">Intel</span>
                  </div>
                  <p className="text-sm text-foreground">{selected.notes}</p>
                </div>
              )}

              <a
                href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lng}#map=16/${selected.lat}/${selected.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                <Navigation size={16} />
                Open in Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
