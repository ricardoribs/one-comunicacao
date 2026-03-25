exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_clients_manager_id ON clients(manager_id);
    CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
    CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_campaigns_pipeline_stage ON campaigns(pipeline_stage);

    CREATE INDEX IF NOT EXISTS idx_metrics_campaign_id_period ON metrics(campaign_id, period DESC);

    CREATE INDEX IF NOT EXISTS idx_messages_sender_id_created_at ON messages(sender_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver_id_created_at ON messages(receiver_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_context ON messages(context_type, context_id);

    CREATE INDEX IF NOT EXISTS idx_invoices_client_id_created_at ON invoices(client_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

    CREATE INDEX IF NOT EXISTS idx_tasks_client_id_created_at ON tasks(client_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_created_at ON tasks(assigned_to, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_column_name ON tasks(column_name);

    CREATE INDEX IF NOT EXISTS idx_reports_client_id_report_month ON reports(client_id, report_month DESC);

    CREATE INDEX IF NOT EXISTS idx_materials_client_id_created_at ON materials(client_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by_created_at ON materials(uploaded_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_materials_campaign_id ON materials(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);

    CREATE INDEX IF NOT EXISTS idx_files_client_id_created_at ON files(client_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_files_uploaded_by_created_at ON files(uploaded_by, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_contacts_owner_id_created_at ON contacts(owner_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to_created_at ON contacts(assigned_to, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contacts_converted_client_id ON contacts(converted_client_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_lead_stage ON contacts(lead_stage);

    CREATE INDEX IF NOT EXISTS idx_charges_client_id_created_at ON charges(client_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_charges_contact_id_created_at ON charges(contact_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_charges_created_by_created_at ON charges(created_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_charges_status ON charges(status);
    CREATE INDEX IF NOT EXISTS idx_charges_provider_charge_id ON charges(provider_charge_id);

    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_clients_manager_id;
    DROP INDEX IF EXISTS idx_clients_created_at;
    DROP INDEX IF EXISTS idx_users_client_id;
    DROP INDEX IF EXISTS idx_users_role;
    DROP INDEX IF EXISTS idx_users_created_at;
    DROP INDEX IF EXISTS idx_campaigns_client_id;
    DROP INDEX IF EXISTS idx_campaigns_created_at;
    DROP INDEX IF EXISTS idx_campaigns_pipeline_stage;
    DROP INDEX IF EXISTS idx_metrics_campaign_id_period;
    DROP INDEX IF EXISTS idx_messages_sender_id_created_at;
    DROP INDEX IF EXISTS idx_messages_receiver_id_created_at;
    DROP INDEX IF EXISTS idx_messages_context;
    DROP INDEX IF EXISTS idx_invoices_client_id_created_at;
    DROP INDEX IF EXISTS idx_invoices_status;
    DROP INDEX IF EXISTS idx_tasks_client_id_created_at;
    DROP INDEX IF EXISTS idx_tasks_assigned_to_created_at;
    DROP INDEX IF EXISTS idx_tasks_column_name;
    DROP INDEX IF EXISTS idx_reports_client_id_report_month;
    DROP INDEX IF EXISTS idx_materials_client_id_created_at;
    DROP INDEX IF EXISTS idx_materials_uploaded_by_created_at;
    DROP INDEX IF EXISTS idx_materials_campaign_id;
    DROP INDEX IF EXISTS idx_materials_status;
    DROP INDEX IF EXISTS idx_files_client_id_created_at;
    DROP INDEX IF EXISTS idx_files_uploaded_by_created_at;
    DROP INDEX IF EXISTS idx_contacts_owner_id_created_at;
    DROP INDEX IF EXISTS idx_contacts_assigned_to_created_at;
    DROP INDEX IF EXISTS idx_contacts_converted_client_id;
    DROP INDEX IF EXISTS idx_contacts_lead_stage;
    DROP INDEX IF EXISTS idx_charges_client_id_created_at;
    DROP INDEX IF EXISTS idx_charges_contact_id_created_at;
    DROP INDEX IF EXISTS idx_charges_created_by_created_at;
    DROP INDEX IF EXISTS idx_charges_status;
    DROP INDEX IF EXISTS idx_charges_provider_charge_id;
    DROP INDEX IF EXISTS idx_email_verification_tokens_hash;
    DROP INDEX IF EXISTS idx_password_reset_tokens_hash;
  `);
};
