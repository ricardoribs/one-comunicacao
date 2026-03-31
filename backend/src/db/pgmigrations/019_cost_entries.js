exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS cost_entries (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(30) NOT NULL DEFAULT 'operacao',
      description TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      incurred_on DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_cost_entries_client_id_created_at
      ON cost_entries(client_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_cost_entries_category_created_at
      ON cost_entries(category, created_at DESC);

    ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE cost_entries FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS cost_entries_tenant_isolation ON cost_entries;
    CREATE POLICY cost_entries_tenant_isolation ON cost_entries
      FOR ALL
      USING (app.can_access_client(client_id))
      WITH CHECK (app.can_access_client(client_id));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS cost_entries_tenant_isolation ON cost_entries;
    DROP INDEX IF EXISTS idx_cost_entries_category_created_at;
    DROP INDEX IF EXISTS idx_cost_entries_client_id_created_at;
    DROP TABLE IF EXISTS cost_entries;
  `);
};
