DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS cost_entries CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  company VARCHAR(160) NOT NULL,
  plan VARCHAR(120) NOT NULL DEFAULT 'One Start',
  mrr NUMERIC(12,2) NOT NULL DEFAULT 0,
  segment VARCHAR(80),
  manager_id INTEGER,
  started_at DATE,
  brand_manual TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(40),
  job_title VARCHAR(120),
  avatar_url VARCHAR(500),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'admin', 'designer', 'gestor', 'comercial', 'dev')),
  is_active BOOLEAN DEFAULT TRUE,
  notify_task_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  notify_task_completed BOOLEAN NOT NULL DEFAULT TRUE,
  notify_calendar_24h BOOLEAN NOT NULL DEFAULT TRUE,
  notify_calendar_1h BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE clients
  ADD CONSTRAINT fk_clients_manager
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE campaigns (
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

CREATE TABLE metrics (
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

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_type VARCHAR(40) NOT NULL DEFAULT 'general',
  context_id INTEGER,
  content TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL,
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cost_entries (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL DEFAULT 'operacao',
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  incurred_on DATE,
  created_at TIMESTAMP DEFAULT NOW()
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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_assignees (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
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
  created_at TIMESTAMP DEFAULT NOW()
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
  status VARCHAR(30) NOT NULL CHECK (status IN ('Pendente', 'Aprovado', 'Revisao', 'Rejeitado')),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contacts (
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
