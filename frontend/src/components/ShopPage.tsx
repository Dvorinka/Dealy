import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, ShoppingCart, ArrowLeft, Plus, Minus, Eye } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { api } from '../api'
import type { Evidence, EvidenceType, Location, Customer, ShopOrder } from '../types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const iconRetina = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png'
const iconDefault = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png'
const shadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'

;(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconDefault,
  shadowUrl: shadow,
})

const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const productIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

type Tab = 'products' | 'track' | 'delivery-map'

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ShopPage() {
  const [tab, setTab] = useState<Tab>('products')
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [evidenceTypes, setEvidenceTypes] = useState<EvidenceType[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  const [cart, setCart] = useState<{ evidence: Evidence; qty: number }[]>([])
  const [customerName, setCustomerName] = useState('')
  const [meetupLocationId, setMeetupLocationId] = useState('')
  const [orderStatus, setOrderStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [orderResult, setOrderResult] = useState<string>('')

  const [trackCode, setTrackCode] = useState('')
  const [trackResult, setTrackResult] = useState<ShopOrder | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Evidence | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.listEvidence(),
      api.listEvidenceTypes(),
      api.listLocations(),
      api.listCustomers(),
    ])
      .then(([ev, et, loc, cust]) => {
        setEvidence(ev)
        setEvidenceTypes(et)
        setLocations(loc)
        setCustomers(cust)
        setProducts(ev.filter(e => e.status === 'stored'))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const storedWithLocation = useMemo(() => {
    return evidence.filter(e => e.status === 'stored' && e.location_id != null)
  }, [evidence])

  const filteredProducts = products.filter(p => {
    const matchesSearch = !search ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase())
    const matchesType = !filterType || String(p.type_id) === filterType
    return matchesSearch && matchesType
  })

  const addToCart = (ev: Evidence) => {
    setCart(prev => {
      const found = prev.find(c => c.evidence.id === ev.id)
      if (found) return prev.map(c => c.evidence.id === ev.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { evidence: ev, qty: 1 }]
    })
  }

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => c.evidence.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c))
  }

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(c => c.evidence.id !== id))
  }

  const cartTotal = useMemo(() => cart.reduce((sum, c) => sum + c.evidence.street_value * c.qty, 0), [cart])

  const trimmedCustomerName = customerName.trim()
  const existingCustomer = useMemo(
    () => customers.find(c => c.codename.toLowerCase() === trimmedCustomerName.toLowerCase()),
    [customers, trimmedCustomerName]
  )

  const activeLocations = useMemo(
    () => locations.filter(l => l.status === 'active'),
    [locations]
  )

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return

    if (!trimmedCustomerName) {
      setOrderStatus('error')
      setOrderResult('Please enter a customer name or codename.')
      return
    }

    if (!meetupLocationId) {
      setOrderStatus('error')
      setOrderResult('Please select a drop-off location.')
      return
    }

    setOrderStatus('loading')
    try {
      const orderPayload: {
        customer_id?: number
        new_customer?: { codename: string; real_name: string; territory: string }
        meetup_location_id: number
        notes: string
        items: { evidence_id: number; quantity: number; unit_price: number }[]
      } = {
        meetup_location_id: Number(meetupLocationId),
        notes: 'Placed via shop',
        items: cart.map(c => ({
          evidence_id: c.evidence.id,
          quantity: c.qty,
          unit_price: c.evidence.street_value,
        })),
      }

      if (existingCustomer) {
        orderPayload.customer_id = existingCustomer.id
      } else {
        orderPayload.new_customer = {
          codename: trimmedCustomerName,
          real_name: trimmedCustomerName,
          territory: 'Unknown',
        }
      }

      const result = await api.shopCreateOrder(orderPayload)
      const orderCode = (result as { order_code: string }).order_code
      setOrderResult(`Order ${orderCode} placed successfully!`)
      setOrderStatus('success')
      setCart([])
      setCustomerName('')
      setMeetupLocationId('')

      if (!existingCustomer) {
        const updatedCustomers = await api.listCustomers()
        setCustomers(updatedCustomers)
      }
    } catch (err: any) {
      setOrderStatus('error')
      setOrderResult(err.message || 'Failed to place order.')
    }
  }

  const handleTrack = async () => {
    if (!trackCode.trim()) return
    setTrackLoading(true)
    setTrackResult(null)
    try {
      const result = await api.shopTrackOrder(trackCode.trim())
      setTrackResult(result)
    } catch {
      setTrackResult(null)
    }
    setTrackLoading(false)
  }

  const mapPins = useMemo(() => {
    const locs = locations.map(l => ({
      lat: l.lat ?? 34.5197,
      lng: l.lng ?? -106.8106,
      name: l.name,
      type: l.type,
      status: l.status,
      id: l.id,
    }))
    const products = storedWithLocation.map(e => {
      const loc = locations.find(l => l.id === e.location_id)
      return {
        lat: loc?.lat ?? 34.5197,
        lng: loc?.lng ?? -106.8106,
        name: e.title,
        type: e.code,
        status: 'stored',
      }
    })
    return [...locs, ...products]
  }, [locations, storedWithLocation])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-display text-primary animate-pulse-slow mb-4">HEISENBERG</div>
          <div className="text-muted-foreground text-sm">Loading shop inventory...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="bg-card/60 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl lg:text-3xl font-display text-foreground tracking-wide">The Shop</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Browse available product. Buyer discretion advised.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart size={18} className="text-muted-foreground" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cart.reduce((s, c) => s + c.qty, 0)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {(['products', 'track', 'delivery-map'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {t === 'products' ? 'Products' : t === 'track' ? 'Track Order' : 'Delivery Map'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'products' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Products */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search products or codes..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Types</option>
                  {evidenceTypes.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="md:w-48 h-48 bg-muted/30 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-border">
                      <img src={selectedProduct.image_url} alt={selectedProduct.title} className="w-full h-full object-contain pixel-art" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{selectedProduct.code}</span>
                          <h3 className="text-xl font-bold text-foreground mt-1">{selectedProduct.title}</h3>
                        </div>
                        <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                          <Eye size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{selectedProduct.description}</p>
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        {selectedProduct.purity_percent && <span>Purity: {selectedProduct.purity_percent}%</span>}
                        {selectedProduct.weight_grams && <span>Weight: {selectedProduct.weight_grams}g</span>}
                        {selectedProduct.location_name && (
                          <span className="flex items-center gap-1"><MapPin size={10} />{selectedProduct.location_name}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-2xl font-bold text-accent">{formatCurrency(selectedProduct.street_value)}</span>
                        <button
                          onClick={() => { addToCart(selectedProduct); setSelectedProduct(null) }}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
                        >
                          <Plus size={16} /> Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 transition-all duration-200 group"
                  >
                    <div className="flex gap-3 mb-3">
                      <div className="w-16 h-16 bg-muted/30 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        <img src={p.image_url} alt={p.title} className="w-full h-full object-contain pixel-art" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[10px] text-muted-foreground">{p.code}</span>
                        <h3 className="text-sm font-bold text-foreground line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">
                          {p.title}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {evidenceTypes.find(t => t.id === p.type_id)?.name || 'Evidence'}
                      </span>
                      <span className="text-sm font-bold text-accent">{formatCurrency(p.street_value)}</span>
                    </div>
                  </button>
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <Search size={40} className="mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">No products found</h3>
                  <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
                </div>
              )}
            </div>

            {/* Cart & Checkout */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-5 sticky top-24">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                  <ShoppingCart size={18} className="text-primary" />
                  Your Cart {cart.length > 0 && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{cart.length}</span>}
                </h3>

                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Your cart is empty. Browse products to add items.</p>
                ) : (
                  <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
                    {cart.map(c => (
                      <div key={c.evidence.id} className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-background rounded flex items-center justify-center shrink-0 overflow-hidden border border-border">
                          <img src={c.evidence.image_url} alt={c.evidence.title} className="w-full h-full object-contain pixel-art" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{c.evidence.title}</div>
                          <div className="text-xs text-accent font-bold">{formatCurrency(c.evidence.street_value * c.qty)}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQty(c.evidence.id, -1)} className="p-1 hover:bg-muted rounded text-muted-foreground"><Minus size={12} /></button>
                          <span className="text-xs font-bold w-6 text-center">{c.qty}</span>
                          <button onClick={() => updateQty(c.evidence.id, 1)} className="p-1 hover:bg-muted rounded text-muted-foreground"><Plus size={12} /></button>
                        </div>
                        <button onClick={() => removeFromCart(c.evidence.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded"><Minus size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {cart.length > 0 && (
                  <>
                    <div className="border-t border-border pt-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total ({cart.reduce((s, c) => s + c.qty, 0)} items)</span>
                        <span className="font-bold text-accent">{formatCurrency(cartTotal)}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Customer Name / Codename</label>
                        <input
                          type="text"
                          placeholder="e.g. Los Pollos"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {trimmedCustomerName && (
                          <div className={`text-[10px] mt-1 ${existingCustomer ? 'text-success' : 'text-accent'}`}>
                            {existingCustomer ? 'Existing customer found.' : 'New customer will be created automatically.'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Drop-off Location *</label>
                        <select
                          value={meetupLocationId}
                          onChange={e => setMeetupLocationId(e.target.value)}
                          className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select drop-off location...</option>
                          {activeLocations.map(l => (
                            <option key={l.id} value={l.id}>{l.name} ({l.type.replace('_', ' ')})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {orderStatus === 'success' && (
                      <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                        <div className="text-success text-sm font-medium">{orderResult}</div>
                      </div>
                    )}
                    {orderStatus === 'error' && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-4">
                        <div className="text-destructive text-sm">{orderResult}</div>
                      </div>
                    )}

                    <button
                      onClick={handlePlaceOrder}
                      disabled={orderStatus === 'loading' || cart.length === 0}
                      className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {orderStatus === 'loading' ? 'Placing Order...' : `Place Order — ${formatCurrency(cartTotal)}`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'track' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Track Your Order</h2>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Enter order code..."
                  value={trackCode}
                  onChange={e => setTrackCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrack()}
                  className="flex-1 bg-background border border-input rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleTrack}
                  disabled={trackLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {trackLoading ? 'Searching...' : 'Track'}
                </button>
              </div>

              {trackResult && (
                <div className="bg-muted/30 rounded-xl p-5 animate-fade-in">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="font-mono text-lg font-bold text-foreground">{trackResult.order_code}</span>
                      <div className="text-sm text-muted-foreground mt-0.5">{formatDate(trackResult.created_at)}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${trackResult.status === 'delivered' ? 'bg-success/15 text-success border-success/30' : trackResult.status === 'in_transit' ? 'bg-accent/15 text-accent border-accent/30' : 'bg-warning/15 text-warning border-warning/30'}`}>
                      {trackResult.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-card rounded-lg p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Customer</div>
                      <div className="text-sm font-bold text-foreground">{trackResult.customer}</div>
                    </div>
                    <div className="bg-card rounded-lg p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total</div>
                      <div className="text-lg font-bold text-accent">{formatCurrency(trackResult.total_value)}</div>
                    </div>
                  </div>

                  {trackResult.meetup_name && (
                    <div className="bg-card rounded-lg p-4 mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Drop-off Location</div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <MapPin size={12} className="text-primary" />
                        {trackResult.meetup_name}
                      </div>
                    </div>
                  )}

                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Items</h4>
                  <div className="space-y-2">
                    {trackResult.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-card rounded-lg px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.evidence_code}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{item.quantity} x {formatCurrency(item.unit_price)}</div>
                          <div className="text-sm font-bold text-accent">{formatCurrency(item.total_price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'delivery-map' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xl font-bold text-foreground mb-1">Meetup Locations</h2>
              <p className="text-sm text-muted-foreground mb-4">Where we meet. All locations across Albuquerque.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {evidenceTypes.map(t => (
                  <span key={t.id} className={`px-3 py-1 rounded-full text-xs font-medium border ${t.danger_level >= 4 ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-muted text-muted-foreground border-border'}`}>
                    {t.name}
                  </span>
                ))}
              </div>
              <div className="h-[500px] rounded-xl overflow-hidden border border-border">
                <MapContainer center={[34.5197, -106.8106]} zoom={12} className="h-full w-full" style={{ zIndex: 0 }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[34.5197, -106.8106]} icon={storeIcon}>
                    <Popup>
                      <div className="text-sm font-bold text-foreground">Downtown ABQ</div>
                      <div className="text-xs text-muted-foreground">Default meetup zone</div>
                    </Popup>
                  </Marker>
                  {mapPins.map((pin, i) => (
                    <Marker key={i} position={[pin.lat, pin.lng]} icon={pin.type === 'evidence' ? productIcon : storeIcon}>
                      <Popup>
                        <div className="text-sm font-bold text-foreground">{pin.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{pin.type} · {pin.status}</div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-lg font-bold text-foreground mb-3">Location List</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {locations.map(loc => (
                  <div key={loc.id} className="bg-muted/30 rounded-lg p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-foreground">{loc.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        loc.status === 'active' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                      }`}>
                        {loc.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{loc.type}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin size={10} /> {loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
