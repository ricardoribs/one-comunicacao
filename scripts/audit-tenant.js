const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  'backend/src/controllers',
  'backend/src/routes',
  'backend/src/models',
  'backend/src/services',
  'backend/src/utils',
].map((dir) => path.join(ROOT, dir));

const TENANT_TABLES = new Set([
  'clients',
  'campaigns',
  'tasks',
  'messages',
  'contacts',
  'materials',
  'files',
  'invoices',
  'cost_entries',
  'metrics',
  'charges',
  'reports',
  'client_integrations',
  'calendar_events',
]);

const SAFE_DIRECT_TABLES = new Set([
  'users',
  'refresh_tokens',
  'email_verification_tokens',
  'password_reset_tokens',
  'notifications',
  'calendar_event_reminders',
  'user_daily_checklists',
  'task_assignees',
]);

const QUERY_CALL_PATTERN = /\b([A-Za-z_$][\w$]*)\.query\s*\(/g;
const TENANT_DB_RECEIVERS = new Set(['tenantDb']);

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return fullPath.endsWith('.js') ? [fullPath] : [];
  });
}

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function extractStatement(content, index) {
  const openParen = content.indexOf('(', index);
  if (openParen === -1) {
    return content.slice(index, Math.min(content.length, index + 300));
  }

  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let cursor = openParen; cursor < content.length; cursor += 1) {
    const char = content[cursor];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(index, cursor + 1);
      }
    }
  }

  return content.slice(index, Math.min(content.length, index + 1200));
}

function findMentionedTables(statement) {
  const normalized = statement.toLowerCase();
  return [...TENANT_TABLES].filter((table) => new RegExp(`\\b${table}\\b`, 'i').test(normalized));
}

function findSafeTables(statement) {
  const normalized = statement.toLowerCase();
  return [...SAFE_DIRECT_TABLES].filter((table) => new RegExp(`\\b${table}\\b`, 'i').test(normalized));
}

function hasExplicitAllow(statement) {
  return /tenant-audit:\s*allow-direct-query/i.test(statement);
}

const violations = [];

for (const file of SCAN_DIRS.flatMap(walk)) {
  const content = fs.readFileSync(file, 'utf8');
  QUERY_CALL_PATTERN.lastIndex = 0;

  let match;
  while ((match = QUERY_CALL_PATTERN.exec(content))) {
    const receiver = match[1];
    if (TENANT_DB_RECEIVERS.has(receiver)) {
      continue;
    }

    const statement = extractStatement(content, match.index);
    const tenantTables = findMentionedTables(statement);
    if (tenantTables.length === 0) {
      continue;
    }

    if (hasExplicitAllow(statement)) {
      continue;
    }

    const safeTables = findSafeTables(statement);
    violations.push({
      file: path.relative(ROOT, file),
      line: lineNumberForIndex(content, match.index),
      receiver,
      tables: tenantTables,
      safeTables,
    });
  }
}

if (violations.length > 0) {
  console.error('\n[TENANT GUARD] Queries diretas contra tabelas tenant encontradas:\n');
  violations.forEach((violation) => {
    console.error(
      `  ${violation.file}:${violation.line} receiver=${violation.receiver} tables=${violation.tables.join(',')}`
    );
  });
  console.error('\nUse tenantDb.query/queryWithClient com escopo tenant ou documente uma excecao revisada.\n');
  process.exit(1);
}

console.log('[TENANT GUARD] OK - nenhuma query direta contra tabelas tenant.');
