#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { Pool } = require('pg');

const env = require('../src/config/env');
const { buildDatabaseSslConfig } = require('../src/utils/databaseSsl');

const repoRoot = path.resolve(__dirname, '../..');
const backendRoot = path.resolve(__dirname, '..');
const backupDir = path.resolve(process.env.RESTORE_DRILL_BACKUP_DIR || path.join(repoRoot, 'backups', 'restore-drills'));
const evidenceDir = path.resolve(process.env.RESTORE_DRILL_EVIDENCE_DIR || path.join(repoRoot, 'docs', 'restore-drills'));
const startedAt = new Date();
const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
const suffix = crypto.randomBytes(4).toString('hex');
const drillDbName = process.env.RESTORE_DRILL_DATABASE_NAME || `one_restore_drill_${stamp.replace(/[^0-9TZ-]/g, '').replace(/-/g, '_')}_${suffix}`;
const keepDatabase = process.env.RESTORE_DRILL_KEEP_DB === 'true';
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 30);

function assertSafeDrillDatabaseName(name) {
  if (!/^one_restore_drill_[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error('RESTORE_DRILL_DATABASE_NAME deve comecar com one_restore_drill_ e conter apenas letras, numeros e underscore.');
  }
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function parseDatabaseUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    sslmode: parsed.searchParams.get('sslmode') || '',
  };
}

function buildSourceDatabaseConfig() {
  if (env.databaseHost && env.databaseUser && env.databaseName) {
    return {
      host: env.databaseHost,
      port: env.databasePort,
      database: env.databaseName,
      username: env.databaseUser,
      password: env.databasePassword,
    };
  }

  return parseDatabaseUrl(env.databaseUrl);
}

function buildDatabaseUrl(config, databaseName = config.database) {
  const url = new URL('postgresql://localhost');
  url.hostname = config.host;
  url.port = String(config.port || 5432);
  url.username = config.username || '';
  url.password = config.password || '';
  url.pathname = `/${encodeURIComponent(databaseName)}`;

  if (config.sslmode) {
    url.searchParams.set('sslmode', config.sslmode);
  }

  return url.toString();
}

function buildPgToolEnv(config) {
  const toolEnv = {
    ...process.env,
    PGPASSWORD: config.password || '',
  };

  if (env.databaseSslRequired || config.sslmode) {
    toolEnv.PGSSLMODE = process.env.PGSSLMODE || (env.databaseSslCaFile ? 'verify-full' : 'require');
  }

  if (env.databaseSslCaFile) {
    toolEnv.PGSSLROOTCERT = env.databaseSslCaFile;
  }

  return toolEnv;
}

function runCommand(command, args, options = {}) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || backendRoot,
      env: options.env || process.env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      const durationMs = Date.now() - started;

      if (code !== 0) {
        const error = new Error(`${command} ${args.join(' ')} falhou com exit code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.durationMs = durationMs;
        reject(error);
        return;
      }

      resolve({ stdout, stderr, durationMs });
    });
  });
}

function buildPoolConfig(config, databaseName = config.database) {
  const poolConfig = {
    host: config.host,
    port: config.port,
    database: databaseName,
    user: config.username,
    password: config.password,
  };

  const sslConfig = buildDatabaseSslConfig({
    required: env.databaseSslRequired,
    caFilePath: env.databaseSslCaFile,
    caPem: env.databaseSslCaPem,
  });

  if (sslConfig) {
    poolConfig.ssl = sslConfig;
  }

  return poolConfig;
}

async function createDrillDatabase(sourceConfig) {
  const maintenanceDatabase = process.env.RESTORE_DRILL_MAINTENANCE_DB || 'postgres';
  const pool = new Pool(buildPoolConfig(sourceConfig, maintenanceDatabase));

  try {
    await pool.query(`CREATE DATABASE ${quoteIdentifier(drillDbName)}`);
  } finally {
    await pool.end();
  }
}

async function dropDrillDatabase(sourceConfig) {
  const maintenanceDatabase = process.env.RESTORE_DRILL_MAINTENANCE_DB || 'postgres';
  const pool = new Pool(buildPoolConfig(sourceConfig, maintenanceDatabase));

  try {
    await pool.query(
      `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()
      `,
      [drillDbName]
    );
    await pool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(drillDbName)}`);
  } finally {
    await pool.end();
  }
}

