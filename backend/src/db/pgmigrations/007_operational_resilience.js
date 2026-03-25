exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE charges
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_charges_created_by_idempotency_key
      ON charges(created_by, idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_charges_created_by_idempotency_key;

    ALTER TABLE charges
      DROP COLUMN IF EXISTS idempotency_key;
  `);
};
