export type OrderStatus = 'nowe' | 'w_trakcie' | 'gotowe' | 'wydane' | 'fv_wystawiona' | 'zapłacone'
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
  // Karta tego klienta w ERP Kuna (erp_contractors) — wspólny CRM z handlowcem lakierni (06.10.2026)
  contractor_id?: string | null
}

export interface PaintingVariant {
  id: string
  name: string
  default_price_per_m2: number
  sides: number
  sort_order: number | null
  /** false = nie pokazuj w cenniku ani w PDF (wariant tylko do zamówień / historyczny) */
  in_cennik: boolean
  /** 'm2' albo 'szt' — jednostka ceny */
  unit: string
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
  accepted_date: string | null
  planned_date: string | null
  ready_date: string | null
  invoice_number: string | null
  paid_date: string | null
  material_provided: boolean
  paints_provided: boolean
  dimensions_entered: boolean
  color: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  // Handlowiec, który pozyskał zamówienie (opiekun karty w ERP w chwili przyjęcia) — jego wynik
  handlowiec?: string | null
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
  color_surcharge: boolean
  has_wplyka: boolean
  notes: string | null
  m2: number
  price_per_m2: number
  total_price: number
  passes: number
  sort_order: number
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

export type PurchaseStatus = 'do_zamowienia' | 'zamowione' | 'dostarczone' | 'faktura'

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
  color: string | null
  notes: string | null
  supplier?: Supplier
}
