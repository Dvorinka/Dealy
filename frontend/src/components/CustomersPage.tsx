import { useEffect, useState } from 'react'
import { Users, Search, Star, MapPin, Phone, DollarSign, X, Shield, Skull } from 'lucide-react'
import { api } from '../api'
import type { Customer } from '../types'

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-success/15 text-success border-success/30',
    flagged: 'bg-warning/15 text-warning border-warning/30',
    burned: 'bg-destructive/15 text-destructive border-destructive/30',
    deceased: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[status] || colors.active}`}>
      {status}
    </span>
  )
}

function TrustStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Star
          key={i}
          size={10}
          className={i < level ? 'text-accent fill-accent' : 'text-muted'}
        />
      ))}
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listCustomers()
      .then(c => { setCustomers(c); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c => {
    const matchesSearch = !search ||
      c.codename.toLowerCase().includes(search.toLowerCase()) ||
      c.real_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.territory?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !filterStatus || c.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-primary font-display text-xl">Loading clients...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display text-foreground mb-1">Client Network</h2>
          <p className="text-sm text-muted-foreground">Distribution partners and their territories</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="burned">Burned</option>
            <option value="deceased">Deceased</option>
          </select>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/40 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Users size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{c.codename}</h3>
                  {c.real_name && <p className="text-xs text-muted-foreground">{c.real_name}</p>}
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>

            <div className="space-y-2.5 mb-4">
              {c.territory && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={13} />
                  {c.territory}
                </div>
              )}
              {c.contact && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={13} />
                  {c.contact}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Trust Level</div>
                <TrustStars level={c.trust_level} />
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Spent</div>
                <div className="text-accent font-bold">{formatCurrency(c.total_spent)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
          No clients found
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  {selected.status === 'deceased' ? <Skull size={22} className="text-muted-foreground" /> : <Shield size={22} className="text-primary" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selected.codename}</h3>
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              {selected.real_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Real name: </span>
                  <span className="text-foreground font-medium">{selected.real_name}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Trust</div>
                  <div className="text-xl font-bold text-foreground">{selected.trust_level}/10</div>
                  <div className="mt-1"><TrustStars level={selected.trust_level} /></div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Spent</div>
                  <div className="text-xl font-bold text-accent">{formatCurrency(selected.total_spent)}</div>
                </div>
              </div>

              <div className="space-y-2.5">
                {selected.territory && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Territory:</span>
                    <span className="text-foreground font-medium">{selected.territory}</span>
                  </div>
                )}
                {selected.contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Contact:</span>
                    <span className="text-foreground font-medium">{selected.contact}</span>
                  </div>
                )}
                {selected.order_count !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Orders:</span>
                    <span className="text-foreground font-medium">{selected.order_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
