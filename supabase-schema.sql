-- ============================================================
-- ANTONY PALLAZO APARTMENT MANAGEMENT — SUPABASE SQL SCHEMA
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- ── 1. FLATS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flats (
  id            TEXT PRIMARY KEY,
  block         TEXT NOT NULL,
  flat_no       TEXT NOT NULL,
  bhk_type      TEXT NOT NULL,
  monthly_charge INT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'occupied',
  occupancy     TEXT NOT NULL DEFAULT 'owner',
  floor         INT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. RESIDENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id       TEXT REFERENCES flats(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner','tenant')),
  phone         TEXT NOT NULL UNIQUE,
  whatsapp      TEXT,
  email         TEXT,
  alt_phone     TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  lease_start   DATE,
  lease_end     DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. USERS (Auth linked) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  resident_id   UUID REFERENCES residents(id),
  flat_id       TEXT REFERENCES flats(id),
  role          TEXT NOT NULL CHECK (role IN ('admin','owner','tenant')),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. BILLS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id       TEXT REFERENCES flats(id) ON DELETE CASCADE,
  billing_month TEXT NOT NULL,           -- e.g. "2026-05"
  total_amount  INT NOT NULL,
  arrears       INT NOT NULL DEFAULT 0,
  due_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','overdue')),
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  generated_by  UUID REFERENCES users(id),
  UNIQUE(flat_id, billing_month)         -- prevent duplicate bills
);

-- ── 5. BILL LINE ITEMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id       UUID REFERENCES bills(id) ON DELETE CASCADE,
  charge_type   TEXT NOT NULL,
  description   TEXT,
  amount        INT NOT NULL,
  payer         TEXT DEFAULT 'both' CHECK (payer IN ('owner','tenant','both'))
);

-- ── 6. PAYMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id       UUID REFERENCES bills(id) ON DELETE RESTRICT,
  flat_id       TEXT REFERENCES flats(id),
  amount_paid   INT NOT NULL,
  mode          TEXT NOT NULL CHECK (mode IN ('Cash','UPI','NEFT','IMPS','Cheque')),
  reference     TEXT,
  payment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'cleared' CHECK (status IN ('cleared','pending_clearance','bounced')),
  recorded_by   UUID REFERENCES users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. RECEIPTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID REFERENCES payments(id) ON DELETE RESTRICT,
  flat_id       TEXT REFERENCES flats(id),
  receipt_no    TEXT NOT NULL UNIQUE,
  amount        INT NOT NULL,
  billing_month TEXT NOT NULL,
  is_voided     BOOLEAN DEFAULT FALSE,
  void_reason   TEXT,
  issued_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate receipt numbers: RCP-2026-0001
CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;

CREATE OR REPLACE FUNCTION generate_receipt_no()
RETURNS TRIGGER AS $$
BEGIN
  NEW.receipt_no := 'RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('receipt_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_receipt_no ON receipts;
CREATE TRIGGER trg_receipt_no
  BEFORE INSERT ON receipts
  FOR EACH ROW EXECUTE FUNCTION generate_receipt_no();

-- ── 8. ADVANCE LEDGER ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advance_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id       TEXT REFERENCES flats(id),
  amount        INT NOT NULL,
  type          TEXT CHECK (type IN ('credit','debit')),
  reference     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. EXPENSES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor        TEXT NOT NULL,
  category      TEXT NOT NULL,
  amount        INT NOT NULL,
  expense_date  DATE NOT NULL,
  invoice_no    TEXT,
  invoice_url   TEXT,
  notes         TEXT,
  recorded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. NOTICES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  target        TEXT NOT NULL DEFAULT 'all' CHECK (target IN ('all','owners','tenants','specific')),
  flat_id       TEXT REFERENCES flats(id),
  posted_by     UUID REFERENCES users(id),
  posted_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. NOTICE READS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notice_reads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id     UUID REFERENCES notices(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notice_id, user_id)
);

