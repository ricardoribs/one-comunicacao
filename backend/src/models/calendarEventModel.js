const tenantDb = require('../db/tenantDb');
const { getInternalClientAccessScope } = require('../utils/internalClientScope');

const SERVICE_ACTOR = Object.freeze({ role: 'admin' });

function calendarScopeConfig(alias = 'e') {
  return {
    client: `${alias}.client_id = $TENANT AND ${alias}.visibility = 'client'`,
    internal: [
      `${alias}.visibility = 'team'`,
      `${alias}.created_by = $TENANT`,
      ...getInternalClientAccessScope(`${alias}.client_id`),
    ],
  };
}

const baseSelect = `
  SELECT
    e.id,
    e.title,
    e.description,
    e.starts_at,
    e.ends_at,
    e.location,
    e.color,
    e.client_id,
    e.visibility,
    e.google_event_id,
    e.synced_from_google,
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at,
    c.name AS client_name,
    c.company AS client_company,
    creator.name AS created_by_name,
    updater.name AS updated_by_name
  FROM calendar_events e
  LEFT JOIN clients c ON c.id = e.client_id
  LEFT JOIN users creator ON creator.id = e.created_by
  LEFT JOIN users updater ON updater.id = e.updated_by
`;

async function listRange(user, { from, to }) {
  const { rows } = await tenantDb.query(user, {
    table: 'calendar_events',
    scopeConfig: calendarScopeConfig('e'),
    prefix: 'AND',
    startIndex: 3,
    sql:
    `${baseSelect}
     WHERE e.starts_at < $2
       AND e.ends_at > $1
       __TENANT_SCOPE__
     ORDER BY e.starts_at ASC, e.id ASC`,
    params: [from, to],
  });

  return rows;
}

async function findById(id, user) {
  const { rows } = await tenantDb.query(user, {
    table: 'calendar_events',
    scopeConfig: calendarScopeConfig('e'),
    prefix: 'AND',
    startIndex: 2,
    sql:
    `${baseSelect}
     WHERE e.id = $1
       __TENANT_SCOPE__`,
    params: [id],
  });

  return rows[0] || null;
}

async function create(data, actor) {
  const visibility = data.client_id ? 'client' : 'team';
  const id = await tenantDb.runWithTenantContext(actor, async (client) => {
    const { rows } = await tenantDb.queryWithClient(actor, client, {
      table: 'calendar_events',
      bypassScope: true,
      sql: `INSERT INTO calendar_events (
         title,
         description,
         starts_at,
         ends_at,
         location,
         color,
         client_id,
         visibility,
         google_event_id,
         synced_from_google,
         created_by,
         updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING id`,
      params: [
        data.title,
        data.description || null,
        data.starts_at,
        data.ends_at,
        data.location || null,
        data.color || 'pink',
        data.client_id || null,
        visibility,
        data.google_event_id || null,
        data.synced_from_google || false,
        actor?.id || null,
      ],
    });

    return rows[0].id;
  });

  return findById(id, actor);
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
  appendField('client_id');
  appendField('google_event_id');

  if (Object.prototype.hasOwnProperty.call(data, 'client_id')) {
    updates.push(`visibility = $${index++}`);
    params.push(data.client_id ? 'client' : 'team');
  }

  if (!updates.length) {
    return findById(id, actor);
  }

  updates.push(`updated_by = $${index++}`);
  params.push(actor?.id || null);
  updates.push('updated_at = NOW()');

  const { rows } = await tenantDb.query(actor, {
    table: 'calendar_events',
    scopeConfig: calendarScopeConfig('calendar_events'),
    prefix: 'AND',
    startIndex: index,
    sql: `UPDATE calendar_events
          SET ${updates.join(',\n              ')}
        WHERE id = $1
          __TENANT_SCOPE__
        RETURNING id`,
    params,
  });

  if (!rows[0]) {
    return null;
  }

  return findById(rows[0].id, actor);
}

async function remove(id, actor) {
  const { rows } = await tenantDb.query(actor, {
    table: 'calendar_events',
    scopeConfig: calendarScopeConfig('calendar_events'),
    prefix: 'AND',
    startIndex: 2,
    sql: `DELETE FROM calendar_events
        WHERE id = $1
          __TENANT_SCOPE__
        RETURNING id`,
    params: [id],
  });

  return rows[0] || null;
}

async function listDueReminderCandidates(user, { from, to, reminderType, limit = 20 }) {
  if (!user?.id) {
    return [];
  }

  const { rows } = await tenantDb.query(user, {
    table: 'calendar_events',
    scopeConfig: calendarScopeConfig('e'),
    prefix: 'AND',
    startIndex: 6,
    sql:
    `${baseSelect}
     LEFT JOIN calendar_event_reminders reminder
       ON reminder.event_id = e.id
      AND reminder.user_id = $1
      AND reminder.reminder_type = $4
     WHERE e.starts_at > $2
       AND e.starts_at <= $3
       AND reminder.id IS NULL
       __TENANT_SCOPE__
     ORDER BY e.starts_at ASC, e.id ASC
     LIMIT $5`,
    params: [user.id, from, to, reminderType, limit],
  });

  return rows;
}

async function registerReminderDelivery({ eventId, userId, reminderType }) {
  const { rows } = await tenantDb.runWithTenantContext(
    SERVICE_ACTOR,
    (client) => client.query(
      `INSERT INTO calendar_event_reminders (event_id, user_id, reminder_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id, reminder_type) DO NOTHING
       RETURNING id`,
      [eventId, userId, reminderType]
    )
  );

  return rows[0] || null;
}

async function findByGoogleId(user, googleEventId) {
  const { rows } = await tenantDb.query(user, {
    table: 'calendar_events',
    scopeConfig: calendarScopeConfig('e'),
    prefix: 'AND',
    startIndex: 2,
    sql:
    `${baseSelect}
     WHERE e.google_event_id = $1
       __TENANT_SCOPE__
     LIMIT 1`,
    params: [googleEventId],
  });

  return rows[0] || null;
}

module.exports = {
  calendarScopeConfig,
  listRange,
  findById,
  findByGoogleId,
  create,
  update,
  remove,
  listDueReminderCandidates,
  registerReminderDelivery,
};
