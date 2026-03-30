const pool = require('../config/db');
const PLACEHOLDER_LABELS = new Set(['fazer isso', 'fazer aquilo', 'depois isso']);

function normalizeChecklistDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}

function normalizeChecklistItem(item, index = 0) {
  const label = String(item?.label || item?.text || '').trim();
  if (!label || PLACEHOLDER_LABELS.has(label.toLowerCase())) {
    return null;
  }

  return {
    id: String(item?.id || `check_${Date.now()}_${index}`),
    label: label.slice(0, 120),
    done: Boolean(item?.done),
    createdAt: item?.createdAt || new Date().toISOString(),
  };
}

function normalizeChecklistItems(items = []) {
  let source = items;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = [];
    }
  }

  return (Array.isArray(source) ? source : [])
    .map((item, index) => normalizeChecklistItem(item, index))
    .filter(Boolean)
    .slice(0, 100);
}

function mapChecklistRow(row) {
  return {
    id: String(row.id),
    date: normalizeChecklistDate(row.checklist_date),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    items: normalizeChecklistItems(row.items),
  };
}

function buildChecklistSnapshot(rows) {
  const todayKey = normalizeChecklistDate(new Date());
  const mappedRows = rows.map(mapChecklistRow);
  const activeRow = mappedRows.find((row) => row.date === todayKey && !row.completedAt);

  return {
    activeDate: todayKey,
    activeItems: activeRow ? activeRow.items.map((item) => ({ ...item, done: Boolean(item.done) })) : [],
    history: mappedRows
      .filter((row) => row.completedAt)
      .map((row) => ({
        ...row,
        items: row.items.map((item) => ({ ...item, done: true })),
      })),
  };
}

async function pruneChecklistHistory(userId, executor = pool) {
  await executor.query(
    `
      DELETE FROM user_daily_checklists
      WHERE user_id = $1
        AND checklist_date < CURRENT_DATE - 30
    `,
    [userId]
  );
}

async function listRecent(userId, executor = pool) {
  const { rows } = await executor.query(
    `
      SELECT id, checklist_date, items, completed_at, updated_at
      FROM user_daily_checklists
      WHERE user_id = $1
      ORDER BY checklist_date DESC, updated_at DESC
    `,
    [userId]
  );

  return rows;
}

async function getSnapshot(userId, executor = pool) {
  await pruneChecklistHistory(userId, executor);
  const rows = await listRecent(userId, executor);
  return buildChecklistSnapshot(rows);
}

async function replaceToday(userId, items, executor = pool) {
  const normalizedItems = normalizeChecklistItems(items);
  const todayKey = normalizeChecklistDate(new Date());
  await pruneChecklistHistory(userId, executor);

  if (!normalizedItems.length) {
    await executor.query(
      'DELETE FROM user_daily_checklists WHERE user_id = $1 AND checklist_date = $2::date',
      [userId, todayKey]
    );

    return getSnapshot(userId, executor);
  }

  const allDone = normalizedItems.every((item) => item.done);
  const completedAt = allDone ? new Date().toISOString() : null;

  await executor.query(
    `
      INSERT INTO user_daily_checklists (user_id, checklist_date, items, completed_at)
      VALUES ($1, $2::date, $3::jsonb, $4)
      ON CONFLICT (user_id, checklist_date)
      DO UPDATE SET
        items = EXCLUDED.items,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW()
    `,
    [userId, todayKey, JSON.stringify(normalizedItems), completedAt]
  );

  return getSnapshot(userId, executor);
}

module.exports = {
  getSnapshot,
  replaceToday,
};
