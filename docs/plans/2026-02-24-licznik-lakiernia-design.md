# Licznik Lakiernia - Design Document

## Goal

Replace the Excel-based paint shop order tracking system (192 spreadsheets) with a database-backed web application. The app tracks orders, calculates pricing per element dimensions, logs production stages per worker, generates worker reports, and provides financial summaries. Displayed on a large screen in the workshop and accessible on mobile.

## Users & Roles

| Role | Access |
|------|--------|
| **Admin** | Full access - orders, client pricing, costs, reports, finances |
| **Worker** | Dashboard (read), log work stages, view own report |
| **Client** | Client portal only - order status (no prices/costs) |

- Admin: Google OAuth (Artur)
- Workers: Google OAuth or simple login
- Clients: access code / PIN link (no Google account needed)

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS 4
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Hosting:** GitHub Pages (deploy via GitHub Actions)
- **Mobile:** PWA (installable, offline-capable)

## Data Model

### `clients`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| name | text | e.g. "Piotrek", "Marion", "MM Style" |
| type | enum | 'individual', 'company' |
| contact_info | text | phone, email |
| access_code | text | PIN for client portal |
| created_at | timestamptz | |

### `painting_variants`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| name | text | e.g. "Frezowane 2str", "Gładkie 1str", "Fornir 2 przejścia" |
| default_price_per_m2 | decimal | default price if client has no custom pricing |
| sides | integer | 1 or 2 (affects m2 calculation) |

### `client_pricing`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| client_id | uuid FK clients | |
| variant_id | uuid FK painting_variants | |
| price_per_m2 | decimal | custom price for this client+variant |
| UNIQUE(client_id, variant_id) | | |

### `orders`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| number | serial | sequential order number |
| client_id | uuid FK clients | |
| description | text | e.g. "Fronty frezowane 9016 MAT" |
| status | enum | 'nowe', 'w_trakcie', 'gotowe', 'wydane', 'zapłacone' |
| planned_date | date | when expected ready |
| ready_date | date | actual ready date |
| material_provided | boolean | material provided? |
| paints_provided | boolean | paints provided? |
| dimensions_entered | boolean | dimensions entered? |
| notes | text | |
| created_at | timestamptz | |
| created_by | uuid FK auth.users | |

### `order_items`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| order_id | uuid FK orders | |
| length_mm | integer | element length in mm |
| width_mm | integer | element width in mm |
| quantity | integer | number of pieces |
| variant_id | uuid FK painting_variants | |
| has_handle | boolean | has handle cutout? |
| notes | text | special instructions |
| m2 | decimal | auto: length x width x quantity x sides / 1000000 |
| price_per_m2 | decimal | from client pricing or default |
| total_price | decimal | m2 x price_per_m2 |

### `work_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| order_id | uuid FK orders | nullable (0 = general work like cleaning) |
| worker_name | text | Kasia, Łukasz, Michał, Fabian... |
| operation | text | Przygotowanie, Podkład, Szlifowanie, Lakierowanie, Pakowanie... |
| date | date | |
| hours | decimal | e.g. 2.5 |
| hourly_rate | decimal | 35, 40, 50 zł |
| cost | decimal | auto: hours x rate |
| m2_painted | decimal | m2 painted (for painters, nullable) |
| created_at | timestamptz | |

### `monthly_costs`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| month | text | e.g. "2026-02" |
| rent | decimal | czynsz (3000) |
| waste | decimal | śmieci (350) |
| other | decimal | inne (650) |
| total | decimal | auto sum |

### `paint_purchases`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| date | date | purchase date |
| supplier | text | dostawca |
| product | text | product name |
| quantity | decimal | |
| unit | text | kg, l, szt |
| unit_price | decimal | |
| total | decimal | quantity x unit_price |
| order_id | uuid FK orders | optional - assigned to specific order |

## Views / Pages

### 1. Dashboard (large screen optimized)
- Dark theme (slate-900), large cards with status colors
- Kanban columns: Nowe -> W trakcie -> Gotowe -> Do odbioru
- Each order card: number, client, type, planned date, value
- Card color by urgency: red = overdue, yellow = this week, green = on time
- Top bar: orders in progress count, ready-for-pickup value, today's painted m2
- Auto-refresh via Supabase realtime (every 30s)

### 2. Order Card (detail)
- Header: number, client (dropdown - auto-loads pricing), status, dates
- Elements table: length, width, qty, variant (dropdown - price auto-fills from client pricing), handle, m2 (auto), price (auto)
- Summary: total material m2, paint m2, order value, labor costs (auto from work_logs), material cost, margin, profit, profit/hour
- Production timeline: work log entries - who, what, hours, date. "+ Add stage" button
- Status change buttons at bottom

### 3. Worker Report
- Filter: date range, worker (optional)
- Table: date, worker, operation, order number, client, hours, rate, cost
- Summary per worker: total hours, total cost, m2 painted (for painters)
- CSV export

### 4. Financial Summary
- Filter: date range
- Cards: revenue, labor costs, material costs, fixed costs, net profit
- Order list with margin and profit/hour per order
- Monthly trend chart

### 5. Client Portal
- Login via access code (no Google, simple PIN/link)
- See own orders: number, type, status (icons: new/in production/ready)
- No prices, no costs visible

### 6. Client Pricing
- Client list, click to see variant pricing table
- Default pricing + per-client overrides
- Quick edit inline

### 7. Paint Purchases
- Purchase list: date, supplier, product, quantity, price, total
- Summary per supplier, per month
- Optional assignment to specific order

## Computed Fields (auto-calculated)

- `order_items.m2` = length_mm x width_mm x quantity x variant.sides / 1,000,000
- `order_items.total_price` = m2 x price_per_m2
- `orders.material_m2` = SUM(order_items.m2) where sides=1 side counts
- `orders.paint_m2` = SUM(order_items.m2) full
- `orders.total_value` = SUM(order_items.total_price)
- `orders.total_cost` = SUM(work_logs.cost) + material_cost
- `orders.profit` = total_value - total_cost
- `orders.profit_per_hour` = profit / SUM(work_logs.hours)

## Security

- Supabase RLS on all tables
- Admin: full CRUD on everything
- Worker: read orders, insert/update own work_logs
- Client: read own orders (matched by client_id + access_code), no financial data

## Language

- Polish only (internal company tool + client portal)
- UI labels in Polish
