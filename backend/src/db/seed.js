const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const env = require('../config/env');
const { applyTenantContext } = require('./tenantContext');

function generatePassword(label) {
  return `${label}-${crypto.randomBytes(8).toString('hex')}!Aa1`;
}

async function run() {
  if (env.isProduction) {
    throw new Error('db:seed esta bloqueado em producao. Use um bootstrap seguro para o primeiro administrador.');
  }

  if (env.nodeEnv !== 'development' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('db:seed cria usuarios demo e so pode rodar em development ou com ALLOW_DEMO_SEED=true.');
  }

  const rawPasswords = {
    admin: generatePassword('admin'),
    gestor: generatePassword('gestor'),
    designer: generatePassword('designer'),
    comercial: generatePassword('comercial'),
    dev: generatePassword('dev'),
  };

  const passwords = {
    admin: await bcrypt.hash(rawPasswords.admin, 12),
    gestor: await bcrypt.hash(rawPasswords.gestor, 12),
    designer: await bcrypt.hash(rawPasswords.designer, 12),
    comercial: await bcrypt.hash(rawPasswords.comercial, 12),
    dev: await bcrypt.hash(rawPasswords.dev, 12),
  };

  const client = await pool.connect();
  const originalQuery = pool.query.bind(pool);
  pool.query = client.query.bind(client);

  try {
    await client.query('BEGIN');
    await applyTenantContext(client, { role: 'admin' });

    await pool.query(
      `INSERT INTO users (name, email, password, role, email_verified_at)
     VALUES ($1, $2, $3, 'admin', NOW())`,
      ['Demo Admin', 'admin@example.test', passwords.admin]
    );

    const gestorUser = (
      await pool.query(
        `INSERT INTO users (name, email, password, role, email_verified_at)
       VALUES ($1, $2, $3, 'gestor', NOW())
       RETURNING *`,
        ['Demo Manager', 'manager@example.test', passwords.gestor]
      )
    ).rows[0];

    const designerUser = (
      await pool.query(
        `INSERT INTO users (name, email, password, role, email_verified_at)
       VALUES ($1, $2, $3, 'designer', NOW())
       RETURNING *`,
        ['Demo Designer', 'designer@example.test', passwords.designer]
      )
    ).rows[0];

    const comercialUser = (
      await pool.query(
        `INSERT INTO users (name, email, password, role, email_verified_at)
       VALUES ($1, $2, $3, 'comercial', NOW())
       RETURNING *`,
        ['Demo Sales', 'sales@example.test', passwords.comercial]
      )
    ).rows[0];

    const devUser = (
      await pool.query(
        `INSERT INTO users (name, email, password, role, email_verified_at)
       VALUES ($1, $2, $3, 'dev', NOW())
       RETURNING *`,
        ['Demo Developer', 'developer@example.test', passwords.dev]
      )
    ).rows[0];

    const clientRows = await Promise.all([
      pool.query(
        `INSERT INTO clients (name, company, plan, mrr, segment, manager_id, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['Demo Health Clinic', 'Demo Health Clinic LTDA', 'growth', 7200, 'Saúde', gestorUser.id, '2025-11-01']
      ),
      pool.query(
        `INSERT INTO clients (name, company, plan, mrr, segment, manager_id, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['Demo Retail Store', 'Demo Retail Store Boutique', 'starter', 3500, 'Varejo', comercialUser.id, '2026-01-15']
      ),
      pool.query(
        `INSERT INTO clients (name, company, plan, mrr, segment, manager_id, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['Demo Learning Institute', 'Demo Learning Institute Ltda', 'scale', 8900, 'Educação', gestorUser.id, '2025-08-05']
      ),
    ]);

    const [renovar, moda, saber] = clientRows.map((result) => result.rows[0]);

    const campaignRows = await Promise.all([
      pool.query(
        `INSERT INTO campaigns (client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
        [
          renovar.id,
          'Agendamentos Saúde 2026',
          'Meta Ads',
          'Adultos 25-55',
          'Gerar agendamentos',
          'otimizacao',
          6500,
          '2026-03-01',
          'Ativa',
        ]
      ),
      pool.query(
        `INSERT INTO campaigns (client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
        [
          moda.id,
          'Coleção Outono',
          'Instagram + Meta',
          'Mulheres 20-40',
          'Venda da coleção',
          'execucao',
          4200,
          '2026-03-05',
          'Ativa',
        ]
      ),
      pool.query(
        `INSERT INTO campaigns (client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
        [
          saber.id,
          'Captação de Matrículas',
          'Google Ads',
          'Pais e responsáveis',
          'Leads qualificados',
          'escala',
          7800,
          '2026-02-18',
          'Ativa',
        ]
      ),
    ]);

    const [campRenovar, campModa, campSaber] = campaignRows.map((result) => result.rows[0]);

    await Promise.all([
      pool.query(
        'INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks) VALUES ($1, $2, $3, $4, $5, $6)',
        [campRenovar.id, '2026-03-01', 124, 23200, 145000, 6200]
      ),
      pool.query(
        'INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks) VALUES ($1, $2, $3, $4, $5, $6)',
        [campModa.id, '2026-03-01', 86, 14800, 98000, 4100]
      ),
      pool.query(
        'INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks) VALUES ($1, $2, $3, $4, $5, $6)',
        [campSaber.id, '2026-03-01', 177, 35600, 188000, 8700]
      ),
    ]);

    await Promise.all([
      pool.query(
        'INSERT INTO reports (client_id, title, report_month, summary, file_url) VALUES ($1, $2, $3, $4, $5)',
        [
          renovar.id,
          'Relatório Mensal de Performance',
          '2026-03-01',
          'Crescimento consistente de leads e redução do CPL.',
          '/uploads/demo-relatorio-renovar.pdf',
        ]
      ),
      pool.query(
        'INSERT INTO reports (client_id, title, report_month, summary, file_url) VALUES ($1, $2, $3, $4, $5)',
        [
          moda.id,
          'Relatório de Conteúdo e Vendas',
          '2026-03-01',
          'A coleção outono elevou vendas e ticket médio.',
          '/uploads/demo-relatorio-moda.pdf',
        ]
      ),
    ]);

    await Promise.all([
      pool.query(
        'INSERT INTO materials (client_id, campaign_id, uploaded_by, title, filename, url, status, feedback) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          renovar.id,
          campRenovar.id,
          designerUser.id,
          'Carrossel Março - Procedimentos',
          'material-renovar.jpg',
          '/uploads/material-renovar.jpg',
          'Pendente',
          null,
        ]
      ),
      pool.query(
        'INSERT INTO materials (client_id, campaign_id, uploaded_by, title, filename, url, status, feedback) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          moda.id,
          campModa.id,
          designerUser.id,
          'Lookbook Outono',
          'lookbook-moda.jpg',
          '/uploads/lookbook-moda.jpg',
          'Revisao',
          'Ajustar CTA final',
        ]
      ),
    ]);

    await Promise.all([
      pool.query('INSERT INTO invoices (client_id, amount, status, due_date) VALUES ($1, $2, $3, $4)', [
        renovar.id,
        7200,
        'Pago',
        '2026-03-10',
      ]),
      pool.query('INSERT INTO invoices (client_id, amount, status, due_date) VALUES ($1, $2, $3, $4)', [
        moda.id,
        3500,
        'Em aberto',
        '2026-03-25',
      ]),
      pool.query('INSERT INTO invoices (client_id, amount, status, due_date) VALUES ($1, $2, $3, $4)', [
        saber.id,
        8900,
        'Em aberto',
        '2026-03-28',
      ]),
    ]);

    await Promise.all([
      pool.query(
        'INSERT INTO tasks (client_id, assigned_to, status, type, column_name, title, description, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          renovar.id,
          gestorUser.id,
          'Em progresso',
          'trafego',
          'doing',
          'Otimizar campanha de captação',
          'Ajustar segmentação e criativos da campanha principal.',
          '2026-03-22',
        ]
      ),
      pool.query(
        'INSERT INTO tasks (client_id, assigned_to, status, type, column_name, title, description, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          moda.id,
          designerUser.id,
          'Backlog',
          'design',
          'backlog',
          'Planejar criativos de abril',
          'Subir novas ofertas e distribuição visual por canal.',
          '2026-03-26',
        ]
      ),
      pool.query(
        'INSERT INTO tasks (client_id, assigned_to, status, type, column_name, title, description, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          saber.id,
          devUser.id,
          'Concluido',
          'landing-page',
          'done',
          'Revisar landing page de matrícula',
          'Ajustes finais antes do pico de mídia.',
          '2026-03-15',
        ]
      ),
    ]);

    await Promise.all([
      pool.query(
        'INSERT INTO messages (sender_id, receiver_id, context_type, context_id, content) VALUES ($1, $2, $3, $4, $5)',
        [
          designerUser.id,
          gestorUser.id,
          'campaign',
          campRenovar.id,
          'Precisamos antecipar a publicação do material de sexta.',
        ]
      ),
      pool.query(
        'INSERT INTO messages (sender_id, receiver_id, context_type, context_id, content) VALUES ($1, $2, $3, $4, $5)',
        [gestorUser.id, designerUser.id, 'campaign', campRenovar.id, 'Recebido. Vamos priorizar a aprovação ainda hoje.']
      ),
    ]);

    await Promise.all([
      pool.query(
        'INSERT INTO contacts (name, phone, email, company, service, lead_stage, estimated_value, message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          'Demo Lead 01',
          '00000000000',
          'lead01@example.test',
          'Demo Health Company',
          'Tráfego Pago',
          'Proposta',
          5000,
          'Preciso de captação para abril.',
        ]
      ),
      pool.query(
        'INSERT INTO contacts (name, phone, email, company, service, lead_stage, estimated_value, message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          'Demo Lead 02',
          '00000000000',
          'lead02@example.test',
          'Demo Education Company',
          'Site',
          'Negociacao',
          9200,
          'Quero landing page e mídia.',
        ]
      ),
    ]);

    await client.query('COMMIT');

    console.log('Seed aplicado com sucesso.');
    console.table([
      { email: 'admin@example.test', password: rawPasswords.admin },
      { email: 'manager@example.test', password: rawPasswords.gestor },
      { email: 'designer@example.test', password: rawPasswords.designer },
      { email: 'sales@example.test', password: rawPasswords.comercial },
      { email: 'developer@example.test', password: rawPasswords.dev },
    ]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    pool.query = originalQuery;
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Erro ao aplicar seed:', error);
  process.exit(1);
});
