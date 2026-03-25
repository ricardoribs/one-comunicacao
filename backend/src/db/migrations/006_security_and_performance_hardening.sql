CREATE INDEX IF NOT EXISTS idx_clients_manager_id_created_at
  ON clients(manager_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_client_id_status_created_at
  ON campaigns(client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_status_assigned_to_created_at
  ON tasks(status, assigned_to, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_client_id_status_created_at
  ON tasks(client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to_lead_stage_created_at
  ON contacts(assigned_to, lead_stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_converted_client_id_created_at
  ON contacts(converted_client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id_status_created_at
  ON invoices(client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_materials_client_id_status_created_at
  ON materials(client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_campaign_id_created_at
  ON metrics(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_charges_client_id_status_created_at
  ON charges(client_id, status, created_at DESC);
