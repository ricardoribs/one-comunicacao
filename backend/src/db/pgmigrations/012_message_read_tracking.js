exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

    CREATE INDEX IF NOT EXISTS idx_messages_receiver_read_at
      ON messages(receiver_id, read_at, created_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_messages_receiver_read_at;

    ALTER TABLE messages
      DROP COLUMN IF EXISTS read_at;
  `);
};