-- ── 12. AUDIT LOG ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  action        TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  record_id     TEXT,
  old_value     JSONB,
  new_value     JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE flats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_reads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: get current user's flat_id
CREATE OR REPLACE FUNCTION current_user_flat()
RETURNS TEXT AS $$
  SELECT flat_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- FLATS: admin sees all; residents see own flat
CREATE POLICY flats_select ON flats FOR SELECT USING (
  current_user_role() = 'admin' OR id = current_user_flat()
);
CREATE POLICY flats_admin_all ON flats FOR ALL USING (current_user_role() = 'admin');

-- RESIDENTS: admin sees all; residents see own flat
CREATE POLICY residents_select ON residents FOR SELECT USING (
  current_user_role() = 'admin' OR flat_id = current_user_flat()
);
CREATE POLICY residents_admin_all ON residents FOR ALL USING (current_user_role() = 'admin');

-- USERS: admin sees all; users see own record
CREATE POLICY users_select ON users FOR SELECT USING (
  current_user_role() = 'admin' OR id = auth.uid()
);
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = auth.uid());

-- BILLS: admin sees all; residents see own flat's bills
CREATE POLICY bills_select ON bills FOR SELECT USING (
  current_user_role() = 'admin' OR flat_id = current_user_flat()
);
CREATE POLICY bills_admin_write ON bills FOR ALL USING (current_user_role() = 'admin');

-- BILL LINE ITEMS: follow bill access + tenant filter
CREATE POLICY line_items_select ON bill_line_items FOR SELECT USING (
  current_user_role() = 'admin'
  OR (
    bill_id IN (SELECT id FROM bills WHERE flat_id = current_user_flat())
    AND (current_user_role() = 'owner' OR payer IN ('tenant','both'))
  )
);

-- PAYMENTS: admin sees all; residents see own
CREATE POLICY payments_select ON payments FOR SELECT USING (
  current_user_role() = 'admin' OR flat_id = current_user_flat()
);
CREATE POLICY payments_admin_write ON payments FOR ALL USING (current_user_role() = 'admin');

-- RECEIPTS: admin sees all; residents download own
CREATE POLICY receipts_select ON receipts FOR SELECT USING (
  current_user_role() = 'admin' OR flat_id = current_user_flat()
);
CREATE POLICY receipts_admin_write ON receipts FOR ALL USING (current_user_role() = 'admin');

-- EXPENSES: admin only
CREATE POLICY expenses_admin ON expenses FOR ALL USING (current_user_role() = 'admin');

-- NOTICES: admin full access; residents see targeted notices
CREATE POLICY notices_select ON notices FOR SELECT USING (
  current_user_role() = 'admin'
  OR target = 'all'
  OR (target = 'owners' AND current_user_role() = 'owner')
  OR (target = 'tenants' AND current_user_role() = 'tenant')
  OR (target = 'specific' AND flat_id = current_user_flat())
);
CREATE POLICY notices_admin_write ON notices FOR ALL USING (current_user_role() = 'admin');

-- NOTICE READS: users can insert/view own reads
CREATE POLICY notice_reads_all ON notice_reads FOR ALL USING (user_id = auth.uid());

-- AUDIT LOG: admin only
CREATE POLICY audit_admin ON audit_log FOR ALL USING (current_user_role() = 'admin');

-- ADVANCE LEDGER: admin sees all; residents see own
CREATE POLICY advance_select ON advance_ledger FOR SELECT USING (
  current_user_role() = 'admin' OR flat_id = current_user_flat()
);

-- ============================================================
-- SEED DATA — All 30 Flats
-- ============================================================

