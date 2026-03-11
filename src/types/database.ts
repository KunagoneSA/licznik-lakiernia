export type OrderStatus = 'nowe' | 'w_trakcie' | 'gotowe' | 'wydane' | 'zapłacone'
export type ClientType = 'individual' | 'company'

export interface Client {
  id: string
  name: string
  type: ClientType
  contact_info: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  access_code: string | null
  created_at: string
}

export interface PaintingVariant {
  id: string
  name: string
  default_price_per_m2: number
  sides: number
  sort_order: number | null
}

export interface ClientPricing {
  id: string
  client_id: string
  variant_id: string
  price_per_m2: number
}

export interface Order {
  id: string
  number: number
  client_id: string
  description: string | null
  status: OrderStatus
  planned_date: string | null
  ready_date: string | null
  material_provided: boolean
  paints_provided: boolean
  dimensions_entered: boolean
  color: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  client?: Client
}

export interface OrderItem {
  id: string
  order_id: string
  length_mm: number
  width_mm: number
  quantity: number
  variant_id: string
  has_handle: boolean
  notes: string | null
  m2: number
  price_per_m2: number
  total_price: number
  variant?: PaintingVariant
}

export interface WorkLog {
  id: string
  order_id: string | null
  worker_name: string
  operation: string
  date: string
  hours: number
  hourly_rate: number
  cost: number
  m2_painted: number | null
  notes: string | null
  created_at: string
}

export interface MonthlyCost {
  id: string
  month: string
  rent: number
  waste: number
  other: number
  total: number
}

export type PurchaseStatus = 'zamowione' | 'dostarczone' | 'faktura'

export interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  contact_person: string | null
  is_default: boolean
  order_frequency: string | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  unit: string
  default_price: number | null
  default_supplier_id: string | null
  order_frequency: string | null
  created_at: string
  default_supplier?: Supplier
}

export interface PaintPurchase {
  id: string
  date: string
  supplier_id: string
  product_id: string
  product: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  order_id: string | null
  status: PurchaseStatus
  number: number | null
  notes: string | null
  supplier?: Supplier
}
