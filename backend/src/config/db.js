const { Pool } = require('pg');
const env = require('./env');
const { buildDatabaseSslConfig } = require('../utils/databaseSsl');

function createPgMemPool() {
  const { newDb } = require('pg-mem');

  const memoryDb = newDb({ autoCreateForeignKeyIndices: true });
  const settings = new Map();

  memoryDb.public.registerFunction({
    name: 'set_config',
    args: ['text', 'text', 'bool'],
    returns: 'text',
    implementation(name, value) {
      settings.set(String(name), value == null ? '' : String(value));
      return value == null ? '' : String(value);
    },
  });

  memoryDb.public.registerFunction({
    name: 'current_setting',
    args: ['text'],
    returns: 'text',
    implementation(name) {
      return settings.get(String(name)) || '';
    },
  });

  memoryDb.public.registerFunction({
    name: 'current_setting',
    args: ['text', 'bool'],
    returns: 'text',
    implementation(name, missingOk) {
      const value = settings.get(String(name));
      if (value !== undefined) {
        return value;
      }

      return missingOk ? '' : '';
    },
  });

  memoryDb.public.none(`
    CREATE TABLE clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      plan VARCHAR(120) NOT NULL DEFAULT 'One Start',
      mrr NUMERIC(12, 2) NOT NULL DEFAULT 0,
      segment VARCHAR(120),
      manager_id INTEGER,
      started_at DATE,
      legal_document VARCHAR(30),
      contact_name VARCHAR(120),
      contact_email VARCHAR(160),
      contact_phone VARCHAR(40),
      billing_email VARCHAR(160),
      address_line1 VARCHAR(180),
      address_line2 VARCHAR(180),
      neighborhood VARCHAR(120),
      city VARCHAR(120),
      state VARCHAR(80),
      zip_code VARCHAR(20),
      country VARCHAR(80),
      notes TEXT,
      brand_manual TEXT,
      asaas_customer_id VARCHAR(80),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(40),
      job_title VARCHAR(120),
      avatar_url VARCHAR(500),
      password TEXT NOT NULL,
      role VARCHAR(32) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      session_version INTEGER NOT NULL DEFAULT 0,
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      email_verified_at TIMESTAMP,
      mfa_totp_secret_encrypted TEXT,
      mfa_totp_pending_secret_encrypted TEXT,
      mfa_enabled_at TIMESTAMP,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMP,
      last_login_at TIMESTAMP,
      last_seen_at TIMESTAMP,
      last_seen_ip VARCHAR(64),
      last_seen_location VARCHAR(160),
      notify_task_assigned BOOLEAN NOT NULL DEFAULT TRUE,
      notify_task_completed BOOLEAN NOT NULL DEFAULT TRUE,
      notify_calendar_24h BOOLEAN NOT NULL DEFAULT TRUE,
      notify_calendar_1h BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE clients
      ADD CONSTRAINT fk_clients_manager
      FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

    CREATE TABLE refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMP,
      replaced_by_token_hash TEXT,
      created_by_ip VARCHAR(64),
      revoked_by_ip VARCHAR(64),
      user_agent TEXT
    );

    CREATE TABLE revoked_access_tokens (
      id SERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_by_ip VARCHAR(80)
    );

    CREATE TABLE email_verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE invoices (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL,
      due_date DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE cost_entries (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(30) NOT NULL DEFAULT 'operacao',
      description TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      incurred_on DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE campaigns (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL,
      channel VARCHAR(60) NOT NULL,
      audience TEXT,
      objective TEXT,
      pipeline_stage VARCHAR(40) NOT NULL DEFAULT 'planejamento',
      budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
      start_date DATE,
      end_date DATE,
      status VARCHAR(40) NOT NULL DEFAULT 'Ativa',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE metrics (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      period DATE NOT NULL,
      leads INTEGER NOT NULL DEFAULT 0,
      revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (campaign_id, period)
    );

    CREATE TABLE messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      context_type VARCHAR(40) NOT NULL DEFAULT 'general',
      context_id INTEGER,
      content TEXT NOT NULL,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE tasks (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL,
      type VARCHAR(40) NOT NULL DEFAULT 'geral',
      column_name VARCHAR(30) NOT NULL DEFAULT 'backlog',
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      deadline DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE task_assignees (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (task_id, user_id)
    );

    CREATE TABLE notifications (
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

    CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX idx_notifications_user_read_at ON notifications(user_id, read_at, created_at DESC);

    CREATE TABLE calendar_events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      description TEXT,
      starts_at TIMESTAMP NOT NULL,
      ends_at TIMESTAMP NOT NULL,
      location VARCHAR(160),
      color VARCHAR(24) NOT NULL DEFAULT 'pink',
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      visibility VARCHAR(20) NOT NULL DEFAULT 'team',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT calendar_events_visibility_check CHECK (visibility IN ('team', 'client')),
      CONSTRAINT calendar_events_visibility_client_check CHECK (
        (visibility = 'team' AND client_id IS NULL)
        OR (visibility = 'client' AND client_id IS NOT NULL)
      )
    );

    CREATE INDEX idx_calendar_events_starts_at ON calendar_events(starts_at ASC, ends_at ASC);
    CREATE INDEX idx_calendar_events_client_id_starts_at ON calendar_events(client_id, starts_at ASC, ends_at ASC);
    CREATE INDEX idx_calendar_events_visibility_starts_at ON calendar_events(visibility, starts_at ASC, ends_at ASC);

    CREATE TABLE calendar_event_reminders (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reminder_type VARCHAR(40) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (event_id, user_id, reminder_type)
    );

    CREATE INDEX idx_calendar_event_reminders_user_id
      ON calendar_event_reminders(user_id, created_at DESC);

    CREATE TABLE reports (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title VARCHAR(160) NOT NULL,
      report_month DATE NOT NULL,
      summary TEXT NOT NULL,
      file_url TEXT
    );

    CREATE TABLE materials (
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

    CREATE TABLE files (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(120),
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE contacts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      whatsapp VARCHAR(40),
      email VARCHAR(160) NOT NULL,
      company VARCHAR(160),
      service VARCHAR(120),
      source VARCHAR(80),
      document VARCHAR(30),
      lead_stage VARCHAR(40) NOT NULL DEFAULT 'Prospeccao',
      estimated_value NUMERIC(12, 2) DEFAULT 0,
      message TEXT,
      notes TEXT,
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      birth_date DATE,
      address_line1 VARCHAR(180),
      address_line2 VARCHAR(180),
      neighborhood VARCHAR(120),
      city VARCHAR(120),
      state VARCHAR(80),
      zip_code VARCHAR(20),
      country VARCHAR(80),
      converted_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      asaas_customer_id VARCHAR(80),
      last_contact_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE charges (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(40) NOT NULL DEFAULT 'manual',
      provider_customer_id VARCHAR(120),
      provider_charge_id VARCHAR(120),
      payment_method VARCHAR(30) NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
      due_date DATE,
      payment_link TEXT,
      boleto_url TEXT,
      boleto_barcode TEXT,
      pix_copy_paste TEXT,
      pix_qr_base64 TEXT,
      external_reference VARCHAR(120),
      external_payload JSONB,
      idempotency_key VARCHAR(120) UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE client_integrations (
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
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, provider_key)
    );

    CREATE TABLE user_daily_checklists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checklist_date DATE NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, checklist_date)
    );
  `);

  const adapter = memoryDb.adapters.createPg();
  const pool = new adapter.Pool();
  pool.__isPgMem = true;

  return pool;
}

const shouldUsePgMem = env.nodeEnv === 'test' && !process.env.DATABASE_URL;

function buildPoolConfig() {
  const config = {
    max: env.dbPoolMax,
    connectionTimeoutMillis: env.dbConnectionTimeoutMs,
    idleTimeoutMillis: env.dbIdleTimeoutMs,
    query_timeout: env.dbQueryTimeoutMs,
    statement_timeout: env.dbStatementTimeoutMs,
  };

  if (env.databaseHost && env.databaseUser && env.databaseName) {
    config.host = env.databaseHost;
    config.port = env.databasePort;
    config.database = env.databaseName;
    config.user = env.databaseUser;
    config.password = env.databasePassword;
  } else {
    config.connectionString = env.databaseUrl;
  }

  const sslConfig = buildDatabaseSslConfig({
    required: env.databaseSslRequired,
    caFilePath: env.databaseSslCaFile,
    caPem: env.databaseSslCaPem,
  });
  if (sslConfig) {
    config.ssl = sslConfig;
  }

  return config;
}

module.exports = shouldUsePgMem
  ? createPgMemPool()
  : new Pool(buildPoolConfig());
