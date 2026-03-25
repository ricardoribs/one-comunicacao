exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS legal_document VARCHAR(30),
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(120),
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(160),
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(40),
      ADD COLUMN IF NOT EXISTS billing_email VARCHAR(160),
      ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(180),
      ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(180),
      ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(120),
      ADD COLUMN IF NOT EXISTS city VARCHAR(120),
      ADD COLUMN IF NOT EXISTS state VARCHAR(80),
      ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS country VARCHAR(80),
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(80);

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
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS charges CASCADE;

    ALTER TABLE contacts
      DROP COLUMN IF EXISTS document,
      DROP COLUMN IF EXISTS whatsapp,
      DROP COLUMN IF EXISTS source,
      DROP COLUMN IF EXISTS owner_id,
      DROP COLUMN IF EXISTS assigned_to,
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS birth_date,
      DROP COLUMN IF EXISTS address_line1,
      DROP COLUMN IF EXISTS address_line2,
      DROP COLUMN IF EXISTS neighborhood,
      DROP COLUMN IF EXISTS city,
      DROP COLUMN IF EXISTS state,
      DROP COLUMN IF EXISTS zip_code,
      DROP COLUMN IF EXISTS country,
      DROP COLUMN IF EXISTS converted_client_id,
      DROP COLUMN IF EXISTS asaas_customer_id,
      DROP COLUMN IF EXISTS last_contact_at,
      DROP COLUMN IF EXISTS updated_at;

    ALTER TABLE clients
      DROP COLUMN IF EXISTS legal_document,
      DROP COLUMN IF EXISTS contact_name,
      DROP COLUMN IF EXISTS contact_email,
      DROP COLUMN IF EXISTS contact_phone,
      DROP COLUMN IF EXISTS billing_email,
      DROP COLUMN IF EXISTS address_line1,
      DROP COLUMN IF EXISTS address_line2,
      DROP COLUMN IF EXISTS neighborhood,
      DROP COLUMN IF EXISTS city,
      DROP COLUMN IF EXISTS state,
      DROP COLUMN IF EXISTS zip_code,
      DROP COLUMN IF EXISTS country,
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS asaas_customer_id;
  `);
};
