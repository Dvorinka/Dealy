export interface EvidenceType {
  id: number;
  name: string;
  description: string;
  icon: string;
  danger_level: number;
  created_at: string;
}

export interface Location {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  status: string;
  notes: string;
  created_at: string;
}

export interface GangMember {
  id: number;
  codename: string;
  real_name: string;
  role: string;
  status: string;
  trust_level: number;
  created_at: string;
}

export interface Evidence {
  id: number;
  code: string;
  title: string;
  description: string;
  type_id: number;
  type_name?: string;
  location_id?: number;
  location_name?: string;
  collected_by?: number;
  collector_name?: string;
  weight_grams: number;
  purity_percent: number;
  street_value: number;
  image_url: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
  status: string;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  message: string;
}

export interface Customer {
  id: number;
  codename: string;
  real_name: string;
  contact: string;
  territory: string;
  trust_level: number;
  status: string;
  total_spent: number;
  created_at: string;
  order_count?: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  evidence_id: number;
  evidence_code?: string;
  evidence_title?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Order {
  id: number;
  order_code: string;
  customer_id: number;
  customer_codename?: string;
  status: string;
  total_value: number;
  meetup_location_id?: number;
  meetup_name?: string;
  notes: string;
  items?: OrderItem[];
  payment?: Payment;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  method: string;
  status: string;
  transaction_ref: string;
  created_at: string;
}

export interface Stats {
  total_evidence: number
  total_value: number
  avg_purity: number
  total_weight: number
  total_orders: number
  pending_orders: number
  total_customers: number
  active_customers: number
  revenue: number
}

export interface ShopProduct {
  id: number
  code: string
  title: string
  description: string
  type_name: string
  weight_grams: number
  purity_percent: number
  street_value: number
  image_url: string
  status: string
  location_name?: string
}

export interface ShopProductDetail extends ShopProduct {
  tags: string[]
  location_id?: number
  lat?: number
  lng?: number
  address?: string
}

export interface ShopOrder {
  order_code: string
  status: string
  total_value: number
  customer: string
  created_at: string
  items: {
    title: string
    evidence_code: string
    quantity: number
    unit_price: number
    total_price: number
  }[]
}
