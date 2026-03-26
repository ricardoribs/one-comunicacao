const fs = require('fs');
const { Pool } = require('pg');
const env = require('./env');

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
      plan VARCHAR(50) NOT NULL DEFAULT 'starter',
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
      asaas_customer_id VARCHAR(80),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role VARCHAR(32) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      email_verified_at TIMESTAMP,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMP,
      last_login_at TIMESTAMP,
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
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE tasks (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL,
      type VARCHAR(40) NOT NULL DEFAULT 'geral',
      column_name VARCHAR(30) NOT NULL DEFAULT 'backlog',
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      deadline DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

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

  if (env.databaseSslCaFile) {
    if (!fs.existsSync(env.databaseSslCaFile)) {
      let availableSecretFiles = '(nenhum)';

      try {
        const secretFiles = fs.readdirSync('/etc/secrets');
        if (secretFiles.length > 0) {
          availableSecretFiles = secretFiles.join(', ');
        }
      } catch (_error) {
        availableSecretFiles = '(nao foi possivel listar /etc/secrets)';
      }

      throw new Error(
        `DATABASE_SSL_CA_FILE nao encontrado: ${env.databaseSslCaFile}. Arquivos visiveis em /etc/secrets: ${availableSecretFiles}`
      );
    }

    config.ssl = {
      ca: fs.readFileSync(env.databaseSslCaFile, 'utf8'),
      rejectUnauthorized: true,
    };
  }

  return config;
}

module.exports = shouldUsePgMem
  ? createPgMemPool()
  : new Pool(buildPoolConfig());
