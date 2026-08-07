const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const env = require('../src/config/env');
const { assertStrongPassword } = require('../src/utils/passwordPolicy');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SHOWCASE_PASSWORD = process.env.SHOWCASE_PASSWORD;
const SHOWCASE_IPS = [
  '177.200.10.10',
  '177.200.10.11',
  '177.200.10.12',
  '177.200.10.13',
  '177.200.10.14',
  '177.200.10.15',
];

function pad(number) {
  return String(number).padStart(2, '0');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toDateOnly(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function atTime(value, hours, minutes = 0) {
  const date = new Date(value);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function monthStart(baseDate, offset) {
  const date = new Date(baseDate);
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  date.setHours(0, 0, 0, 0);
  return date;
}

function monthDueDate(baseDate, offset, day) {
  const date = monthStart(baseDate, offset);
  date.setDate(day);
  return date;
}

function buildAvatarSvg(initials, accent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="240" height="240" rx="40" fill="#F4F0EA"/>
  <rect x="18" y="18" width="204" height="204" rx="32" fill="${accent}"/>
  <circle cx="120" cy="120" r="72" fill="#20161B" fill-opacity="0.12"/>
  <text x="120" y="136" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="64" fill="#FFFFFF">${initials}</text>
</svg>
`;
}

function buildCreativeSvg(title, subtitle, accent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="900" viewBox="0 0 1600 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="900" rx="40" fill="#1C171A"/>
  <rect x="60" y="60" width="1480" height="780" rx="28" fill="#2B2025"/>
  <rect x="100" y="120" width="420" height="8" rx="4" fill="${accent}"/>
  <text x="100" y="210" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="#FFFFFF">${title}</text>
  <text x="100" y="300" font-family="Arial, sans-serif" font-size="34" font-weight="500" fill="#E7DCE1">${subtitle}</text>
  <rect x="100" y="380" width="360" height="180" rx="24" fill="${accent}" fill-opacity="0.18"/>
  <rect x="500" y="380" width="420" height="180" rx="24" fill="#FFFFFF" fill-opacity="0.08"/>
  <rect x="960" y="380" width="480" height="180" rx="24" fill="#FFFFFF" fill-opacity="0.08"/>
  <text x="100" y="720" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="#FFFFFF">ONE Comunicacao Integrada</text>
</svg>
`;
}

function buildReportText(clientName, monthLabel, highlights) {
  return [
    `Relatorio operacional - ${clientName}`,
    `Competencia: ${monthLabel}`,
    '',
    'Resumo executivo:',
    ...highlights.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Proximo passo:',
    'Manter cadencia de campanha, revisar funil comercial e acompanhar a margem por cliente no financeiro.',
  ].join('\n');
}

function buildCsv(headers, rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
}

function buildBrandManual(clientName, tone, restrictions, cta) {
  return [
    `Manual de marca - ${clientName}`,
    '',
    `Tom de voz: ${tone}.`,
    `Restricoes: ${restrictions}.`,
    `CTA principal: ${cta}.`,
    '',
    'Orientacoes operacionais:',
    '- Priorizar clareza, prova social e oferta objetiva.',
    '- Evitar excesso de texto em artes de social media.',
    '- Revisar ortografia e datas antes de qualquer aprovacao final.',
  ].join('\n');
}

async function ensureDatabaseExists() {
  const resolvedHost = env.databaseHost || new URL(env.databaseUrl).hostname;
  const resolvedPort = env.databaseHost ? env.databasePort : new URL(env.databaseUrl).port;
  const resolvedName = env.databaseHost
    ? env.databaseName
    : decodeURIComponent(new URL(env.databaseUrl).pathname.replace(/^\//, ''));
  const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(resolvedHost);

  if (!isLocalDatabase) {
    console.log('[showcase] Banco remoto detectado; pulando criacao/verificacao administrativa.');
    return;
  }

  const clientConfig = env.databaseHost && env.databaseUser && env.databaseName
    ? {
        host: env.databaseHost,
        port: resolvedPort,
        database: 'postgres',
        user: env.databaseUser,
        password: env.databasePassword,
      }
    : (() => {
        const adminUrl = new URL(env.databaseUrl);
        adminUrl.pathname = '/postgres';
        return { connectionString: adminUrl.toString() };
      })();

  const client = new Client(clientConfig);
  await client.connect();
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [resolvedName]);
    if (!rows.length) {
      const safeName = `"${resolvedName.replace(/"/g, '""')}"`;
      await client.query(`CREATE DATABASE ${safeName}`);
      console.log(`[showcase] Banco criado: ${resolvedName}`);
    } else {
      console.log(`[showcase] Banco encontrado: ${resolvedName}`);
    }
  } finally {
    await client.end();
  }
}

function runMigrations() {
  console.log('[showcase] Rodando migrations...');
  execFileSync(process.execPath, [path.join('src', 'db', 'migrate.js'), 'up'], {
    cwd: BACKEND_ROOT,
    stdio: 'inherit',
  });
}

function createUploadAssets(baseDate) {
  fs.mkdirSync(env.uploadsDir, { recursive: true });
  const todayLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(baseDate);

  const assets = {
    'avatar-gabriel-jordan.svg': buildAvatarSvg('GJ', '#ED3B72'),
    'avatar-janayna-sousa.svg': buildAvatarSvg('JS', '#4AB889'),
    'avatar-thalisson.svg': buildAvatarSvg('TH', '#5E87E5'),
    'avatar-camyle.svg': buildAvatarSvg('CA', '#E98AB1'),
    'avatar-valeria.svg': buildAvatarSvg('VL', '#F0A34A'),
    'avatar-ricardo-admin.svg': buildAvatarSvg('RA', '#C95F7D'),
    'avatar-lorena-sousa.svg': buildAvatarSvg('LS', '#A67EE5'),
    'avatar-elizangela.svg': buildAvatarSvg('EL', '#EC6C6C'),
    'avatar-pedro-henrique.svg': buildAvatarSvg('PH', '#4787B8'),
    'avatar-ricardo-bispo.svg': buildAvatarSvg('RB', '#6E6E6E'),
    'material-expobusiness-cobertura.svg': buildCreativeSvg('ExpoBusiness 2026', 'Cobertura principal e captacao de expositores', '#ED3B72'),
    'material-belavida-harmonizacao.svg': buildCreativeSvg('BelaVida', 'Campanha de harmonizacao facial e captacao local', '#E86D8D'),
    'material-techmaranhao-dashboard.svg': buildCreativeSvg('TechMaranhao', 'Landing page e dashboard de conversoes', '#568AE7'),
    'material-saborebrasa-festival.svg': buildCreativeSvg('Sabor & Brasa', 'Festival Parrilla e reforco de agenda semanal', '#D57A43'),
    'material-horizonte-matriculas.svg': buildCreativeSvg('Instituto Horizonte', 'Matriculas abertas e leads qualificados', '#4AB889'),
    'relatorio-expobusiness-marco.txt': buildReportText('ExpoBusiness 2026', todayLabel, [
      'Captação de expositores com aumento consistente de leads qualificados.',
      'Cobertura ao vivo com engajamento acima da media do setor.',
      'Fluxo comercial integrado com CRM para conversao de patrocinadores.',
    ]),
    'relatorio-belavida-marco.txt': buildReportText('Clinica de Estetica BelaVida', todayLabel, [
      'Campanhas de Meta Ads e Google Ads com ganho de escala controlado.',
      'Melhoras em CTR e aproveitamento de leads por whatsapp.',
      'Ajuste de mensagens para procedimentos premium e recorrencia.',
    ]),
    'relatorio-techmaranhao-marco.txt': buildReportText('TechMaranhao Solucoes', todayLabel, [
      'Ganho de previsibilidade em funil B2B com landing page dedicada.',
      'Eventos de conversao padronizados entre GA4 e Looker Studio.',
      'Pipeline comercial mais limpo para reunioes de demonstracao.',
    ]),
    'relatorio-saborebrasa-marco.txt': buildReportText('Restaurante Sabor & Brasa', todayLabel, [
      'Conteudo organico e impulsionamento local sustentaram as reservas.',
      'Criativos de cardapio tiveram maior resposta aos fins de semana.',
      'Campanha sazonal preparada para calendario de abril.',
    ]),
    'relatorio-horizonte-marco.txt': buildReportText('Instituto Horizonte', todayLabel, [
      'Campanhas de matriculas com ganho de volume e melhor custo por lead.',
      'Sequencia de nutricao por e-mail elevou a taxa de resposta.',
      'Painel comercial consolidado para acompanhamento diario.',
    ]),
    'arquivo-briefing-expobusiness.txt': [
      'Briefing ExpoBusiness 2026',
      '',
      'Objetivo: acelerar patrocinio, expositores e visitantes qualificados.',
      'Foco: tom executivo, senso de urgencia e prova social do evento.',
    ].join('\n'),
    'arquivo-manual-belavida.txt': buildBrandManual(
      'Clinica de Estetica BelaVida',
      'seguro, premium e acolhedor',
      'evitar promessas milagrosas e claims absolutos',
      'Agendar avaliacao'
    ),
    'arquivo-dashboard-techmaranhao.csv': buildCsv(
      ['cliente', 'campanha', 'leads', 'receita', 'observacao'],
      [
        ['TechMaranhao Solucoes', 'Leads ERP B2B', 64, 92000, 'Mes com melhor taxa de demonstracao do trimestre'],
        ['ExpoBusiness 2026', 'Captação de expositores', 112, 180000, 'Aceleracao na ultima quinzena'],
      ]
    ),
  };

  Object.entries(assets).forEach(([fileName, content]) => {
    fs.writeFileSync(path.join(env.uploadsDir, fileName), content, 'utf8');
  });

  return Object.fromEntries(
    Object.keys(assets).map((fileName) => [fileName, `/uploads/${fileName}`])
  );
}

async function upsertUser(client, data) {
  const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [data.email]);
  if (existing.rows[0]) {
    const userId = existing.rows[0].id;
    await client.query(
      `UPDATE users
          SET client_id = $2,
              name = $3,
              phone = $4,
              job_title = $5,
              avatar_url = $6,
              password = $7,
              role = $8,
              is_active = $9,
              email_verified_at = $10,
              notify_task_assigned = $11,
              notify_task_completed = $12,
              notify_calendar_24h = $13,
              notify_calendar_1h = $14,
              last_login_at = $15,
              last_seen_at = $16,
              last_seen_ip = $17,
              last_seen_location = $18
        WHERE id = $1`,
      [
        userId,
        data.client_id ?? null,
        data.name,
        data.phone || null,
        data.job_title || null,
        data.avatar_url || null,
        data.password,
        data.role,
        data.is_active !== false,
        data.email_verified_at || null,
        data.notify_task_assigned !== false,
        data.notify_task_completed !== false,
        data.notify_calendar_24h !== false,
        data.notify_calendar_1h !== false,
        data.last_login_at || null,
        data.last_seen_at || null,
        data.last_seen_ip || null,
        data.last_seen_location || null,
      ]
    );
    return userId;
  }

  const { rows } = await client.query(
    `INSERT INTO users (
       client_id, name, email, phone, job_title, avatar_url, password, role, is_active,
       email_verified_at, notify_task_assigned, notify_task_completed, notify_calendar_24h, notify_calendar_1h,
       last_login_at, last_seen_at, last_seen_ip, last_seen_location
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     RETURNING id`,
    [
      data.client_id ?? null,
      data.name,
      data.email,
      data.phone || null,
      data.job_title || null,
      data.avatar_url || null,
      data.password,
      data.role,
      data.is_active !== false,
      data.email_verified_at || null,
      data.notify_task_assigned !== false,
      data.notify_task_completed !== false,
      data.notify_calendar_24h !== false,
      data.notify_calendar_1h !== false,
      data.last_login_at || null,
      data.last_seen_at || null,
      data.last_seen_ip || null,
      data.last_seen_location || null,
    ]
  );

  return rows[0].id;
}

async function upsertClient(client, data) {
  const existing = await client.query('SELECT id FROM clients WHERE name = $1', [data.name]);
  if (existing.rows[0]) {
    const clientId = existing.rows[0].id;
    await client.query(
      `UPDATE clients
          SET company = $2,
              plan = $3,
              mrr = $4,
              segment = $5,
              manager_id = $6,
              started_at = $7,
              legal_document = $8,
              contact_name = $9,
              contact_email = $10,
              contact_phone = $11,
              billing_email = $12,
              address_line1 = $13,
              address_line2 = $14,
              neighborhood = $15,
              city = $16,
              state = $17,
              zip_code = $18,
              country = $19,
              notes = $20,
              brand_manual = $21
        WHERE id = $1`,
      [
        clientId,
        data.company,
        data.plan,
        data.mrr,
        data.segment,
        data.manager_id || null,
        data.started_at || null,
        data.legal_document || null,
        data.contact_name || null,
        data.contact_email || null,
        data.contact_phone || null,
        data.billing_email || null,
        data.address_line1 || null,
        data.address_line2 || null,
        data.neighborhood || null,
        data.city || null,
        data.state || null,
        data.zip_code || null,
        data.country || null,
        data.notes || null,
        data.brand_manual || null,
      ]
    );
    return clientId;
  }

  const { rows } = await client.query(
    `INSERT INTO clients (
       name, company, plan, mrr, segment, manager_id, started_at, legal_document, contact_name, contact_email,
       contact_phone, billing_email, address_line1, address_line2, neighborhood, city, state, zip_code, country, notes, brand_manual
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
     RETURNING id`,
    [
      data.name,
      data.company,
      data.plan,
      data.mrr,
      data.segment || null,
      data.manager_id || null,
      data.started_at || null,
      data.legal_document || null,
      data.contact_name || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.billing_email || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.neighborhood || null,
      data.city || null,
      data.state || null,
      data.zip_code || null,
      data.country || null,
      data.notes || null,
      data.brand_manual || null,
    ]
  );

  return rows[0].id;
}

async function upsertCampaign(client, data) {
  const existing = await client.query('SELECT id FROM campaigns WHERE client_id = $1 AND name = $2', [data.client_id, data.name]);
  if (existing.rows[0]) {
    const campaignId = existing.rows[0].id;
    await client.query(
      `UPDATE campaigns
          SET channel = $2,
              audience = $3,
              objective = $4,
              pipeline_stage = $5,
              budget = $6,
              start_date = $7,
              end_date = $8,
              status = $9
        WHERE id = $1`,
      [
        campaignId,
        data.channel,
        data.audience || null,
        data.objective || null,
        data.pipeline_stage,
        data.budget,
        data.start_date || null,
        data.end_date || null,
        data.status,
      ]
    );
    return campaignId;
  }

  const { rows } = await client.query(
    `INSERT INTO campaigns (
       client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, end_date, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      data.client_id,
      data.name,
      data.channel,
      data.audience || null,
      data.objective || null,
      data.pipeline_stage,
      data.budget,
      data.start_date || null,
      data.end_date || null,
      data.status,
    ]
  );

  return rows[0].id;
}

async function upsertMetric(client, data) {
  await client.query(
    `INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (campaign_id, period)
     DO UPDATE SET
       leads = EXCLUDED.leads,
       revenue = EXCLUDED.revenue,
       impressions = EXCLUDED.impressions,
       clicks = EXCLUDED.clicks`,
    [data.campaign_id, data.period, data.leads, data.revenue, data.impressions, data.clicks]
  );
}

async function upsertReport(client, data) {
  const existing = await client.query(
    'SELECT id FROM reports WHERE client_id = $1 AND title = $2 AND report_month = $3',
    [data.client_id, data.title, data.report_month]
  );

  if (existing.rows[0]) {
    await client.query(
      `UPDATE reports
          SET summary = $2,
              file_url = $3
        WHERE id = $1`,
      [existing.rows[0].id, data.summary, data.file_url || null]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO reports (client_id, title, report_month, summary, file_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.client_id, data.title, data.report_month, data.summary, data.file_url || null]
  );
  return rows[0].id;
}

async function upsertMaterial(client, data) {
  const existing = await client.query('SELECT id FROM materials WHERE client_id = $1 AND title = $2', [data.client_id, data.title]);
  if (existing.rows[0]) {
    await client.query(
      `UPDATE materials
          SET campaign_id = $2,
              uploaded_by = $3,
              filename = $4,
              url = $5,
              status = $6,
              feedback = $7
        WHERE id = $1`,
      [
        existing.rows[0].id,
        data.campaign_id || null,
        data.uploaded_by || null,
        data.filename || null,
        data.url || null,
        data.status,
        data.feedback || null,
      ]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO materials (client_id, campaign_id, uploaded_by, title, filename, url, status, feedback)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      data.client_id,
      data.campaign_id || null,
      data.uploaded_by || null,
      data.title,
      data.filename || null,
      data.url || null,
      data.status,
      data.feedback || null,
    ]
  );
  return rows[0].id;
}

async function upsertFile(client, data) {
  const existing = await client.query('SELECT id FROM files WHERE stored_name = $1', [data.stored_name]);
  if (existing.rows[0]) {
    await client.query(
      `UPDATE files
          SET client_id = $2,
              uploaded_by = $3,
              original_name = $4,
              mime_type = $5,
              size = $6,
              url = $7
        WHERE id = $1`,
      [
        existing.rows[0].id,
        data.client_id ?? null,
        data.uploaded_by || null,
        data.original_name,
        data.mime_type || null,
        data.size,
        data.url,
      ]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO files (client_id, uploaded_by, original_name, stored_name, mime_type, size, url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      data.client_id ?? null,
      data.uploaded_by || null,
      data.original_name,
      data.stored_name,
      data.mime_type || null,
      data.size,
      data.url,
    ]
  );
  return rows[0].id;
}

async function upsertContact(client, data) {
  const existing = await client.query('SELECT id FROM contacts WHERE LOWER(email) = LOWER($1)', [data.email]);
  if (existing.rows[0]) {
    const contactId = existing.rows[0].id;
    await client.query(
      `UPDATE contacts
          SET name = $2,
              phone = $3,
              whatsapp = $4,
              company = $5,
              service = $6,
              source = $7,
              document = $8,
              lead_stage = $9,
              estimated_value = $10,
              message = $11,
              notes = $12,
              owner_id = $13,
              assigned_to = $14,
              last_contact_at = $15,
              converted_client_id = $16,
              address_line1 = $17,
              neighborhood = $18,
              city = $19,
              state = $20,
              zip_code = $21,
              country = $22,
              created_at = $23,
              updated_at = $24
        WHERE id = $1`,
      [
        contactId,
        data.name,
        data.phone,
        data.whatsapp || null,
        data.company || null,
        data.service || null,
        data.source || null,
        data.document || null,
        data.lead_stage,
        data.estimated_value || 0,
        data.message || null,
        data.notes || null,
        data.owner_id || null,
        data.assigned_to || null,
        data.last_contact_at || null,
        data.converted_client_id || null,
        data.address_line1 || null,
        data.neighborhood || null,
        data.city || null,
        data.state || null,
        data.zip_code || null,
        data.country || null,
        data.created_at,
        data.updated_at,
      ]
    );
    return contactId;
  }

  const { rows } = await client.query(
    `INSERT INTO contacts (
       name, phone, whatsapp, email, company, service, source, document, lead_stage, estimated_value,
       message, notes, owner_id, assigned_to, last_contact_at, converted_client_id,
       address_line1, neighborhood, city, state, zip_code, country, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
     RETURNING id`,
    [
      data.name,
      data.phone,
      data.whatsapp || null,
      data.email,
      data.company || null,
      data.service || null,
      data.source || null,
      data.document || null,
      data.lead_stage,
      data.estimated_value || 0,
      data.message || null,
      data.notes || null,
      data.owner_id || null,
      data.assigned_to || null,
      data.last_contact_at || null,
      data.converted_client_id || null,
      data.address_line1 || null,
      data.neighborhood || null,
      data.city || null,
      data.state || null,
      data.zip_code || null,
      data.country || null,
      data.created_at,
      data.updated_at,
    ]
  );
  return rows[0].id;
}

async function upsertInvoice(client, data) {
  const existing = await client.query(
    'SELECT id FROM invoices WHERE client_id = $1 AND due_date = $2 AND amount = $3',
    [data.client_id, data.due_date, data.amount]
  );
  if (existing.rows[0]) {
    await client.query(
      `UPDATE invoices
          SET status = $2,
              created_at = $3
        WHERE id = $1`,
      [existing.rows[0].id, data.status, data.created_at]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO invoices (client_id, amount, status, due_date, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.client_id, data.amount, data.status, data.due_date, data.created_at]
  );
  return rows[0].id;
}

async function upsertCharge(client, data) {
  const provider = data.provider || 'manual';
  const existing = await client.query('SELECT id FROM charges WHERE external_reference = $1', [data.external_reference]);
  if (existing.rows[0]) {
    await client.query(
      `UPDATE charges
          SET client_id = $2,
              contact_id = $3,
              created_by = $4,
              provider = $5,
              payment_method = $6,
              description = $7,
              amount = $8,
              due_date = $9,
              status = $10,
              payment_link = $11,
              boleto_url = $12,
              boleto_barcode = $13,
              pix_copy_paste = $14,
              pix_qr_base64 = $15,
              external_payload = $16,
              updated_at = $17
        WHERE id = $1`,
      [
        existing.rows[0].id,
        data.client_id || null,
        data.contact_id || null,
        data.created_by || null,
        provider,
        data.payment_method,
        data.description,
        data.amount,
        data.due_date || null,
        data.status,
        data.payment_link || null,
        data.boleto_url || null,
        data.boleto_barcode || null,
        data.pix_copy_paste || null,
        data.pix_qr_base64 || null,
        data.external_payload ? JSON.stringify(data.external_payload) : null,
        data.created_at,
      ]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO charges (
       client_id, contact_id, created_by, provider, payment_method, description, amount, due_date, status,
       payment_link, boleto_url, boleto_barcode, pix_copy_paste, pix_qr_base64, external_reference, external_payload, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
     RETURNING id`,
    [
      data.client_id || null,
      data.contact_id || null,
      data.created_by || null,
      provider,
      data.payment_method,
      data.description,
      data.amount,
      data.due_date || null,
      data.status,
      data.payment_link || null,
      data.boleto_url || null,
      data.boleto_barcode || null,
      data.pix_copy_paste || null,
      data.pix_qr_base64 || null,
      data.external_reference,
      data.external_payload ? JSON.stringify(data.external_payload) : null,
      data.created_at,
    ]
  );
  return rows[0].id;
}

async function upsertCostEntry(client, data) {
  const existing = await client.query(
    'SELECT id FROM cost_entries WHERE client_id IS NOT DISTINCT FROM $1 AND description = $2 AND incurred_on = $3',
    [data.client_id ?? null, data.description, data.incurred_on]
  );
  if (existing.rows[0]) {
    await client.query(
      `UPDATE cost_entries
          SET created_by = $2,
              category = $3,
              amount = $4,
              created_at = $5
        WHERE id = $1`,
      [existing.rows[0].id, data.created_by, data.category, data.amount, data.created_at]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO cost_entries (client_id, created_by, category, description, amount, incurred_on, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [data.client_id ?? null, data.created_by, data.category, data.description, data.amount, data.incurred_on, data.created_at]
  );
  return rows[0].id;
}

async function upsertTask(client, data) {
  const existing = await client.query(
    'SELECT id FROM tasks WHERE client_id IS NOT DISTINCT FROM $1 AND title = $2',
    [data.client_id ?? null, data.title]
  );
  let taskId;

  if (existing.rows[0]) {
    taskId = existing.rows[0].id;
    await client.query(
      `UPDATE tasks
          SET created_by = $2,
              assigned_to = $3,
              status = $4,
              type = $5,
              column_name = $6,
              description = $7,
              deadline = $8,
              created_at = $9
        WHERE id = $1`,
      [
        taskId,
        data.created_by || null,
        data.assigned_to || null,
        data.status,
        data.type,
        data.column_name,
        data.description,
        data.deadline || null,
        data.created_at,
      ]
    );
  } else {
    const { rows } = await client.query(
      `INSERT INTO tasks (
         client_id, created_by, assigned_to, status, type, column_name, title, description, deadline, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        data.client_id ?? null,
        data.created_by || null,
        data.assigned_to || null,
        data.status,
        data.type,
        data.column_name,
        data.title,
        data.description,
        data.deadline || null,
        data.created_at,
      ]
    );
    taskId = rows[0].id;
  }

  await client.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
  for (const userId of data.assigned_user_ids) {
    await client.query(
      `INSERT INTO task_assignees (task_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (task_id, user_id) DO NOTHING`,
      [taskId, userId]
    );
  }

  return taskId;
}

async function upsertIntegration(client, data) {
  const { rows } = await client.query(
    `INSERT INTO client_integrations (
       client_id, provider_key, status, external_account_id, external_property_id,
       connected_at, last_sync_at, last_success_at, last_error, metadata, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, '{}'::jsonb), $11, $11)
     ON CONFLICT (client_id, provider_key)
     DO UPDATE SET
       status = EXCLUDED.status,
       external_account_id = EXCLUDED.external_account_id,
       external_property_id = EXCLUDED.external_property_id,
       connected_at = EXCLUDED.connected_at,
       last_sync_at = EXCLUDED.last_sync_at,
       last_success_at = EXCLUDED.last_success_at,
       last_error = EXCLUDED.last_error,
       metadata = EXCLUDED.metadata,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING id`,
    [
      data.client_id,
      data.provider_key,
      data.status,
      data.external_account_id || null,
      data.external_property_id || null,
      data.connected_at || null,
      data.last_sync_at || null,
      data.last_success_at || null,
      data.last_error || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.created_by || null,
    ]
  );

  return rows[0].id;
}

async function upsertCalendarEvent(client, data) {
  const existing = await client.query('SELECT id FROM calendar_events WHERE title = $1 AND starts_at = $2', [data.title, data.starts_at]);
  if (existing.rows[0]) {
    await client.query(
      `UPDATE calendar_events
          SET description = $2,
              ends_at = $3,
              location = $4,
              color = $5,
              created_by = $6,
              updated_by = $7
        WHERE id = $1`,
      [
        existing.rows[0].id,
        data.description || null,
        data.ends_at,
        data.location || null,
        data.color || 'pink',
        data.created_by || null,
        data.updated_by || data.created_by || null,
      ]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO calendar_events (title, description, starts_at, ends_at, location, color, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      data.title,
      data.description || null,
      data.starts_at,
      data.ends_at,
      data.location || null,
      data.color || 'pink',
      data.created_by || null,
      data.updated_by || data.created_by || null,
    ]
  );
  return rows[0].id;
}

async function upsertNotification(client, data) {
  const existing = await client.query(
    'SELECT id FROM notifications WHERE user_id = $1 AND type = $2 AND title = $3 AND entity_type IS NOT DISTINCT FROM $4 AND entity_id IS NOT DISTINCT FROM $5',
    [data.user_id, data.type, data.title, data.entity_type || null, data.entity_id || null]
  );
  if (existing.rows[0]) {
    await client.query(
      `UPDATE notifications
          SET body = $2,
              read_at = $3,
              created_at = $4
        WHERE id = $1`,
      [existing.rows[0].id, data.body || null, data.read_at || null, data.created_at]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id, read_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      data.user_id,
      data.type,
      data.title,
      data.body || null,
      data.entity_type || null,
      data.entity_id || null,
      data.read_at || null,
      data.created_at,
    ]
  );
  return rows[0].id;
}

async function upsertChecklistEntry(client, data) {
  await client.query(
    `INSERT INTO user_daily_checklists (user_id, checklist_date, items, completed_at, created_at, updated_at)
     VALUES ($1, $2::date, $3::jsonb, $4, $5, $6)
     ON CONFLICT (user_id, checklist_date)
     DO UPDATE SET
       items = EXCLUDED.items,
       completed_at = EXCLUDED.completed_at,
       created_at = EXCLUDED.created_at,
       updated_at = EXCLUDED.updated_at`,
    [
      data.user_id,
      data.checklist_date,
      JSON.stringify(data.items),
      data.completed_at || null,
      data.created_at,
      data.updated_at,
    ]
  );
}

async function upsertMessage(client, data) {
  const existing = await client.query(
    'SELECT id FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND context_type = $3 AND context_id IS NOT DISTINCT FROM $4 AND content = $5',
    [data.sender_id, data.receiver_id, data.context_type, data.context_id || null, data.content]
  );
  if (existing.rows[0]) {
    await client.query(
      `UPDATE messages
          SET read_at = $2,
              created_at = $3
        WHERE id = $1`,
      [existing.rows[0].id, data.read_at || null, data.created_at]
    );
    return existing.rows[0].id;
  }

  const { rows } = await client.query(
    `INSERT INTO messages (sender_id, receiver_id, context_type, context_id, content, read_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      data.sender_id,
      data.receiver_id,
      data.context_type || 'general',
      data.context_id || null,
      data.content,
      data.read_at || null,
      data.created_at,
    ]
  );
  return rows[0].id;
}

function buildShowcaseDataset(baseDate, assets, passwordHash) {
  const now = new Date(baseDate);
  const sixMonthPeriods = Array.from({ length: 6 }, (_, index) => monthStart(now, index - 5));
  const currentMonthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(now);

  const internalUsers = [
    ['gabriel', 'Gabriel Jordan', 'gabriel@one.com', 'admin', '(98) 98111-1200', 'Diretor de Marketing', 'avatar-gabriel-jordan.svg', 0, 13, 40, 14, 5, 'Sao Luis, Maranhao, Brasil'],
    ['janayna', 'Janayna Sousa', 'janayna@one.com', 'gestor', '(98) 98222-3300', 'Gestora de Operacoes', 'avatar-janayna-sousa.svg', -1, 16, 10, 16, 12, 'Sao Luis, Maranhao, Brasil'],
    ['thalisson', 'Thalisson', 'thalisson@one.com', 'designer', '(98) 98333-4411', 'Designer Motion', 'avatar-thalisson.svg', -1, 9, 0, 9, 5, 'Sao Jose de Ribamar, Maranhao, Brasil'],
    ['camyle', 'Camyle', 'camyle@one.com', 'designer', '(98) 98444-5522', 'Designer Grafica', 'avatar-camyle.svg', -2, 11, 30, 11, 45, 'Sao Luis, Maranhao, Brasil'],
    ['valeria', 'Valeria', 'valeria@one.com', 'designer', '(98) 98555-6633', 'Social Media', 'avatar-valeria.svg', -3, 15, 55, 16, 0, 'Paco do Lumiar, Maranhao, Brasil'],
    ['pedro', 'Pedro Henrique', 'pedro@one.com', 'comercial', '(98) 98666-7744', 'Executivo Comercial', 'avatar-pedro-henrique.svg', -1, 18, 20, 18, 40, 'Sao Luis, Maranhao, Brasil'],
    ['elizangela', 'Elizangela', 'elizangela@one.com', 'comercial', '(98) 98777-8855', 'Atendimento Comercial', 'avatar-elizangela.svg', -4, 14, 30, 14, 38, 'Sao Luis, Maranhao, Brasil'],
    ['lorena', 'Lorena Sousa', 'lorena@one.com', 'gestor', '(98) 98888-9966', 'Gestora de Relacionamento', 'avatar-lorena-sousa.svg', -2, 10, 15, 10, 18, 'Imperatriz, Maranhao, Brasil'],
    ['ricardo-admin', 'Ricardo Admin', 'ricardo.admin@one.com', 'admin', '(98) 98999-2200', 'Diretor Executivo', 'avatar-ricardo-admin.svg', -5, 12, 45, 12, 50, 'Sao Luis, Maranhao, Brasil'],
    ['ricardo-bispo', 'Ricardo Bispo', 'ricardo.bispo@one.com', 'dev', '(98) 98000-3300', 'Desenvolvedor e Integracoes', 'avatar-ricardo-bispo.svg', -1, 20, 15, 20, 25, 'Sao Luis, Maranhao, Brasil'],
  ].map(([key, name, email, role, phone, job_title, avatar, offset, loginHour, loginMinute, seenHour, seenMinute, location], index) => ({
    key,
    name,
    email,
    role,
    phone,
    job_title,
    avatar_url: assets[avatar],
    password: passwordHash,
    is_active: true,
    email_verified_at: atTime(addDays(now, -20), 10, 0).toISOString(),
    last_login_at: atTime(addDays(now, offset), loginHour, loginMinute).toISOString(),
    last_seen_at: atTime(addDays(now, offset), seenHour, seenMinute).toISOString(),
    last_seen_ip: SHOWCASE_IPS[index % SHOWCASE_IPS.length],
    last_seen_location: location,
  }));

  const clients = [
    {
      key: 'expo',
      name: 'ExpoBusiness 2026',
      company: 'ExpoBusiness Eventos e Negocios LTDA',
      plan: 'Sob demanda · Cobertura de Eventos',
      mrr: 0,
      segment: 'Eventos e feiras',
      manager_key: 'janayna',
      started_at: toDateOnly(addDays(now, -80)),
      legal_document: '12.345.678/0001-10',
      contact_name: 'Marina Costa',
      contact_email: 'marina@expobusiness2026.com.br',
      contact_phone: '(98) 99111-2200',
      billing_email: 'financeiro@expobusiness2026.com.br',
      address_line1: 'Av. dos Holandeses, 14',
      neighborhood: 'Calhau',
      city: 'Sao Luis',
      state: 'MA',
      zip_code: '65071-380',
      country: 'Brasil',
      notes: 'Conta focada em patrocinio, expositores e cobertura institucional do evento.',
      brand_manual: buildBrandManual('ExpoBusiness 2026', 'executivo, direto e orientado a oportunidade', 'evitar gírias e excesso de informalidade', 'Solicitar proposta e reservar cota'),
    },
    {
      key: 'belavida',
      name: 'Clinica de Estetica BelaVida',
      company: 'BelaVida Clinica Integrada LTDA',
      plan: 'One Start',
      mrr: 6500,
      segment: 'Saude e estetica',
      manager_key: 'gabriel',
      started_at: toDateOnly(addDays(now, -220)),
      legal_document: '23.456.789/0001-11',
      contact_name: 'Caroline Braga',
      contact_email: 'caroline@belavida.com.br',
      contact_phone: '(98) 99222-1100',
      billing_email: 'financeiro@belavida.com.br',
      address_line1: 'Rua dos Pinheiros, 310',
      neighborhood: 'Renascenca',
      city: 'Sao Luis',
      state: 'MA',
      zip_code: '65075-441',
      country: 'Brasil',
      notes: 'Conta com foco em agendamentos locais, autoridade medica e recorrencia.',
      brand_manual: buildBrandManual('Clinica de Estetica BelaVida', 'seguro, premium e acolhedor', 'evitar promessas milagrosas e claims absolutos', 'Agendar avaliacao'),
    },
    {
      key: 'tech',
      name: 'TechMaranhao Solucoes',
      company: 'TechMaranhao Solucoes em Software SA',
      plan: 'One Master',
      mrr: 8200,
      segment: 'Tecnologia B2B',
      manager_key: 'gabriel',
      started_at: toDateOnly(addDays(now, -180)),
      legal_document: '34.567.891/0001-22',
      contact_name: 'Renato Coelho',
      contact_email: 'renato@techmaranhao.com.br',
      contact_phone: '(98) 99333-4400',
      billing_email: 'financeiro@techmaranhao.com.br',
      address_line1: 'Av. Daniel de La Touche, 500',
      neighborhood: 'Cohama',
      city: 'Sao Luis',
      state: 'MA',
      zip_code: '65074-115',
      country: 'Brasil',
      notes: 'Conta B2B com funil consultivo, demonstracao e nutricao por conteudo.',
      brand_manual: buildBrandManual('TechMaranhao Solucoes', 'consultivo, tecnico sem ser frio, orientado a eficiencia', 'evitar buzzwords sem contexto e exagero comercial', 'Agendar demonstracao'),
    },
    {
      key: 'sabor',
      name: 'Restaurante Sabor & Brasa',
      company: 'Sabor & Brasa Gastronomia Ltda',
      plan: 'One Ideal',
      mrr: 4800,
      segment: 'Alimentacao',
      manager_key: 'janayna',
      started_at: toDateOnly(addDays(now, -140)),
      legal_document: '45.678.912/0001-33',
      contact_name: 'Marcos Leao',
      contact_email: 'marcos@saborebrasa.com.br',
      contact_phone: '(98) 99444-5500',
      billing_email: 'financeiro@saborebrasa.com.br',
      address_line1: 'Av. Litoranea, 902',
      neighborhood: 'Olho dAgua',
      city: 'Sao Luis',
      state: 'MA',
      zip_code: '65065-180',
      country: 'Brasil',
      notes: 'Conta local com foco em reserva, cardapio semanal e sazonalidade de datas especiais.',
      brand_manual: buildBrandManual('Restaurante Sabor & Brasa', 'quente, convidativo e apetitoso', 'evitar textos longos em criativos e excesso de informacao em cardapio', 'Reservar mesa'),
    },
    {
      key: 'horizonte',
      name: 'Instituto Horizonte',
      company: 'Instituto Horizonte Educacao LTDA',
      plan: 'One Master',
      mrr: 9100,
      segment: 'Educacao',
      manager_key: 'lorena',
      started_at: toDateOnly(addDays(now, -260)),
      legal_document: '56.789.123/0001-44',
      contact_name: 'Debora Farias',
      contact_email: 'debora@institutohorizonte.edu.br',
      contact_phone: '(98) 99555-6600',
      billing_email: 'financeiro@institutohorizonte.edu.br',
      address_line1: 'Rua dos Professores, 88',
      neighborhood: 'Cohafuma',
      city: 'Sao Luis',
      state: 'MA',
      zip_code: '65065-320',
      country: 'Brasil',
      notes: 'Conta com meta de matriculas, reforco institucional e calendario academico.',
      brand_manual: buildBrandManual('Instituto Horizonte', 'didatico, confiavel e acolhedor', 'evitar excesso de promessas e tecnicismos pedagogicos no feed', 'Falar com a secretaria'),
    },
  ];

  const campaigns = [
    ['expo-captacao', 'expo', 'Captação de expositores 2026', 'Meta Ads', 'Empresas de servicos, industria e patrocinadores regionais', 'Gerar conversas qualificadas para patrocinio e espaco de estande', 'execucao', 20000, -28, 18, 'Ativa'],
    ['belavida-meta', 'belavida', 'Harmonizacao facial premium', 'Instagram + Meta', 'Mulheres e homens de 27 a 48 anos na Grande Ilha', 'Agendamentos de avaliacao e preenchimento do CRM', 'otimizacao', 7000, -24, 10, 'Ativa'],
    ['tech-google', 'tech', 'Leads ERP B2B', 'Google Ads', 'Diretores operacionais e gestores financeiros de medias empresas', 'Gerar pedidos de demonstracao do ERP', 'escala', 12000, -40, 25, 'Ativa'],
    ['sabor-festival', 'sabor', 'Festival Parrilla de Abril', 'Instagram', 'Publico local com interesse em gastronomia e experiencias', 'Reservas de mesa e fortalecimento de agenda de fim de semana', 'execucao', 3500, -15, 20, 'Ativa'],
    ['horizonte-matriculas', 'horizonte', 'Matriculas 2026.2', 'Google Ads', 'Pais e responsaveis de alunos da educacao basica', 'Leads para secretaria e visitas guiadas', 'otimizacao', 15000, -35, 35, 'Ativa'],
  ].map(([key, client_key, name, channel, audience, objective, pipeline_stage, budget, startOffset, endOffset, status]) => ({
    key,
    client_key,
    name,
    channel,
    audience,
    objective,
    pipeline_stage,
    budget,
    start_date: toDateOnly(addDays(now, startOffset)),
    end_date: toDateOnly(addDays(now, endOffset)),
    status,
  }));

  const metrics = [];
  campaigns.forEach((campaign, campaignIndex) => {
    sixMonthPeriods.forEach((period, periodIndex) => {
      const monthFactor = periodIndex + 1;
      const baseLeads = [32, 24, 28, 18, 26][campaignIndex];
      const leads = baseLeads * monthFactor + campaignIndex * 3;
      const clicks = leads * (18 + campaignIndex);
      const impressions = clicks * (14 + periodIndex);
      const revenuePerLead = [1200, 540, 2200, 180, 760][campaignIndex];
      metrics.push({
        campaign_key: campaign.key,
        period: toDateOnly(period),
        leads,
        revenue: leads * revenuePerLead,
        impressions,
        clicks,
      });
    });
  });

  const reportMonth = toDateOnly(monthStart(now, 0));
  const reports = [
    ['expo', 'Relatorio ExpoBusiness - panorama de patrocinio', 'Captação de expositores acelerada, cobertura aquecida e patrocinio com funil bem definido.', 'relatorio-expobusiness-marco.txt'],
    ['belavida', 'Relatorio BelaVida - consolidado de campanhas', 'Meta Ads e Google Ads com ganho de escala e leads mais qualificados para a recepcao.', 'relatorio-belavida-marco.txt'],
    ['tech', 'Relatorio TechMaranhao - funil e analytics', 'Dashboard de conversoes consolidado e ganho de previsibilidade em demonstracoes.', 'relatorio-techmaranhao-marco.txt'],
    ['sabor', 'Relatorio Sabor & Brasa - reservas e conteudo', 'Reserva de mesas evoluindo com calendario sazonal e criativos de maior resposta.', 'relatorio-saborebrasa-marco.txt'],
    ['horizonte', 'Relatorio Instituto Horizonte - matriculas', 'Fluxo de matriculas mais organizado entre campanha, CRM e agenda comercial.', 'relatorio-horizonte-marco.txt'],
  ].map(([client_key, title, summary, file_name]) => ({
    client_key,
    title,
    summary,
    file_name,
    report_month: reportMonth,
  }));

  const materials = [
    ['expo', 'expo-captacao', 'camyle', 'Criativo principal da ExpoBusiness 2026', 'material-expobusiness-cobertura.svg', 'Aprovado', 'Aprovado para patrocinio e captacao de expositores.'],
    ['belavida', 'belavida-meta', 'camyle', 'Carrossel BelaVida - harmonizacao', 'material-belavida-harmonizacao.svg', 'Revisao', 'Ajustar a chamada final para agendamento.'],
    ['tech', 'tech-google', 'ricardo-bispo', 'Layout dashboard TechMaranhao', 'material-techmaranhao-dashboard.svg', 'Pendente', null],
    ['sabor', 'sabor-festival', 'valeria', 'Card do Festival Parrilla', 'material-saborebrasa-festival.svg', 'Aprovado', 'Liberado para impulsionamento local.'],
    ['horizonte', 'horizonte-matriculas', 'thalisson', 'Peca de matriculas 2026.2', 'material-horizonte-matriculas.svg', 'Pendente', null],
  ].map(([client_key, campaign_key, uploaded_by_key, title, filename, status, feedback]) => ({
    client_key,
    campaign_key,
    uploaded_by_key,
    title,
    filename,
    status,
    feedback,
    url: assets[filename],
  }));

  const files = [
    ['expo', 'gabriel', 'briefing-expobusiness.txt', 'arquivo-briefing-expobusiness.txt', 'text/plain'],
    ['belavida', 'janayna', 'manual-belavida.txt', 'arquivo-manual-belavida.txt', 'text/plain'],
    ['tech', 'ricardo-bispo', 'dashboard-techmaranhao.csv', 'arquivo-dashboard-techmaranhao.csv', 'text/csv'],
  ].map(([client_key, uploaded_by_key, original_name, stored_name, mime_type]) => ({
    client_key,
    uploaded_by_key,
    original_name,
    stored_name,
    mime_type,
    url: assets[stored_name],
  }));

  const contacts = [
    ['Carla Tavares', 'carla@grupoodos.com.br', '(98) 99121-0001', 'Grupo oDos', 'Cobertura de Eventos', 'Instagram', 'Proposta', 18000, 'pedro', 'janayna', -14, -2, 'Contato quente, ja pediu proposta comercial.'],
    ['Marcelo Viana', 'marcelo@clinicavitta.com.br', '(98) 99121-0002', 'Clinica Vitta', 'Tráfego Pago', 'Site', 'Prospeccao', 6200, 'elizangela', 'pedro', -6, -1, 'Primeiro contato entrou pelo site.'],
    ['Luciana Prado', 'luciana@colegiopositivo.org', '(98) 99121-0003', 'Colegio Positivo', 'Campanha de matriculas', 'Indicacao', 'Negociacao', 24000, 'pedro', 'lorena', -20, -1, 'Aguardando aprovacao de diretoria financeira.'],
    ['Rodrigo Serra', 'rodrigo@vintagehall.com.br', '(98) 99121-0004', 'Vintage Hall', 'Conteudo e cobertura', 'WhatsApp', 'Contato feito', 9800, 'elizangela', 'janayna', -9, -3, 'Pediu referencias de coberturas recentes.'],
    ['Sandra Queiroz', 'sandra@casaodontologia.com.br', '(98) 99121-0005', 'Casa Odontologia', 'CRM e performance', 'Evento', 'Fechado', 12500, 'pedro', 'gabriel', -27, -4, 'Contrato assinado; onboarding em abril.'],
  ].map(([name, email, phone, company, service, source, lead_stage, estimated_value, owner_key, assigned_to_key, createdOffset, updatedOffset, notes]) => ({
    name,
    email,
    phone,
    whatsapp: phone,
    company,
    service,
    source,
    document: `${Math.floor(Math.random() * 900) + 100}.000.000-00`,
    lead_stage,
    estimated_value,
    message: `Contato iniciado para ${service.toLowerCase()}.`,
    notes,
    owner_key,
    assigned_to_key,
    last_contact_at: atTime(addDays(now, updatedOffset), 16, 10).toISOString(),
    created_at: atTime(addDays(now, createdOffset), 10, 0).toISOString(),
    updated_at: atTime(addDays(now, updatedOffset), 16, 10).toISOString(),
    address_line1: 'Endereco comercial principal',
    neighborhood: 'Centro',
    city: 'Sao Luis',
    state: 'MA',
    zip_code: '65010-000',
    country: 'Brasil',
  }));

  const tasks = [
    ['expo', 'Redacao de release da abertura da ExpoBusiness', 'Escrever o texto oficial para imprensa local e portais parceiros, alinhando patrocinio e credenciamento.', 'Backlog', 'releases', 'backlog', 'gabriel', ['pedro', 'valeria'], 2, -4, 9, 10],
    ['expo', 'Visita de captacao para gravacao de reels', 'Registrar bastidores da montagem e gerar takes para social media e cobertura do evento.', 'A Fazer', 'captacao', 'todo', 'janayna', ['thalisson', 'camyle'], 1, -3, 14, 20],
    ['expo', 'Alinhamento de cobertura com cerimonial', 'Fechar cronograma de palco, janelas de imprensa e prioridades do patrocinio master.', 'Em progresso', 'reuniao', 'doing', 'gabriel', ['gabriel', 'janayna'], 0, -2, 10, 5],
    ['belavida', 'Campanha Google Ads para abril', 'Subir novo grupo de anuncios para harmonizacao e depilacao, com extensoes de chamada e formulario.', 'A Fazer', 'trafego_pago', 'todo', 'gabriel', ['pedro', 'ricardo-bispo'], 3, -3, 11, 35],
    ['belavida', 'Design de banners de harmonizacao', 'Criar pecas para feed, stories e landing page com foco em autoridade e agendamento.', 'Em progresso', 'design_grafico', 'doing', 'gabriel', ['camyle'], -1, -5, 16, 15],
    ['tech', 'Configuracao do GA4 e eventos de conversao', 'Padronizar eventos, UTMs e dashboards para demonstracoes e formularios de contato.', 'Em progresso', 'planejamento', 'doing', 'ricardo-admin', ['ricardo-bispo'], 2, -6, 10, 0],
    ['tech', 'Landing page do ERP para captacao', 'Estruturar pagina com proposta de valor, provas e CTA de demonstracao comercial.', 'Backlog', 'copywriting', 'backlog', 'gabriel', ['thalisson', 'ricardo-bispo'], 5, -7, 15, 0],
    ['sabor', 'Calendario editorial do Festival Parrilla', 'Definir pauta semanal, reforco dos cortes especiais e CTA de reserva para sexta e sabado.', 'A Fazer', 'social_media', 'todo', 'janayna', ['valeria', 'lorena'], 4, -2, 9, 45],
    ['sabor', 'Sessao de fotos do novo cardapio', 'Captar pratos, sobremesas e bastidores para reforcar o lancamento de abril.', 'Backlog', 'fotografia', 'backlog', 'janayna', ['camyle', 'thalisson'], 6, -4, 17, 0],
    ['horizonte', 'Sequencia de e-mails de matricula', 'Construir nutricao com prova social, diferenciais pedagogicos e urgencia de vagas.', 'Em progresso', 'newsletter', 'doing', 'lorena', ['valeria', 'pedro'], 1, -3, 8, 20],
    ['horizonte', 'Apresentacao de resultados de marco', 'Organizar os aprendizados do mes e recomendar ajustes para a campanha de matriculas.', 'Concluído', 'planejamento', 'done', 'gabriel', ['gabriel', 'lorena'], -2, -8, 13, 15],
    ['expo', 'Publicacao do pos-evento no blog', 'Subir resumo do evento com fotos, parceiros e CTA para lista de espera da proxima edicao.', 'Concluído', 'copywriting', 'done', 'gabriel', ['valeria'], -5, -12, 16, 45],
  ].map(([client_key, title, description, status, type, column_name, created_by_key, assigned_keys, deadlineOffset, createdOffset, hour, minute]) => ({
    client_key,
    title,
    description,
    status,
    type,
    column_name,
    created_by_key,
    assigned_keys,
    deadline: toDateOnly(addDays(now, deadlineOffset)),
    created_at: atTime(addDays(now, createdOffset), hour, minute).toISOString(),
  }));

  const currentMonthInvoices = [
    ['belavida', 6500, 'Pago', toDateOnly(monthDueDate(now, 0, 5)), atTime(monthDueDate(now, 0, 1), 9, 0).toISOString()],
    ['tech', 8200, 'Pago', toDateOnly(monthDueDate(now, 0, 10)), atTime(monthDueDate(now, 0, 1), 10, 0).toISOString()],
    ['sabor', 4800, 'Em aberto', toDateOnly(addDays(now, 5)), atTime(monthDueDate(now, 0, 2), 11, 0).toISOString()],
    ['horizonte', 9100, 'Em aberto', toDateOnly(addDays(now, -7)), atTime(monthDueDate(now, 0, 3), 11, 30).toISOString()],
  ].map(([client_key, amount, status, due_date, created_at]) => ({ client_key, amount, status, due_date, created_at }));

  const recurringInvoices = [];
  ['belavida', 'tech', 'sabor', 'horizonte'].forEach((clientKey) => {
    const amount = clients.find((client) => client.key === clientKey).mrr;
    [-5, -4, -3, -2, -1].forEach((offset) => {
      recurringInvoices.push({
        client_key: clientKey,
        amount,
        status: 'Pago',
        due_date: toDateOnly(monthDueDate(now, offset, 5 + (clientKey === 'tech' ? 3 : 0))),
        created_at: atTime(monthDueDate(now, offset, 1), 9, 0).toISOString(),
      });
    });
  });

  const charges = [
    {
      client_key: 'expo',
      created_by_key: 'gabriel',
      payment_method: 'PIX',
      description: 'Cobrança ExpoBusiness 2026 · cobertura principal',
      amount: 120000,
      due_date: toDateOnly(addDays(now, -1)),
      status: 'RECEIVED',
      external_reference: 'showcase-expobusiness-cobertura-principal',
      payment_link: 'https://pay.one.local/expobusiness-principal',
      pix_copy_paste: '00020126580014BR.GOV.BCB.PIX0114showcaseexpo5204000053039865406120000.005802BR5909ONE LTDA6008SAOLUIS62070503***6304ABCD',
      external_payload: { source: 'manual-showcase', kind: 'pix' },
      created_at: atTime(addDays(now, -12), 9, 20).toISOString(),
    },
    {
      client_key: 'tech',
      created_by_key: 'pedro',
      payment_method: 'BOLETO',
      description: 'Cobrança TechMaranhao · setup analytics',
      amount: 5000,
      due_date: toDateOnly(now),
      status: 'RECEIVED',
      external_reference: 'showcase-tech-setup-analytics',
      boleto_url: 'https://pay.one.local/tech-analytics-boleto',
      boleto_barcode: '34191.79001 01043.510047 91020.150008 4 12340000500000',
      external_payload: { source: 'manual-showcase', kind: 'boleto' },
      created_at: atTime(addDays(now, -5), 14, 15).toISOString(),
    },
    {
      client_key: 'belavida',
      created_by_key: 'pedro',
      payment_method: 'PIX',
      description: 'Cobrança BelaVida · pacote de abril',
      amount: 7500,
      due_date: toDateOnly(addDays(now, 4)),
      status: 'PENDING',
      external_reference: 'showcase-belavida-pacote-abril',
      payment_link: 'https://pay.one.local/belavida-abril',
      pix_copy_paste: '00020126580014BR.GOV.BCB.PIX0114showcasebella52040000530398654067500.005802BR5909ONE LTDA6008SAOLUIS62070503***6304BCDE',
      external_payload: { source: 'manual-showcase', kind: 'pix' },
      created_at: atTime(addDays(now, -2), 10, 40).toISOString(),
    },
    {
      client_key: 'sabor',
      created_by_key: 'pedro',
      payment_method: 'BOLETO',
      description: 'Cobrança Sabor & Brasa · campanha especial',
      amount: 3200,
      due_date: toDateOnly(addDays(now, -13)),
      status: 'OVERDUE',
      external_reference: 'showcase-sabor-campanha-especial',
      boleto_url: 'https://pay.one.local/sabor-parrilla-boleto',
      boleto_barcode: '34191.79001 01043.510047 91020.150008 4 12340000320000',
      external_payload: { source: 'manual-showcase', kind: 'boleto' },
      created_at: atTime(addDays(now, -15), 9, 10).toISOString(),
    },
  ];

  const costEntries = [
    ['expo', 'gabriel', 'media', 'Midia principal ExpoBusiness 2026', 20000, -24, 10, 0],
    ['expo', 'janayna', 'producao', 'Equipe de cobertura e ilha de edicao', 6500, -10, 15, 0],
    ['belavida', 'gabriel', 'media', 'Investimento Meta Ads BelaVida', 7000, -25, 9, 0],
    ['belavida', 'camyle', 'producao', 'Pecas e adaptacoes de campanha BelaVida', 1500, -8, 11, 30],
    ['tech', 'ricardo-bispo', 'operacao', 'Instrumentacao GA4 e ajustes da landing page', 2500, -12, 18, 0],
    ['tech', 'ricardo-bispo', 'outro', 'Ferramenta adicional de dashboard', 1200, -9, 10, 40],
    ['sabor', 'janayna', 'producao', 'Captacao fotografica do cardapio sazonal', 1800, -6, 16, 20],
    ['horizonte', 'lorena', 'media', 'Google Ads matriculas 2026.2', 15000, -20, 9, 20],
    ['horizonte', 'lorena', 'operacao', 'Operacao de nutricao comercial', 3200, -7, 14, 45],
    [null, 'ricardo-admin', 'operacao', 'Aluguel do estudio', 4500, -5, 9, 30],
    [null, 'ricardo-admin', 'outro', 'Adobe Creative Cloud', 780, -5, 9, 35],
    [null, 'ricardo-admin', 'outro', 'Google Workspace', 240, -5, 9, 36],
    [null, 'ricardo-admin', 'outro', 'Internet e ferramentas operacionais', 390, -5, 9, 38],
  ].map(([client_key, created_by_key, category, description, amount, offset, hour, minute]) => ({
    client_key,
    created_by_key,
    category,
    description,
    amount,
    incurred_on: toDateOnly(addDays(now, offset)),
    created_at: atTime(addDays(now, offset), hour, minute).toISOString(),
  }));

  const integrations = [
    ['expo', 'ga4', 'connected', 'GA4-EXP-001', 'property-72001', null],
    ['expo', 'meta_business', 'connected', 'BM-EXP-201', 'ad-account-9981', null],
    ['expo', 'looker_studio', 'connected', 'studio-expobusiness', 'dashboard-expo-live', null],
    ['belavida', 'ga4', 'connected', 'GA4-BELA-101', 'property-22110', null],
    ['belavida', 'meta_business', 'connected', 'BM-BELA-221', 'ad-account-7710', null],
    ['belavida', 'search_console', 'configuring', 'search-belavida.com.br', 'https://belavida.com.br', 'Validando propriedade de dominio'],
    ['tech', 'ga4', 'connected', 'GA4-TECH-007', 'property-65421', null],
    ['tech', 'power_bi', 'connected', 'workspace-tech', 'dataset-receita', null],
    ['tech', 'search_console', 'error', 'gsc-techmaranhao', 'https://techmaranhao.com.br', 'Aguardando permissao do dominio principal'],
    ['sabor', 'meta_business', 'connected', 'BM-SABOR-501', 'ad-account-9921', null],
    ['sabor', 'ga4', 'disconnected', 'GA4-SABOR-002', 'property-41001', null],
    ['horizonte', 'ga4', 'connected', 'GA4-HORI-100', 'property-81000', null],
    ['horizonte', 'looker_studio', 'connected', 'studio-horizonte', 'dashboard-matriculas', null],
  ].map(([client_key, provider_key, status, external_account_id, external_property_id, last_error]) => ({
    client_key,
    provider_key,
    status,
    external_account_id,
    external_property_id,
    connected_at: status === 'connected' ? atTime(addDays(now, -18), 10, 0).toISOString() : null,
    last_sync_at: status === 'disconnected' ? null : atTime(addDays(now, -1), 7, 45).toISOString(),
    last_success_at: status === 'connected' ? atTime(addDays(now, -1), 7, 45).toISOString() : null,
    last_error,
    metadata: status === 'connected' ? { source: 'showcase', sync_mode: 'manual' } : { source: 'showcase' },
    created_by_key: 'ricardo-bispo',
  }));

  const calendarEvents = [
    ['Kickoff BelaVida - abril', 'Revisao de pauta, midia, criativos e aprovacoes da primeira semana.', 0, 9, 0, 10, 0, 'Google Meet', 'blue', 'gabriel'],
    ['Captação ExpoBusiness no Multicenter', 'Registro de bastidores, patrocinio e credenciamento em video curto.', 1, 14, 0, 17, 0, 'Centro de Convencoes Multicenter', 'pink', 'janayna'],
    ['Aprovacao final do dashboard TechMaranhao', 'Fechamento da primeira leitura comercial e alinhamento de conversoes.', 2, 16, 0, 17, 0, 'Google Meet', 'gold', 'ricardo-bispo'],
    ['Sessao de fotos do Sabor & Brasa', 'Cardapio, drinks e cenas de atendimento para campanha de abril.', 3, 10, 0, 12, 0, 'Restaurante Sabor & Brasa', 'blue', 'janayna'],
    ['Comite de matriculas Instituto Horizonte', 'Revisar leads, pauta de secretaria e cronograma de visitas guiadas.', 4, 8, 30, 9, 30, 'Instituto Horizonte', 'green', 'lorena'],
  ].map(([title, description, offset, startHour, startMinute, endHour, endMinute, location, color, created_by_key]) => ({
    title,
    description,
    starts_at: atTime(addDays(now, offset), startHour, startMinute).toISOString(),
    ends_at: atTime(addDays(now, offset), endHour, endMinute).toISOString(),
    location,
    color,
    created_by_key,
  }));

  const checklist = {
    user_key: 'gabriel',
    today: [
      { id: 'financas-marco', label: 'Revisar inadimplencia e recebidos do financeiro', done: false, createdAt: atTime(now, 8, 0).toISOString() },
      { id: 'expo-pauta', label: 'Aprovar pauta da ExpoBusiness com Janayna', done: true, createdAt: atTime(now, 8, 10).toISOString() },
      { id: 'horizonte-cronograma', label: 'Fechar cronograma comercial do Instituto Horizonte', done: false, createdAt: atTime(now, 8, 20).toISOString() },
    ],
    history: [
      {
        checklist_date: toDateOnly(addDays(now, -1)),
        items: [
          { id: 'h1', label: 'Validar verba da BelaVida', done: true, createdAt: atTime(addDays(now, -1), 8, 0).toISOString() },
          { id: 'h2', label: 'Revisar materiais do Sabor & Brasa', done: true, createdAt: atTime(addDays(now, -1), 8, 15).toISOString() },
          { id: 'h3', label: 'Responder pendencias do TechMaranhao', done: true, createdAt: atTime(addDays(now, -1), 8, 30).toISOString() },
        ],
        completed_at: atTime(addDays(now, -1), 18, 10).toISOString(),
        created_at: atTime(addDays(now, -1), 8, 0).toISOString(),
        updated_at: atTime(addDays(now, -1), 18, 10).toISOString(),
      },
      {
        checklist_date: toDateOnly(addDays(now, -3)),
        items: [
          { id: 'h4', label: 'Aprovar roteiro de captacao da Expo', done: true, createdAt: atTime(addDays(now, -3), 8, 5).toISOString() },
          { id: 'h5', label: 'Checar agenda do calendario da equipe', done: true, createdAt: atTime(addDays(now, -3), 8, 20).toISOString() },
        ],
        completed_at: atTime(addDays(now, -3), 17, 40).toISOString(),
        created_at: atTime(addDays(now, -3), 8, 0).toISOString(),
        updated_at: atTime(addDays(now, -3), 17, 40).toISOString(),
      },
    ],
  };

  const notifications = [
    ['thalisson', 'task_assigned', 'Nova tarefa para voce', 'Visita de captacao para gravacao de reels foi atribuida ao seu fluxo.', 'task', 'Visita de captacao para gravacao de reels', -1, 9, 10, null],
    ['gabriel', 'calendar_event_reminder_24h', 'Evento se aproximando', 'Kickoff BelaVida - abril acontece nas proximas 24 horas.', 'calendar_event', 'Kickoff BelaVida - abril', -1, 11, 0, null],
    ['gabriel', 'charge_overdue', 'Cobranca em atraso', 'Sabor & Brasa possui titulo em atraso e precisa de acompanhamento.', 'charge', 'showcase-sabor-campanha-especial', -1, 12, 30, atTime(addDays(now, -1), 13, 15).toISOString()],
    ['janayna', 'task_completed', 'Entrega concluida', 'Publicacao do pos-evento no blog foi concluida.', 'task', 'Publicacao do pos-evento no blog', -2, 18, 10, null],
  ].map(([user_key, type, title, body, entity_type, entity_key, offset, hour, minute, read_at]) => ({
    user_key,
    type,
    title,
    body,
    entity_type,
    entity_key,
    created_at: atTime(addDays(now, offset), hour, minute).toISOString(),
    read_at,
  }));

  const messages = [
    ['pedro', 'gabriel', 'client', 'expo', 'O lead da Grupo oDos pediu a proposta final ainda hoje.', -1, 16, 0, atTime(addDays(now, -1), 16, 12).toISOString()],
    ['janayna', 'thalisson', 'task', 'Visita de captacao para gravacao de reels', 'Priorize takes verticais para social e depoimentos curtos.', -1, 17, 5, null],
  ].map(([sender_key, receiver_key, context_type, context_key, content, offset, hour, minute, read_at]) => ({
    sender_key,
    receiver_key,
    context_type,
    context_key,
    content,
    created_at: atTime(addDays(now, offset), hour, minute).toISOString(),
    read_at,
  }));

  return {
    currentMonthLabel,
    internalUsers,
    clients,
    campaigns,
    metrics,
    reports,
    materials,
    files,
    contacts,
    invoices: [...recurringInvoices, ...currentMonthInvoices],
    charges,
    costEntries,
    integrations,
    tasks,
    calendarEvents,
    checklist,
    notifications,
    messages,
  };
}

async function ingest() {
  if (!SHOWCASE_PASSWORD) {
    throw new Error('Defina SHOWCASE_PASSWORD para gerar dados de demonstracao.');
  }
  assertStrongPassword(SHOWCASE_PASSWORD, 'SHOWCASE_PASSWORD');

  await ensureDatabaseExists();
  runMigrations();

  const pool = require('../src/config/db');
  const passwordHash = await bcrypt.hash(SHOWCASE_PASSWORD, Number(env.bcryptRounds || 12));
  const baseDate = new Date();
  const assets = createUploadAssets(baseDate);
  const dataset = buildShowcaseDataset(baseDate, assets, passwordHash);

  const client = await pool.connect();
  const ids = {
    users: new Map(),
    clients: new Map(),
    campaigns: new Map(),
    contacts: new Map(),
    tasks: new Map(),
    events: new Map(),
    charges: new Map(),
  };

  try {
    await client.query('BEGIN');

    for (const user of dataset.internalUsers) {
      const userId = await upsertUser(client, user);
      ids.users.set(user.key, userId);
    }

    for (const clientData of dataset.clients) {
      const clientId = await upsertClient(client, {
        ...clientData,
        manager_id: ids.users.get(clientData.manager_key),
      });
      ids.clients.set(clientData.key, clientId);
    }

    for (const campaign of dataset.campaigns) {
      const campaignId = await upsertCampaign(client, {
        ...campaign,
        client_id: ids.clients.get(campaign.client_key),
      });
      ids.campaigns.set(campaign.key, campaignId);
    }

    for (const metric of dataset.metrics) {
      await upsertMetric(client, {
        ...metric,
        campaign_id: ids.campaigns.get(metric.campaign_key),
      });
    }

    for (const report of dataset.reports) {
      await upsertReport(client, {
        ...report,
        client_id: ids.clients.get(report.client_key),
        file_url: assets[report.file_name],
      });
    }

    for (const material of dataset.materials) {
      await upsertMaterial(client, {
        ...material,
        client_id: ids.clients.get(material.client_key),
        campaign_id: ids.campaigns.get(material.campaign_key),
        uploaded_by: ids.users.get(material.uploaded_by_key),
      });
    }

    for (const file of dataset.files) {
      const absolutePath = path.join(env.uploadsDir, file.stored_name);
      await upsertFile(client, {
        ...file,
        client_id: ids.clients.get(file.client_key),
        uploaded_by: ids.users.get(file.uploaded_by_key),
        size: fs.statSync(absolutePath).size,
      });
    }

    for (const contact of dataset.contacts) {
      const contactId = await upsertContact(client, {
        ...contact,
        owner_id: ids.users.get(contact.owner_key),
        assigned_to: ids.users.get(contact.assigned_to_key),
      });
      ids.contacts.set(contact.email.toLowerCase(), contactId);
    }

    for (const invoice of dataset.invoices) {
      await upsertInvoice(client, {
        ...invoice,
        client_id: ids.clients.get(invoice.client_key),
      });
    }

    for (const charge of dataset.charges) {
      const chargeId = await upsertCharge(client, {
        ...charge,
        client_id: ids.clients.get(charge.client_key),
        created_by: ids.users.get(charge.created_by_key),
      });
      ids.charges.set(charge.external_reference, chargeId);
    }

    for (const entry of dataset.costEntries) {
      await upsertCostEntry(client, {
        ...entry,
        client_id: entry.client_key ? ids.clients.get(entry.client_key) : null,
        created_by: ids.users.get(entry.created_by_key),
      });
    }

    for (const integration of dataset.integrations) {
      await upsertIntegration(client, {
        ...integration,
        client_id: ids.clients.get(integration.client_key),
        created_by: ids.users.get(integration.created_by_key),
      });
    }

    for (const task of dataset.tasks) {
      const taskId = await upsertTask(client, {
        ...task,
        client_id: ids.clients.get(task.client_key),
        created_by: ids.users.get(task.created_by_key),
        assigned_to: ids.users.get(task.assigned_keys[0]),
        assigned_user_ids: task.assigned_keys.map((key) => ids.users.get(key)).filter(Boolean),
      });
      ids.tasks.set(task.title, taskId);
    }

    for (const event of dataset.calendarEvents) {
      const eventId = await upsertCalendarEvent(client, {
        ...event,
        created_by: ids.users.get(event.created_by_key),
        updated_by: ids.users.get(event.created_by_key),
      });
      ids.events.set(event.title, eventId);
    }

    await upsertChecklistEntry(client, {
      user_id: ids.users.get(dataset.checklist.user_key),
      checklist_date: toDateOnly(baseDate),
      items: dataset.checklist.today,
      completed_at: null,
      created_at: atTime(baseDate, 8, 0).toISOString(),
      updated_at: atTime(baseDate, 8, 30).toISOString(),
    });

    for (const historyRow of dataset.checklist.history) {
      await upsertChecklistEntry(client, {
        ...historyRow,
        user_id: ids.users.get(dataset.checklist.user_key),
      });
    }

    for (const message of dataset.messages) {
      await upsertMessage(client, {
        ...message,
        sender_id: ids.users.get(message.sender_key),
        receiver_id: ids.users.get(message.receiver_key),
        context_id:
          message.context_type === 'task'
            ? ids.tasks.get(message.context_key)
            : message.context_type === 'client'
              ? ids.clients.get(message.context_key)
              : null,
      });
    }

    for (const notification of dataset.notifications) {
      await upsertNotification(client, {
        ...notification,
        user_id: ids.users.get(notification.user_key),
        entity_id:
          notification.entity_type === 'task'
            ? ids.tasks.get(notification.entity_key)
            : notification.entity_type === 'calendar_event'
              ? ids.events.get(notification.entity_key)
              : notification.entity_type === 'charge'
                ? ids.charges.get(notification.entity_key)
                : null,
      });
    }

    await client.query('COMMIT');

    const summaryStatements = [
      'SELECT COUNT(*)::int AS total FROM users',
      'SELECT COUNT(*)::int AS total FROM clients',
      'SELECT COUNT(*)::int AS total FROM campaigns',
      'SELECT COUNT(*)::int AS total FROM metrics',
      'SELECT COUNT(*)::int AS total FROM tasks',
      'SELECT COUNT(*)::int AS total FROM contacts',
      'SELECT COUNT(*)::int AS total FROM calendar_events',
      'SELECT COUNT(*)::int AS total FROM invoices',
      'SELECT COUNT(*)::int AS total FROM charges',
      'SELECT COUNT(*)::int AS total FROM cost_entries',
      'SELECT COUNT(*)::int AS total FROM notifications',
    ];
    const summaryCounts = [];
    for (const statement of summaryStatements) {
      const result = await client.query(statement);
      summaryCounts.push(result.rows[0].total);
    }

    const [usersCount, clientsCount, campaignsCount, metricsCount, tasksCount, contactsCount, eventsCount, invoicesCount, chargesCount, costsCount, notificationsCount] =
      summaryCounts;

    console.log('');
    console.log('[showcase] Ingestao concluida com sucesso.');
    console.log(`- usuarios: ${usersCount}`);
    console.log(`- clientes: ${clientsCount}`);
    console.log(`- campanhas: ${campaignsCount}`);
    console.log(`- metricas: ${metricsCount}`);
    console.log(`- tarefas: ${tasksCount}`);
    console.log(`- leads/contatos: ${contactsCount}`);
    console.log(`- eventos: ${eventsCount}`);
    console.log(`- faturas: ${invoicesCount}`);
    console.log(`- cobrancas: ${chargesCount}`);
    console.log(`- custos: ${costsCount}`);
    console.log(`- notificacoes: ${notificationsCount}`);
    console.log('');
    console.log('[showcase] Usuarios internos criados com a senha definida em SHOWCASE_PASSWORD.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

ingest().catch((error) => {
  console.error('[showcase] Falha na ingestao:', error);
  process.exitCode = 1;
});
