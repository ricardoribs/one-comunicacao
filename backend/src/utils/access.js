const AppError = require('./AppError');
const clientModel = require('../models/clientModel');
const contactModel = require('../models/contactModel');
const userModel = require('../models/userModel');

const INTERNAL_ROLES = new Set(['admin', 'gestor', 'designer', 'comercial', 'dev']);

const ROLE_CAPABILITIES = {
  admin: {
    view_dashboard: true,
    view_dashboard_financial: true,
    view_dashboard_team: true,
    view_internal_directory: true,
    view_calendar_events: true,
    manage_calendar_events: true,
    view_clients: true,
    view_clients_sensitive: true,
    manage_clients: true,
    view_contacts: true,
    manage_contacts: true,
    view_campaigns: true,
    view_campaign_financials: true,
    manage_campaigns: true,
    view_tasks: true,
    manage_tasks: true,
    view_materials: true,
    manage_materials: true,
    view_files: true,
    manage_files: true,
    view_reports: true,
    view_metrics: true,
    view_invoices: true,
    manage_invoices: true,
    view_charges: true,
    manage_charges: true,
    send_messages: true,
  },
  gestor: {
    view_dashboard: true,
    view_dashboard_financial: false,
    view_dashboard_team: true,
    view_internal_directory: true,
    view_calendar_events: true,
    manage_calendar_events: true,
    view_clients: true,
    view_clients_sensitive: true,
    manage_clients: true,
    view_contacts: true,
    manage_contacts: true,
    view_campaigns: true,
    view_campaign_financials: true,
    manage_campaigns: true,
    view_tasks: true,
    manage_tasks: true,
    view_materials: true,
    manage_materials: true,
    view_files: true,
    manage_files: true,
    view_reports: true,
    view_metrics: true,
    view_invoices: false,
    manage_invoices: false,
    view_charges: true,
    manage_charges: true,
    send_messages: true,
  },
  designer: {
    view_dashboard: true,
    view_dashboard_financial: false,
    view_dashboard_team: false,
    view_internal_directory: true,
    view_calendar_events: true,
    manage_calendar_events: false,
    view_clients: true,
    view_clients_sensitive: false,
    manage_clients: false,
    view_contacts: false,
    manage_contacts: false,
    view_campaigns: true,
    view_campaign_financials: false,
    manage_campaigns: false,
    view_tasks: true,
    manage_tasks: true,
    view_materials: true,
    manage_materials: true,
    view_files: true,
    manage_files: true,
    view_reports: true,
    view_metrics: false,
    view_invoices: false,
    manage_invoices: false,
    view_charges: false,
    manage_charges: false,
    send_messages: true,
  },
  comercial: {
    view_dashboard: true,
    view_dashboard_financial: true,
    view_dashboard_team: false,
    view_internal_directory: true,
    view_calendar_events: true,
    manage_calendar_events: false,
    view_clients: true,
    view_clients_sensitive: true,
    manage_clients: true,
    view_contacts: true,
    manage_contacts: true,
    view_campaigns: true,
    view_campaign_financials: true,
    manage_campaigns: true,
    view_tasks: true,
    manage_tasks: true,
    view_materials: true,
    manage_materials: false,
    view_files: true,
    manage_files: false,
    view_reports: true,
    view_metrics: false,
    view_invoices: true,
    manage_invoices: true,
    view_charges: true,
    manage_charges: true,
    send_messages: true,
  },
  dev: {
    view_dashboard: true,
    view_dashboard_financial: false,
    view_dashboard_team: false,
    view_internal_directory: true,
    view_calendar_events: true,
    manage_calendar_events: false,
    view_clients: true,
    view_clients_sensitive: false,
    manage_clients: false,
    view_contacts: false,
    manage_contacts: false,
    view_campaigns: false,
    view_campaign_financials: false,
    manage_campaigns: false,
    view_tasks: true,
    manage_tasks: true,
    view_materials: true,
    manage_materials: false,
    view_files: true,
    manage_files: false,
    view_reports: true,
    view_metrics: true,
    view_invoices: false,
    manage_invoices: false,
    view_charges: false,
    manage_charges: false,
    send_messages: true,
  },
};

function isAdmin(user) {
  return user.role === 'admin';
}

function isClient(user) {
  return user.role === 'client';
}

