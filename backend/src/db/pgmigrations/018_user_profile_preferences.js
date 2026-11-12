exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS job_title VARCHAR(120),
      ADD COLUMN IF NOT EXISTS notify_task_assigned BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS notify_task_completed BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS notify_calendar_24h BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS notify_calendar_1h BOOLEAN NOT NULL DEFAULT true;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS notify_calendar_1h,
      DROP COLUMN IF EXISTS notify_calendar_24h,
      DROP COLUMN IF EXISTS notify_task_completed,
      DROP COLUMN IF EXISTS notify_task_assigned,
      DROP COLUMN IF EXISTS job_title;
  `);
};