INSERT INTO flats (id, block, flat_no, bhk_type, monthly_charge, status, occupancy, floor) VALUES
  ('A1',   'A', 'A1',   '3BHK', 2000, 'occupied', 'owner',  1),
  ('A2',   'A', 'A2',   '3BHK', 2000, 'occupied', 'rented', 1),
  ('A3',   'A', 'A3',   '3BHK', 2000, 'occupied', 'owner',  2),
  ('A4',   'A', 'A4',   '3BHK', 2000, 'occupied', 'rented', 2),
  ('A5',   'A', 'A5',   '3BHK', 2000, 'occupied', 'owner',  3),
  ('A6',   'A', 'A6',   '3BHK', 2000, 'occupied', 'rented', 3),
  ('B1',   'B', 'B1',   '2BHK', 1800, 'occupied', 'owner',  1),
  ('B2',   'B', 'B2',   '2BHK', 1800, 'occupied', 'rented', 1),
  ('B3',   'B', 'B3',   '2BHK', 1800, 'occupied', 'owner',  2),
  ('B4',   'B', 'B4',   '1BHK', 1600, 'occupied', 'rented', 2),
  ('B5',   'B', 'B5',   '2BHK', 1800, 'occupied', 'owner',  3),
  ('B6',   'B', 'B6',   '2BHK', 1800, 'occupied', 'owner',  3),
  ('C1',   'C', 'C1',   '2BHK', 1800, 'occupied', 'rented', 1),
  ('C2',   'C', 'C2',   '2BHK', 1800, 'occupied', 'owner',  1),
  ('C3',   'C', 'C3',   '2BHK', 1800, 'occupied', 'owner',  2),
  ('C4',   'C', 'C4',   '1BHK', 1600, 'occupied', 'rented', 2),
  ('C5',   'C', 'C5',   '2BHK', 1800, 'occupied', 'owner',  3),
  ('C6',   'C', 'C6',   '2BHK', 1800, 'vacant',   'vacant', 3),
  ('D1D2', 'D', 'D1D2', '3BHK', 2000, 'occupied', 'owner',  1),
  ('D3',   'D', 'D3',   '2BHK', 1800, 'occupied', 'rented', 1),
  ('D4',   'D', 'D4',   '1BHK', 1600, 'occupied', 'owner',  2),
  ('D5',   'D', 'D5',   '1BHK', 1600, 'occupied', 'rented', 2),
  ('E1',   'E', 'E1',   '2BHK', 1800, 'occupied', 'owner',  1),
  ('E2',   'E', 'E2',   '3BHK', 2000, 'occupied', 'owner',  1),
  ('E3',   'E', 'E3',   '1BHK', 1600, 'occupied', 'rented', 2),
  ('E4',   'E', 'E4',   '2BHK', 1800, 'occupied', 'owner',  2),
  ('F1',   'F', 'F1',   '2BHK', 1800, 'occupied', 'owner',  1),
  ('F2',   'F', 'F2',   '2BHK', 1800, 'occupied', 'rented', 1),
  ('F3',   'F', 'F3',   '2BHK', 1800, 'occupied', 'owner',  2),
  ('F4',   'F', 'F4',   '2BHK', 1800, 'occupied', 'rented', 2)
ON CONFLICT (id) DO NOTHING;

