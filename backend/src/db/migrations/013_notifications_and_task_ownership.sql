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
   END;

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
