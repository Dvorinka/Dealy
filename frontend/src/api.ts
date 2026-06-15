import type { Evidence, EvidenceType, Location, GangMember, Customer, Order, Payment, Stats, LoginResponse, User, PlatformSettings, ShopOrder } from './types'

const API_BASE = '/api'
const SHOP_BASE = '/shop'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function fetchShopJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${SHOP_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  login: (username: string, password: string) =>
    fetchJSON<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => fetchJSON<{ id: number; username: string; role: string; status: string }>('/me'),

  updateMe: (data: { username?: string; current_password?: string; new_password?: string }) =>
    fetchJSON<User>('/me', { method: 'PUT', body: JSON.stringify(data) }),

  getPlatformSettings: () => fetchJSON<PlatformSettings>('/settings'),
  updatePlatformSettings: (data: PlatformSettings) =>
    fetchJSON<PlatformSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  getNextOrderCode: () =>
    fetchJSON<{ order_code: string }>('/orders/next-code'),

  getStats: () => fetchJSON<Stats>('/stats'),

  listEvidence: () => fetchJSON<Evidence[]>('/evidence'),
  getEvidence: (id: number) => fetchJSON<Evidence>(`/evidence/${id}`),
  createEvidence: (data: Partial<Evidence>) =>
    fetchJSON<{ id: number }>('/evidence', { method: 'POST', body: JSON.stringify(data) }),
  updateEvidence: (id: number, data: Partial<Evidence>) =>
    fetchJSON<{ updated: boolean }>(`/evidence/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvidence: (id: number) =>
    fetchJSON<{ deleted: boolean }>(`/evidence/${id}`, { method: 'DELETE' }),

  listEvidenceTypes: () => fetchJSON<EvidenceType[]>('/evidence-types'),
  listLocations: () => fetchJSON<Location[]>('/locations'),
  listGangMembers: () => fetchJSON<GangMember[]>('/gang-members'),

  listCustomers: () => fetchJSON<Customer[]>('/customers'),
  getCustomer: (id: number) => fetchJSON<Customer>(`/customers/${id}`),
  createCustomer: (data: Partial<Customer>) =>
    fetchJSON<{ id: number }>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: number, data: Partial<Customer>) =>
    fetchJSON<{ updated: boolean }>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: number) =>
    fetchJSON<{ deleted: boolean }>(`/customers/${id}`, { method: 'DELETE' }),

  listOrders: () => fetchJSON<Order[]>('/orders'),
  getOrder: (id: number) => fetchJSON<Order>(`/orders/${id}`),
  getOrderByCode: (code: string) => fetchJSON<Order>(`/orders/code/${code}`),
  createOrder: (data: { order_code: string; customer_id: number; meetup_location_id?: number; notes?: string; items: { evidence_id: number; quantity: number; unit_price: number }[] }) =>
    fetchJSON<{ id: number; total_value: number }>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id: number, data: Partial<Order>) =>
    fetchJSON<{ updated: boolean }>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id: number) =>
    fetchJSON<{ deleted: boolean }>(`/orders/${id}`, { method: 'DELETE' }),

  listPayments: () => fetchJSON<Payment[]>('/payments'),
  createPayment: (data: Partial<Payment>) =>
    fetchJSON<{ id: number }>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  updatePaymentStatus: (id: number, status: string) =>
    fetchJSON<{ updated: boolean }>(`/payments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Shop (public) endpoints
  shopListProducts: () => fetchShopJSON<any[]>('/products'),
  shopGetProduct: (id: number) => fetchShopJSON<any>(`/products/${id}`),
  shopTrackOrder: (code: string) => fetchShopJSON<ShopOrder>(`/orders/track/${encodeURIComponent(code)}`),
  shopCreateOrder: (data: any) =>
    fetchShopJSON<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  shopCreateCustomer: (data: any) =>
    fetchShopJSON<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  shopListLocations: () => fetchShopJSON<any[]>('/locations'),
};