-- ── Seed residents ────────────────────────────────────────────
INSERT INTO residents (flat_id, name, role, phone, whatsapp, email) VALUES
  ('A1',   'Priya Sharma',    'owner',  '9840111111', '9840111111', 'priya@email.com'),
  ('A2',   'Rajan Kumar',     'owner',  '9840222222', '9840222222', 'rajan@email.com'),
  ('A2',   'Meena Devi',      'tenant', '9840333333', '9840333333', NULL),
  ('A3',   'Sathish Babu',    'owner',  '9840444444', '9840444444', 'sathish@email.com'),
  ('A4',   'Kavitha Nair',    'owner',  '9840999999', '9840999999', 'kavitha@email.com'),
  ('A4',   'Ravi Shankar',    'tenant', '9841010101', '9841010101', NULL),
  ('A5',   'Deepa Menon',     'owner',  '9841111122', '9841111122', 'deepa@email.com'),
  ('A6',   'Suresh Pillai',   'owner',  '9841222233', '9841222233', 'suresh@email.com'),
  ('A6',   'Anu Thomas',      'tenant', '9841333344', '9841333344', NULL),
  ('B1',   'Anitha Raj',      'owner',  '9840555555', '9840555555', 'anitha@email.com'),
  ('B2',   'Mohan Das',       'owner',  '9841444455', '9841444455', 'mohan@email.com'),
  ('B2',   'Preeti Singh',    'tenant', '9841555566', '9841555566', NULL),
  ('B3',   'Ramesh Iyer',     'owner',  '9841666677', '9841666677', 'ramesh@email.com'),
  ('B4',   'Lalitha Devi',    'owner',  '9841777788', '9841777788', 'lalitha@email.com'),
  ('B4',   'Kiran Kumar',     'tenant', '9841888899', '9841888899', NULL),
  ('B5',   'Naresh Babu',     'owner',  '9841999900', '9841999900', 'naresh@email.com'),
  ('B6',   'Saroja Rani',     'owner',  '9842000011', '9842000011', 'saroja@email.com'),
  ('C1',   'Vijay Mohan',     'owner',  '9840666666', '9840666666', 'vijay@email.com'),
  ('C1',   'Lakshmi T',       'tenant', '9840777777', '9840777777', NULL),
  ('C2',   'Pradeep Kumar',   'owner',  '9842111122', '9842111122', 'pradeep@email.com'),
  ('C3',   'Uma Devi',        'owner',  '9842222233', '9842222233', 'uma@email.com'),
  ('C4',   'Harish Nair',     'owner',  '9842333344', '9842333344', 'harish@email.com'),
  ('C4',   'Pooja Sharma',    'tenant', '9842444455', '9842444455', NULL),
  ('C5',   'Sridhar Rao',     'owner',  '9842555566', '9842555566', 'sridhar@email.com'),
  ('D1D2', 'Arjun Nair',      'owner',  '9840888888', '9840888888', 'arjun@email.com'),
  ('D3',   'Meenakshi S',     'owner',  '9842666677', '9842666677', 'meenakshi@email.com'),
  ('D3',   'Rajesh P',        'tenant', '9842777788', '9842777788', NULL),
  ('D4',   'Chandran K',      'owner',  '9842888899', '9842888899', 'chandran@email.com'),
  ('D5',   'Revathi Devi',    'owner',  '9842999900', '9842999900', 'revathi@email.com'),
  ('D5',   'Anil Kumar',      'tenant', '9843000011', '9843000011', NULL),
  ('E1',   'Gopalan Nair',    'owner',  '9843111122', '9843111122', 'gopalan@email.com'),
  ('E2',   'Sunita Raj',      'owner',  '9843222233', '9843222233', 'sunita@email.com'),
  ('E3',   'Balachandran T',  'owner',  '9843333344', '9843333344', 'bala@email.com'),
  ('E3',   'Divya Menon',     'tenant', '9843444455', '9843444455', NULL),
  ('E4',   'Kamala Devi',     'owner',  '9843555566', '9843555566', 'kamala@email.com'),
  ('F1',   'Venkat Raman',    'owner',  '9843666677', '9843666677', 'venkat@email.com'),
  ('F2',   'Shanthi Devi',    'owner',  '9843777788', '9843777788', 'shanthi@email.com'),
  ('F2',   'Sunil Mathew',    'tenant', '9843888899', '9843888899', NULL),
  ('F3',   'Krishnan Nair',   'owner',  '9843999900', '9843999900', 'krishnan@email.com'),
  ('F4',   'Padma Latha',     'owner',  '9844000011', '9844000011', 'padma@email.com'),
  ('F4',   'Rohan Verma',     'tenant', '9844111122', '9844111122', NULL)
ON CONFLICT DO NOTHING;

