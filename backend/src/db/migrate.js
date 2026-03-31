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
      CREATE SCHEMA IF NOT EXISTS app;

      CREATE OR REPLACE FUNCTION app.current_role()
      RETURNS TEXT
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT NULLIF(current_setting('app.current_role', true), '');
      $$;

      CREATE OR REPLACE FUNCTION app.current_user_id()
      RETURNS INTEGER
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
      $$;

      CREATE OR REPLACE FUNCTION app.current_client_id()
      RETURNS INTEGER
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT NULLIF(current_setting('app.current_client_id', true), '')::INTEGER;
      $$;

      CREATE OR REPLACE FUNCTION app.is_admin()
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT app.current_role() = 'admin';
      $$;

      CREATE OR REPLACE FUNCTION app.is_client()
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT app.current_role() = 'client';
      $$;

      CREATE OR REPLACE FUNCTION app.is_internal()
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT app.current_role() IN ('designer', 'gestor', 'comercial', 'dev');
      $$;

      CREATE OR REPLACE FUNCTION app.can_access_client(target_client_id INTEGER)
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT
          app.is_admin()
          OR (app.is_client() AND target_client_id = app.current_client_id())
          OR (
            app.is_internal()
            AND EXISTS (
              SELECT 1
              FROM clients c
              WHERE c.id = target_client_id
                AND c.manager_id = app.current_user_id()
            )
          );
      $$;

      CREATE OR REPLACE FUNCTION app.can_access_contact(owner_user_id INTEGER, assigned_user_id INTEGER)
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT
          app.is_admin()
          OR (
            app.is_internal()
            AND (
              owner_user_id = app.current_user_id()
              OR assigned_user_id = app.current_user_id()
            )
          );
      $$;

      CREATE OR REPLACE FUNCTION app.can_write_contact(owner_user_id INTEGER, assigned_user_id INTEGER)
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT
          app.is_admin()
          OR (
            app.is_internal()
            AND (
              owner_user_id = app.current_user_id()
              OR assigned_user_id = app.current_user_id()
              OR (owner_user_id IS NULL AND assigned_user_id IS NULL)
            )
          );
      $$;

      CREATE OR REPLACE FUNCTION app.can_access_charge_row(target_client_id INTEGER, created_by_user_id INTEGER)
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT
          app.is_admin()
          OR (app.is_client() AND target_client_id = app.current_client_id())
          OR (
            app.is_internal()
            AND (
              created_by_user_id = app.current_user_id()
              OR app.can_access_client(target_client_id)
            )
          );
      $$;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
        ADD COLUMN IF NOT EXISTS job_title VARCHAR(120),
        ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS last_seen_ip VARCHAR(64),
        ADD COLUMN IF NOT EXISTS last_seen_location VARCHAR(160),
        ADD COLUMN IF NOT EXISTS notify_task_assigned BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notify_task_completed BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notify_calendar_24h BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notify_calendar_1h BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;

      CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
        ON users(last_seen_at DESC);

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMP NULL,
        replaced_by_token_hash VARCHAR(128) NULL,
        created_by_ip VARCHAR(80) NULL,
        revoked_by_ip VARCHAR(80) NULL,
        user_agent TEXT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
        ON email_verification_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash
        ON email_verification_tokens(token_hash);

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
        ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
        ON password_reset_tokens(token_hash);

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

      ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
      ALTER TABLE clients FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
      CREATE POLICY clients_tenant_isolation ON clients
        FOR ALL
        USING (
          app.is_admin()
          OR (app.is_client() AND id = app.current_client_id())
          OR (app.is_internal() AND manager_id = app.current_user_id())
        )
        WITH CHECK (
          app.is_admin()
          OR (app.is_client() AND id = app.current_client_id())
          OR (app.is_internal() AND manager_id = app.current_user_id())
        );

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(160) NOT NULL,
        channel VARCHAR(60) NOT NULL,
        audience TEXT,
        objective TEXT,
        pipeline_stage VARCHAR(40) NOT NULL DEFAULT 'planejamento',
        budget NUMERIC(12,2) NOT NULL DEFAULT 0,
        start_date DATE,
        end_date DATE,
        status VARCHAR(40) NOT NULL DEFAULT 'Ativa',
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS name VARCHAR(160),
        ADD COLUMN IF NOT EXISTS channel VARCHAR(60),
        ADD COLUMN IF NOT EXISTS audience TEXT,
        ADD COLUMN IF NOT EXISTS objective TEXT,
        ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(40) NOT NULL DEFAULT 'planejamento',
        ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE,
        ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'Ativa',
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_campaigns_client_id_created_at ON campaigns(client_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_campaigns_client_id_status ON campaigns(client_id, status);

      ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
      ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS campaigns_tenant_isolation ON campaigns;
      CREATE POLICY campaigns_tenant_isolation ON campaigns
        FOR ALL
        USING (app.can_access_client(client_id))
        WITH CHECK (app.can_access_client(client_id));

      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        period DATE NOT NULL,
        leads INTEGER NOT NULL DEFAULT 0,
        revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
        impressions INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (campaign_id, period)
      );

      ALTER TABLE metrics
        ADD COLUMN IF NOT EXISTS period DATE,
        ADD COLUMN IF NOT EXISTS leads INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS impressions INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_metrics_campaign_id_period ON metrics(campaign_id, period DESC);

      ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
      ALTER TABLE metrics FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS metrics_tenant_isolation ON metrics;
      CREATE POLICY metrics_tenant_isolation ON metrics
        FOR ALL
        USING (
          app.is_admin()
          OR EXISTS (
            SELECT 1
            FROM campaigns cam
            WHERE cam.id = metrics.campaign_id
              AND app.can_access_client(cam.client_id)
          )
        )
        WITH CHECK (
          app.is_admin()
          OR EXISTS (
            SELECT 1
            FROM campaigns cam
            WHERE cam.id = metrics.campaign_id
              AND app.can_access_client(cam.client_id)
          )
        );

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

      CREATE TABLE IF NOT EXISTS cost_entries (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(30) NOT NULL DEFAULT 'operacao',
        description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        incurred_on DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE cost_entries
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'operacao',
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS incurred_on DATE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_cost_entries_client_id_created_at ON cost_entries(client_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_cost_entries_category_created_at ON cost_entries(category, created_at DESC);

      ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE cost_entries FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS cost_entries_tenant_isolation ON cost_entries;
      CREATE POLICY cost_entries_tenant_isolation ON cost_entries
        FOR ALL
        USING (app.can_access_client(client_id))
        WITH CHECK (app.can_access_client(client_id));

      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        phone VARCHAR(40) NOT NULL,
        email VARCHAR(160) NOT NULL,
        company VARCHAR(160),
        service VARCHAR(120),
        lead_stage VARCHAR(40) NOT NULL DEFAULT 'Prospeccao',
        estimated_value NUMERIC(12,2) DEFAULT 0,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE contacts
        ADD COLUMN IF NOT EXISTS document VARCHAR(30),
        ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(40),
        ADD COLUMN IF NOT EXISTS source VARCHAR(80),
        ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS birth_date DATE,
        ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(180),
        ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(180),
        ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(120),
        ADD COLUMN IF NOT EXISTS city VARCHAR(120),
        ADD COLUMN IF NOT EXISTS state VARCHAR(80),
        ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
        ADD COLUMN IF NOT EXISTS country VARCHAR(80),
        ADD COLUMN IF NOT EXISTS converted_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(80),
        ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_contacts_owner_id_created_at ON contacts(owner_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to_created_at ON contacts(assigned_to, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_contacts_converted_client_id ON contacts(converted_client_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_lead_stage ON contacts(lead_stage);
      CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to_lead_stage_created_at
        ON contacts(assigned_to, lead_stage, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_contacts_converted_client_id_created_at
        ON contacts(converted_client_id, created_at DESC);

      ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS contacts_tenant_isolation ON contacts;
      CREATE POLICY contacts_tenant_isolation ON contacts
        FOR ALL
        USING (app.can_access_contact(owner_id, assigned_to))
        WITH CHECK (app.can_write_contact(owner_id, assigned_to));

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title VARCHAR(160) NOT NULL,
        report_month DATE NOT NULL,
        summary TEXT NOT NULL,
        file_url TEXT
      );

      ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS title VARCHAR(160),
        ADD COLUMN IF NOT EXISTS report_month DATE,
        ADD COLUMN IF NOT EXISTS summary TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS file_url TEXT;

      CREATE INDEX IF NOT EXISTS idx_reports_client_id_report_month ON reports(client_id, report_month DESC);

      ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE reports FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS reports_tenant_isolation ON reports;
      CREATE POLICY reports_tenant_isolation ON reports
        FOR ALL
        USING (app.can_access_client(client_id))
        WITH CHECK (app.can_access_client(client_id));

      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(160) NOT NULL,
        filename VARCHAR(255),
        url TEXT,
        status VARCHAR(30) NOT NULL,
        feedback TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE materials
        ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS filename VARCHAR(255),
        ADD COLUMN IF NOT EXISTS url TEXT,
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'Rascunho',
        ADD COLUMN IF NOT EXISTS feedback TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_materials_client_id_created_at ON materials(client_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_materials_campaign_id ON materials(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by_created_at ON materials(uploaded_by, created_at DESC);

      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        original_name VARCHAR(255) NOT NULL,
        stored_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(120),
        size INTEGER NOT NULL DEFAULT 0,
        url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE files
        ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS original_name VARCHAR(255) NOT NULL DEFAULT 'arquivo',
        ADD COLUMN IF NOT EXISTS stored_name VARCHAR(255) NOT NULL DEFAULT 'arquivo',
        ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120),
        ADD COLUMN IF NOT EXISTS size INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_files_client_id_created_at ON files(client_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_files_uploaded_by_created_at ON files(uploaded_by, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_files_stored_name ON files(stored_name);

      CREATE TABLE IF NOT EXISTS charges (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(40) NOT NULL DEFAULT 'manual',
        provider_customer_id VARCHAR(120),
        provider_charge_id VARCHAR(120),
        payment_method VARCHAR(30) NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        due_date DATE,
        status VARCHAR(40) NOT NULL DEFAULT 'pending',
        payment_link TEXT,
        boleto_url TEXT,
        boleto_barcode TEXT,
        pix_copy_paste TEXT,
        pix_qr_base64 TEXT,
        external_reference VARCHAR(120),
        external_payload JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
      ALTER TABLE charges FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS charges_tenant_isolation ON charges;
      CREATE POLICY charges_tenant_isolation ON charges
        FOR ALL
        USING (app.can_access_charge_row(client_id, created_by))
        WITH CHECK (app.can_access_charge_row(client_id, created_by));

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

      CREATE TABLE IF NOT EXISTS task_assignees (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (task_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id_task_id ON task_assignees(user_id, task_id);

      INSERT INTO task_assignees (task_id, user_id)
      SELECT tasks.id, tasks.assigned_to
      FROM tasks
      WHERE tasks.assigned_to IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM task_assignees task_assignee
          WHERE task_assignee.task_id = tasks.id
            AND task_assignee.user_id = tasks.assigned_to
        );

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

      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(160) NOT NULL,
        description TEXT,
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        location VARCHAR(160),
        color VARCHAR(24) NOT NULL DEFAULT 'pink',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE calendar_events
        ADD COLUMN IF NOT EXISTS title VARCHAR(160),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS location VARCHAR(160),
        ADD COLUMN IF NOT EXISTS color VARCHAR(24) NOT NULL DEFAULT 'pink',
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

      CREATE INDEX IF NOT EXISTS idx_calendar_events_starts_at
        ON calendar_events(starts_at ASC, ends_at ASC);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by
        ON calendar_events(created_by);

      CREATE TABLE IF NOT EXISTS calendar_event_reminders (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reminder_type VARCHAR(40) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (event_id, user_id, reminder_type)
      );

      CREATE INDEX IF NOT EXISTS idx_calendar_event_reminders_user_id
        ON calendar_event_reminders(user_id, created_at DESC);

      CREATE OR REPLACE FUNCTION app.can_access_upload_row(target_client_id INTEGER, actor_user_id INTEGER)
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT
          app.is_admin()
          OR (app.is_client() AND target_client_id = app.current_client_id())
          OR (
            app.is_internal()
            AND (
              actor_user_id = app.current_user_id()
              OR app.can_access_client(target_client_id)
            )
          );
      $$;

      CREATE OR REPLACE FUNCTION app.can_access_task(
        task_id INTEGER,
        task_client_id INTEGER,
        assigned_user_id INTEGER,
        created_user_id INTEGER
      )
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT
          app.is_admin()
          OR (
            app.is_client()
            AND task_client_id = app.current_client_id()
            AND (
              assigned_user_id IS NOT NULL
              OR EXISTS (
                SELECT 1
                FROM task_assignees task_assignee
                WHERE task_assignee.task_id = task_id
              )
            )
          )
          OR (
            app.is_internal()
            AND (
              assigned_user_id = app.current_user_id()
              OR EXISTS (
                SELECT 1
                FROM task_assignees task_assignee
                WHERE task_assignee.task_id = task_id
                  AND task_assignee.user_id = app.current_user_id()
              )
              OR created_user_id = app.current_user_id()
              OR (
                assigned_user_id IS NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM task_assignees task_assignee
                  WHERE task_assignee.task_id = task_id
                )
              )
              OR app.can_access_client(task_client_id)
            )
          );
      $$;

      DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
      CREATE POLICY tasks_tenant_isolation ON tasks
        USING (app.can_access_task(id, client_id, assigned_to, created_by))
        WITH CHECK (app.can_access_task(id, client_id, assigned_to, created_by));

      ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
      ALTER TABLE materials FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS materials_tenant_isolation ON materials;
      CREATE POLICY materials_tenant_isolation ON materials
        FOR ALL
        USING (app.can_access_upload_row(client_id, uploaded_by))
        WITH CHECK (app.can_access_upload_row(client_id, uploaded_by));

      ALTER TABLE files ENABLE ROW LEVEL SECURITY;
      ALTER TABLE files FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS files_tenant_isolation ON files;
      CREATE POLICY files_tenant_isolation ON files
        FOR ALL
        USING (app.can_access_upload_row(client_id, uploaded_by))
        WITH CHECK (app.can_access_upload_row(client_id, uploaded_by));
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
