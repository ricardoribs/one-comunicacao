const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { runner } = require('node-pg-migrate');
const env = require('../config/env');

function buildMigrationDatabaseConfig() {
  if (env.databaseHost && env.databaseUser && env.databaseName) {
    const config = {
      host: env.databaseHost,
      port: env.databasePort,
      database: env.databaseName,
      user: env.databaseUser,
      password: env.databasePassword,
    };

    if (env.databaseSslCaFile) {
      if (!fs.existsSync(env.databaseSslCaFile)) {
        throw new Error(`DATABASE_SSL_CA_FILE nao encontrado para migrations: ${env.databaseSslCaFile}`);
      }

      config.ssl = {
        ca: fs.readFileSync(env.databaseSslCaFile, 'utf8'),
        rejectUnauthorized: true,
      };
    }

    return config;
  }

  return env.databaseUrl;
}

function buildPgClientConfig(databaseConfig) {
  if (typeof databaseConfig === 'string') {
    return {
      connectionString: databaseConfig,
    };
  }

  return {
    ...databaseConfig,
  };
}

async function reconcileLegacyMigrationNames(databaseConfig) {
  const client = new Client(buildPgClientConfig(databaseConfig));

  await client.connect();

  try {
    const tableCheck = await client.query("SELECT to_regclass('public.app_schema_migrations') AS table_name");
    if (!tableCheck.rows[0]?.table_name) {
      return;
    }

    const { rows } = await client.query(
      `
        SELECT name
          FROM app_schema_migrations
         WHERE name = ANY($1::text[])
      `,
      [['010_user_daily_checklists', '011_user_daily_checklists']]
    );

    const names = new Set(rows.map((row) => row.name));
    if (!names.has('010_user_daily_checklists') || names.has('011_user_daily_checklists')) {
      return;
    }

    await client.query(
      `
        UPDATE app_schema_migrations
           SET name = $1
         WHERE name = $2
      `,
      ['011_user_daily_checklists', '010_user_daily_checklists']
    );

    console.log('Compatibilidade aplicada: 010_user_daily_checklists renomeada para 011_user_daily_checklists.');
  } finally {
    await client.end();
  }
}

