'use client'

import { useEffect, useState } from 'react'
import { Package, Search, ChevronRight, X, MapPin, User, Clock, CheckCircle, UserPlus } from 'lucide-react'
import { api } from '../api'
import type { Order, Customer, Location, Evidence } from '../types'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default as any).prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-warning/15 text-warning border-warning/30',
    confirmed: 'bg-info/15 text-info border-info/30',
    in_transit: 'bg-accent/15 text-accent border-accent/30',
    delivered: 'bg-success/15 text-success border-success/30',
    cancelled: 'bg-muted text-muted-foreground',
    busted: 'bg-destructive/15 text-destructive border-destructive/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${colors[status] || colors.pending}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [autoCode, setAutoCode] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [newCust, setNewCust] = useState({ codename: '', real_name: '', contact: '', territory: '' })

  const [newOrder, setNewOrder] = useState({
    customer_id: '',
    meetup_location_id: '',
    notes: '',
    items: [] as { evidence_id: string; quantity: string; unit_price: string }[],
  })

  useEffect(() => { loadAll() }, [])

  function loadAll() {
    setLoading(true)
    Promise.all([
      api.listOrders(),
      api.listCustomers(),
      api.listLocations(),
      api.listEvidence(),
    ]).then(([o, c, l, e]) => {
      setOrders(o)
      setCustomers(c)
      setLocations(l)
      setEvidence(e)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    if (showCreate && !autoCode) {
      api.getNextOrderCode().then(r => setAutoCode(r.order_code)).catch(() => {})
    }
  }, [showCreate])

  const filtered = orders.filter(o => {
    const matchesSearch = !search ||
      o.order_code.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_codename?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !filterStatus || o.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const resetForm = () => {
    setNewOrder({ customer_id: '', meetup_location_id: '', notes: '', items: [] })
    setAutoCode(null)
    setCreatingCustomer(false)
    setNewCust({ codename: '', real_name: '', contact: '', territory: '' })
    setShowMap(false)
  }

  const handleCreateOrder = async () => {
    if (!autoCode || !newOrder.customer_id || newOrder.items.length === 0) return
    try {
      await api.createOrder({
        order_code: autoCode,
        customer_id: Number(newOrder.customer_id),
        meetup_location_id: newOrder.meetup_location_id ? Number(newOrder.meetup_location_id) : undefined,
        notes: newOrder.notes,
        items: newOrder.items.map(i => ({
          evidence_id: Number(i.evidence_id),
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      })
      setShowCreate(false)
      resetForm()
      loadAll()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCreateQuickCustomer = async () => {
    if (!newCust.codename) return
    try {
      const res = await api.createCustomer(newCust as any)
      setNewOrder({ ...newOrder, customer_id: String(res.id) })
      setCreatingCustomer(false)
      setNewCust({ codename: '', real_name: '', contact: '', territory: '' })
      loadAll()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.updateOrder(id, { status })
      loadAll()
      if (selected?.id === id) {
        const updated = await api.getOrder(id)
        setSelected(updated)
      }
    } catch (err: any) { alert(err.message) }
  }

  const handleCreatePayment = async (orderId: number, amount: number) => {
    try {
      await api.createPayment({ order_id: orderId, amount, method: 'cash' })
      loadAll()
      if (selected?.id === orderId) {
        const updated = await api.getOrder(orderId)
        setSelected(updated)
      }
    } catch (err: any) { alert(err.message) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-primary font-display text-xl">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display text-foreground mb-1">Order Ledger</h2>
          <p className="text-sm text-muted-foreground">Track distribution from lab to street</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true) }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <Package size={16} />
          New Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders..."
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
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="busted">Busted</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Order</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Customer</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                <th className="text-right px-6 py-3.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Value</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Meetup</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(order => (
                <tr
                  key={order.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setSelected(order)}
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold text-foreground">{order.order_code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">{order.customer_codename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-accent">{formatCurrency(order.total_value)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {order.meetup_name ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin size={12} />
                        <span className="truncate max-w-[120px]">{order.meetup_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(order.created_at)}</td>
                  <td className="px-6 py-4">
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">No orders found</div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowCreate(false); resetForm() }}>
          <div className="bg-card border border-border rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">New Order</h3>
              <button onClick={() => { setShowCreate(false); resetForm() }} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Order Code</label>
                  <input
                    value={autoCode || ''}
                    readOnly
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-foreground cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Customer</label>
                  {!creatingCustomer ? (
                    <div className="flex gap-2">
                      <select
                        value={newOrder.customer_id}
                        onChange={e => setNewOrder({ ...newOrder, customer_id: e.target.value })}
                        className="flex-1 bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select...</option>
                        {customers.filter(c => c.status === 'active').map(c => (
                          <option key={c.id} value={c.id}>{c.codename}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setCreatingCustomer(true)}
                        className="px-3 py-2 border border-input rounded-lg hover:border-primary transition-colors"
                        title="Quick add customer"
                      >
                        <UserPlus size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Codename *"
                        value={newCust.codename}
                        onChange={e => setNewCust({ ...newCust, codename: e.target.value })}
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Real name"
                          value={newCust.real_name}
                          onChange={e => setNewCust({ ...newCust, real_name: e.target.value })}
                          className="bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          type="text"
                          placeholder="Contact"
                          value={newCust.contact}
                          onChange={e => setNewCust({ ...newCust, contact: e.target.value })}
                          className="bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Territory"
                        value={newCust.territory}
                        onChange={e => setNewCust({ ...newCust, territory: e.target.value })}
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateQuickCustomer}
                          disabled={!newCust.codename}
                          className="flex-1 bg-success hover:bg-success/90 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          Create & Select
                        </button>
                        <button
                          onClick={() => { setCreatingCustomer(false); setNewCust({ codename: '', real_name: '', contact: '', territory: '' }) }}
                          className="px-3 py-2 border border-input rounded-lg hover:bg-muted text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Meetup Location</label>
                <div className="flex gap-2">
                  <select
                    value={newOrder.meetup_location_id}
                    onChange={e => setNewOrder({ ...newOrder, meetup_location_id: e.target.value })}
                    className="flex-1 bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select location...</option>
                    {locations.filter(l => l.status === 'active').map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className="px-3 py-2 border border-input rounded-lg hover:border-primary transition-colors"
                    title="View map picker"
                  >
                    <MapPin size={16} />
                  </button>
                </div>
                {showMap && (
                  <div className="h-56 mt-2 rounded-lg overflow-hidden border border-border">
                    <MapContainer center={[34.5197, -106.8106]} zoom={13} className="h-full w-full" style={{ background: '#f5f5f5' }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {locations.filter(l => l.lat && l.lng).map(loc => (
                        <Marker key={loc.id} position={[loc.lat!, loc.lng!]} icon={storeIcon}>
                          <Popup>
                            <div className="text-xs font-semibold">{loc.name}</div>
                            <button
                              onClick={() => { setNewOrder({ ...newOrder, meetup_location_id: String(loc.id) }); setShowMap(false) }}
                              className="mt-1 px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                            >
                              Select
                            </button>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Notes</label>
                <textarea
                  value={newOrder.notes}
                  onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                  placeholder="Special instructions..."
                  rows={2}
                  className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Items */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Items</label>
                <div className="space-y-2">
                  {newOrder.items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <select
                        value={item.evidence_id}
                        onChange={e => {
                          const items = [...newOrder.items]
                          items[i].evidence_id = e.target.value
                          setNewOrder({ ...newOrder, items })
                        }}
                        className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Select product...</option>
                        {evidence.filter(e => e.status === 'stored').map(e => (
                          <option key={e.id} value={e.id}>{e.code} — {e.title}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => {
                          const items = [...newOrder.items]
                          items[i].quantity = e.target.value
                          setNewOrder({ ...newOrder, items })
                        }}
                        placeholder="Qty"
                        className="w-24 bg-background border border-input rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => {
                          const items = [...newOrder.items]
                          items[i].unit_price = e.target.value
                          setNewOrder({ ...newOrder, items })
                        }}
                        placeholder="$/unit"
                        className="w-28 bg-background border border-input rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter((_, idx) => idx !== i) })}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setNewOrder({ ...newOrder, items: [...newOrder.items, { evidence_id: '', quantity: '', unit_price: '' }] })}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    + Add item
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreateOrder}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground font-mono">{selected.order_code}</h3>
                <p className="text-sm text-muted-foreground">{formatDate(selected.created_at)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <StatusBadge status={selected.status} />
                <span className="text-2xl font-bold text-accent">{formatCurrency(selected.total_value)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold text-foreground">{selected.customer_codename}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Meetup:</span>
                  <span className="font-semibold text-foreground">{selected.meetup_name || 'TBD'}</span>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-muted/30 rounded-lg p-4 text-sm text-foreground">{selected.notes}</div>
              )}

              {/* Items */}
              {selected.items && selected.items.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Items</h4>
                  <div className="space-y-2">
                    {selected.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.evidence_title || item.evidence_code}</div>
                          <div className="text-xs text-muted-foreground">{item.quantity} x {formatCurrency(item.unit_price)}</div>
                        </div>
                        <div className="text-sm font-bold text-accent">{formatCurrency(item.total_price)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Payment</h4>
                {selected.payment ? (
                  <div className="flex items-center justify-between bg-success/10 border border-success/20 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-sm text-success font-medium capitalize">{selected.payment.method}</span>
                    </div>
                    <span className="text-sm font-bold text-success">{formatCurrency(selected.payment.amount)}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-warning/10 border border-warning/20 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-warning" />
                      <span className="text-sm text-warning font-medium">Unpaid</span>
                    </div>
                    {selected.status !== 'cancelled' && selected.status !== 'busted' && (
                      <button
                        onClick={() => handleCreatePayment(selected.id, selected.total_value)}
                        className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded font-medium hover:bg-primary/90 transition-colors"
                      >
                        Record Payment
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Update Status</h4>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled', 'busted'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(selected.id, status)}
                      disabled={selected.status === status}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
                        selected.status === status
                          ? 'bg-muted text-muted-foreground border-border cursor-default'
                          : 'bg-background text-foreground border-input hover:border-primary hover:text-primary'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
