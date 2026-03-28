const tenantDb = require('../db/tenantDb');
const campaignModel = require('../models/campaignModel');
const invoiceModel = require('../models/invoiceModel');
const materialModel = require('../models/materialModel');
const messageModel = require('../models/messageModel');
const reportModel = require('../models/reportModel');
const taskModel = require('../models/taskModel');
const userModel = require('../models/userModel');
const { hasCapability, sanitizeDashboardSummary } = require('../utils/access');
const { getInternalClientScope, getInternalClientAccessScope } = require('../utils/internalClientScope');

async function getClientDashboard(user) {
  const [
    campaignCountResult,
    revenueResult,
    leadsResult,
    budgetResult,
    campaigns,
    reports,
    materials,
    invoices,
    messages,
    tasks,
    teamResult,
  ] = await Promise.all([
    tenantDb.query(user, {
      table: 'campaigns',
      scopeConfig: {
        client: 'cam.client_id = $TENANT',
      },
      prefix: 'WHERE',
      startIndex: 1,
      sql: 'SELECT COUNT(*) AS campaigns_count FROM campaigns cam __TENANT_SCOPE__',
    }),
    tenantDb.query(user, {
      table: 'metrics',
      scopeConfig: {
        client: 'cam.client_id = $TENANT',
      },
      prefix: 'WHERE',
      startIndex: 1,
      sql: `SELECT COALESCE(SUM(m.revenue), 0) AS revenue
              FROM metrics m
              INNER JOIN campaigns cam ON cam.id = m.campaign_id
              __TENANT_SCOPE__`,
    }),
    tenantDb.query(user, {
      table: 'metrics',
      scopeConfig: {
        client: 'cam.client_id = $TENANT',
      },
      prefix: 'WHERE',
      startIndex: 1,
      sql: `SELECT COALESCE(SUM(m.leads), 0) AS leads
              FROM metrics m
              INNER JOIN campaigns cam ON cam.id = m.campaign_id
              __TENANT_SCOPE__`,
    }),
    tenantDb.query(user, {
      table: 'campaigns',
      scopeConfig: {
        client: 'cam.client_id = $TENANT',
      },
      prefix: 'WHERE',
      startIndex: 1,
      sql: 'SELECT COALESCE(SUM(cam.budget), 0) AS budget FROM campaigns cam __TENANT_SCOPE__',
    }),
    campaignModel.list(user),
    reportModel.list(user),
    materialModel.list(user),
    invoiceModel.list(user),
    messageModel.listForUser(user),
    taskModel.list(user),
    userModel.listActiveInternalTeam(user),
  ]);

  const campaignsCount = Number(campaignCountResult.rows[0]?.campaigns_count || 0);
  const revenue = Number(revenueResult.rows[0]?.revenue || 0);
  const leads = Number(leadsResult.rows[0]?.leads || 0);
  const budget = Number(budgetResult.rows[0]?.budget || 0);
  const roi = budget > 0 ? Number((((revenue - budget) / budget) * 100).toFixed(2)) : 0;

  return {
    mode: 'client',
    summary: {
      campaigns_count: campaignsCount,
      revenue,
      leads,
      roi,
    },
    campaigns,
    reports,
    materials,
    invoices,
    messages,
    tasks,
    team: teamResult,
  };
}

async function getInternalDashboard(user) {
  const [clientsCountResult, campaignsCountResult, openTasksResult, leadsResult, revenueResult, teamResult] = await Promise.all([
    tenantDb.query(user, {
      table: 'clients',
      scopeConfig: {
        client: 'c.id = $TENANT',
        internal: getInternalClientScope('c'),
      },
      prefix: 'WHERE',
      startIndex: 1,
      sql: 'SELECT COUNT(*) AS clients_count FROM clients c __TENANT_SCOPE__',
    }),
    tenantDb.query(user, {
      table: 'campaigns',
      scopeConfig: {
        client: 'c.id = $TENANT',
        internal: getInternalClientScope('c'),
      },
      prefix: 'WHERE',
      startIndex: 1,
      sql: `SELECT COUNT(*) AS campaigns_count
            FROM campaigns cam
            INNER JOIN clients c ON c.id = cam.client_id
            __TENANT_SCOPE__`,
    }),
    tenantDb.query(user, {
      table: 'tasks',
      scopeConfig: {
        client: 't.client_id = $TENANT AND t.assigned_to IS NOT NULL',
        internal: [
          't.assigned_to = $TENANT',
          't.assigned_to IS NULL',
          ...getInternalClientAccessScope('t.client_id'),
        ],
      },
      prefix: 'AND',
      startIndex: 1,
      sql: `SELECT COUNT(*) AS open_tasks
            FROM tasks t
            WHERE t.status <> 'Concluido'
            __TENANT_SCOPE__`,
    }),
    tenantDb.query(user, {
      table: 'metrics',
      scopeConfig: {
        client: 'c.id = $TENANT',
        internal: getInternalClientScope('c'),
      },
      prefix: 'WHERE',
      startIndex: 1,
      sql: `SELECT COALESCE(SUM(m.leads), 0) AS leads
            FROM metrics m
            INNER JOIN campaigns cam ON cam.id = m.campaign_id
            INNER JOIN clients c ON c.id = cam.client_id
            __TENANT_SCOPE__`,
    }),
    tenantDb.query(user, {
      table: 'metrics',
      scopeConfig: {
        client: 'c.id = $TENANT',
        internal: getInternalClientScope('c'),
      },
      prefix: 'WHERE',
      startIndex: 1,
      sql: `SELECT COALESCE(SUM(m.revenue), 0) AS revenue
            FROM metrics m
            INNER JOIN campaigns cam ON cam.id = m.campaign_id
            INNER JOIN clients c ON c.id = cam.client_id
            __TENANT_SCOPE__`,
    }),
    hasCapability(user, 'view_dashboard_team') ? userModel.listActiveInternalTeam(user) : Promise.resolve([]),
  ]);

  return {
    mode: 'internal',
    summary: sanitizeDashboardSummary(
      {
        clients_count: Number(clientsCountResult.rows[0]?.clients_count || 0),
        campaigns_count: Number(campaignsCountResult.rows[0]?.campaigns_count || 0),
        open_tasks: Number(openTasksResult.rows[0]?.open_tasks || 0),
        leads: Number(leadsResult.rows[0]?.leads || 0),
        revenue: Number(revenueResult.rows[0]?.revenue || 0),
      },
      user
    ),
    widgets: {
      financial: hasCapability(user, 'view_dashboard_financial'),
      team: hasCapability(user, 'view_dashboard_team'),
    },
    team: teamResult,
  };
}

async function getDashboard(user) {
  return user.role === 'client' ? getClientDashboard(user) : getInternalDashboard(user);
}

module.exports = {
  getDashboard,
};