-- ── Seed expenses ─────────────────────────────────────────────
INSERT INTO expenses (vendor, category, amount, expense_date, invoice_no) VALUES
  ('CleanPro Services',   'Cleaning',    8000,  '2026-05-18', 'INV-2026-045'),
  ('SecureGuard Pvt Ltd', 'Security',    12000, '2026-05-14', 'INV-2026-044'),
  ('TNEB',                'Electricity', 6400,  '2026-05-10', 'TNEB-MAY26'),
  ('LiftTech India',      'Repairs',     3500,  '2026-05-05', 'LT-2026-112'),
  ('GardenCare',          'Maintenance', 2000,  '2026-05-01', 'GC-2026-031'),
  ('Office Supplies',     'Admin',       850,   '2026-05-01', 'ADM-2026-05')
ON CONFLICT DO NOTHING;

-- ── Seed notices ──────────────────────────────────────────────
INSERT INTO notices (title, body, target, posted_at) VALUES
  ('May 2026 Maintenance Bills Generated',
   'Monthly maintenance bills for all 30 flats have been generated for May 2026. Please pay by 10th June 2026 to avoid late fees.',
   'all', '2026-05-20 09:00:00'),
  ('Water Pump Maintenance – 22 May',
   'The overhead water pump will undergo scheduled maintenance on 22 May from 10 AM to 2 PM. Water supply will be interrupted during this period.',
   'all', '2026-05-15 10:00:00'),
  ('AGM Meeting – 15 June 2026',
   'The Annual General Meeting will be held on 15th June 2026 at 6:00 PM in the Community Hall. All flat owners are requested to attend.',
   'owners', '2026-05-01 09:00:00'),
  ('Lift Servicing Completed',
   'The lift in Block A & B has been serviced successfully by LiftTech India. Normal operations have resumed.',
   'all', '2026-04-28 11:00:00')
ON CONFLICT DO NOTHING;

-- ── Seed bills for May 2026 ───────────────────────────────────
INSERT INTO bills (flat_id, billing_month, total_amount, arrears, due_date, status) VALUES
  ('A1',   '2026-05', 2000, 0,    '2026-06-10', 'paid'),
  ('A2',   '2026-05', 2000, 4000, '2026-06-10', 'overdue'),
  ('A3',   '2026-05', 2000, 0,    '2026-06-10', 'paid'),
  ('A4',   '2026-05', 2000, 2000, '2026-06-10', 'partial'),
  ('A5',   '2026-05', 2000, 0,    '2026-06-10', 'paid'),
  ('A6',   '2026-05', 2000, 2000, '2026-06-10', 'overdue'),
  ('B1',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('B2',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('B3',   '2026-05', 1800, 1800, '2026-06-10', 'overdue'),
  ('B4',   '2026-05', 1600, 0,    '2026-06-10', 'paid'),
  ('B5',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('B6',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('C1',   '2026-05', 1800, 3600, '2026-06-10', 'overdue'),
  ('C2',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('C3',   '2026-05', 1800, 1800, '2026-06-10', 'partial'),
  ('C4',   '2026-05', 1600, 0,    '2026-06-10', 'paid'),
  ('C5',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('D1D2', '2026-05', 2000, 0,    '2026-06-10', 'paid'),
  ('D3',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('D4',   '2026-05', 1600, 0,    '2026-06-10', 'paid'),
  ('D5',   '2026-05', 1600, 1600, '2026-06-10', 'overdue'),
  ('E1',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('E2',   '2026-05', 2000, 0,    '2026-06-10', 'paid'),
  ('E3',   '2026-05', 1600, 1600, '2026-06-10', 'partial'),
  ('E4',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('F1',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('F2',   '2026-05', 1800, 1800, '2026-06-10', 'overdue'),
  ('F3',   '2026-05', 1800, 0,    '2026-06-10', 'paid'),
  ('F4',   '2026-05', 1800, 0,    '2026-06-10', 'paid')
ON CONFLICT (flat_id, billing_month) DO NOTHING;

-- ============================================================
-- DONE! All 12 tables created with RLS + seed data loaded.
-- ============================================================
