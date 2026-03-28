const pool = require('../config/db');

async function create({ userId, type, title, body, entityType, entityId }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications
       (user_id, type, title, body, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, type, title, body || null, entityType || null, entityId || null]
  );

  return rows[0] || null;
}

async function listForUser(userId, { limit = 30, unreadOnly = false } = {}) {
  const { rows } = await pool.query(
    `SELECT *
       FROM notifications
      WHERE user_id = $1
        AND ($2::boolean = false OR read_at IS NULL)
      ORDER BY created_at DESC
      LIMIT $3`,
    [userId, Boolean(unreadOnly), limit]
  );

  return rows;
}

async function countUnread(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total
       FROM notifications
      WHERE user_id = $1
        AND read_at IS NULL`,
    [userId]
  );

  return Number(rows[0]?.total || 0);
}

async function markAsRead(id, userId) {
  const { rows } = await pool.query(
    `UPDATE notifications
        SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1
        AND user_id = $2
      RETURNING id`,
    [id, userId]
  );

  return rows[0] || null;
}

async function markAllAsRead(userId) {
  const { rows } = await pool.query(
    `UPDATE notifications
        SET read_at = COALESCE(read_at, NOW())
      WHERE user_id = $1
        AND read_at IS NULL
      RETURNING id`,
    [userId]
  );

  return rows.length;
}

module.exports = {
  create,
  listForUser,
  countUnread,
  markAsRead,
  markAllAsRead,
};
