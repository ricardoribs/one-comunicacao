const pool = require('../config/db');

const baseSelect = `
  SELECT
    e.id,
    e.title,
    e.description,
    e.starts_at,
    e.ends_at,
    e.location,
    e.color,
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at,
    creator.name AS created_by_name,
    updater.name AS updated_by_name
  FROM calendar_events e
  LEFT JOIN users creator ON creator.id = e.created_by
  LEFT JOIN users updater ON updater.id = e.updated_by
`;

async function listRange({ from, to }) {
  const { rows } = await pool.query(
    `${baseSelect}
     WHERE e.starts_at < $2
       AND e.ends_at > $1
     ORDER BY e.starts_at ASC, e.id ASC`,
    [from, to]
  );

  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `${baseSelect}
     WHERE e.id = $1`,
    [id]
  );

  return rows[0] || null;
}

async function create(data, actor) {
  const { rows } = await pool.query(
    `INSERT INTO calendar_events (
       title,
       description,
       starts_at,
       ends_at,
       location,
       color,
       created_by,
       updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING id`,
    [
      data.title,
      data.description || null,
      data.starts_at,
      data.ends_at,
      data.location || null,
      data.color || 'pink',
      actor?.id || null,
    ]
  );

  return findById(rows[0].id);
}

async function update(id, data, actor) {
  const updates = [];
  const params = [id];
  let index = 2;
  const appendField = (key, column = key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      return;
    }

    updates.push(`${column} = $${index++}`);
    params.push(data[key] ?? null);
  };

  appendField('title');
  appendField('description');
  appendField('starts_at');
  appendField('ends_at');
  appendField('location');
  appendField('color');

  if (!updates.length) {
    return findById(id);
  }

  updates.push(`updated_by = $${index++}`);
  params.push(actor?.id || null);
  updates.push('updated_at = NOW()');

  const { rows } = await pool.query(
    `UPDATE calendar_events
        SET ${updates.join(',\n            ')}
      WHERE id = $1
      RETURNING id`,
    params
  );

  if (!rows[0]) {
    return null;
  }

  return findById(rows[0].id);
}

async function remove(id) {
  const { rows } = await pool.query(
    `DELETE FROM calendar_events
      WHERE id = $1
      RETURNING id`,
    [id]
  );

  return rows[0] || null;
}

async function listDueReminderCandidates(userId, { from, to, reminderType, limit = 20 }) {
  const { rows } = await pool.query(
    `${baseSelect}
     LEFT JOIN calendar_event_reminders reminder
       ON reminder.event_id = e.id
      AND reminder.user_id = $1
      AND reminder.reminder_type = $4
     WHERE e.starts_at > $2
       AND e.starts_at <= $3
       AND reminder.id IS NULL
     ORDER BY e.starts_at ASC, e.id ASC
     LIMIT $5`,
    [userId, from, to, reminderType, limit]
  );

  return rows;
}

async function registerReminderDelivery({ eventId, userId, reminderType }) {
  const { rows } = await pool.query(
    `INSERT INTO calendar_event_reminders (event_id, user_id, reminder_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, user_id, reminder_type) DO NOTHING
     RETURNING id`,
    [eventId, userId, reminderType]
  );

  return rows[0] || null;
}

module.exports = {
  listRange,
  findById,
  create,
  update,
  remove,
  listDueReminderCandidates,
  registerReminderDelivery,
};