function getRoleCapabilities(userOrRole) {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return ROLE_CAPABILITIES[role] || {};
}

function hasCapability(userOrRole, capability) {
  return Boolean(getRoleCapabilities(userOrRole)[capability]);
}

function ensureCapability(user, capability) {
  if (!hasCapability(user, capability)) {
    throw new AppError('Acesso negado para este perfil.', 403);
  }
}

function sanitizeClientForUser(record, user) {
  if (!record || hasCapability(user, 'view_clients_sensitive')) {
    return record;
  }

  return {
    id: record.id,
    name: record.name,
    company: record.company,
    plan: record.plan,
    segment: record.segment,
    started_at: record.started_at,
    brand_manual: record.brand_manual,
    campaigns_count: record.campaigns_count,
    created_at: record.created_at,
  };
}

function sanitizeCampaignForUser(record, user) {
  if (!record || hasCapability(user, 'view_campaign_financials')) {
    return record;
  }

  return {
    id: record.id,
    client_id: record.client_id,
    name: record.name,
    channel: record.channel,
    audience: record.audience,
    pipeline_stage: record.pipeline_stage,
    start_date: record.start_date,
    end_date: record.end_date,
    status: record.status,
    client_name: record.client_name,
    client_company: record.client_company,
    created_at: record.created_at,
  };
}

function sanitizeDashboardSummary(summary, user) {
  const safeSummary = {
    clients_count: Number(summary?.clients_count || 0),
    campaigns_count: Number(summary?.campaigns_count || 0),
    open_tasks: Number(summary?.open_tasks || 0),
    leads: Number(summary?.leads || 0),
    revenue: Number(summary?.revenue || 0),
  };

  if (!hasCapability(user, 'view_contacts')) {
    safeSummary.leads = 0;
  }

  if (!hasCapability(user, 'view_dashboard_financial')) {
    safeSummary.revenue = 0;
  }

  return safeSummary;
}

async function canAccessClient(user, clientId) {
  if (!clientId) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (isClient(user)) {
    return Number(user.client_id) === Number(clientId);
  }

  return Boolean(await clientModel.findById(clientId, user));
}

async function ensureClientAccess(user, clientId) {
  const allowed = await canAccessClient(user, clientId);
  if (!allowed) {
    throw new AppError('Acesso negado para este cliente.', 403);
  }
}

async function canAccessContact(user, contactId) {
  if (!contactId || isClient(user)) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  return Boolean(await contactModel.findById(contactId, user));
}

async function ensureContactAccess(user, contactId) {
  if (!(await canAccessContact(user, contactId))) {
    throw new AppError('Acesso negado para este lead.', 403);
  }

  return contactModel.findById(contactId, user);
}

async function ensureMessageTargetAccess(user, receiverId) {
  const target = await userModel.findById(receiverId);

  if (!target || target.is_active === false) {
    throw new AppError('Destinatário não encontrado.', 404);
  }

  if (Number(target.id) === Number(user.id)) {
    return target;
  }

  const targetIsInternal = INTERNAL_ROLES.has(target.role);

  if (user.role === 'client') {
    if (!targetIsInternal || !user.client_id) {
      throw new AppError('Sem permissão para enviar mensagem para este destinatário.', 403);
    }

    const scopedInternalUsers = await userModel.listActiveInternalTeam(user);
    const canReachTarget = scopedInternalUsers.some((internalUser) => Number(internalUser.id) === Number(target.id));

    if (!canReachTarget) {
      throw new AppError('Sem permissão para enviar mensagem para este destinatário.', 403);
    }

    return target;
  }

  if (targetIsInternal) {
    return target;
  }

  if (!target.client_id) {
    throw new AppError('Sem permissão para enviar mensagem para este destinatário.', 403);
  }

  await ensureClientAccess(user, target.client_id);
  return target;
}

module.exports = {
  ROLE_CAPABILITIES,
  isAdmin,
  isClient,
  getRoleCapabilities,
  hasCapability,
  ensureCapability,
  sanitizeClientForUser,
  sanitizeCampaignForUser,
  sanitizeDashboardSummary,
  canAccessClient,
  canAccessContact,
  ensureClientAccess,
  ensureContactAccess,
  ensureMessageTargetAccess,
};
