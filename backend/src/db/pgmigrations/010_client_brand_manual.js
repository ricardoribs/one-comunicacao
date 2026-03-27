exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS brand_manual TEXT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE clients
      DROP COLUMN IF EXISTS brand_manual;
  `);
};
