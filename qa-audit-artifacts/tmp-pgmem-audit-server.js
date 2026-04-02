process.env.NODE_ENV = "test";
process.env.PORT = process.env.PORT || "3210";

const bcrypt = require("../backend/node_modules/bcryptjs");
const app = require("../backend/src/app");
const pool = require("../backend/src/config/db");

async function seed() {
  const password = await bcrypt.hash("SenhaForte@123", 12);

  const adminUser = (
    await pool.query(
      `INSERT INTO users (
        name, email, password, role, email_verified_at, is_active,
        phone, job_title, last_login_at, last_seen_at, last_seen_location
      )
      VALUES ($1, $2, $3, 'admin', NOW(), TRUE, $4, $5, NOW(), NOW(), $6)
      RETURNING *`,
      ["Admin ONE", "admin@one.com", password, "(98) 98888-1111", "Direção", "São Luís, Maranhão, Brasil"]
    )
  ).rows[0];

  const gestorUser = (
    await pool.query(
      `INSERT INTO users (
        name, email, password, role, email_verified_at, is_active,
        phone, job_title, last_login_at, last_seen_at, last_seen_location
      )
      VALUES ($1, $2, $3, 'gestor', NOW(), TRUE, $4, $5, NOW(), NOW(), $6)
      RETURNING *`,
      ["Rafael Costa", "gestor@one.com", password, "(98) 98888-2222", "Gestão de Contas", "São Paulo, São Paulo, Brasil"]
    )
  ).rows[0];

  const designerUser = (
    await pool.query(
      `INSERT INTO users (
        name, email, password, role, email_verified_at, is_active,
        phone, job_title, last_login_at, last_seen_at, last_seen_location
      )
      VALUES ($1, $2, $3, 'designer', NOW(), TRUE, $4, $5, NOW(), NOW(), $6)
      RETURNING *`,
      ["Ana Silva", "designer@one.com", password, "(98) 98888-3333", "Direção de Arte", "Fortaleza, Ceará, Brasil"]
    )
  ).rows[0];

  const comercialUser = (
    await pool.query(
      `INSERT INTO users (
        name, email, password, role, email_verified_at, is_active,
        phone, job_title, last_login_at, last_seen_at, last_seen_location
      )
      VALUES ($1, $2, $3, 'comercial', NOW(), TRUE, $4, $5, NOW(), NOW(), $6)
      RETURNING *`,
      ["Julia Pereira", "comercial@one.com", password, "(98) 98888-4444", "Comercial", "Belém, Pará, Brasil"]
    )
  ).rows[0];

  const devUser = (
    await pool.query(
      `INSERT INTO users (
        name, email, password, role, email_verified_at, is_active,
        phone, job_title, last_login_at, last_seen_at, last_seen_location
      )
      VALUES ($1, $2, $3, 'dev', NOW(), TRUE, $4, $5, NOW(), NOW(), $6)
      RETURNING *`,
      ["Lucas Melo", "dev@one.com", password, "(98) 98888-5555", "Desenvolvimento", "Recife, Pernambuco, Brasil"]
    )
  ).rows[0];

  const clients = (
    await Promise.all([
      pool.query(
        `INSERT INTO clients (
          name, company, plan, mrr, segment, manager_id, started_at,
          contact_name, contact_email, contact_phone, brand_manual
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          "Clínica Renovar",
          "Clínica Renovar LTDA",
          "growth",
          7200,
          "Saúde",
          gestorUser.id,
          "2025-11-01",
          "Dra. Helena Paes",
          "helena@renovar.com",
          "(98) 4002-1111",
          "Tom de voz acolhedor, foco em autoridade médica e clareza sobre agendamentos."
        ]
      ),
      pool.query(
        `INSERT INTO clients (
          name, company, plan, mrr, segment, manager_id, started_at,
          contact_name, contact_email, contact_phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          "Moda Única",
          "Moda Única Boutique",
          "starter",
          3500,
          "Varejo",
          comercialUser.id,
          "2026-01-15",
          "Marcela Torres",
          "marcela@modaunica.com",
          "(11) 3000-2222"
        ]
      ),
      pool.query(
        `INSERT INTO clients (
          name, company, plan, mrr, segment, manager_id, started_at,
          contact_name, contact_email, contact_phone, brand_manual
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          "Instituto Saber+",
          "Instituto Saber Mais",
          "scale",
          8900,
          "Educação",
          gestorUser.id,
          "2025-08-05",
          "Fábio Oliveira",
          "fabio@sabermais.com",
          "(31) 3000-3333",
          "Comunicação direta, foco em captação e prova social."
        ]
      ),
      pool.query(
        `INSERT INTO clients (
          name, company, plan, mrr, segment, manager_id, started_at,
          contact_name, contact_email, contact_phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          "Bella Vida",
          "Bella Vida Estética",
          "sob-demanda",
          0,
          "Estética",
          comercialUser.id,
          "2026-02-10",
          "Camila Rocha",
          "camila@bellavida.com",
          "(21) 3000-4444"
        ]
      )
    ])
  ).map((result) => result.rows[0]);

  const [renovar, moda, saber, bella] = clients;

  const campaigns = (
    await Promise.all([
      pool.query(
        `INSERT INTO campaigns (
          client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [renovar.id, "Agendamentos Saúde 2026", "Meta Ads", "Adultos 25-55", "Gerar agendamentos", "otimizacao", 6500, "2026-03-01", "Ativa"]
      ),
      pool.query(
        `INSERT INTO campaigns (
          client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [moda.id, "Coleção Outono", "Instagram + Meta", "Mulheres 20-40", "Venda da coleção", "execucao", 4200, "2026-03-05", "Ativa"]
      ),
      pool.query(
        `INSERT INTO campaigns (
          client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [saber.id, "Captação de Matrículas", "Google Ads", "Pais e responsáveis", "Leads qualificados", "escala", 7800, "2026-02-18", "Ativa"]
      ),
      pool.query(
        `INSERT INTO campaigns (
          client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [bella.id, "Lançamento Harmonização", "TikTok Ads", "Mulheres 24-45", "Avaliações presenciais", "planejamento", 2800, "2026-03-12", "Pausada"]
      )
    ])
  ).map((result) => result.rows[0]);

  const [campRenovar, campModa, campSaber, campBella] = campaigns;

  await Promise.all([
    pool.query(
      `INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [campRenovar.id, "2026-03-01", 124, 23200, 145000, 6200]
    ),
    pool.query(
      `INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [campModa.id, "2026-03-01", 86, 14800, 98000, 4100]
    ),
    pool.query(
      `INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [campSaber.id, "2026-03-01", 177, 35600, 188000, 8700]
    ),
    pool.query(
      `INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [campBella.id, "2026-03-01", 32, 5400, 64000, 1700]
    )
  ]);

  await Promise.all([
    pool.query(
      `INSERT INTO reports (client_id, title, report_month, summary, file_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [renovar.id, "Relatório Mensal de Performance", "2026-03-01", "Crescimento consistente de leads e redução do CPL.", "/uploads/demo-relatorio-renovar.pdf"]
    ),
    pool.query(
      `INSERT INTO reports (client_id, title, report_month, summary, file_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [moda.id, "Relatório de Conteúdo e Vendas", "2026-03-01", "A coleção de outono elevou vendas e ticket médio.", "/uploads/demo-relatorio-moda.pdf"]
    ),
    pool.query(
      `INSERT INTO reports (client_id, title, report_month, summary, file_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [saber.id, "Relatório de Captação", "2026-03-01", "Aumento de volume com custo por lead controlado.", "/uploads/demo-relatorio-saber.pdf"]
    )
  ]);

  await Promise.all([
    pool.query(
      `INSERT INTO materials (client_id, campaign_id, uploaded_by, title, filename, url, status, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [renovar.id, campRenovar.id, designerUser.id, "Carrossel Março - Procedimentos", "material-renovar.jpg", "/uploads/material-renovar.jpg", "Pendente", null]
    ),
    pool.query(
      `INSERT INTO materials (client_id, campaign_id, uploaded_by, title, filename, url, status, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [moda.id, campModa.id, designerUser.id, "Lookbook Outono", "lookbook-moda.jpg", "/uploads/lookbook-moda.jpg", "Revisao", "Ajustar CTA final."]
    ),
    pool.query(
      `INSERT INTO materials (client_id, campaign_id, uploaded_by, title, filename, url, status, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [saber.id, campSaber.id, designerUser.id, "Criativos matrícula abril", "criativos-saber.zip", "/uploads/criativos-saber.zip", "Aprovado", null]
    )
  ]);

  await Promise.all([
    pool.query(
      `INSERT INTO files (client_id, uploaded_by, original_name, stored_name, mime_type, size, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [renovar.id, designerUser.id, "apresentacao-renovar.pdf", "apresentacao-renovar.pdf", "application/pdf", 418000, "/uploads/apresentacao-renovar.pdf"]
    ),
    pool.query(
      `INSERT INTO files (client_id, uploaded_by, original_name, stored_name, mime_type, size, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [moda.id, designerUser.id, "guia-vitrine-marco.pdf", "guia-vitrine-marco.pdf", "application/pdf", 292000, "/uploads/guia-vitrine-marco.pdf"]
    ),
    pool.query(
      `INSERT INTO files (client_id, uploaded_by, original_name, stored_name, mime_type, size, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [saber.id, devUser.id, "landing-matriculas-v2.zip", "landing-matriculas-v2.zip", "application/zip", 984000, "/uploads/landing-matriculas-v2.zip"]
    )
  ]);

  await Promise.all([
    pool.query(
      `INSERT INTO invoices (client_id, amount, status, due_date, created_at)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '20 day')`,
      [renovar.id, 7200, "Pago", "2026-03-10"]
    ),
    pool.query(
      `INSERT INTO invoices (client_id, amount, status, due_date, created_at)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '10 day')`,
      [moda.id, 3500, "Em aberto", "2026-03-25"]
    ),
    pool.query(
      `INSERT INTO invoices (client_id, amount, status, due_date, created_at)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '5 day')`,
      [saber.id, 8900, "Em aberto", "2026-03-28"]
    )
  ]);

  await Promise.all([
    pool.query(
      `INSERT INTO cost_entries (client_id, created_by, category, description, amount, incurred_on, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '15 day')`,
      [renovar.id, adminUser.id, "midia", "Investimento em mídia Meta", 3200, "2026-03-05"]
    ),
    pool.query(
      `INSERT INTO cost_entries (client_id, created_by, category, description, amount, incurred_on, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '12 day')`,
      [moda.id, adminUser.id, "producao", "Sessão de fotos de catálogo", 1200, "2026-03-08"]
    ),
    pool.query(
      `INSERT INTO cost_entries (client_id, created_by, category, description, amount, incurred_on, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '8 day')`,
      [saber.id, adminUser.id, "operacao", "Suporte e ajustes de landing", 1450, "2026-03-11"]
    )
  ]);

  const contacts = (
    await Promise.all([
      pool.query(
        `INSERT INTO contacts (
          name, phone, email, company, service, lead_stage, estimated_value, message,
          owner_id, assigned_to, created_at, last_contact_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '12 day', NOW() - INTERVAL '2 day')
        RETURNING *`,
        ["Mariana Costa", "999999999", "mariana@lead.com", "Clin Pharma", "Tráfego Pago", "Proposta", 5000, "Preciso de captação para abril.", comercialUser.id, comercialUser.id]
      ),
      pool.query(
        `INSERT INTO contacts (
          name, phone, email, company, service, lead_stage, estimated_value, message,
          owner_id, assigned_to, created_at, last_contact_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '10 day', NOW() - INTERVAL '1 day')
        RETURNING *`,
        ["Paulo Nogueira", "989898989", "paulo@lead.com", "Escola Horizonte", "Site", "Negociacao", 9200, "Quero landing page e mídia.", comercialUser.id, gestorUser.id]
      ),
      pool.query(
        `INSERT INTO contacts (
          name, phone, email, company, service, lead_stage, estimated_value, message,
          owner_id, assigned_to, created_at, last_contact_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '8 day', NOW() - INTERVAL '3 day')
        RETURNING *`,
        ["Larissa Souza", "979797979", "larissa@lead.com", "Bella Shape", "Branding", "Contato feito", 3800, "Preciso estruturar posicionamento e criativos.", comercialUser.id, designerUser.id]
      ),
      pool.query(
        `INSERT INTO contacts (
          name, phone, email, company, service, lead_stage, estimated_value, message,
          owner_id, assigned_to, created_at, last_contact_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '16 day', NOW() - INTERVAL '5 day')
        RETURNING *`,
        ["Bruno Azevedo", "969696969", "bruno@lead.com", "Academia Pulse", "Tráfego Pago", "Fechado", 8400, "Contrato aprovado.", comercialUser.id, gestorUser.id]
      )
    ])
  ).map((result) => result.rows[0]);

  await Promise.all([
    pool.query(
      `INSERT INTO charges (
        client_id, contact_id, created_by, provider, payment_method, description, amount, status,
        due_date, payment_link, external_reference, created_at, updated_at
      )
      VALUES ($1, $2, $3, 'manual', 'link', $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '9 day', NOW() - INTERVAL '2 day')`,
      [renovar.id, null, adminUser.id, "Mensalidade Março", 7200, "RECEIVED", "2026-03-10", "https://pay.one.local/renovar-marco", "RENOVAR-0326"]
    ),
    pool.query(
      `INSERT INTO charges (
        client_id, contact_id, created_by, provider, payment_method, description, amount, status,
        due_date, boleto_url, external_reference, created_at, updated_at
      )
      VALUES ($1, $2, $3, 'manual', 'boleto', $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '7 day', NOW() - INTERVAL '1 day')`,
      [moda.id, null, adminUser.id, "Mensalidade Março", 3500, "PENDING", "2026-03-25", "https://pay.one.local/moda-boleto", "MODA-0326"]
    ),
    pool.query(
      `INSERT INTO charges (
        client_id, contact_id, created_by, provider, payment_method, description, amount, status,
        due_date, pix_copy_paste, external_reference, created_at, updated_at
      )
      VALUES ($1, $2, $3, 'manual', 'pix', $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '4 day', NOW() - INTERVAL '1 day')`,
      [saber.id, null, adminUser.id, "Mensalidade Março", 8900, "PENDING", "2026-03-28", "00020126580014BR.GOV.BCB.PIX0136abc123", "SABER-0326"]
    ),
    pool.query(
      `INSERT INTO charges (
        client_id, contact_id, created_by, provider, payment_method, description, amount, status,
        due_date, payment_link, external_reference, created_at, updated_at
      )
      VALUES ($1, $2, $3, 'manual', 'link', $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '3 day', NOW() - INTERVAL '1 day')`,
      [null, contacts[1].id, adminUser.id, "Proposta avulsa", 2200, "PENDING", "2026-04-06", "https://pay.one.local/pulse-proposta", "LEAD-PULSE-0406"]
    )
  ]);

  await Promise.all([
    pool.query(
      `INSERT INTO client_integrations (
        client_id, provider_key, status, external_account_id, external_property_id,
        connected_at, last_sync_at, last_success_at, created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '30 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', $6, $7, NOW() - INTERVAL '30 day', NOW() - INTERVAL '1 day')`,
      [renovar.id, "meta_ads", "connected", "Conta 1190", "Pixel principal", adminUser.id, adminUser.id]
    ),
    pool.query(
      `INSERT INTO client_integrations (
        client_id, provider_key, status, external_account_id, external_property_id,
        connected_at, last_sync_at, last_success_at, created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '18 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', $6, $7, NOW() - INTERVAL '18 day', NOW() - INTERVAL '1 day')`,
      [saber.id, "google_ads", "connected", "Conta EDU-44", "Conversões Matrícula", adminUser.id, gestorUser.id]
    ),
    pool.query(
      `INSERT INTO client_integrations (
        client_id, provider_key, status, external_account_id, external_property_id,
        last_sync_at, created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '3 day', $6, $7, NOW() - INTERVAL '7 day', NOW() - INTERVAL '3 day')`,
      [moda.id, "ga4", "configuring", "GA4-7812", null, adminUser.id, devUser.id]
    ),
    pool.query(
      `INSERT INTO client_integrations (
        client_id, provider_key, status, external_account_id, external_property_id,
        last_sync_at, last_error, created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '5 day', $6, $7, $8, NOW() - INTERVAL '10 day', NOW() - INTERVAL '5 day')`,
      [bella.id, "meta_pixel", "error", "Pixel BV-09", "Site institucional", "Token expirado", adminUser.id, devUser.id]
    )
  ]);

  const taskRows = (
    await Promise.all([
      pool.query(
        `INSERT INTO tasks (
          client_id, created_by, assigned_to, status, type, column_name, title, description, deadline, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '5 day')
        RETURNING *`,
        [renovar.id, adminUser.id, gestorUser.id, "Em progresso", "trafego", "doing", "Otimizar campanha de captação", "Ajustar segmentação e criativos da campanha principal.", "2026-04-04"]
      ),
      pool.query(
        `INSERT INTO tasks (
          client_id, created_by, assigned_to, status, type, column_name, title, description, deadline, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '7 day')
        RETURNING *`,
        [moda.id, adminUser.id, designerUser.id, "Backlog", "design", "backlog", "Planejar criativos de abril", "Subir novas ofertas e distribuição visual por canal.", "2026-04-07"]
      ),
      pool.query(
        `INSERT INTO tasks (
          client_id, created_by, assigned_to, status, type, column_name, title, description, deadline, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '12 day')
        RETURNING *`,
        [saber.id, adminUser.id, devUser.id, "Concluido", "landing-page", "done", "Revisar landing page de matrícula", "Ajustes finais antes do pico de mídia.", "2026-03-15"]
      ),
      pool.query(
        `INSERT INTO tasks (
          client_id, created_by, assigned_to, status, type, column_name, title, description, deadline, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '3 day')
        RETURNING *`,
        [bella.id, adminUser.id, designerUser.id, "A Fazer", "copy", "todo", "Escrever sequência de WhatsApp", "Preparar abordagem inicial para avaliação estética.", "2026-04-05"]
      )
    ])
  ).map((result) => result.rows[0]);

  await Promise.all(
    taskRows.map((task, index) =>
      pool.query(
        `INSERT INTO task_assignees (task_id, user_id, created_at) VALUES ($1, $2, NOW() - INTERVAL '${index + 1} day')`,
        [task.id, task.assigned_to]
      )
    )
  );

  await Promise.all([
    pool.query(
      `INSERT INTO calendar_events (
        title, description, starts_at, ends_at, location, color, created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '4 day', NOW() - INTERVAL '2 day')`,
      ["Reunião semanal de operação", "Definição de prioridades da semana.", "2026-04-03 09:00:00", "2026-04-03 10:00:00", "Google Meet", "pink", adminUser.id, adminUser.id]
    ),
    pool.query(
      `INSERT INTO calendar_events (
        title, description, starts_at, ends_at, location, color, created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '4 day', NOW() - INTERVAL '1 day')`,
      ["Apresentação de resultados para Clínica Renovar", "Revisão de performance e próximos passos.", "2026-04-04 15:00:00", "2026-04-04 16:00:00", "Sala 2", "blue", gestorUser.id, gestorUser.id]
    )
  ]);

  await Promise.all([
    pool.query(
      `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '2 hour')`,
      [adminUser.id, "task_assigned", "Nova tarefa atribuída", "Planejar criativos de abril foi atribuído à Ana.", "task", taskRows[1].id]
    ),
    pool.query(
      `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 hour')`,
      [adminUser.id, "charge_due", "Cobrança próxima do vencimento", "Mensalidade de Moda Única vence em breve.", "charge", 2]
    )
  ]);

  await pool.query(
    `INSERT INTO user_daily_checklists (user_id, checklist_date, items, completed_at, created_at, updated_at)
     VALUES ($1, CURRENT_DATE, $2::jsonb, NOW(), NOW(), NOW())`,
    [
      adminUser.id,
      JSON.stringify([
        { id: "check-1", label: "Validar calendário da equipe", done: true },
        { id: "check-2", label: "Conferir campanhas com baixo CTR", done: false },
        { id: "check-3", label: "Revisar cobranças pendentes", done: false }
      ])
    ]
  );
}

async function main() {
  await seed();
  const server = app.listen(Number(process.env.PORT), () => {
    console.log(`AUDIT_SERVER_READY http://localhost:${process.env.PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      try {
        await pool.end();
      } catch (_error) {
        // ignore
      }
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
