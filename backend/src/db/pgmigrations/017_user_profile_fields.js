exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS avatar_url,
      DROP COLUMN IF EXISTS phone;
  `);
};
