CREATE TABLE net_worth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on net_worth_snapshots" ON net_worth_snapshots FOR ALL USING (true) WITH CHECK (true);