async function reconcileSchemaDrift(databaseConfig) {
  const client = new Client(buildPgClientConfig(databaseConfig));

  await client.connect();

  try {
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;

      ALTER TABLE clients
        ALTER COLUMN plan TYPE VARCHAR(120),
        ALTER COLUMN plan SET DEFAULT 'One Start';

      UPDATE clients
         SET plan = CASE
           WHEN LOWER(TRIM(plan)) = 'starter' THEN 'One Ideal'
           WHEN LOWER(TRIM(plan)) = 'growth' THEN 'One Start'
           WHEN LOWER(TRIM(plan)) = 'scale' THEN 'One Master'
           WHEN LOWER(TRIM(plan)) IN ('one start', 'one star') THEN 'One Start'
           WHEN LOWER(TRIM(plan)) = 'one ideal' THEN 'One Ideal'
           WHEN LOWER(TRIM(plan)) = 'one master' THEN 'One Master'
           WHEN LOWER(TRIM(plan)) = 'cobertura de eventos' THEN 'Sob demanda · Cobertura de Eventos'
           WHEN LOWER(TRIM(plan)) IN ('releases', 'releases (imprensa)') THEN 'Sob demanda · Releases (Imprensa)'
           WHEN LOWER(TRIM(plan)) = 'newsletter' THEN 'Sob demanda · Newsletter'
           WHEN LOWER(TRIM(plan)) = 'fotografia' THEN 'Sob demanda · Fotografia'
           WHEN LOWER(TRIM(plan)) IN ('trafego pago', 'tráfego pago', 'tráfego pago (como serviço isolado)') THEN 'Sob demanda · Tráfego Pago (como serviço isolado)'
           ELSE plan
         END
       WHERE plan IS NOT NULL;

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        amount NUMERIC(12,2) NOT NULL,
        status VARCHAR(30) NOT NULL,
        due_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS due_date DATE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_invoices_client_id_created_at ON invoices(client_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id_status_created_at ON invoices(client_id, status, created_at DESC);

      ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
      CREATE POLICY invoices_tenant_isolation ON invoices
        FOR ALL
        USING (app.can_access_client(client_id))
        WITH CHECK (app.can_access_client(client_id));

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title VARCHAR(160) NOT NULL,
        report_month DATE NOT NULL,
        summary TEXT NOT NULL,
        file_url TEXT
      );

      ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS file_url TEXT;

      CREATE INDEX IF NOT EXISTS idx_reports_client_id_report_month ON reports(client_id, report_month DESC);

      ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE reports FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS reports_tenant_isolation ON reports;
      CREATE POLICY reports_tenant_isolation ON reports
        FOR ALL
        USING (app.can_access_client(client_id))
        WITH CHECK (app.can_access_client(client_id));

      CREATE TABLE IF NOT EXISTS client_integrations (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        provider_key VARCHAR(50) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'configuring',
        external_account_id VARCHAR(160),
        external_property_id VARCHAR(160),
        connected_at TIMESTAMP,
        last_sync_at TIMESTAMP,
        last_success_at TIMESTAMP,
        last_error TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE client_integrations
        ADD COLUMN IF NOT EXISTS external_account_id VARCHAR(160),
        ADD COLUMN IF NOT EXISTS external_property_id VARCHAR(160),
        ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_error TEXT,
        ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

      CREATE UNIQUE INDEX IF NOT EXISTS uq_client_integrations_client_provider
        ON client_integrations(client_id, provider_key);
      CREATE INDEX IF NOT EXISTS idx_client_integrations_client_status
        ON client_integrations(client_id, status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_client_integrations_provider_status
        ON client_integrations(provider_key, status, updated_at DESC);

      ALTER TABLE client_integrations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE client_integrations FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS client_integrations_tenant_isolation ON client_integrations;
      CREATE POLICY client_integrations_tenant_isolation ON client_integrations
        FOR ALL
        USING (app.can_access_client(client_id))
        WITH CHECK (app.can_access_client(client_id));

      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(60) NOT NULL,
        title VARCHAR(160) NOT NULL,
        body TEXT,
        entity_type VARCHAR(40),
        entity_id INTEGER,
        read_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at ON notifications(user_id, read_at, created_at DESC);

      CREATE OR REPLACE FUNCTION app.can_access_task(task_client_id INTEGER, assigned_user_id INTEGER, created_user_id INTEGER)
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT
          app.is_admin()
          OR (app.is_client() AND task_client_id = app.current_client_id() AND assigned_user_id IS NOT NULL)
          OR (
            app.is_internal()
            AND (
              assigned_user_id = app.current_user_id()
              OR created_user_id = app.current_user_id()
              OR assigned_user_id IS NULL
              OR app.can_access_client(task_client_id)
            )
          );
      $$;

      DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
      CREATE POLICY tasks_tenant_isolation ON tasks
        USING (app.can_access_task(client_id, assigned_to, created_by))
        WITH CHECK (app.can_access_task(client_id, assigned_to, created_by));
    `);

    console.log('Schema drift reconciliation concluida.');
  } finally {
    await client.end();
  }
}

async function main() {
  const direction = process.argv[2] || 'up';
  const count = process.argv[3] ? Number(process.argv[3]) : undefined;

  if (!['up', 'down'].includes(direction)) {
    throw new Error("Direcao de migration invalida. Use 'up' ou 'down'.");
  }

  const databaseConfig = buildMigrationDatabaseConfig();

  if (direction === 'up') {
    await reconcileLegacyMigrationNames(databaseConfig);
  }

  await runner({
    databaseUrl: databaseConfig,
    dir: path.join(__dirname, 'pgmigrations'),
    direction,
    count,
    migrationsTable: 'app_schema_migrations',
    log: direction === 'down' ? console.warn : console.log,
    noLock: false,
    createSchema: false,
  });

  if (direction === 'up') {
    await reconcileSchemaDrift(databaseConfig);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
