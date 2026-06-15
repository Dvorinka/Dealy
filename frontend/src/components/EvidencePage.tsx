import { useEffect, useState } from 'react'
import { Search, MapPin, User, Tag, Filter, X, Weight } from 'lucide-react'
import { api } from '../api'
import type { Evidence, EvidenceType } from '../types'
import PixelSprite from './PixelSprite'
import { evidenceTypeSprites } from '../lib/pixelAssets'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Select } from './ui/select'

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    stored: 'bg-success/15 text-success border-success/30',
    in_transit: 'bg-warning/15 text-warning border-warning/30',
    disposed: 'bg-muted text-muted-foreground',
    seized: 'bg-destructive/15 text-destructive border-destructive/30',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[status] || colors.stored}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [types, setTypes] = useState<EvidenceType[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Evidence | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.listEvidence(), api.listEvidenceTypes()])
      .then(([e, t]) => { setEvidence(e); setTypes(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = evidence.filter(ev => {
    const matchesSearch = !search ||
      ev.code.toLowerCase().includes(search.toLowerCase()) ||
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchesType = !filterType || String(ev.type_id) === filterType
    const matchesStatus = !filterStatus || ev.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-primary font-display text-xl">Loading evidence...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display text-foreground mb-1">Evidence Vault</h2>
          <p className="text-sm text-muted-foreground">Inventory tracking — every batch, every location</p>
        </div>
        <div className="h-1 w-24 bg-primary rounded-full lg:hidden" />
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by code, title, or tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={filterType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
              className="bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Types</option>
              {types.map(t => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </Select>
            <Select
              value={filterStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
              className="bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Status</option>
              <option value="stored">Stored</option>
              <option value="in_transit">In Transit</option>
              <option value="disposed">Disposed</option>
              <option value="seized">Seized</option>
            </Select>
            {(search || filterType || filterStatus) && (
              <button
                onClick={() => { setSearch(''); setFilterType(''); setFilterStatus('') }}
                className="px-3 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(ev => (
          <button
            key={ev.id}
            onClick={() => setSelected(ev)}
            className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/40 transition-all duration-300 group overflow-hidden"
          >
            <div className="flex gap-4 mb-3">
              <div className="pixel-frame rounded-lg p-2 shrink-0 bg-muted/30">
                <PixelSprite
                  src={ev.image_url || evidenceTypeSprites[types.find(t => t.id === ev.type_id)?.icon || ''] || '/assets/pixel/tiles/crate.png'}
                  alt={ev.title}
                  size="lg"
                  glow
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-foreground">{ev.code}</span>
                  <StatusBadge status={ev.status} />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{ev.title}</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{ev.description}</p>

            <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-3">
              {ev.type_name && (
                <span className="flex items-center gap-1">
                  <Tag size={10} />
                  {ev.type_name}
                </span>
              )}
              {ev.weight_grams > 0 && (
                <span className="flex items-center gap-1">
                  <Weight size={10} />
                  {ev.weight_grams >= 1000 ? `${(ev.weight_grams / 1000).toFixed(1)}kg` : `${ev.weight_grams}g`}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex gap-1.5">
                {ev.tags?.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">{tag}</span>
                ))}
              </div>
              <span className="text-accent font-bold text-sm">{formatCurrency(ev.street_value)}</span>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Filter size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No matches found</h3>
          <p className="text-sm text-muted-foreground">Adjust your filters or search terms</p>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="pixel-frame rounded-lg p-2">
                  <PixelSprite
                    src={selected.image_url || '/assets/pixel/tiles/flask.png'}
                    alt={selected.title}
                    size="lg"
                    glow
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selected.code}</h3>
                  <p className="text-sm text-muted-foreground">{selected.type_name}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xl font-semibold text-foreground mb-2">{selected.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Purity</div>
                  <div className="text-2xl font-bold text-primary">{selected.purity_percent > 0 ? `${selected.purity_percent}%` : 'N/A'}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Street Value</div>
                  <div className="text-2xl font-bold text-accent">{formatCurrency(selected.street_value)}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Weight</div>
                  <div className="text-2xl font-bold text-foreground">{selected.weight_grams > 0 ? `${selected.weight_grams}g` : 'N/A'}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</div>
                  <div className="mt-1"><StatusBadge status={selected.status} /></div>
                </div>
              </div>

              <div className="space-y-3">
                {selected.location_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="text-foreground font-medium">{selected.location_name}</span>
                  </div>
                )}
                {selected.collector_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Collected by:</span>
                    <span className="text-foreground font-medium">{selected.collector_name}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.tags?.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
