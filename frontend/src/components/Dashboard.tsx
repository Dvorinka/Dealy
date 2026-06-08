import { useEffect, useState } from 'react'
import { FlaskConical, Package, DollarSign, TrendingUp, AlertTriangle, Activity, Beaker } from 'lucide-react'
import { api } from '../api'
import type { Stats, Order, Evidence } from '../types'
import PixelSprite from './PixelSprite'

function StatCard({ icon: Icon, label, value, subtext, color }: { icon: any; label: string; value: string; subtext?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${color} bg-opacity-10`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        <Activity size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      {subtext && <div className="text-[11px] text-muted-foreground mt-1.5">{subtext}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    stored: 'bg-success/15 text-success border-success/30',
    in_transit: 'bg-warning/15 text-warning border-warning/30',
    disposed: 'bg-muted text-muted-foreground',
    seized: 'bg-destructive/15 text-destructive border-destructive/30',
    pending: 'bg-warning/15 text-warning border-warning/30',
    confirmed: 'bg-info/15 text-info border-info/30',
    delivered: 'bg-success/15 text-success border-success/30',
    cancelled: 'bg-muted text-muted-foreground',
    busted: 'bg-destructive/15 text-destructive border-destructive/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${colors[status] || colors.stored}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [recentEvidence, setRecentEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.listOrders().then(o => o.slice(0, 5)),
      api.listEvidence().then(e => e.slice(0, 5)),
    ]).then(([s, o, e]) => {
      setStats(s)
      setRecentOrders(o)
      setRecentEvidence(e)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-primary font-display text-xl">Loading intel...</div>
      </div>
    )
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  const formatWeight = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(2)} kg` : `${v.toFixed(1)} g`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-display text-foreground mb-1">Operation Status</h2>
        <p className="text-sm text-muted-foreground">Albuquerque distribution network — real-time intelligence</p>
        <div className="mt-3 w-24 h-1 bg-primary rounded-full" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FlaskConical}
          label="Evidence Items"
          value={String(stats?.total_evidence || 0)}
          subtext={`Avg purity: ${stats?.avg_purity || 0}%`}
          color="bg-success"
        />
        <StatCard
          icon={DollarSign}
          label="Inventory Value"
          value={formatCurrency(stats?.total_value || 0)}
          subtext={`${formatWeight(stats?.total_weight || 0)} total weight`}
          color="bg-accent"
        />
        <StatCard
          icon={Package}
          label="Active Orders"
          value={String(stats?.pending_orders || 0)}
          subtext={`${stats?.total_orders || 0} total orders`}
          color="bg-warning"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue"
          value={formatCurrency(stats?.revenue || 0)}
          subtext={`${stats?.active_customers || 0} active customers`}
          color="bg-primary"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Recent Orders</h3>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last 5</span>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map(order => (
              <div key={order.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-sm font-semibold text-foreground">{order.order_code}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{order.customer_codename}</span>
                  <span className="text-accent font-semibold">{formatCurrency(order.total_value)}</span>
                </div>
                {order.meetup_name && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                    <AlertTriangle size={10} />
                    {order.meetup_name}
                  </div>
                )}
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">No orders on record</div>
            )}
          </div>
        </div>

        {/* Recent Evidence */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beaker size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Fresh Evidence</h3>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last 5</span>
          </div>
          <div className="divide-y divide-border">
            {recentEvidence.map(ev => (
              <div key={ev.id} className="px-6 py-4 hover:bg-muted/30 transition-colors flex gap-3">
                <div className="pixel-frame rounded p-1 shrink-0 self-start">
                  <PixelSprite src={ev.image_url || '/assets/pixel/tiles/crate.png'} alt={ev.code} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-sm font-semibold text-foreground">{ev.code}</span>
                  <StatusBadge status={ev.status} />
                </div>
                <div className="text-sm text-foreground mb-1 truncate">{ev.title}</div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{ev.type_name}</span>
                  <span className="text-accent font-semibold">
                    {ev.purity_percent > 0 ? `${ev.purity_percent}% pure` : formatCurrency(ev.street_value)}
                  </span>
                </div>
                </div>
              </div>
            ))}
            {recentEvidence.length === 0 && (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">No evidence logged</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom hazard stripe */}
      <div className="h-2 hazard-stripe rounded-full opacity-60" />
    </div>
  )
}
