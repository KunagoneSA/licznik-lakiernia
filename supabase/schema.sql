-- Enums
CREATE TYPE client_type AS ENUM ('individual', 'company');
CREATE TYPE order_status AS ENUM ('nowe', 'w_trakcie', 'gotowe', 'wydane', 'zapłacone');

-- Clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type client_type NOT NULL DEFAULT 'individual',
  contact_info text,
  access_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Painting variants
CREATE TABLE painting_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  default_price_per_m2 decimal NOT NULL DEFAULT 0,
  sides integer NOT NULL DEFAULT 2
);

-- Client-specific pricing
CREATE TABLE client_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES painting_variants(id) ON DELETE CASCADE,
  price_per_m2 decimal NOT NULL,
  UNIQUE(client_id, variant_id)
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number serial UNIQUE,
  client_id uuid NOT NULL REFERENCES clients(id),
  description text,
  status order_status NOT NULL DEFAULT 'nowe',
  planned_date date,
  ready_date date,
  material_provided boolean NOT NULL DEFAULT false,
  paints_provided boolean NOT NULL DEFAULT false,
  dimensions_entered boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Order items (elements)
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  length_mm integer NOT NULL,
  width_mm integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  variant_id uuid NOT NULL REFERENCES painting_variants(id),
  has_handle boolean NOT NULL DEFAULT false,
  notes text,
  m2 decimal NOT NULL DEFAULT 0,
  price_per_m2 decimal NOT NULL DEFAULT 0,
  total_price decimal NOT NULL DEFAULT 0
);

-- Work logs
CREATE TABLE work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  worker_name text NOT NULL,
  operation text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  hours decimal NOT NULL,
  hourly_rate decimal NOT NULL,
  cost decimal NOT NULL DEFAULT 0,
  m2_painted decimal,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Monthly fixed costs
CREATE TABLE monthly_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL UNIQUE,
  rent decimal NOT NULL DEFAULT 0,
  waste decimal NOT NULL DEFAULT 0,
  other decimal NOT NULL DEFAULT 0,
  total decimal NOT NULL DEFAULT 0
);

-- Paint purchases
CREATE TABLE paint_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  supplier text NOT NULL,
  product text NOT NULL,
  quantity decimal NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  unit_price decimal NOT NULL,
  total decimal NOT NULL DEFAULT 0,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_work_logs_order ON work_logs(order_id);
CREATE INDEX idx_work_logs_date ON work_logs(date);
CREATE INDEX idx_work_logs_worker ON work_logs(worker_name);
CREATE INDEX idx_paint_purchases_date ON paint_purchases(date);
CREATE INDEX idx_client_pricing_client ON client_pricing(client_id);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE painting_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE paint_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Auth full access" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON painting_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON client_pricing FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON work_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON monthly_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON paint_purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Seed painting variants
INSERT INTO painting_variants (name, default_price_per_m2, sides) VALUES
  ('Frezowane 2str', 450, 2),
  ('Frezowane 1str', 350, 1),
  ('Gladkie 2str', 250, 2),
  ('Gladkie 1str', 200, 1),
  ('Fornir 2 przejscia', 130, 2),
  ('Fornir 1 przejscie', 100, 1);