async function collectDatabaseChecks(targetConfig) {
  const pool = new Pool(buildPoolConfig(targetConfig));

  try {
    const tables = ['users', 'clients', 'campaigns', 'calendar_events'];
    const checks = {};

    for (const table of tables) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      checks[table] = rows[0].count;
    }

    const calendarColumns = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'calendar_events'
          AND column_name IN ('client_id', 'visibility')
        ORDER BY column_name
      `
    );
    checks.calendar_event_tenant_columns = calendarColumns.rows.map((row) => row.column_name);

    return checks;
  } finally {
    await pool.end();
  }
}

async function waitForJson(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return { status: response.status, data };
      }

      lastError = new Error(`${url} respondeu ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError || new Error(`${url} nao respondeu dentro do timeout.`);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function runApiSmoke(targetDatabaseUrl) {
  const port = Number(process.env.RESTORE_DRILL_PORT || 4300 + Math.floor(Math.random() * 1000));
  const baseUrl = `http://127.0.0.1:${port}`;
  const apiEnv = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(port),
    DATABASE_URL: targetDatabaseUrl,
    DATABASE_HOST: '',
    DATABASE_NAME: '',
    DATABASE_USER: '',
    DATABASE_PASSWORD: '',
    JWT_SECRET: process.env.JWT_SECRET || 'restore-drill-jwt-secret-restore-drill-jwt-secret-restore-drill-jwt-secret',
    MFA_REQUIRED_ROLES: process.env.MFA_REQUIRED_ROLES || '',
    MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY || 'restore-drill-mfa-encryption-key-32-chars',
    FINANCIAL_ENCRYPTION_KEY: process.env.FINANCIAL_ENCRYPTION_KEY || 'restore-drill-financial-encryption-key-32-chars',
    APP_BASE_URL: baseUrl,
    CORS_ORIGINS: baseUrl,
    TRUST_PROXY: process.env.TRUST_PROXY || '1',
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'log',
    UPLOAD_REQUIRE_MALWARE_SCAN: 'false',
  };

  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: backendRoot,
    env: apiEnv,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const ready = await waitForJson(`${baseUrl}/api/ready`);
    const health = await waitForJson(`${baseUrl}/api/health`);
    const smoke = {
      base_url: baseUrl,
      ready: ready.data.status,
      health: health.data.status,
    };

    const email = process.env.RESTORE_DRILL_SMOKE_EMAIL || process.env.SMOKE_EMAIL;
    const password = process.env.RESTORE_DRILL_SMOKE_PASSWORD || process.env.SMOKE_PASSWORD;

    if (email && password) {
      const login = await requestJson(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      smoke.login_status = login.status;
      smoke.login_ok = Boolean(login.ok && login.data.accessToken);

      if (login.data.accessToken) {
        const me = await requestJson(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${login.data.accessToken}` },
        });
        smoke.me_status = me.status;
        smoke.user_email = me.data.user?.email || null;
        smoke.user_role = me.data.user?.role || null;
      }
    } else {
      smoke.login_skipped = 'SMOKE_EMAIL/SMOKE_PASSWORD nao configurados.';
    }

    return smoke;
  } finally {
    child.kill('SIGTERM');

    if (stderr.trim()) {
      console.error(stderr.trim());
    }
  }
}

async function main() {
  assertSafeDrillDatabaseName(drillDbName);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.mkdir(evidenceDir, { recursive: true });

  const sourceConfig = buildSourceDatabaseConfig();
  const targetConfig = {
    ...sourceConfig,
    database: drillDbName,
  };
  const backupPath = path.join(backupDir, `one-restore-drill-${stamp}.sql`);
  const evidencePath = path.join(evidenceDir, `${stamp}.json`);
  const targetDatabaseUrl = buildDatabaseUrl(sourceConfig, drillDbName);
  const pgToolEnv = buildPgToolEnv(sourceConfig);
  const timings = {};
  let databaseCreated = false;

  try {
    const backupStarted = Date.now();
    await runCommand('pg_dump', [
      '-h',
      sourceConfig.host,
      '-p',
      String(sourceConfig.port),
      '-U',
      sourceConfig.username,
      '-d',
      sourceConfig.database,
      '--no-owner',
      '--no-acl',
      '--clean',
      '--if-exists',
      '--format=plain',
      '--file',
      backupPath,
    ], { cwd: repoRoot, env: pgToolEnv });
    timings.backup_ms = Date.now() - backupStarted;

    const backupStats = await fs.stat(backupPath);
    const restoreStarted = Date.now();

    await createDrillDatabase(sourceConfig);
    databaseCreated = true;

    await runCommand('psql', [
      '-h',
      targetConfig.host,
      '-p',
      String(targetConfig.port),
      '-U',
      targetConfig.username,
      '-d',
      targetConfig.database,
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      backupPath,
    ], { cwd: repoRoot, env: buildPgToolEnv(targetConfig) });
    timings.restore_ms = Date.now() - restoreStarted;

    const migrationStarted = Date.now();
    await runCommand(process.execPath, ['src/db/migrate.js', 'up'], {
      cwd: backendRoot,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DATABASE_URL: targetDatabaseUrl,
        DATABASE_HOST: '',
        DATABASE_NAME: '',
        DATABASE_USER: '',
        DATABASE_PASSWORD: '',
      },
    });
    timings.migration_ms = Date.now() - migrationStarted;

    const checks = await collectDatabaseChecks(targetConfig);
    const smokeStarted = Date.now();
    const smoke = await runApiSmoke(targetDatabaseUrl);
    timings.smoke_ms = Date.now() - smokeStarted;

    const finishedAt = new Date();
    const rtoMs = finishedAt.getTime() - restoreStarted;
    const rpoMs = restoreStarted - backupStarted;
    const evidence = {
      status: 'ok',
      executed_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      source_database: sourceConfig.database,
      restore_database: drillDbName,
      restore_database_kept: keepDatabase,
      backup_file: path.relative(repoRoot, backupPath).replace(/\\/g, '/'),
      backup_size_bytes: backupStats.size,
      retention_days: retentionDays,
      rpo_seconds: Number((rpoMs / 1000).toFixed(2)),
      rto_seconds: Number((rtoMs / 1000).toFixed(2)),
      timings,
      checks,
      smoke,
    };

    await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    if (databaseCreated && !keepDatabase) {
      await dropDrillDatabase(sourceConfig);
    }
  }
}

main().catch((error) => {
  console.error(error.message);

  if (error.stderr) {
    console.error(error.stderr);
  }

  process.exit(1);
});
