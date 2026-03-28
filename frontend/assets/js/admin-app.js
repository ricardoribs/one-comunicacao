const API_BASE = window.ONE_CONFIG?.apiBase || "/api";
const APP = window.ONE_APP;
const FORM = window.FormUtils || window.ONE_FORM;
const INTERNAL_HANDOFF_KEY = "one_internal_handoff";
const ROLE_LABELS = {
  admin: "Admin",
  gestor: "Gestor",
  designer: "Designer",
  comercial: "Comercial",
  dev: "Desenvolvimento",
  client: "Cliente"
};

const INTEGRATION_PROVIDERS = [
  { key: "ga4", name: "Google Analytics 4" },
  { key: "meta_business", name: "Meta Business Suite" },
  { key: "search_console", name: "Google Search Console" },
  { key: "power_bi", name: "Power BI" },
  { key: "looker_studio", name: "Looker Studio" }
];

const INTEGRATION_STATUS_LABELS = {
  connected: "Conectado",
  configuring: "Configurando",
  error: "Erro",
  disconnected: "Desconectado"
};

const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
];

const PIPELINE_STAGE_LABELS = {
  "Prospeccao": "Prospecção",
  "Prospecção": "Prospecção",
  "Contato feito": "Contato feito",
  "Proposta": "Proposta",
  "Negociacao": "Negociação",
  "Negociação": "Negociação",
  "Fechado": "Fechado"
};

const PAGE_ACCESS = {
  admin: ["home", "kanban", "crm", "campanhas", "producao", "trafego", "analytics", "financeiro", "acesso"],
  gestor: ["home", "kanban", "crm", "campanhas", "producao", "trafego", "analytics"],
  designer: ["home", "kanban", "producao"],
  comercial: ["home", "kanban", "crm", "campanhas", "producao", "financeiro"],
  dev: ["home", "kanban", "producao", "analytics"]
};

const ROLE_DATA_ACCESS = {
  admin: {
    manageTasks: true,
    manageClients: true,
    manageMaterials: true,
    homeFinancial: true,
    homeTeam: true,
    assignableUsers: true,
    clients: true,
    contacts: true,
    campaigns: true,
    tasks: true,
    users: true,
    charges: true,
    invoices: true,
    metrics: true,
    reports: true,
    materials: true,
    files: true,
    integrations: true
  },
  gestor: {
    manageTasks: true,
    manageClients: true,
    manageMaterials: true,
    homeFinancial: false,
    homeTeam: true,
    assignableUsers: true,
    clients: true,
    contacts: true,
    campaigns: true,
    tasks: true,
    users: false,
    charges: true,
    invoices: false,
    metrics: true,
    reports: true,
    materials: true,
    files: true,
    integrations: true
  },
  designer: {
    manageTasks: true,
    manageClients: false,
    manageMaterials: true,
    homeFinancial: false,
    homeTeam: false,
    assignableUsers: true,
    clients: true,
    contacts: false,
    campaigns: true,
    tasks: true,
    users: false,
    charges: false,
    invoices: false,
    metrics: false,
    reports: true,
    materials: true,
    files: true,
    integrations: false
  },
  comercial: {
    manageTasks: true,
    manageClients: true,
    manageMaterials: false,
    homeFinancial: true,
    homeTeam: false,
    assignableUsers: true,
    clients: true,
    contacts: true,
    campaigns: true,
    tasks: true,
    users: false,
    charges: true,
    invoices: true,
    metrics: false,
    reports: true,
    materials: true,
    files: true,
    integrations: false
  },
  dev: {
    manageTasks: true,
    manageClients: false,
    manageMaterials: false,
    homeFinancial: false,
    homeTeam: false,
    assignableUsers: true,
    clients: true,
    contacts: false,
    campaigns: false,
    tasks: true,
    users: false,
    charges: false,
    invoices: false,
    metrics: true,
    reports: true,
    materials: true,
    files: true,
    integrations: true
  }
};

const TASK_TYPE_LABELS = {
  geral: "Geral",
  design: "Design",
  revisao_design: "Revisão Design",
  captacao: "Captação",
  edicao: "Edição",
  social_media: "Social Media",
  atendimento: "Atendimento",
  financeiro: "Financeiro",
  adm: "ADM",
  reuniao_estrategica: "Reunião Estratégica"
};

const state = {
  session: null,
  dashboard: null,
  team: [],
  assignableUsers: [],
  integrations: [],
  clients: [],
  campaigns: [],
  tasks: [],
  users: [],
  contacts: [],
  charges: [],
  invoices: [],
  metrics: [],
  reports: [],
  materials: [],
  files: [],
  checklist: null,
  activePage: "home",
  filters: {
    kanbanClient: "",
    analyticsClient: "",
    analyticsPeriod: ""
  }
};

const UI = {
  empty: (msg = "Nenhum registro disponível", sub = "") => `
    <div class="empty-state">
      <div class="empty-state-icon">○</div>
      <div class="empty-state-title">${msg}</div>
      ${sub ? `<div class="empty-state-sub">${sub}</div>` : ""}
    </div>`,

  tableEmpty: (cols, msg = "Nenhum registro disponível", sub = "") => `
    <tr>
      <td colspan="${cols}">
        <div class="empty-state">
          <div class="empty-state-icon">○</div>
          <div class="empty-state-title">${msg}</div>
          ${sub ? `<div class="empty-state-sub">${sub}</div>` : ""}
        </div>
      </td>
    </tr>`,

  skeletonRows: (cols = 4, rows = 3) =>
    Array.from(
      { length: rows },
      () => `
        <tr>${Array.from(
          { length: cols },
          () => `<td><div class="skeleton skeleton-text" style="width:${60 + ((Math.random() * 30) | 0)}%"></div></td>`
        ).join("")}</tr>
      `
    ).join(""),

  skeletonKpis: (n = 4) =>
    Array.from(
      { length: n },
      () => `
        <div class="kpi-card">
          <div class="skeleton skeleton-text" style="width:60%"></div>
          <div class="skeleton skeleton-kpi"></div>
          <div class="skeleton skeleton-text" style="width:40%"></div>
        </div>
      `
    ).join("")
};
let lastFocusedElement = null;
const MOBILE_BREAKPOINT = 768;
let lastSidebarTouchAt = 0;

function trapModalFocus(event) {
  const overlay = document.getElementById("modal-overlay");
  if (!overlay?.classList.contains("open") || event.key !== "Tab") {
    return;
  }

  const focusable = overlay.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (!focusable.length) {
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function parseInlineArgs(rawArgs) {
  if (!rawArgs.trim()) {
    return [];
  }

  return rawArgs.split(",").map((item) => item.trim()).map((item) => {
    if ((item.startsWith("'") && item.endsWith("'")) || (item.startsWith('"') && item.endsWith('"'))) {
      return item.slice(1, -1);
    }
    if (item === "event") {
      return "__event__";
    }
    if (item === "this.value") {
      return "__this_value__";
    }
    if (/^-?\d+$/.test(item)) {
      return Number(item);
    }
    return item;
  });
}

function executeInlineAction(action, event, element) {
  const match = action.match(/^([a-zA-Z_$][\w$]*)\((.*)\)$/);
  if (!match) {
    return false;
  }

  const [, fnName, rawArgs] = match;
  const args = parseInlineArgs(rawArgs).map((arg) => {
    if (arg === "__event__") {
      return event;
    }
    if (arg === "__this_value__") {
      return element.value;
    }
    return arg;
  });

  const handlers = {
    doLogin,
    doLogout,
    goTo,
    goToTab,
    openModal,
    setTab,
    filterKanban,
    closeModal,
    closeModalIfBg,
    setAnalyticsClientFilter,
    setAnalyticsPeriodFilter,
    updateInvoiceStatus,
    updateChargeStatus,
    exportFinanceCsv,
    syncTrafficData,
    openChargeResource,
    copyChargePix,
    deleteClient,
    deleteLead,
    convertLead,
    openChargeModalForClient,
    deleteCampaign,
    deleteTask,
    deleteMaterial,
    deleteIntegration,
    deleteUser,
    showToast,
    openProtectedResource
  };

  const handler = handlers[fnName];
  if (!handler) {
    return false;
  }

  handler(...args);
  return true;
}

function bindLegacyInlineHandlers(root = document) {
  root.querySelectorAll("[onclick]").forEach((element) => {
    if (element.dataset.boundClick === "1") {
      return;
    }
    const action = element.getAttribute("onclick");
    element.addEventListener("click", (event) => {
      executeInlineAction(action, event, element);
    });
    element.dataset.boundClick = "1";
    element.removeAttribute("onclick");
  });

  root.querySelectorAll("[onchange]").forEach((element) => {
    if (element.dataset.boundChange === "1") {
      return;
    }
    const action = element.getAttribute("onchange");
    element.addEventListener("change", (event) => {
      executeInlineAction(action, event, element);
    });
    element.dataset.boundChange = "1";
    element.removeAttribute("onchange");
  });
}

function hasRoleDataAccess(capability) {
  return Boolean(ROLE_DATA_ACCESS[state.session?.user?.role]?.[capability]);
}

function canManageTasks() {
  return hasRoleDataAccess("manageTasks");
}

function canManageClients() {
  return hasRoleDataAccess("manageClients");
}

function canManageMaterials() {
  return hasRoleDataAccess("manageMaterials");
}

function canDeleteTasks() {
  return state.session?.user?.role === "admin";
}

function getScopedClientOptions() {
  if (state.clients.length) {
    return state.clients.map((client) => ({ id: client.id, name: client.name }));
  }

  const sources = [state.tasks, state.metrics, state.materials, state.campaigns];
  const seen = new Map();

  sources.forEach((records) => {
    records.forEach((record) => {
      if (!record?.client_id || !record?.client_name) {
        return;
      }

      const key = String(record.client_id);
      if (!seen.has(key)) {
        seen.set(key, { id: record.client_id, name: record.client_name });
      }
    });
  });

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function hasScopedClients() {
  return getScopedClientOptions().length > 0;
}

function canManageIntegrations() {
  return ["admin", "gestor"].includes(state.session?.user?.role);
}

function getIntegrationProviderLabel(providerKey) {
  return INTEGRATION_PROVIDERS.find((provider) => provider.key === providerKey)?.name || providerKey || "-";
}

function integrationProviderOptions(selectedKey) {
  return INTEGRATION_PROVIDERS.map(
    (provider) => `<option value="${provider.key}" ${provider.key === selectedKey ? "selected" : ""}>${provider.name}</option>`
  ).join("");
}

function getIntegrationStatusBadgeClass(status) {
  if (status === "connected") {
    return "badge-green";
  }
  if (status === "configuring") {
    return "badge-yellow";
  }
  if (status === "error") {
    return "badge-pink";
  }
  return "badge-gray";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60000);
  return normalized.toISOString().slice(0, 16);
}

function getFilteredIntegrations() {
  return state.integrations.filter((integration) => {
    if (!state.filters.analyticsClient) {
      return true;
    }

    return String(integration.client_id) === String(state.filters.analyticsClient);
  });
}

function saveSession(session) {
  APP.saveSession(session);
  state.session = session;
}

function clearSession() {
  APP.clearSession();
  state.session = null;
}

function loadInternalHandoff() {
  try {
    return JSON.parse(sessionStorage.getItem(INTERNAL_HANDOFF_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function clearInternalHandoff() {
  sessionStorage.removeItem(INTERNAL_HANDOFF_KEY);
}

async function apiFetch(path, options = {}) {
  const data = await APP.fetchJson(path, options);
  const session = APP.loadSession();
  if (session) {
    state.session = session;
  }
  return data;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createEmptyDashboard() {
  return {
    mode: "internal",
    team: [],
    campaigns: [],
    reports: [],
    materials: [],
    invoices: [],
    tasks: [],
    messages: [],
    widgets: {
      financial: false,
      team: false
    },
    summary: {
      clients_count: 0,
      campaigns_count: 0,
      leads: 0,
      revenue: 0,
      open_tasks: 0
    }
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatLeadCount(value) {
  const count = Number(value || 0);
  return `${count} ${count === 1 ? "lead" : "leads"}`;
}

function normalizePipelineStage(stage) {
  return PIPELINE_STAGE_LABELS[String(stage || "").trim()] || String(stage || "").trim();
}

function formatCurrencyValue(value) {
  return formatCurrency(Number(value || 0));
}

function normalizeDateKey(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function isOverdueDate(value) {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) {
    return false;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  return dateKey < todayKey;
}

function formatTaskTypeLabel(type) {
  const normalized = String(type || "geral").trim();
  return TASK_TYPE_LABELS[normalized] || normalized;
}

function taskTypeOptions(selected = "") {
  const normalized = String(selected || "geral").trim();
  const knownOptions = Object.entries(TASK_TYPE_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${normalized === value ? "selected" : ""}>${label}</option>`
    )
    .join("");

  if (normalized && !TASK_TYPE_LABELS[normalized]) {
    return `${knownOptions}<option value="${escapeHtml(normalized)}" selected>${escapeHtml(normalized)}</option>`;
  }

  return knownOptions;
}

function mergeInternalUsers(...sources) {
  const merged = new Map();

  sources
    .filter(Array.isArray)
    .flat()
    .filter((user) => user && user.role && user.role !== "client")
    .forEach((user) => {
      const key = String(user.id || user.email || user.name || Math.random());
      const current = merged.get(key) || {};
      merged.set(key, {
        ...current,
        ...user,
        is_active: user.is_active !== false && current.is_active !== false
      });
    });

  return [...merged.values()].sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "pt-BR"));
}

function sumBy(records, getter) {
  return records.reduce((total, record) => total + Number(getter(record) || 0), 0);
}

function averageBy(records, getter) {
  if (!records.length) {
    return 0;
  }

  return sumBy(records, getter) / records.length;
}

function getActiveCampaigns() {
  return state.campaigns.filter((campaign) => String(campaign.status || "").toLowerCase() === "ativa");
}

function getTrafficMetricsForCampaigns(campaigns) {
  if (!campaigns.length) {
    return [];
  }

  const campaignIds = new Set(campaigns.map((campaign) => Number(campaign.id)));
  return state.metrics.filter((metric) => campaignIds.has(Number(metric.campaign_id)));
}

function renderKpiCards(container, cards) {
  if (!container) {
    return;
  }

  container.innerHTML = cards
    .map(
      (item) => `
        <div class="kpi-card">
          <div class="kpi-label">${item.label}</div>
          <div class="kpi-val">${item.value}</div>
          <div class="kpi-sub${item.subClass ? ` ${item.subClass}` : ""}">${item.sub}</div>
        </div>
      `
    )
    .join("");
}

function setSidebarCount(page, value) {
  const countNode = document.querySelector(`.sb-link[data-page="${page}"] .count`);
  if (!countNode) {
    return;
  }

  const total = Number(value || 0);
  if (total <= 0) {
    countNode.textContent = "0";
    countNode.style.display = "none";
    return;
  }

  countNode.textContent = formatNumber(total);
  countNode.style.display = "inline-flex";
}

function renderSidebarCounts() {
  const openTasks = state.tasks.filter((task) => task.status !== "Concluido").length;
  const productionItems = state.materials.length + state.files.length + state.reports.length;

  setSidebarCount("kanban", openTasks);
  setSidebarCount("producao", productionItems);
}

function getAverageSalesCycleDays(contacts) {
  const cycleDurations = contacts
    .map((contact) => {
      const createdAt = contact.created_at ? new Date(contact.created_at) : null;
      const updatedAt = contact.updated_at ? new Date(contact.updated_at) : null;
      if (!createdAt || !updatedAt || Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) {
        return null;
      }

      const diff = updatedAt.getTime() - createdAt.getTime();
      return diff >= 0 ? Math.round(diff / 86400000) : null;
    })
    .filter((value) => Number.isFinite(value));

  return cycleDurations.length ? Math.round(averageBy(cycleDurations, (value) => value)) : 0;
}

function getValueToneClass(value) {
  return Number(value || 0) === 0 ? "value-zero" : "value-strong";
}

function normalizeMaterialStatus(status) {
  const raw = String(status || "").trim();
  if (raw === "Revisao") return "Revisão";
  if (raw === "Concluido") return "Concluído";
  return raw;
}

function normalizeChargeStatus(status) {
  const raw = String(status || "").trim().toUpperCase();
  if (raw === "RECEIVED" || raw === "PAID") return "Recebida";
  if (raw === "PENDING") return "Pendente";
  return String(status || "").trim();
}

function getChannelBadgeClass(channel) {
  const value = String(channel || "").toLowerCase();
  if (value.includes("google")) return "badge-gray";
  if (value.includes("meta") || value.includes("facebook")) return "badge-blue";
  if (value.includes("instagram")) return "badge-pink";
  return "badge-gray";
}

function getCampaignStatusBadgeClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "ativa") return "badge-green";
  if (value === "pausada") return "badge-yellow";
  return "badge-gray";
}

function getScoreBadgeClass(value) {
  const score = Number(value || 0);
  if (score >= 90) return "badge-green";
  if (score >= 70) return "badge-yellow";
  return "badge-gray";
}

function getRoleBadgeClass(role) {
  return role === "admin"
    ? "rb-admin"
    : role === "gestor"
      ? "rb-gestor"
      : role === "designer"
        ? "rb-designer"
        : role === "comercial"
          ? "rb-comercial"
          : "rb-dev";
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((piece) => piece[0])
    .join("")
    .slice(0, 2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDeadlineClass(task) {
  const dueDateValue = task.due_date || task.deadline;
  if (task.status === "Concluido" || !dueDateValue) {
    return "deadline-ok";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dueDateValue);
  dueDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(dueDate.getTime())) {
    return "deadline-soon";
  }

  const diffDays = Math.round((dueDate - today) / 86400000);
  if (diffDays < 0) {
    return "deadline-late";
  }
  if (diffDays <= 2) {
    return "deadline-soon";
  }
  return "deadline-ok";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeInlineMessage(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function openProtectedResource(url) {
  try {
    await APP.openAuthorizedUrl(url);
  } catch (error) {
    showToast(error.message);
  }
}

function renderResourceAction(
  url,
  {
    label = "Abrir",
    className = "btn btn-ghost btn-sm",
    missingMessage = "Arquivo ainda não disponível."
  } = {}
) {
  if (url) {
    if (url.startsWith("/api/files/")) {
      return `<button type="button" class="${className}" onclick="openProtectedResource('${escapeInlineMessage(
        url
      )}')">${label}</button>`;
    }

    return `<a class="${className}" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  return `<button type="button" class="${className}" onclick="showToast('${escapeInlineMessage(
    missingMessage
  )}')">${label}</button>`;
}

function renderMemberRow(user, currentUserId) {
  const lastAccess = user.last_login_at ? formatDate(user.last_login_at) : "Nunca";
  return `
    <tr>
      <td class="cell-stack"><div class="row"><div class="avatar av-pink">${getInitials(user.name)}</div><strong class="cell-title" title="${escapeHtml(user.name)}">${user.name}</strong></div></td>
      <td><span class="sb-role-badge ${getRoleBadgeClass(user.role)}">${ROLE_LABELS[user.role] || user.role}</span></td>
      <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(user.email)}">${user.email}</span></td>
      <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(lastAccess)}">${lastAccess}</span></td>
      <td><span class="badge ${user.is_active ? "badge-green" : "badge-gray"}">${user.is_active ? "Ativo" : "Inativo"}</span></td>
      <td class="cell-actions">
        <div class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="openModal('novo-membro', ${user.id})">Editar</button>
          ${user.id !== currentUserId ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Remover</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function renderRoleCard(role, permissions) {
  const badgeClass =
    role === "Admin"
      ? "rb-admin"
      : role === "Gestor"
        ? "rb-gestor"
        : role === "Comercial"
          ? "rb-comercial"
          : role === "Dev"
            ? "rb-dev"
            : "rb-designer";

  return `
    <div class="access-card">
      <div class="access-card-header">
        <span class="access-card-title">${role}</span>
        <span class="sb-role-badge ${badgeClass}">${role}</span>
      </div>
      <div class="perm-list">
        ${permissions.map((permission) => `<div class="perm-row"><span class="perm-label">${permission}</span></div>`).join("")}
      </div>
    </div>
  `;
}

function setRoleUI(user) {
  document.getElementById("sb-name").textContent = user.name;
  document.getElementById("sb-role-label").textContent = "";
  const badge = document.getElementById("sb-badge");
  badge.textContent = ROLE_LABELS[user.role] || user.role;
  badge.className = `sb-role-badge ${getRoleBadgeClass(user.role)}`;
  document.getElementById("home-welcome").textContent = `Olá, ${user.name}.`;
}

function isMobileViewport() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function bindSidebarInteractions() {
  const toggle = document.getElementById("mobile-nav-toggle");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (!toggle || !backdrop) {
    return;
  }

  if (toggle.dataset.boundSidebar !== "1") {
    const handleToggle = (event) => {
      if (event.type === "click" && Date.now() - lastSidebarTouchAt < 500) {
        return;
      }
      if (event.type === "touchend") {
        lastSidebarTouchAt = Date.now();
      }
      event.preventDefault();
      event.stopPropagation();
      toggleSidebar();
    };

    toggle.addEventListener("click", handleToggle);
    toggle.addEventListener("touchend", handleToggle, { passive: false });
    toggle.dataset.boundSidebar = "1";
  }

  if (backdrop.dataset.boundSidebar !== "1") {
    const handleClose = (event) => {
      if (event.type === "click" && Date.now() - lastSidebarTouchAt < 500) {
        return;
      }
      if (event.type === "touchend") {
        lastSidebarTouchAt = Date.now();
      }
      event.preventDefault();
      event.stopPropagation();
      closeSidebar();
    };

    backdrop.addEventListener("click", handleClose);
    backdrop.addEventListener("touchend", handleClose, { passive: false });
    backdrop.dataset.boundSidebar = "1";
  }
}

function syncSidebarShell() {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("mobile-nav-toggle");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (!sidebar || !toggle || !backdrop) {
    return;
  }

  if (!isMobileViewport()) {
    sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir navegação");
    backdrop.setAttribute("aria-hidden", "true");
    return;
  }

  const isOpen = sidebar.classList.contains("open");
  document.body.classList.toggle("sidebar-open", isOpen);
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  toggle.setAttribute("aria-label", isOpen ? "Fechar navegação" : "Abrir navegação");
  backdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar || !isMobileViewport()) {
    return;
  }

  const shouldOpen = typeof forceState === "boolean" ? forceState : !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", shouldOpen);
  syncSidebarShell();
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) {
    return;
  }

  sidebar.classList.remove("open");
  syncSidebarShell();
}

function syncNavigation() {
  const allowed = PAGE_ACCESS[state.session.user.role] || [];
  document.querySelectorAll(".sb-link").forEach((link) => {
    const page = link.dataset.page;
    link.style.display = allowed.includes(page) ? "flex" : "none";
    link.classList.toggle("active", page === state.activePage);
  });

  document.querySelectorAll(".sb-section").forEach((section) => {
    let next = section.nextElementSibling;
    let hasVisibleLinks = false;

    while (next && !next.classList.contains("sb-section") && !next.classList.contains("sb-footer")) {
      if (next.classList.contains("sb-link") && next.style.display !== "none") {
        hasVisibleLinks = true;
        break;
      }
      next = next.nextElementSibling;
    }

    section.style.display = hasVisibleLinks ? "" : "none";
  });

  document.querySelectorAll(".app-screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `page-${state.activePage}`);
  });
}

function goTo(page) {
  const allowed = PAGE_ACCESS[state.session.user.role] || [];
  if (!allowed.includes(page)) {
    showToast("Acesso não permitido para este perfil.");
    return false;
  }

  state.activePage = page;
  syncNavigation();
  closeSidebar();
  return true;
}

function goToTab(page, group, tab) {
  if (!goTo(page)) {
    return false;
  }

  if (group && tab) {
    setTab(group, tab);
  }

  return true;
}

function bindHomeCardInteractions(container) {
  if (!container) {
    return;
  }

  container.querySelectorAll("[data-home-page]").forEach((card) => {
    if (card.dataset.boundHomeNav === "1") {
      return;
    }

    card.addEventListener("click", () => {
      const page = card.dataset.homePage;
      const group = card.dataset.homeGroup;
      const tab = card.dataset.homeTab;

      if (!page) {
        return;
      }

      if (group && tab) {
        goToTab(page, group, tab);
        return;
      }

      goTo(page);
    });

    card.dataset.boundHomeNav = "1";
  });
}

function renderBarChart(containerId, values, labels, formatter) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  if (!values.length || !labels.length) {
    container.innerHTML = UI.empty("Ainda não há dados suficientes", "Os gráficos serão exibidos assim que houver base consolidada para leitura.");
    return;
  }

  const max = Math.max(...values, 1);
  container.innerHTML = values
    .map(
      (value, index) => `
        <div class="bar-item">
          <div class="bar-meta">
            <div class="bar-label">${labels[index]}</div>
            <div class="bar-val">${formatter(value)}</div>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${((value / max) * 100).toFixed(1)}%"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderHome() {
  const newTaskButton = document.querySelector("#page-home .topbar-actions .btn-pink");
  if (newTaskButton) {
    newTaskButton.style.display = hasRoleDataAccess("manageTasks") ? "" : "none";
  }

  const grid = document.querySelector("#page-home .kpi-grid");
  if (grid && state.dashboard) {
    const openTasks = state.tasks.filter((task) => task.status !== "Concluido").length;
    const homeCards = [
      {
        label: "Clientes Ativos",
        value: state.dashboard.summary.clients_count,
        sub: hasRoleDataAccess("clients")
          ? `${
              state.clients.length
                ? `${state.clients.length} cadastrados`
                : `${Number(state.dashboard.summary.clients_count || 0)} no escopo atual`
            }`
          : "escopo atual do perfil",
        page: "crm",
        tabGroup: "crm",
        tab: "clientes"
      },
      {
        label: "Campanhas",
        value: state.dashboard.summary.campaigns_count,
        sub: `${state.campaigns.length} registradas`,
        page: "campanhas"
      }
    ];

    if (hasRoleDataAccess("contacts")) {
      homeCards.push({
        label: "Leads",
        value: state.dashboard.summary.leads,
        sub: `${state.contacts.length} contatos capturados`,
        page: "crm",
        tabGroup: "crm",
        tab: "pipeline"
      });
    } else {
      homeCards.push({
        label: "Tarefas abertas",
        value: state.dashboard.summary.open_tasks || openTasks,
        sub: `${openTasks} em acompanhamento`,
        page: "kanban"
      });
    }

    if (hasRoleDataAccess("homeFinancial")) {
      homeCards.push({
        label: "Faturamento",
        value: formatCurrency(state.dashboard.summary.revenue),
        sub: `${state.invoices.length} faturas no sistema`,
        page: "financeiro"
      });
    } else if (hasRoleDataAccess("materials")) {
      homeCards.push({
        label: "Entregas",
        value: state.materials.length,
        sub: `${state.reports.length} relatórios disponíveis`,
        page: "producao"
      });
    } else if (hasRoleDataAccess("metrics")) {
      homeCards.push({
        label: "Métricas",
        value: state.metrics.length,
        sub: `${state.metrics.filter((metric) => Number(metric.leads || 0) > 0).length} com leads`,
        page: "analytics"
      });
    } else {
      homeCards.push({ label: "Arquivos", value: state.files.length, sub: "base operacional do perfil" });
    }

    grid.innerHTML = homeCards
      .map(
        (item) => `
          <button
            type="button"
            class="kpi-card${item.page ? " kpi-card-link" : ""}"
            ${item.page ? `data-home-page="${item.page}"` : "disabled"}
            ${item.tabGroup ? `data-home-group="${item.tabGroup}"` : ""}
            ${item.tab ? `data-home-tab="${item.tab}"` : ""}
            ${item.page ? `aria-label="Abrir ${item.label}"` : `aria-disabled="true" tabindex="-1"`}
          >
            <div class="kpi-label">${item.label}</div>
            <div class="kpi-val">${item.label === "Faturamento" ? item.value : formatNumber(item.value)}</div>
            <div class="kpi-sub">${item.sub}</div>
          </button>
        `
      )
      .join("");
    bindHomeCardInteractions(grid);
  }

  const topCards = document.querySelectorAll("#page-home .two-col .card");
  if (topCards[0]) {
    const urgentTasks = state.tasks
      .filter((task) => task.status !== "Concluido")
      .slice(0, 4)
      .map(
        (task) => `
          <div class="item-row">
            <div>
              <div class="block-title-sm">${task.title}</div>
              <div class="block-text-xs">${task.client_name || "Interno"} · ${formatDate(task.due_date || task.deadline)}</div>
            </div>
            <span class="badge ${task.status === "Em progresso" ? "badge-yellow" : "badge-gray"}">${task.status}</span>
          </div>
        `
      )
      .join("");
    topCards[0].innerHTML = `
      <div class="section-header"><div><div class="section-title">Tarefas urgentes</div><div class="section-sub">Fila operacional real</div></div></div>
      ${urgentTasks || "<div>Nenhuma tarefa crítica no momento.</div>"}
    `;
  }

  if (topCards[1]) {
    if (hasRoleDataAccess("homeFinancial")) {
      topCards[1].innerHTML = `
        <div class="section-header"><div><div class="section-title">Faturamento — Últimos 6 meses</div></div></div>
        <div class="chart-bar-wrap" id="home-chart"></div>
      `;
      renderBarChart(
        "home-chart",
        state.invoices.slice(0, 6).map((invoice) => Number(invoice.amount)),
        state.invoices.slice(0, 6).map((invoice) => invoice.client_name),
        (value) => `R$${Math.round(value / 1000)}k`
      );
    } else if (hasRoleDataAccess("materials")) {
      const statusBuckets = ["Pendente", "Revisao", "Aprovado"].map((status) => ({
        label: normalizeMaterialStatus(status),
        value: state.materials.filter((material) => material.status === status).length
      }));
      topCards[1].innerHTML = `
        <div class="section-header"><div><div class="section-title">Produção — Status atual</div><div class="section-sub">Leitura rápida das entregas em andamento</div></div></div>
        <div class="chart-bar-wrap" id="home-chart"></div>
      `;
      renderBarChart("home-chart", statusBuckets.map((bucket) => bucket.value), statusBuckets.map((bucket) => bucket.label), (value) => `${formatNumber(value)} itens`);
    } else if (hasRoleDataAccess("metrics")) {
      const trackedMetrics = state.metrics.slice(0, 6);
      topCards[1].innerHTML = `
        <div class="section-header"><div><div class="section-title">Analytics — Campanhas recentes</div><div class="section-sub">Últimas leituras consolidadas por campanha</div></div></div>
        <div class="chart-bar-wrap" id="home-chart"></div>
      `;
      renderBarChart(
        "home-chart",
        trackedMetrics.map((metric) => Number(metric.revenue || 0)),
        trackedMetrics.map((metric) => metric.campaign_name),
        (value) => formatCurrencyValue(value)
      );
    } else {
      topCards[1].innerHTML = `
        <div class="section-header"><div><div class="section-title">Resumo operacional</div><div class="section-sub">Seu perfil não possui widgets adicionais nesta área.</div></div></div>
        ${UI.empty("Sem dados complementares", "Os painéis extras são habilitados conforme o escopo de acesso do perfil.")}
      `;
    }
  }

  const lowerCards = document.querySelectorAll("#page-home .two-col")[1]?.querySelectorAll(".card") || [];
  if (lowerCards[0]) {
    if (hasRoleDataAccess("contacts")) {
      const stages = ["Prospecção", "Contato feito", "Proposta", "Negociação"];
      lowerCards[0].innerHTML = `
        <div class="section-header"><div class="section-title">Pipeline resumido</div><button class="btn btn-ghost btn-sm btn-link-arrow" onclick="goTo('crm')">Ver CRM <span>→</span></button></div>
        ${stages
          .map((stage) => {
            const stageContacts = state.contacts.filter((contact) => normalizePipelineStage(contact.lead_stage) === stage);
            const totalValue = stageContacts.reduce((acc, contact) => acc + Number(contact.estimated_value || 0), 0);
            const isEmpty = stageContacts.length === 0;
            return `
              <div class="inline-metrics ${isEmpty ? "inline-metrics-empty" : ""}">
                <span class="inline-metrics-label">${stage}</span>
                <div class="inline-metrics-meta"><span class="badge ${isEmpty ? "badge-gray badge-zero" : "badge-pink"}">${formatLeadCount(stageContacts.length)}</span><span class="inline-metrics-value">${formatCurrency(totalValue)}</span></div>
              </div>
            `;
          })
          .join("")}
      `;
    } else if (hasRoleDataAccess("materials") || hasRoleDataAccess("reports")) {
      const recentWork = [...state.materials, ...state.reports]
        .slice(0, 4)
        .map(
          (item) => `
            <div class="item-row">
              <div>
                <div class="block-title-sm">${item.title}</div>
                <div class="block-text-xs">${item.client_name || "Operação interna"}</div>
              </div>
              <span class="badge ${item.status === "Aprovado" ? "badge-green" : item.status === "Revisao" ? "badge-yellow" : "badge-gray"}">${item.report_month ? "Relatório" : normalizeMaterialStatus(item.status || "Pendente")}</span>
            </div>
          `
        )
        .join("");

      lowerCards[0].innerHTML = `
        <div class="section-header"><div class="section-title">Entregas e registros</div></div>
        ${recentWork || UI.empty("Nenhuma entrega recente", "As últimas entregas, aprovações e relatórios aparecerão aqui.")}
      `;
    } else {
      lowerCards[0].innerHTML = `
        <div class="section-header"><div class="section-title">Visão operacional</div></div>
        ${UI.empty("Sem painel complementar", "Este perfil recebe apenas os blocos operacionais essenciais na visão geral.")}
      `;
    }
  }

  if (lowerCards[1]) {
    if (hasRoleDataAccess("homeTeam")) {
      const teamMembers = (Array.isArray(state.team) ? state.team : [])
        .filter((user) => user && user.role !== "client")
        .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "pt-BR"));

      lowerCards[1].innerHTML = `
        <div class="section-header"><div class="section-title">Equipe habilitada</div></div>
        ${teamMembers
          .map(
            (user) => `
              <div class="team-member-row">
                <div class="team-member">
                  <div class="avatar av-pink">${getInitials(user.name)}</div>
                  <div class="team-member-info">
                    <div class="team-member-name">${user.name}</div>
                    <div class="team-member-role">${ROLE_LABELS[user.role]}</div>
                  </div>
                </div>
                <span class="badge ${user.is_active === false ? "badge-gray" : "badge-green"}">${user.is_active === false ? "Desabilitado" : "Habilitado"}</span>
              </div>
            `
          )
          .join("") || UI.empty("Nenhum membro habilitado", "Cadastre os usuários internos para estruturar o acompanhamento da operação.")}
      `;
    } else if (hasRoleDataAccess("files")) {
      const recentFiles = state.files
        .slice(0, 4)
        .map(
          (file) => `
            <div class="item-row">
              <div>
                <div class="block-title-sm">${file.original_name}</div>
                <div class="block-text-xs">${file.client_name || "Interno"} · ${Math.round((file.size || 0) / 1024)} KB</div>
              </div>
              ${renderResourceAction(file.url, { label: "Abrir", className: "btn btn-ghost btn-sm" })}
            </div>
          `
        )
        .join("");

      lowerCards[1].innerHTML = `
        <div class="section-header"><div class="section-title">Arquivos recentes</div></div>
        ${recentFiles || UI.empty("Nenhum arquivo recente", "Os arquivos vinculados à produção e à operação aparecem aqui.")}
      `;
    } else if (hasRoleDataAccess("metrics")) {
      const recentMetrics = state.metrics
        .slice(0, 4)
        .map(
          (metric) => `
            <div class="item-row">
              <div>
                <div class="block-title-sm">${metric.campaign_name}</div>
                <div class="block-text-xs">${metric.client_name} · ${formatDate(metric.period)}</div>
              </div>
              <span class="badge badge-blue">${formatNumber(metric.leads)} leads</span>
            </div>
          `
        )
        .join("");

      lowerCards[1].innerHTML = `
        <div class="section-header"><div class="section-title">Leitura recente</div></div>
        ${recentMetrics || UI.empty("Nenhuma leitura recente", "As últimas métricas consolidadas das campanhas aparecem aqui.")}
      `;
    } else if (hasRoleDataAccess("reports")) {
      const reports = state.reports
        .slice(0, 4)
        .map(
          (report) => `
            <div class="item-row">
              <div>
                <div class="block-title-sm">${report.title}</div>
                <div class="block-text-xs">${report.client_name} · ${formatDate(report.report_month)}</div>
              </div>
              ${renderResourceAction(report.file_url, {
                missingMessage: "Relatório ainda não disponível para abertura."
              })}
            </div>
          `
        )
        .join("");

      lowerCards[1].innerHTML = `
        <div class="section-header"><div class="section-title">Relatórios recentes</div></div>
        ${reports || UI.empty("Nenhum relatório recente", "Os últimos relatórios publicados aparecem aqui.")}
      `;
    } else {
      lowerCards[1].innerHTML = `
        <div class="section-header"><div class="section-title">Resumo adicional</div></div>
        ${UI.empty("Sem dados disponíveis", "Não há módulos extras habilitados para este perfil neste bloco.")}
      `;
    }
  }
}

function getChecklistTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeChecklistItem(item, index = 0) {
  const label = String(item?.label || item?.text || "").trim();
  if (!label) {
    return null;
  }

  return {
    id: String(item?.id || `check_${Date.now()}_${index}`),
    label,
    done: Boolean(item?.done),
    createdAt: item?.createdAt || new Date().toISOString()
  };
}

function getChecklistDayDiff(dateKey) {
  if (!dateKey) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date(getChecklistTodayKey());
  const target = new Date(dateKey);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.floor((today - target) / 86400000);
}

function createEmptyChecklistSnapshot() {
  return {
    activeDate: getChecklistTodayKey(),
    activeItems: [],
    history: []
  };
}

function normalizeChecklistSnapshot(rawStore) {
  const todayKey = getChecklistTodayKey();
  const source = rawStore && typeof rawStore === "object" ? rawStore : {};
  const activeDate = normalizeDateKey(source.activeDate) || todayKey;
  const activeItems =
    activeDate === todayKey
      ? toArray(source.activeItems)
          .map((item, index) => normalizeChecklistItem(item, index))
          .filter(Boolean)
      : [];

  const history = toArray(source.history)
    .map((entry, index) => {
      const date = normalizeDateKey(entry?.date || entry?.completedAt);
      const items = toArray(entry?.items)
        .map((item, itemIndex) => normalizeChecklistItem({ ...item, done: true }, itemIndex))
        .filter(Boolean);

      if (!date || !items.length) {
        return null;
      }

      const diffDays = getChecklistDayDiff(date);
      if (diffDays < 0 || diffDays > 30) {
        return null;
      }

      return {
        id: String(entry?.id || `history_${date}_${index}`),
        date,
        completedAt: entry?.completedAt || `${date}T23:59:59.000Z`,
        items
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(right.completedAt || right.date).localeCompare(String(left.completedAt || left.date)));

  return {
    activeDate: todayKey,
    activeItems,
    history
  };
}

function getChecklistStore() {
  return normalizeChecklistSnapshot(state.checklist);
}

async function persistChecklistItems(items) {
  const payload = {
    items: toArray(items)
      .map((item, index) => normalizeChecklistItem(item, index))
      .filter(Boolean)
      .slice(0, 100)
  };

  const snapshot = await apiFetch("/checklists/daily", {
    method: "PUT",
    cache: "no-store",
    body: JSON.stringify(payload)
  });
  state.checklist = normalizeChecklistSnapshot(snapshot);
  return state.checklist;
}

function createChecklistItem(label) {
  const nextLabel = String(label || "").trim();
  if (!nextLabel) {
    throw new Error("Digite um item para adicionar ao checklist.");
  }

  return {
    id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: nextLabel,
    done: false,
    createdAt: new Date().toISOString()
  };
}

function getChecklistHistoryGroups(history) {
  const groups = [
    { key: "today", title: "Concluído hoje", min: 0, max: 0 },
    { key: "yesterday", title: "Ontem", min: 1, max: 1 },
    { key: "week", title: "Últimos 7 dias", min: 2, max: 7 },
    { key: "month", title: "Últimos 30 dias", min: 8, max: 30 }
  ];

  return groups
    .map((group) => ({
      ...group,
      entries: history.filter((entry) => {
        const diffDays = getChecklistDayDiff(entry.date);
        return diffDays >= group.min && diffDays <= group.max;
      })
    }))
    .filter((group) => group.entries.length);
}

function getKanbanTasksForToday(filteredTasks) {
  const currentUserId = Number(state.session?.user?.id || 0);
  const scopedTasks = filteredTasks.filter((task) => Number(task.assigned_to || 0) === currentUserId);
  const source = scopedTasks.length ? scopedTasks : filteredTasks;

  return source
    .filter((task) => normalizeDateKey(task.due_date || task.deadline))
    .filter((task) => {
      const dateKey = normalizeDateKey(task.due_date || task.deadline);
      const todayKey = new Date().toISOString().slice(0, 10);
      return dateKey <= todayKey && String(task.status || "").toLowerCase() !== "concluido";
    })
    .sort((left, right) => String(left.due_date || left.deadline || "").localeCompare(String(right.due_date || right.deadline || "")));
}

function bindDailyChecklistInteractions(container) {
  if (!container) {
    return;
  }

  if (container.dataset.boundChecklist === "1") {
    return;
  }

  container.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-checklist-form]");
    if (!form) {
      return;
    }

    event.preventDefault();
    const input = form.querySelector("[name='checklist-item']");

    try {
      const currentStore = getChecklistStore();
      await persistChecklistItems([...currentStore.activeItems, createChecklistItem(input?.value || "")]);
      if (input) {
        input.value = "";
      }
      renderKanban();
    } catch (error) {
      showToast(error.message);
      renderKanban();
    }
  });

  container.addEventListener("change", async (event) => {
    const input = event.target.closest("[data-daily-checklist]");
    if (!input) {
      return;
    }

    try {
      const currentStore = getChecklistStore();
      const nextItems = currentStore.activeItems.map((item) =>
        item.id === input.dataset.dailyChecklist ? { ...item, done: Boolean(input.checked) } : item
      );
      const shouldArchive = nextItems.length > 0 && nextItems.every((item) => item.done);
      await persistChecklistItems(nextItems);
      renderKanban();
      if (shouldArchive && !state.checklist?.activeItems?.length) {
        showToast("Checklist concluído e movido para o histórico.");
      }
    } catch (error) {
      showToast(error.message);
      renderKanban();
    }
  });

  container.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-checklist-remove]");
    if (!removeButton) {
      return;
    }

    try {
      const currentStore = getChecklistStore();
      await persistChecklistItems(currentStore.activeItems.filter((item) => item.id !== removeButton.dataset.checklistRemove));
      renderKanban();
    } catch (error) {
      showToast(error.message);
      renderKanban();
    }
  });

  container.dataset.boundChecklist = "1";
}

function renderKanbanChecklist(filteredTasks) {
  const container = document.getElementById("kanban-daily-checklist");
  if (!container) {
    return;
  }

  const checklistStore = getChecklistStore();
  const historyGroups = getChecklistHistoryGroups(checklistStore.history);
  const dueTasks = getKanbanTasksForToday(filteredTasks);
  const completedItems = checklistStore.activeItems.filter((item) => item.done).length;

  container.innerHTML = `
    <div class="section-sub">Checklist pessoal de ${escapeHtml(state.session?.user?.name || "usuário atual")}. Cada pessoa monta e conclui a própria rotina.</div>
    <form class="checklist-composer" data-checklist-form>
      <input
        type="text"
        name="checklist-item"
        class="checklist-input"
        maxlength="120"
        placeholder="Adicionar item do seu checklist diário"
        aria-label="Novo item do checklist"
      >
      <button type="submit" class="btn btn-outline btn-sm">Adicionar</button>
    </form>
    <div class="checklist-progress">
      ${
        checklistStore.activeItems.length
          ? `${completedItems} de ${checklistStore.activeItems.length} itens concluídos hoje`
          : "Nenhum item aberto para hoje"
      }
    </div>
    <div class="checklist-list">
      ${
        checklistStore.activeItems.length
          ? checklistStore.activeItems
              .map(
                (item) => `
                  <label class="checklist-row${item.done ? " is-done" : ""}">
                    <span class="checklist-row-main">
                      <input type="checkbox" data-daily-checklist="${item.id}" ${item.done ? "checked" : ""}>
                      <span class="checklist-row-label">${escapeHtml(item.label)}</span>
                    </span>
                    <span class="badge ${item.done ? "badge-green" : "badge-gray"}">${item.done ? "Feito" : "Pendente"}</span>
                    <button type="button" class="btn btn-ghost btn-sm checklist-remove" data-checklist-remove="${item.id}">Remover</button>
                  </label>
                `
              )
              .join("")
          : UI.empty("Seu checklist está vazio", "Adicione os itens que você quer acompanhar hoje. Quando todos forem concluídos, a lista vai para o histórico.")
      }
    </div>
    <div class="section-header"><div class="section-title">Entregas do dia</div></div>
    ${
      dueTasks.length
        ? dueTasks
            .map(
              (task) => `
                <div class="item-row">
                  <div>
                    <div class="block-title-sm">${task.title}</div>
                    <div class="block-text-xs">${task.client_name || "Interno"} · ${task.assigned_to_name || "Sem responsável"}</div>
                  </div>
                  <span class="badge ${isOverdueDate(task.due_date || task.deadline) ? "badge-pink" : "badge-blue"}">${isOverdueDate(task.due_date || task.deadline) ? "Atrasada" : "Hoje"}</span>
                </div>
              `
            )
            .join("")
        : UI.empty("Sem tarefas vencendo hoje", "Quando houver prioridade para hoje ou atrasada, ela aparecerá aqui.")
    }
    <div class="section-header checklist-history-head"><div class="section-title">Histórico do checklist</div><div class="section-sub">Registros concluídos por período. Após 30 dias, eles são removidos.</div></div>
    <div class="checklist-history">
      ${
        historyGroups.length
          ? historyGroups
              .map(
                (group) => `
                  <div class="checklist-history-group">
                    <div class="checklist-history-title">${group.title}</div>
                    ${group.entries
                      .map(
                        (entry) => `
                          <div class="checklist-history-card">
                            <div class="checklist-history-meta">${formatDate(entry.date)} · ${entry.items.length} ${entry.items.length === 1 ? "item" : "itens"}</div>
                            <div class="checklist-history-list">
                              ${entry.items
                                .map(
                                  (item) => `
                                    <div class="checklist-history-item">
                                      <span class="badge badge-green">Feito</span>
                                      <span>${escapeHtml(item.label)}</span>
                                    </div>
                                  `
                                )
                                .join("")}
                            </div>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                `
              )
              .join("")
          : UI.empty("Nenhum checklist concluído ainda", "Assim que você finalizar todos os itens do dia, o registro aparecerá aqui.")
      }
    </div>
  `;

  bindDailyChecklistInteractions(container);
}

function resolveKanbanClient(filteredTasks) {
  const selectedClientId = state.filters.kanbanClient;
  if (selectedClientId) {
    return state.clients.find((client) => String(client.id) === String(selectedClientId)) || null;
  }

  const clientIds = [...new Set(filteredTasks.map((task) => task.client_id).filter(Boolean))];
  if (clientIds.length === 1) {
    return state.clients.find((client) => String(client.id) === String(clientIds[0])) || null;
  }

  return null;
}

function renderKanbanBrandManual(filteredTasks) {
  const container = document.getElementById("kanban-brand-manual");
  if (!container) {
    return;
  }

  const client = resolveKanbanClient(filteredTasks);
  if (!client) {
    container.innerHTML = UI.empty(
      "Selecione um cliente no filtro do kanban",
      "Quando um cliente estiver em foco, o manual da marca aparece aqui para orientar briefing, design, revisão e postagem."
    );
    return;
  }

  const brandManual = String(client.brand_manual || "").trim();
  const contactBits = [client.company || null, client.contact_name || null].filter(Boolean).join(" · ");

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">${escapeHtml(client.name || "Cliente")}</div>
        <div class="section-sub">${escapeHtml(contactBits || "Manual operacional da marca")}</div>
      </div>
      ${canManageClients() ? `<button type="button" class="btn btn-outline btn-sm" onclick="openModal('novo-cliente', ${client.id})">Editar</button>` : ""}
    </div>
    ${
      brandManual
        ? `<div class="muted-panel">${escapeHtml(brandManual).replace(/\n/g, "<br>")}</div>`
        : UI.empty(
            "Manual de marca ainda não cadastrado",
            "Abra o cliente no CRM e preencha o campo de manual da marca com tom de voz, referências, restrições, roteiro e observações de execução."
          )
    }
  `;
}

function renderKanban() {
  const columns = [
    { key: "backlog", label: "Backlog" },
    { key: "todo", label: "A Fazer" },
    { key: "doing", label: "Em Progresso" },
    { key: "done", label: "Concluído" }
  ];
  const filtered = state.filters.kanbanClient
    ? state.tasks.filter((task) => String(task.client_id) === String(state.filters.kanbanClient))
    : state.tasks;
  const canEditTasks = canManageTasks();
  const canRemoveTasks = canDeleteTasks();

  renderKanbanChecklist(filtered);
  renderKanbanBrandManual(filtered);

  document.getElementById("kanban-board").innerHTML = columns
    .map((column) => {
      const tasks = filtered.filter((task) => task.column_name === column.key);
      return `
        <div class="kanban-col">
          <div class="kanban-col-title">${column.label} <span class="col-count">${tasks.length}</span></div>
          ${tasks
            .map(
              (task) => `
                <div class="k-card">
                  <div class="k-card-client" title="${escapeHtml(task.client_name || "Interno")}">${task.client_name || "Interno"}</div>
                  <div class="k-card-title" title="${escapeHtml(task.title)}">${task.title}</div>
                  <div class="k-card-desc" title="${escapeHtml(task.description || "")}">${task.description || "Sem descrição."}</div>
                  <div class="status-gap-top"><span class="badge badge-blue">${formatTaskTypeLabel(task.type)}</span></div>
                  <div class="status-gap-top"><span class="badge ${task.status === "Concluido" ? "badge-green" : task.status === "Em progresso" ? "badge-yellow" : "badge-gray"}">${task.status}</span></div>
                  <div class="k-card-meta">
                    <span class="k-card-assignee" title="${escapeHtml(task.assigned_to_name || "Sem responsável")}">${task.assigned_to_name || "Sem responsável"}</span>
                    <span class="k-card-deadline ${getDeadlineClass(task)}">${formatDate(task.due_date || task.deadline)}</span>
                  </div>
                  ${
                    canEditTasks || canRemoveTasks
                      ? `<div class="actions-gap-top">
                          ${canEditTasks ? `<button class="btn btn-ghost btn-sm" onclick="openModal('nova-tarefa', ${task.id})">Editar</button>` : ""}
                          ${canRemoveTasks ? `<button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Excluir</button>` : ""}
                        </div>`
                      : ""
                  }
                </div>
              `
            )
            .join("") || UI.empty("Nenhuma tarefa nesta etapa", "As próximas entregas desta coluna aparecerão aqui.")}
        </div>
      `;
    })
    .join("");
}

function renderCRM() {
  const crmKpiGrid = document.getElementById("crm-kpi-grid");
  const closedContacts = state.contacts.filter((contact) => normalizePipelineStage(contact.lead_stage) === "Fechado");
  const activeContacts = state.contacts.filter((contact) => normalizePipelineStage(contact.lead_stage) !== "Fechado");
  const activePipelineValue = sumBy(activeContacts, (contact) => contact.estimated_value);
  const closedPipelineValue = sumBy(closedContacts, (contact) => contact.estimated_value);
  const conversionRate = state.contacts.length ? (closedContacts.length / state.contacts.length) * 100 : 0;
  const averageTicket = closedContacts.length ? closedPipelineValue / closedContacts.length : 0;
  const averageCycle = getAverageSalesCycleDays(closedContacts);

  renderKpiCards(crmKpiGrid, [
    {
      label: "Total no Funil",
      value: formatNumber(activeContacts.length),
      sub: `${formatLeadCount(activeContacts.length)}`
    },
    {
      label: "Valor Potencial",
      value: formatCurrency(activePipelineValue),
      sub: activeContacts.length ? "no pipeline" : "sem oportunidades abertas"
    },
    {
      label: "Taxa de Conversão",
      value: `${conversionRate.toFixed(0)}%`,
      sub: closedContacts.length ? `${formatNumber(closedContacts.length)} conversões` : "sem conversões ainda"
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(averageTicket),
      sub: closedContacts.length ? "por lead convertido" : "sem vendas fechadas"
    },
    {
      label: "Ciclo de Venda",
      value: `${formatNumber(averageCycle)}d`,
      sub: closedContacts.length ? "em média" : "sem histórico suficiente"
    }
  ]);

  const pipelineStages = ["Prospecção", "Contato feito", "Proposta", "Negociação", "Fechado"];
  document.getElementById("pipeline-board").innerHTML = pipelineStages
    .map((stage) => {
      const contacts = state.contacts.filter((contact) => normalizePipelineStage(contact.lead_stage) === stage);
      return `
        <div class="pipe-col">
          <div class="pipe-col-head">${stage} <span>${contacts.length}</span></div>
          ${contacts
            .map(
              (contact) => `
                <div class="pipe-card">
                  <div class="pipe-lead-name" title="${escapeHtml(contact.name)}">${contact.name}</div>
                  <div class="pipe-lead-company" title="${escapeHtml(contact.company || "Sem empresa")}">${contact.company || "Sem empresa"}</div>
                  <div class="pipe-lead-val">${formatCurrency(contact.estimated_value)}</div>
                  <div class="item-card-actions">
                    <button class="btn btn-ghost btn-sm" onclick="openModal('novo-lead', ${contact.id})">Editar</button>
                    <button class="btn btn-ghost btn-sm" onclick="convertLead(${contact.id})">Converter</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteLead(${contact.id})">Excluir</button>
                  </div>
                </div>
              `
            )
            .join("") || UI.empty("Nenhum lead nesta etapa", "Os contatos desta fase do pipeline aparecerão aqui.")}
        </div>
      `;
    })
    .join("");

  document.getElementById("clientes-tbody").innerHTML = state.clients
    .map(
      (client) => `
        <tr>
          <td class="cell-stack"><span class="cell-title" title="${escapeHtml(client.name)}">${client.name}</span></td>
          <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(client.segment || client.company || "-")}">${client.segment || client.company || "-"}</span></td>
          <td><span class="badge badge-gray">${client.plan || "-"}</span></td>
          <td>${formatDate(client.started_at)}</td>
          <td><span class="badge badge-green">Ativo</span></td>
          <td data-align="right"><span class="${getValueToneClass(client.mrr)}">${formatCurrencyValue(client.mrr)}</span></td>
          <td class="cell-actions">
            <div class="table-actions">
              <button class="btn btn-ghost btn-sm" onclick="openModal('novo-cliente', ${client.id})">Editar</button>
              <button class="btn btn-ghost btn-sm" onclick="openChargeModalForClient(${client.id})">Cobrar</button>
              <button class="btn btn-danger btn-sm" onclick="deleteClient(${client.id})">Excluir</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || UI.tableEmpty(7, "Nenhum cliente cadastrado", "Cadastre o primeiro cliente para iniciar o acompanhamento comercial.");

  document.getElementById("historico-list").innerHTML = [...state.reports, ...state.materials, ...state.charges]
    .slice(0, 8)
    .map(
      (item) => `
        <div class="card card-sm">
          <div class="historic-card-head">
            <div>
              <div class="historic-card-title">${item.title || item.description}</div>
              <div class="historic-card-sub">${item.client_name || item.contact_name || ""}</div>
            </div>
            <span class="badge badge-gray">${item.report_month ? "Relatório" : item.payment_method || item.status}</span>
          </div>
        </div>
      `
    )
    .join("") || UI.empty("Nenhum histórico disponível", "As movimentações comerciais e de relacionamento aparecerão aqui.");
}

function renderCampaigns() {
  const campaignsKpiGrid = document.getElementById("campaigns-kpi-grid");
  const activeCampaigns = getActiveCampaigns();
  const campaignsForSummary = activeCampaigns;
  const totalBudget = sumBy(campaignsForSummary, (campaign) => campaign.budget);
  const totalLeads = sumBy(campaignsForSummary, (campaign) => campaign.leads);
  const clientsCount = new Set(campaignsForSummary.map((campaign) => campaign.client_id).filter(Boolean)).size;
  const averageCpl = totalLeads ? totalBudget / totalLeads : 0;

  renderKpiCards(campaignsKpiGrid, [
    {
      label: "Campanhas Ativas",
      value: formatNumber(activeCampaigns.length),
      sub: `${formatNumber(clientsCount)} ${clientsCount === 1 ? "cliente" : "clientes"}`
    },
    {
      label: "Orçamento Total",
      value: formatCurrency(totalBudget),
      sub: campaignsForSummary.length ? "em tráfego pago" : "sem orçamento alocado"
    },
    {
      label: "Leads Gerados",
      value: formatNumber(totalLeads),
      sub: campaignsForSummary.length ? "dados consolidados" : "sem dados consolidados"
    },
    {
      label: "CPL Médio",
      value: formatCurrency(averageCpl),
      sub: totalLeads ? `${formatNumber(totalLeads)} leads no período` : "sem leads registrados"
    }
  ]);

  document.getElementById("campanhas-tbody").innerHTML = state.campaigns
    .map(
      (campaign) => `
        <tr>
          <td class="cell-stack"><span class="cell-title" title="${escapeHtml(campaign.name)}">${campaign.name}</span></td>
          <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(campaign.client_name)}">${campaign.client_name}</span></td>
          <td><span class="badge ${getChannelBadgeClass(campaign.channel)}">${campaign.channel}</span></td>
          <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(campaign.audience || "-")}">${campaign.audience || "-"}</span></td>
          <td data-align="right"><span class="${getValueToneClass(campaign.budget)}">${formatCurrencyValue(campaign.budget)}</span></td>
          <td>${formatDate(campaign.start_date)}</td>
          <td><span class="badge ${getCampaignStatusBadgeClass(campaign.status)}">${campaign.status}</span></td>
          <td class="cell-actions">
            <div class="table-actions">
              <button class="btn btn-ghost btn-sm" onclick="openModal('nova-campanha', ${campaign.id})">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="deleteCampaign(${campaign.id})">Excluir</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || UI.tableEmpty(8, "Nenhuma campanha cadastrada", "Crie a primeira campanha para iniciar o planejamento e o acompanhamento.");
}

function renderProduction() {
  const canEditProduction = canManageMaterials();
  document.getElementById("design-grid").innerHTML = state.materials
    .map(
      (material) => `
        <div class="card card-sm">
          <div class="historic-card-head">
            <div>
              <div class="historic-card-title">${material.title}</div>
              <div class="historic-card-sub">${material.client_name}</div>
            </div>
            <span class="badge ${material.status === "Aprovado" ? "badge-green" : material.status === "Revisao" ? "badge-yellow" : "badge-pink"}">${normalizeMaterialStatus(material.status)}</span>
          </div>
          <div class="item-card-actions">
            ${renderResourceAction(material.url || material.file_url, {
              label: "Arquivo",
              className: "btn btn-outline btn-sm",
              missingMessage: "Arquivo ainda não disponível para abertura."
            })}
            ${canEditProduction ? `<button class="btn btn-ghost btn-sm" onclick="openModal('nova-entrega', ${material.id})">Editar</button>` : ""}
            ${canEditProduction ? `<button class="btn btn-danger btn-sm" onclick="deleteMaterial(${material.id})">Excluir</button>` : ""}
          </div>
        </div>
      `
    )
    .join("") || UI.empty("Nenhuma entrega cadastrada", "Cadastre a primeira entrega para iniciar o fluxo de produção.");

  document.getElementById("copy-tbody").innerHTML = state.files
    .map(
      (file) => `
        <tr>
          <td class="cell-stack"><span class="cell-title" title="${escapeHtml(file.original_name)}">${file.original_name}</span></td>
          <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(file.client_name || "Interno")}">${file.client_name || "Interno"}</span></td>
          <td>${file.mime_type || "-"}</td>
          <td data-align="right">${Math.round((file.size || 0) / 1024)} KB</td>
          <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(file.uploaded_by_name || "-")}">${file.uploaded_by_name || "-"}</span></td>
          <td class="cell-actions">${renderResourceAction(file.url, { label: "Abrir", className: "btn btn-ghost btn-sm" })}</td>
        </tr>
      `
    )
    .join("") || UI.tableEmpty(6, "Nenhum arquivo disponível", "Os arquivos internos e aprovados aparecerão aqui.");

  document.getElementById("lp-tbody").innerHTML = state.reports
    .map(
      (report) => `
        <tr>
          <td class="cell-stack"><span class="cell-title" title="${escapeHtml(report.title)}">${report.title}</span></td>
          <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(report.client_name)}">${report.client_name}</span></td>
          <td>${formatDate(report.report_month)}</td>
          <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(report.summary || "-")}">${report.summary || "-"}</span></td>
          <td class="cell-actions">${renderResourceAction(report.file_url, {
            missingMessage: "Relatório ainda não disponível para abertura."
          })}</td>
        </tr>
      `
    )
    .join("") || UI.tableEmpty(5, "Nenhum relatório disponível", "Os relatórios publicados e compartilhados aparecerão aqui.");
}

function renderTraffic() {
  const trafficKpiGrid = document.getElementById("traffic-kpi-grid");
  const platformBreakdown = document.getElementById("traffic-platform-breakdown");
  const activeCampaigns = getActiveCampaigns();
  const trafficMetrics = getTrafficMetricsForCampaigns(activeCampaigns);
  const totalBudget = sumBy(activeCampaigns, (campaign) => campaign.budget);
  const totalRevenue = trafficMetrics.length
    ? sumBy(trafficMetrics, (metric) => metric.revenue)
    : sumBy(activeCampaigns, (campaign) => campaign.revenue);
  const totalImpressions = sumBy(trafficMetrics, (metric) => metric.impressions);
  const totalClicks = sumBy(trafficMetrics, (metric) => metric.clicks);
  const roas = totalBudget ? totalRevenue / totalBudget : 0;
  const ctr = totalImpressions ? (totalClicks / totalImpressions) * 100 : 0;
  const activeClients = new Set(activeCampaigns.map((campaign) => campaign.client_id).filter(Boolean)).size;

  renderKpiCards(trafficKpiGrid, [
    {
      label: "Investimento Total",
      value: formatCurrency(totalBudget),
      sub: activeCampaigns.length ? `${formatNumber(activeCampaigns.length)} campanhas ativas` : "mês atual"
    },
    {
      label: "ROAS Médio",
      value: `${roas.toFixed(1)}x`,
      sub: activeCampaigns.length ? `${formatNumber(activeClients)} contas acompanhadas` : "sem campanhas ativas"
    },
    {
      label: "CTR Médio",
      value: `${ctr.toFixed(1)}%`,
      sub: totalClicks ? `${formatNumber(totalClicks)} cliques` : "todas as plataformas"
    },
    {
      label: "Impressões",
      value: formatCompactNumber(totalImpressions),
      sub: trafficMetrics.length ? "este mês" : "sem mídia publicada"
    }
  ]);

  if (platformBreakdown) {
    const channelGroups = activeCampaigns.reduce((accumulator, campaign) => {
      const channel = campaign.channel || "Outros";
      if (!accumulator.has(channel)) {
        accumulator.set(channel, {
          label: channel,
          budget: 0,
          revenue: 0
        });
      }

      const bucket = accumulator.get(channel);
      bucket.budget += Number(campaign.budget || 0);
      bucket.revenue += Number(campaign.revenue || 0);
      return accumulator;
    }, new Map());

    const platformRows = Array.from(channelGroups.values()).sort((left, right) => right.budget - left.budget);
    const maxBudget = Math.max(...platformRows.map((row) => row.budget), 1);

    platformBreakdown.innerHTML = platformRows.length
      ? platformRows
          .map((platform) => {
            const platformRoas = platform.budget ? platform.revenue / platform.budget : 0;
            return `
              <div>
                <div class="progress-item-head">
                  <span>${platform.label}</span>
                  <span class="text-strong">${formatCurrency(platform.budget)} · ROAS ${platformRoas.toFixed(1)}x</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${((platform.budget / maxBudget) * 100).toFixed(1)}%"></div></div>
              </div>
            `;
          })
          .join("")
      : UI.empty("Nenhuma campanha ativa", "As plataformas aparecerão aqui quando houver investimento real em mídia.");
  }

  document.getElementById("ab-list").innerHTML = activeCampaigns
    .slice(0, 3)
    .map(
      (campaign) => `
        <div class="item-row">
          <div>
            <div class="block-title-sm">${campaign.name}</div>
            <div class="block-text-xs">${campaign.client_name}</div>
          </div>
          <span class="badge ${Number(campaign.roi || 0) === 0 ? "badge-gray" : "badge-blue"}">ROI ${Number(campaign.roi || 0).toFixed(1)}%</span>
        </div>
      `
    )
    .join("") || UI.empty("Nenhuma campanha ativa", "Ative campanhas para acompanhar a performance de mídia.");

  document.getElementById("trafego-tbody").innerHTML = state.campaigns
    .map(
      (campaign) => `
        <tr>
          <td class="cell-stack"><span class="cell-title" title="${escapeHtml(campaign.name)}">${campaign.name}</span></td>
          <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(campaign.client_name)}">${campaign.client_name}</span></td>
          <td><span class="badge ${getChannelBadgeClass(campaign.channel)}">${campaign.channel}</span></td>
          <td data-align="right"><span class="${getValueToneClass(campaign.budget)}">${formatCurrencyValue(campaign.budget)}</span></td>
          <td data-align="right"><span class="${getValueToneClass(campaign.leads)}">${formatNumber(campaign.leads)}</span></td>
          <td data-align="right"><span class="${getValueToneClass(campaign.revenue)}">${formatCurrencyValue(campaign.revenue)}</span></td>
          <td data-align="right"><span class="${Number(campaign.roi || 0) === 0 ? "value-zero" : "value-strong"}">${Number(campaign.roi || 0).toFixed(2)}%</span></td>
          <td><span class="badge ${getCampaignStatusBadgeClass(campaign.status)}">${campaign.status}</span></td>
        </tr>
      `
    )
    .join("") || UI.tableEmpty(8, "Nenhum dado de tráfego disponível", "Publique campanhas para visualizar métricas e evolução de mídia.");
}

function getFilteredMetrics() {
  return state.metrics.filter((metric) => {
    const clientMatch = !state.filters.analyticsClient || String(metric.client_id) === String(state.filters.analyticsClient);
    const periodMatch = !state.filters.analyticsPeriod || String(metric.period).slice(0, 10) === state.filters.analyticsPeriod;
    return clientMatch && periodMatch;
  });
}

function renderAnalytics() {
  const filteredMetrics = getFilteredMetrics();
  const filteredIntegrations = getFilteredIntegrations();
  const topMetrics = filteredMetrics.slice(0, 6);
  const revenue = filteredMetrics.reduce((acc, metric) => acc + Number(metric.revenue || 0), 0);
  const impressions = filteredMetrics.reduce((acc, metric) => acc + Number(metric.impressions || 0), 0);
  const clicks = filteredMetrics.reduce((acc, metric) => acc + Number(metric.clicks || 0), 0);
  const leads = filteredMetrics.reduce((acc, metric) => acc + Number(metric.leads || 0), 0);
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
  const conversion = clicks ? ((leads / clicks) * 100).toFixed(2) : "0.00";
  const analyticsGrid = document.querySelector("#page-analytics .kpi-grid");

  if (analyticsGrid) {
    analyticsGrid.innerHTML = [
      { label: "Receita", value: formatCurrency(revenue), sub: `${filteredMetrics.length} registros` },
      { label: "Impressões", value: formatNumber(impressions), sub: "volume consolidado" },
      { label: "CTR Médio", value: `${ctr}%`, sub: `${formatNumber(clicks)} cliques` },
      { label: "Conversão", value: `${conversion}%`, sub: `${formatNumber(leads)} leads` }
    ]
      .map(
        (item) => `
          <div class="kpi-card">
            <div class="kpi-label">${item.label}</div>
            <div class="kpi-val">${item.value}</div>
            <div class="kpi-sub">${item.sub}</div>
          </div>
        `
      )
      .join("");
  }

  const integrationsContainer = document.getElementById("analytics-integrations");
  if (integrationsContainer) {
    if (!hasScopedClients()) {
      integrationsContainer.innerHTML = UI.empty(
        "Cadastre um cliente primeiro",
        "As integrações do analytics são vinculadas por cliente. Quando houver clientes, você poderá registrar conexões reais aqui."
      );
    } else {
      integrationsContainer.innerHTML = INTEGRATION_PROVIDERS.map((provider) => {
      if (state.filters.analyticsClient) {
        const integration = filteredIntegrations.find((item) => item.provider_key === provider.key);
        const subtitle = integration
          ? [integration.external_account_id, integration.external_property_id].filter(Boolean).join(" · ") || "Conexão registrada para este cliente"
          : "Nenhuma conexão registrada para este cliente";

        return `
          <div class="analytics-side-item">
            <div class="cell-stack">
              <span class="cell-title">${provider.name}</span>
              <span class="cell-sub">${escapeHtml(subtitle)}</span>
            </div>
            <span class="badge ${getIntegrationStatusBadgeClass(integration?.status || "disconnected")}">${integration ? INTEGRATION_STATUS_LABELS[integration.status] || integration.status : "Não configurado"}</span>
          </div>
        `;
      }

      const providerIntegrations = filteredIntegrations.filter((item) => item.provider_key === provider.key);
      const connectedCount = providerIntegrations.filter((item) => item.status === "connected").length;
      const configuringCount = providerIntegrations.filter((item) => item.status === "configuring").length;
      const errorCount = providerIntegrations.filter((item) => item.status === "error").length;
      const totalCount = providerIntegrations.length;

      let status = "disconnected";
      let subtitle = "Nenhum cliente configurado";
      let badgeLabel = "Não configurado";

      if (connectedCount > 0) {
        status = "connected";
        subtitle = `${connectedCount} ${connectedCount === 1 ? "cliente conectado" : "clientes conectados"}`;
        badgeLabel = INTEGRATION_STATUS_LABELS.connected;
      } else if (configuringCount > 0) {
        status = "configuring";
        subtitle = `${configuringCount} ${configuringCount === 1 ? "cliente em configuração" : "clientes em configuração"}`;
        badgeLabel = INTEGRATION_STATUS_LABELS.configuring;
      } else if (errorCount > 0) {
        status = "error";
        subtitle = `${errorCount} ${errorCount === 1 ? "cliente com falha" : "clientes com falha"}`;
        badgeLabel = INTEGRATION_STATUS_LABELS.error;
      } else if (totalCount > 0) {
        subtitle = `${totalCount} ${totalCount === 1 ? "cliente desconectado" : "clientes desconectados"}`;
        badgeLabel = INTEGRATION_STATUS_LABELS.disconnected;
      }

      return `
        <div class="analytics-side-item">
          <div class="cell-stack">
            <span class="cell-title">${provider.name}</span>
            <span class="cell-sub">${subtitle}</span>
          </div>
          <span class="badge ${getIntegrationStatusBadgeClass(status)}">${badgeLabel}</span>
        </div>
      `;
    }).join("");
    }
  }

  renderBarChart("ga-chart", topMetrics.map((metric) => Number(metric.revenue || 0)), topMetrics.map((metric) => metric.campaign_name), (value) => `${Math.round(value / 1000)}k`);

  document.getElementById("analytics-tbody").innerHTML = filteredMetrics
    .map(
      (metric) => `
        <tr>
          <td class="cell-stack"><span class="cell-title" title="${escapeHtml(metric.client_name)}">${metric.client_name}</span></td>
          <td data-align="right"><span class="${getValueToneClass(metric.leads)}">${formatNumber(metric.leads)}</span></td>
          <td data-align="right"><span class="${getValueToneClass(metric.revenue)}">${formatCurrencyValue(metric.revenue)}</span></td>
          <td data-align="right"><span class="${getValueToneClass(metric.impressions)}">${formatNumber(metric.impressions)}</span></td>
          <td data-align="right"><span class="${getValueToneClass(metric.clicks)}">${formatNumber(metric.clicks)}</span></td>
          <td>${formatDate(metric.period)}</td>
          <td><span class="badge ${getScoreBadgeClass(Math.min(Math.round(Number(metric.leads || 0)), 100))}">${Math.min(Math.round(Number(metric.leads || 0)), 100)}/100</span></td>
        </tr>
      `
    )
    .join("") || UI.tableEmpty(7, "Nenhuma métrica encontrada", "Ajuste os filtros ou aguarde a consolidação dos dados das campanhas.");

  const integrationsBody = document.getElementById("integrations-tbody");
  if (integrationsBody) {
    integrationsBody.innerHTML = filteredIntegrations
      .map(
        (integration) => `
          <tr>
            <td class="cell-stack"><span class="cell-title" title="${escapeHtml(integration.client_name)}">${integration.client_name}</span></td>
            <td class="cell-stack"><span class="cell-title">${getIntegrationProviderLabel(integration.provider_key)}</span></td>
            <td><span class="badge ${getIntegrationStatusBadgeClass(integration.status)}">${INTEGRATION_STATUS_LABELS[integration.status] || integration.status}</span></td>
            <td class="cell-stack">
              <span class="cell-title" title="${escapeHtml(integration.external_account_id || "-")}">${integration.external_account_id || "-"}</span>
              <span class="cell-sub" title="${escapeHtml(integration.external_property_id || "-")}">${integration.external_property_id || "Sem propriedade vinculada"}</span>
            </td>
            <td>${formatDateTime(integration.last_sync_at)}</td>
            <td class="cell-stack"><span class="cell-sub" title="${escapeHtml(integration.updated_by_name || integration.created_by_name || "-")}">${integration.updated_by_name || integration.created_by_name || "-"}</span></td>
            <td class="cell-actions">
              ${
                canManageIntegrations()
                  ? `<div class="table-actions">
                      <button class="btn btn-ghost btn-sm" onclick="openModal('nova-integracao', ${integration.id})">Editar</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteIntegration(${integration.id})">Excluir</button>
                    </div>`
                  : '<span class="cell-sub">Somente leitura</span>'
              }
            </td>
          </tr>
        `
      )
      .join("")
      || UI.tableEmpty(
        7,
        hasScopedClients() ? "Nenhuma integração registrada" : "Nenhum cliente cadastrado",
        hasScopedClients()
          ? state.filters.analyticsClient
            ? "Cadastre a primeira integração para o cliente selecionado."
            : "Cadastre integrações por cliente para consolidar os conectores do analytics."
          : "Cadastre o primeiro cliente para começar a registrar integrações reais."
      );
  }
}

function renderFinance() {
  const clientFinancials = state.clients.map((client) => {
    const invoices = state.invoices.filter((invoice) => invoice.client_name === client.name);
    const charges = state.charges.filter((charge) => charge.client_name === client.name);
    const revenue = invoices.reduce((acc, invoice) => acc + Number(invoice.amount || 0), 0);
    const chargeVolume = charges.reduce((acc, charge) => acc + Number(charge.amount || 0), 0);
    const campaignCost = state.campaigns
      .filter((campaign) => campaign.client_name === client.name)
      .reduce((acc, campaign) => acc + Number(campaign.budget || 0), 0);
    const margin = revenue ? Math.round(((revenue - campaignCost) / revenue) * 100) : 0;
    return { client, revenue, chargeVolume, campaignCost, margin };
  });

  const totalRevenue = state.invoices.reduce((acc, invoice) => acc + Number(invoice.amount || 0), 0);
  const paidRevenue = state.invoices.filter((invoice) => invoice.status === "Pago").reduce((acc, invoice) => acc + Number(invoice.amount || 0), 0);
  const openRevenue = state.invoices.filter((invoice) => invoice.status !== "Pago").reduce((acc, invoice) => acc + Number(invoice.amount || 0), 0);
  const generatedCharges = state.charges.reduce((acc, charge) => acc + Number(charge.amount || 0), 0);
  const mediaCost = state.campaigns.reduce((acc, campaign) => acc + Number(campaign.budget || 0), 0);
  const productionCost = state.materials.length * 180;
  const operationsCost = state.tasks.length * 95;
  const netProfit = totalRevenue - mediaCost - productionCost - operationsCost;
  const financeGrid = document.querySelector("#page-financeiro .kpi-grid");

  if (financeGrid) {
    financeGrid.innerHTML = [
      { label: "Receita Bruta", value: formatCurrency(totalRevenue), sub: `${state.invoices.length} faturas` },
      { label: "Recebido", value: formatCurrency(paidRevenue), sub: "status pago" },
      { label: "Cobranças geradas", value: formatCurrency(generatedCharges), sub: `${state.charges.length} cobranças` },
      { label: "Lucro Líquido", value: formatCurrency(netProfit), sub: `${formatCurrency(openRevenue)} em aberto` }
    ]
      .map(
        (item) => `
          <div class="kpi-card">
            <div class="kpi-label">${item.label}</div>
            <div class="kpi-val">${item.value}</div>
            <div class="kpi-sub">${item.sub}</div>
          </div>
        `
      )
      .join("");
  }

  document.getElementById("fin-clientes").innerHTML = clientFinancials
    .map(
      ({ client, revenue, chargeVolume, campaignCost, margin }) => `
        <div class="fin-row">
          <span><strong>${client.name}</strong></span>
          <span>${formatCurrency(revenue)}</span>
          <span class="metric-note">${formatCurrency(campaignCost)} · Cobrado ${formatCurrency(chargeVolume)}</span>
          <span class="${margin >= 50 ? "margin-good" : margin >= 20 ? "margin-warn" : "margin-bad"}">${margin}%</span>
          <button class="btn btn-ghost btn-sm" onclick="openChargeModalForClient(${client.id})">Cobrar</button>
        </div>
      `
    )
    .join("") || UI.empty("Nenhum cliente disponível", "Cadastre clientes para acompanhar receitas, custos e margem.");

  const costBuckets = [
    { label: "Mídia", value: mediaCost },
    { label: "Produção", value: productionCost },
    { label: "Operação", value: operationsCost },
    { label: "Recebido", value: paidRevenue }
  ];

  document.getElementById("fin-custos").innerHTML = costBuckets
    .map(
      (bucket) => `
        <div>
          <div class="progress-item-head">
            <span>${bucket.label}</span><span class="text-strong">${formatCurrency(bucket.value)}</span>
          </div>
          <div class="progress-bar progress-sm"><div class="progress-fill" style="width:${Math.min((bucket.value / Math.max(totalRevenue || 1, 1)) * 100, 100)}%;background:var(--ink)"></div></div>
        </div>
      `
    )
    .join("") || UI.empty("Nenhum custo registrado", "Os lançamentos de custo por categoria aparecerão aqui.");

  const canManageInvoices = ["admin", "comercial"].includes(state.session.user.role);
  const financeCards = document.querySelectorAll("#page-financeiro .two-col .card .section-title");
  if (financeCards[0]) {
    financeCards[0].textContent = "Custos e Recebimentos";
  }
  if (financeCards[1]) {
    financeCards[1].textContent = "Cobranças e faturas";
  }
  const chargeRows = state.charges.map(
    (charge) => `
      <div class="charge-item">
        <div class="charge-head">
          <div>
            <div class="charge-name">${charge.client_name || charge.contact_name || "Sem cliente"}</div>
            <div class="charge-sub">${charge.payment_method} · vencimento ${formatDate(charge.due_date)} · ${formatCurrency(charge.amount)}</div>
          </div>
          <span class="badge ${String(charge.status || "").toLowerCase().includes("receive") || String(charge.status || "").toLowerCase().includes("paid") ? "badge-green" : "badge-yellow"}">${normalizeChargeStatus(charge.status)}</span>
        </div>
        <div class="charge-desc">${charge.description || "Cobrança gerada sem observação complementar"}</div>
        <div class="item-actions">
          ${charge.payment_link ? `<button class="btn btn-ghost btn-sm" onclick="openChargeResource(${charge.id}, 'payment_link')">Abrir link</button>` : ""}
          ${charge.boleto_url ? `<button class="btn btn-ghost btn-sm" onclick="openChargeResource(${charge.id}, 'boleto_url')">Boleto</button>` : ""}
          ${charge.pix_copy_paste ? `<button class="btn btn-ghost btn-sm" onclick="copyChargePix(${charge.id})">Copiar Pix</button>` : ""}
          ${
            canManageInvoices
              ? `<button class="btn btn-ghost btn-sm" onclick="updateChargeStatus(${charge.id}, 'RECEIVED')">Recebida</button>
                 <button class="btn btn-ghost btn-sm" onclick="updateChargeStatus(${charge.id}, 'PENDING')">Pendente</button>`
              : ""
          }
        </div>
      </div>
    `
  );

  const invoiceRows = state.invoices.map(
      (invoice) => `
        <div class="invoice-item">
          <div class="invoice-head">
            <div>
              <div class="invoice-name">${invoice.client_name}</div>
              <div class="invoice-sub">Vencimento ${formatDate(invoice.due_date)} · ${formatCurrency(invoice.amount)}</div>
            </div>
            <span class="badge ${invoice.status === "Pago" ? "badge-green" : invoice.status === "Em aberto" ? "badge-yellow" : "badge-blue"}">${invoice.status}</span>
          </div>
          ${
            canManageInvoices
              ? `<div class="item-actions">
                  <button class="btn btn-ghost btn-sm" onclick="updateInvoiceStatus(${invoice.id}, 'Pago')">Marcar pago</button>
                  <button class="btn btn-ghost btn-sm" onclick="updateInvoiceStatus(${invoice.id}, 'Em aberto')">Em aberto</button>
                </div>`
              : ""
          }
        </div>
      `
    );

  document.getElementById("fin-comissoes").innerHTML =
    [...chargeRows, ...invoiceRows].join("") || UI.empty("Nenhuma cobrança ou fatura cadastrada", "Use os botões do módulo para registrar a primeira cobrança ou fatura.");
}

function renderAll() {
  const sections = [
    ["contadores", renderSidebarCounts],
    ["home", renderHome],
    ["kanban", renderKanban],
    ["crm", renderCRM],
    ["campanhas", renderCampaigns],
    ["producao", renderProduction],
    ["trafego", renderTraffic],
    ["analytics", renderAnalytics],
    ["financeiro", renderFinance],
    ["acesso", renderAccessV2]
  ];

  sections.forEach(([label, renderer]) => {
    try {
      renderer();
    } catch (error) {
      console.error(`[renderAll] Falha ao renderizar ${label}:`, error);
    }
  });

  bindLegacyInlineHandlers();
}

function renderAccessV2() {
  if (state.session.user.role !== "admin") {
    return;
  }

  document.getElementById("membros-tbody").innerHTML = state.users
    .map((user) => renderMemberRow(user, state.session.user.id))
    .join("") || UI.tableEmpty(6, "Nenhum membro cadastrado", "Crie o primeiro usuário interno para liberar o acesso da equipe.");

  const roleCards = {
    Admin: ["Clientes", "Campanhas", "Kanban", "Produção", "Tráfego", "Analytics", "Financeiro", "Controle de acesso"],
    Gestor: ["Dashboard interno", "Kanban", "CRM", "Campanhas", "Produção", "Tráfego", "Analytics", "Cobranças"],
    Designer: ["Dashboard interno", "Kanban", "Produção"],
    Comercial: ["Dashboard interno", "Kanban", "CRM", "Campanhas", "Produção", "Financeiro"],
    Dev: ["Dashboard interno", "Kanban", "Produção", "Analytics"],
    Cliente: ["Dashboard", "Campanhas", "Relatórios", "Faturas", "Mensagens"]
  };

  document.getElementById("perfis-grid").innerHTML = Object.entries(roleCards)
    .map(([role, permissions]) => renderRoleCard(role, permissions))
    .join("");
}

async function refreshData() {
  const roleDataAccess = ROLE_DATA_ACCESS[state.session.user.role] || {};
  const fetchFailures = [];
  const loadResource = async (label, loader, fallback) => {
    try {
      return await loader();
    } catch (error) {
      fetchFailures.push(label);
      console.warn(`[refreshData] Falha ao carregar ${label}:`, error);
      return typeof fallback === "function" ? fallback() : fallback;
    }
  };
  const homeKpis = document.querySelector("#page-home .kpi-grid");
  if (homeKpis) {
    homeKpis.innerHTML = UI.skeletonKpis(4);
  }

  const crmKpis = document.getElementById("crm-kpi-grid");
  if (crmKpis) {
    crmKpis.innerHTML = UI.skeletonKpis(5);
  }

  const campaignsKpis = document.getElementById("campaigns-kpi-grid");
  if (campaignsKpis) {
    campaignsKpis.innerHTML = UI.skeletonKpis(4);
  }

  const trafficKpis = document.getElementById("traffic-kpi-grid");
  if (trafficKpis) {
    trafficKpis.innerHTML = UI.skeletonKpis(4);
  }

  const financeKpis = document.querySelector("#page-financeiro .kpi-grid");
  if (financeKpis) {
    financeKpis.innerHTML = UI.skeletonKpis(4);
  }

  const analyticsKpis = document.querySelector("#page-analytics .kpi-grid");
  if (analyticsKpis) {
    analyticsKpis.innerHTML = UI.skeletonKpis(4);
  }

  const campaignsBody = document.getElementById("campanhas-tbody");
  if (campaignsBody) {
    campaignsBody.innerHTML = UI.skeletonRows(8, 4);
  }

  const membersBody = document.getElementById("membros-tbody");
  if (membersBody) {
    membersBody.innerHTML = UI.skeletonRows(6, 3);
  }

  const analyticsBody = document.getElementById("analytics-tbody");
  if (analyticsBody) {
    analyticsBody.innerHTML = UI.skeletonRows(7, 4);
  }

  const integrationsBody = document.getElementById("integrations-tbody");
  if (integrationsBody) {
    integrationsBody.innerHTML = UI.skeletonRows(7, 3);
  }

  const clientsBody = document.getElementById("clientes-tbody");
  if (clientsBody) {
    clientsBody.innerHTML = UI.skeletonRows(7, 4);
  }

  const filesBody = document.getElementById("copy-tbody");
  if (filesBody) {
    filesBody.innerHTML = UI.skeletonRows(6, 4);
  }

  const reportsBody = document.getElementById("lp-tbody");
  if (reportsBody) {
    reportsBody.innerHTML = UI.skeletonRows(5, 4);
  }

  const trafficBody = document.getElementById("trafego-tbody");
  if (trafficBody) {
    trafficBody.innerHTML = UI.skeletonRows(8, 4);
  }

  const pipelineBoard = document.getElementById("pipeline-board");
  if (pipelineBoard) {
    pipelineBoard.innerHTML = UI.empty("Carregando pipeline...", "Buscando dados do CRM.");
  }

  const designGrid = document.getElementById("design-grid");
  if (designGrid) {
    designGrid.innerHTML = UI.empty("Carregando entregas...", "Buscando materiais e arquivos.");
  }

  const platformBreakdown = document.getElementById("traffic-platform-breakdown");
  if (platformBreakdown) {
    platformBreakdown.innerHTML = UI.empty("Carregando tráfego...", "Buscando métricas e campanhas.");
  }

  const [dashboard, team, assignableUsers, clients, campaigns, tasks, checklist, users, contacts, invoices, metrics, reports, materials, files, charges, integrations] = await Promise.all([
    loadResource("dashboard", () => apiFetch("/dashboard"), () => createEmptyDashboard()),
    roleDataAccess.homeTeam ? loadResource("equipe", () => apiFetch("/users/team", { cache: "no-store" }), []) : Promise.resolve([]),
    roleDataAccess.assignableUsers ? loadResource("responsáveis", () => apiFetch("/users/assignable", { cache: "no-store" }), []) : Promise.resolve([]),
    roleDataAccess.clients ? loadResource("clientes", () => apiFetch("/clients"), []) : Promise.resolve([]),
    roleDataAccess.campaigns ? loadResource("campanhas", () => apiFetch("/campaigns"), []) : Promise.resolve([]),
    roleDataAccess.tasks ? loadResource("tarefas", () => apiFetch("/tasks"), []) : Promise.resolve([]),
    roleDataAccess.tasks ? loadResource("checklist", () => apiFetch("/checklists/daily", { cache: "no-store" }), () => createEmptyChecklistSnapshot()) : Promise.resolve(createEmptyChecklistSnapshot()),
    roleDataAccess.users ? loadResource("usuários", () => apiFetch("/users"), []) : Promise.resolve([]),
    roleDataAccess.contacts ? loadResource("CRM", () => apiFetch("/contacts"), []) : Promise.resolve([]),
    roleDataAccess.invoices ? loadResource("faturas", () => apiFetch("/invoices"), []) : Promise.resolve([]),
    roleDataAccess.metrics ? loadResource("métricas", () => apiFetch("/metrics"), []) : Promise.resolve([]),
    roleDataAccess.reports ? loadResource("relatórios", () => apiFetch("/reports"), []) : Promise.resolve([]),
    roleDataAccess.materials ? loadResource("produção", () => apiFetch("/materials"), []) : Promise.resolve([]),
    roleDataAccess.files ? loadResource("arquivos", () => apiFetch("/files"), []) : Promise.resolve([]),
    roleDataAccess.charges ? loadResource("cobranças", () => apiFetch("/charges"), []) : Promise.resolve([]),
    roleDataAccess.integrations ? loadResource("integrações", () => apiFetch("/integrations"), []) : Promise.resolve([])
  ]);

  state.dashboard = dashboard && typeof dashboard === "object" ? dashboard : createEmptyDashboard();
  state.team = mergeInternalUsers(toArray(team), toArray(assignableUsers), toArray(state.dashboard?.team), toArray(users));
  state.assignableUsers = mergeInternalUsers(toArray(assignableUsers), toArray(team));
  state.clients = toArray(clients);
  state.campaigns = toArray(campaigns);
  state.tasks = toArray(tasks);
  state.users = toArray(users).length ? toArray(users) : [state.session.user];
  state.contacts = toArray(contacts);
  state.invoices = toArray(invoices);
  state.metrics = toArray(metrics);
  state.reports = toArray(reports);
  state.materials = toArray(materials);
  state.files = toArray(files);
  state.charges = toArray(charges);
  state.integrations = toArray(integrations);
  state.checklist = normalizeChecklistSnapshot(checklist);

  const scopedClients = getScopedClientOptions();
  const hasSelectedKanbanClient = scopedClients.some((client) => String(client.id) === String(state.filters.kanbanClient));
  const hasSelectedAnalyticsClient = scopedClients.some((client) => String(client.id) === String(state.filters.analyticsClient));
  if (state.filters.kanbanClient && !hasSelectedKanbanClient) {
    state.filters.kanbanClient = "";
  }
  if (state.filters.analyticsClient && !hasSelectedAnalyticsClient) {
    state.filters.analyticsClient = "";
  }

  const kanbanFilter = document.querySelector("#page-kanban select");
  if (kanbanFilter) {
    kanbanFilter.innerHTML = `<option value="">Todos os clientes</option>${scopedClients
      .map((client) => `<option value="${client.id}">${client.name}</option>`)
      .join("")}`;
    kanbanFilter.value = state.filters.kanbanClient;
  }

  const analyticsClientFilter = document.getElementById("analytics-client-filter");
  if (analyticsClientFilter) {
    analyticsClientFilter.innerHTML = `<option value="">Todos os clientes</option>${scopedClients
      .map((client) => `<option value="${client.id}">${client.name}</option>`)
      .join("")}`;
    analyticsClientFilter.value = state.filters.analyticsClient;
  }

  const analyticsPeriodFilter = document.getElementById("analytics-period-filter");
  if (analyticsPeriodFilter) {
    const periods = [...new Set(state.metrics.map((metric) => String(metric.period).slice(0, 10)))];
    analyticsPeriodFilter.innerHTML = `<option value="">Todos os períodos</option>${periods
      .map((period) => `<option value="${period}">${formatDate(period)}</option>`)
      .join("")}`;
    analyticsPeriodFilter.value = state.filters.analyticsPeriod;
  }

  const analyticsActions = document.querySelector("#page-analytics .topbar-actions");
  const integrationsButton = document.getElementById("btn-manage-integrations");
  if (analyticsActions && canManageIntegrations() && hasScopedClients() && !integrationsButton) {
    const button = document.createElement("button");
    button.id = "btn-manage-integrations";
    button.className = "btn btn-pink btn-sm";
    button.textContent = "+ Nova integração";
    button.onclick = () => openModal("nova-integracao");
    analyticsActions.append(button);
  }
  if (integrationsButton && (!canManageIntegrations() || !hasScopedClients())) {
    integrationsButton.remove();
  }

  const crmActions = document.querySelector("#page-crm .topbar-actions");
  const newClientButton = document.getElementById("btn-new-client");
  if (crmActions && canManageClients() && !newClientButton) {
    const button = document.createElement("button");
    button.id = "btn-new-client";
    button.className = "btn btn-outline btn-sm";
    button.textContent = "+ Novo cliente";
    button.onclick = () => openModal("novo-cliente");
    crmActions.prepend(button);
  }
  if (newClientButton && !canManageClients()) {
    newClientButton.remove();
  }

  const newDeliveryButton = document.getElementById("btn-new-delivery");
  if (newDeliveryButton) {
    newDeliveryButton.style.display = canManageMaterials() ? "" : "none";
  }

  renderAll();

  if (fetchFailures.length) {
    const uniqueFailures = [...new Set(fetchFailures)];
    showToast(`Alguns módulos não carregaram: ${uniqueFailures.join(", ")}.`);
  }
}

async function doLogin() {
  const email = document.getElementById("l-email").value.trim();
  const password = document.getElementById("l-pass").value;
  const errorNode = document.getElementById("login-error");
  errorNode.style.display = "none";
  const submitButton = document.querySelector(".login-btn");

  await FORM.submit(
    { querySelector: () => submitButton },
    async () => {
      const session = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false
      });

      if (session.user.role === "client") {
        throw new Error("Este painel é restrito aos perfis internos.");
      }

      saveSession(session);
      await initializeApp();
    },
    { loadingText: "Entrando...", button: submitButton }
  )().catch((error) => {
    errorNode.textContent = error.message;
    errorNode.style.display = "block";
  });
}

async function initializeApp() {
  const me = await apiFetch("/auth/me");
  state.session.user = me.user;
  saveSession(state.session);
  setRoleUI(me.user);
  document.getElementById("home-date").textContent = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full"
  }).format(new Date());
  document.getElementById("login-screen").classList.add("hidden");
  syncNavigation();
  bindSidebarInteractions();
  bindLegacyInlineHandlers();
  await refreshData();
}

function doLogout() {
  closeSidebar();
  APP.logout({ reason: "manual" }).finally(() => {
    clearSession();
    window.location.href = "/";
  });
}

function setTab(group, tab) {
  if (group === "crm") {
    document.getElementById("crm-pipeline").style.display = tab === "pipeline" ? "block" : "none";
    document.getElementById("crm-clientes").style.display = tab === "clientes" ? "block" : "none";
    document.getElementById("crm-historico").style.display = tab === "historico" ? "block" : "none";
  }

  if (group === "prod") {
    document.getElementById("prod-design").style.display = tab === "design" ? "block" : "none";
    document.getElementById("prod-copy").style.display = tab === "copy" ? "block" : "none";
    document.getElementById("prod-lp").style.display = tab === "lp" ? "block" : "none";
  }

  if (group === "acesso") {
    document.getElementById("acesso-membros").style.display = tab === "membros" ? "block" : "none";
    document.getElementById("acesso-perfis").style.display = tab === "perfis" ? "block" : "none";
  }

  document.querySelectorAll(`[id^="${group}-tab-"]`).forEach((node) => {
    node.classList.toggle("active", node.id === `${group}-tab-${tab}`);
  });
}

function filterKanban(clientId) {
  state.filters.kanbanClient = clientId;
  renderKanban();
}

function setAnalyticsClientFilter(clientId) {
  state.filters.analyticsClient = clientId;
  renderAnalytics();
}

function setAnalyticsPeriodFilter(period) {
  state.filters.analyticsPeriod = period;
  renderAnalytics();
}

async function syncTrafficData() {
  await refreshData();
  showToast("Painel atualizado com sucesso.");
}

async function updateInvoiceStatus(id, status) {
  try {
    await apiFetch(`/invoices/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await refreshData();
    showToast("Status da fatura atualizado com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

function exportFinanceCsv() {
  const rows = [
    ["tipo", "cliente", "metodo", "valor", "status", "vencimento", "referencia"],
    ...state.charges.map((charge) => [
      "cobrança",
      charge.client_name || charge.contact_name || "",
      charge.payment_method || "",
      Number(charge.amount || 0),
      charge.status || "",
      formatDate(charge.due_date),
      charge.provider_charge_id || charge.external_reference || ""
    ]),
    ...state.invoices.map((invoice) => ["fatura", invoice.client_name, "", Number(invoice.amount || 0), invoice.status, formatDate(invoice.due_date), invoice.id])
  ];
  const csv = rows.map((row) => row.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "financeiro.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function modalFormWrapper(title, body, submitLabel = "Salvar") {
  return `
    <form id="modal-form">
      <div class="modal-title" id="modal-dialog-title">${title}</div>
      <div class="form-grid">${body}</div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button type="submit" id="modal-submit-btn" class="btn btn-pink">${submitLabel}</button>
      </div>
    </form>
  `;
}

function clientOptions(selectedId) {
  return state.clients
    .map((client) => `<option value="${client.id}" ${String(selectedId) === String(client.id) ? "selected" : ""}>${client.name}</option>`)
    .join("");
}

function userOptions(selectedId) {
  const source = state.assignableUsers.length ? state.assignableUsers : state.team.length ? state.team : state.users;
  return source
    .filter((user) => user && user.is_active !== false)
    .filter((user) => user.role !== "client")
    .map((user) => `<option value="${user.id}" ${String(selectedId) === String(user.id) ? "selected" : ""}>${user.name}</option>`)
    .join("");
}

function contactOptions(selectedId) {
  return state.contacts
    .map((contact) => `<option value="${contact.id}" ${String(selectedId) === String(contact.id) ? "selected" : ""}>${contact.name}${contact.company ? ` · ${contact.company}` : ""}</option>`)
    .join("");
}

function normalizeFormPayload(payload, nullableKeys = []) {
  const normalized = { ...payload };
  nullableKeys.forEach((key) => {
    if (normalized[key] === "") {
      normalized[key] = null;
    }
  });
  return normalized;
}

function campaignOptions(clientId, selectedId) {
  return state.campaigns
    .filter((campaign) => !clientId || String(campaign.client_id) === String(clientId))
    .map((campaign) => `<option value="${campaign.id}" ${String(selectedId) === String(campaign.id) ? "selected" : ""}>${campaign.name}</option>`)
    .join("");
}

function stateOptions(selected = "") {
  return BRAZIL_STATES.map((stateCode) => `<option value="${stateCode}" ${String(selected).toUpperCase() === stateCode ? "selected" : ""}>${stateCode}</option>`).join("");
}

function normalizeZipCode(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

function formatZipCodeInput(value) {
  const digits = normalizeZipCode(value);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeStateCode(value) {
  return String(value || "").trim().toUpperCase().slice(0, 2);
}

function normalizeCountry(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "Brasil";
}

function buildClientAddressFields(client) {
  return `
    <div class="field">
      <label>CEP</label>
      <div class="field-inline">
        <input name="zip_code" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000" value="${escapeHtml(formatZipCodeInput(client.zip_code || ""))}">
        <button type="button" class="btn btn-outline btn-sm" data-action="lookup-cep">Buscar CEP</button>
      </div>
      <div class="field-help" data-cep-feedback>Informe o CEP para sugerir estado, cidade, bairro e rua. Todos os campos continuam editáveis manualmente.</div>
    </div>
    <div class="field">
      <label>Estado</label>
      <select name="state" autocomplete="off">
        <option value="">Selecione</option>
        ${stateOptions(client.state || "")}
      </select>
    </div>
    <div class="field"><label>Cidade</label><input name="city" autocomplete="off" value="${escapeHtml(client.city || "")}"></div>
    <div class="field"><label>Bairro</label><input name="neighborhood" autocomplete="off" value="${escapeHtml(client.neighborhood || "")}"></div>
    <div class="field form-full"><label>Endereço</label><input name="address_line1" autocomplete="off" value="${escapeHtml(client.address_line1 || "")}"></div>
    <div class="field"><label>Complemento</label><input name="address_line2" autocomplete="off" value="${escapeHtml(client.address_line2 || "")}"></div>
    <div class="field"><label>País</label><input name="country" autocomplete="off" value="${escapeHtml(client.country || "Brasil")}"></div>
  `;
}

function setCepFeedback(target, message, tone = "") {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.classList.toggle("is-error", tone === "error");
  target.classList.toggle("is-success", tone === "success");
}

function setAddressFieldValue(field, value, force = false) {
  if (!field) {
    return false;
  }

  const nextValue = String(value || "").trim();
  if (!nextValue) {
    return false;
  }

  const currentValue = String(field.value || "").trim();
  const canReplace = force || !currentValue || field.dataset.autofilled === "1" || field.dataset.userEdited !== "1";

  if (!canReplace) {
    return false;
  }

  field.dataset.settingValue = "1";
  field.value = nextValue;
  field.dataset.autofilled = "1";
  delete field.dataset.settingValue;
  return true;
}

async function fetchCepSuggestion(cep) {
  const mapCepResponse = (data) => {
    if (data?.erro) {
      throw new Error("CEP nao encontrado.");
    }

    return {
      zip_code: formatZipCodeInput(cep),
      address_line1: data.logradouro || data.address_line1 || "",
      address_line2: data.complemento || data.address_line2 || "",
      neighborhood: data.bairro || data.neighborhood || "",
      city: data.localidade || data.city || "",
      state: data.uf || data.state || "",
      country: data.country || "Brasil",
    };
  };

  try {
    const data = await apiFetch(`/address/cep/${cep}`, { cache: "no-store" });
    return mapCepResponse(data);
  } catch (_error) {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Nao foi possivel consultar o CEP no momento.");
    }

    const data = await response.json().catch(() => ({}));
    return mapCepResponse(data);
  }
}

function bindManualAddressField(field) {
  if (!field || field.dataset.boundManualAddress === "1") {
    return;
  }

  const markManualEdit = () => {
    if (field.dataset.settingValue === "1") {
      return;
    }
    field.dataset.autofilled = "0";
    field.dataset.userEdited = "1";
  };

  field.dataset.userEdited = field.dataset.userEdited || "0";
  field.addEventListener("input", markManualEdit);
  field.addEventListener("change", markManualEdit);

  field.dataset.boundManualAddress = "1";
}

function initClientAddressAssist(form) {
  if (!form || form.dataset.boundClientAddressAssist === "1") {
    return;
  }

  const zipField = form.querySelector('[name="zip_code"]');
  const lookupButton = form.querySelector('[data-action="lookup-cep"]');
  const feedbackNode = form.querySelector('[data-cep-feedback]');
  const stateField = form.querySelector('[name="state"]');
  const cityField = form.querySelector('[name="city"]');
  const neighborhoodField = form.querySelector('[name="neighborhood"]');
  const addressField = form.querySelector('[name="address_line1"]');
  const complementField = form.querySelector('[name="address_line2"]');
  const countryField = form.querySelector('[name="country"]');

  if (!zipField) {
    return;
  }

  [stateField, cityField, neighborhoodField, addressField, complementField, countryField].forEach(bindManualAddressField);

  let lastResolvedCep = "";
  let lookupTimer = null;
  let lookupInFlightCep = "";

  const applyAddressLookup = async (force = false) => {
    const cep = normalizeZipCode(zipField.value);

    if (cep.length !== 8) {
      setCepFeedback(feedbackNode, "Informe um CEP valido com 8 digitos para buscar o endereco.", "error");
      return;
    }

    if (!force && cep === lastResolvedCep) {
      setCepFeedback(feedbackNode, "CEP ja localizado. Voce pode ajustar os campos manualmente se necessario.");
      return;
    }

    if (lookupInFlightCep === cep) {
      return;
    }

    if (lookupButton) {
      lookupButton.disabled = true;
    }
    lookupInFlightCep = cep;
    setCepFeedback(feedbackNode, "Buscando endereco pelo CEP...");

    try {
      const address = await fetchCepSuggestion(cep);
      zipField.dataset.settingValue = "1";
      zipField.value = address.zip_code || formatZipCodeInput(cep);
      zipField.dataset.autofilled = "1";
      delete zipField.dataset.settingValue;

      const appliedFields = [
        setAddressFieldValue(stateField, normalizeStateCode(address.state), force),
        setAddressFieldValue(cityField, address.city, force),
        setAddressFieldValue(neighborhoodField, address.neighborhood, force),
        setAddressFieldValue(addressField, address.address_line1, force),
        setAddressFieldValue(complementField, address.address_line2, force),
        setAddressFieldValue(countryField, normalizeCountry(address.country), force),
      ].filter(Boolean).length;

      lastResolvedCep = cep;
      setCepFeedback(
        feedbackNode,
        appliedFields
          ? "CEP localizado. Confira e ajuste os campos se necessario."
          : "CEP localizado. Os campos ja tinham dados preenchidos manualmente.",
        "success"
      );
    } catch (error) {
      setCepFeedback(feedbackNode, error.message, "error");
    } finally {
      lookupInFlightCep = "";
      if (lookupButton) {
        lookupButton.disabled = false;
      }
    }
  };

  zipField.addEventListener("input", () => {
    const formatted = formatZipCodeInput(zipField.value);
    zipField.dataset.settingValue = "1";
    zipField.value = formatted;
    delete zipField.dataset.settingValue;
    clearTimeout(lookupTimer);
    if (normalizeZipCode(formatted) !== lastResolvedCep) {
      setCepFeedback(feedbackNode, "Informe o CEP para sugerir estado, cidade, bairro e rua. Todos os campos continuam editáveis manualmente.");
    }
    if (normalizeZipCode(formatted).length === 8) {
      lookupTimer = window.setTimeout(() => {
        applyAddressLookup(false);
      }, 350);
    }
  });

  zipField.addEventListener("change", () => {
    if (normalizeZipCode(zipField.value).length === 8) {
      clearTimeout(lookupTimer);
      applyAddressLookup(false);
    }
  });

  zipField.addEventListener("paste", () => {
    window.setTimeout(() => {
      if (normalizeZipCode(zipField.value).length === 8) {
        clearTimeout(lookupTimer);
        applyAddressLookup(false);
      }
    }, 0);
  });

  zipField.addEventListener("blur", () => {
    const cep = normalizeZipCode(zipField.value);
    if (cep.length === 8) {
      clearTimeout(lookupTimer);
      applyAddressLookup(false);
    }
  });

  lookupButton?.addEventListener("click", () => applyAddressLookup(true));

  form.dataset.boundClientAddressAssist = "1";
}

function openModal(type, id = null) {
  const modal = document.getElementById("modal-content");
  lastFocusedElement = document.activeElement;
  let html = "";

  if (type === "novo-cliente") {
    const client = state.clients.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      client.id ? "Editar cliente" : "Novo cliente",
      `
        <div class="field"><label>Nome</label><input name="name" value="${client.name || ""}" required></div>
        <div class="field"><label>Empresa</label><input name="company" value="${client.company || ""}" required></div>
        <div class="field"><label>Plano</label><input name="plan" value="${client.plan || ""}"></div>
        <div class="field"><label>MRR</label><input type="number" step="0.01" name="mrr" value="${client.mrr || ""}"></div>
        <div class="field"><label>Segmento</label><input name="segment" value="${client.segment || ""}"></div>
        <div class="field"><label>Responsável</label><select name="manager_id"><option value="">Selecione</option>${userOptions(client.manager_id)}</select></div>
        <div class="field"><label>Início</label><input type="date" name="started_at" value="${client.started_at ? String(client.started_at).slice(0, 10) : ""}"></div>
        <div class="field"><label>Documento</label><input name="legal_document" value="${client.legal_document || ""}"></div>
        <div class="field"><label>Contato principal</label><input name="contact_name" value="${client.contact_name || ""}"></div>
        <div class="field"><label>Email contato</label><input type="email" name="contact_email" value="${client.contact_email || ""}"></div>
        <div class="field"><label>Telefone contato</label><input name="contact_phone" value="${client.contact_phone || ""}"></div>
        <div class="field"><label>Email financeiro</label><input type="email" name="billing_email" value="${client.billing_email || ""}"></div>
        ${buildClientAddressFields(client)}
        <div class="field form-full"><label>Manual da marca</label><textarea name="brand_manual" placeholder="Tom de voz, referências, restrições, roteiro da marca, orientações de gravação, edição, design e postagem.">${client.brand_manual || ""}</textarea><div class="field-help">Use este campo para registrar o jeito certo de falar, criar, revisar e publicar para esta marca.</div></div>
        <div class="field form-full"><label>Observações</label><textarea name="notes">${client.notes || ""}</textarea></div>
      `
    );
  }

  if (type === "nova-tarefa") {
    const task = state.tasks.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      task.id ? "Editar tarefa" : "Nova tarefa",
      `
        <div class="field form-full"><label>Título</label><input name="title" value="${task.title || ""}" required></div>
        <div class="field"><label>Cliente</label><select name="client_id"><option value="">Interno</option>${clientOptions(task.client_id)}</select></div>
        <div class="field"><label>Responsável</label><select name="assigned_to"><option value="">Ninguém</option>${userOptions(task.assigned_to)}</select></div>
        <div class="field"><label>Tipo</label><select name="type">${taskTypeOptions(task.type || "geral")}</select></div>
        <div class="field"><label>Status</label><select name="status"><option ${task.status === "Backlog" ? "selected" : ""}>Backlog</option><option ${task.status === "Em progresso" ? "selected" : ""}>Em progresso</option><option ${task.status === "Concluido" ? "selected" : ""}>Concluido</option></select></div>
        <div class="field"><label>Coluna</label><select name="column_name"><option value="backlog" ${task.column_name === "backlog" ? "selected" : ""}>Backlog</option><option value="todo" ${task.column_name === "todo" ? "selected" : ""}>A Fazer</option><option value="doing" ${task.column_name === "doing" ? "selected" : ""}>Em Progresso</option><option value="done" ${task.column_name === "done" ? "selected" : ""}>Concluído</option></select></div>
        <div class="field"><label>Prazo</label><input type="date" name="deadline" value="${(task.deadline || task.due_date) ? String(task.deadline || task.due_date).slice(0, 10) : ""}"></div>
        <div class="field form-full"><label>Descrição</label><textarea name="description">${task.description || ""}</textarea></div>
      `
    );
  }

  if (type === "novo-lead") {
    const contact = state.contacts.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      contact.id ? "Editar lead" : "Novo lead",
      `
        <div class="field"><label>Nome</label><input name="name" value="${contact.name || ""}" required></div>
        <div class="field"><label>Empresa</label><input name="company" value="${contact.company || ""}"></div>
        <div class="field"><label>Serviço</label><input name="service" value="${contact.service || ""}"></div>
        <div class="field"><label>Telefone</label><input name="phone" value="${contact.phone || ""}" required></div>
        <div class="field"><label>WhatsApp</label><input name="whatsapp" value="${contact.whatsapp || ""}"></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" value="${contact.email || ""}" required></div>
        <div class="field"><label>Documento</label><input name="document" value="${contact.document || ""}"></div>
        <div class="field"><label>Origem</label><input name="source" value="${contact.source || ""}"></div>
        <div class="field"><label>Owner</label><select name="owner_id"><option value="">Selecione</option>${userOptions(contact.owner_id)}</select></div>
        <div class="field"><label>Responsável</label><select name="assigned_to"><option value="">Selecione</option>${userOptions(contact.assigned_to)}</select></div>
        <div class="field"><label>Etapa</label><select name="lead_stage"><option ${contact.lead_stage === "Prospeccao" ? "selected" : ""}>Prospecção</option><option ${contact.lead_stage === "Contato feito" ? "selected" : ""}>Contato feito</option><option ${contact.lead_stage === "Proposta" ? "selected" : ""}>Proposta</option><option ${contact.lead_stage === "Negociacao" ? "selected" : ""}>Negociação</option><option ${contact.lead_stage === "Fechado" ? "selected" : ""}>Fechado</option></select></div>
        <div class="field"><label>Valor estimado</label><input type="number" step="0.01" name="estimated_value" value="${contact.estimated_value || ""}"></div>
        <div class="field"><label>Data nascimento</label><input type="date" name="birth_date" value="${contact.birth_date ? String(contact.birth_date).slice(0, 10) : ""}"></div>
        <div class="field"><label>Último contato</label><input type="datetime-local" name="last_contact_at" value="${contact.last_contact_at ? new Date(contact.last_contact_at).toISOString().slice(0, 16) : ""}"></div>
        <div class="field"><label>Cidade</label><input name="city" value="${contact.city || ""}"></div>
        <div class="field"><label>Estado</label><input name="state" value="${contact.state || ""}"></div>
        <div class="field form-full"><label>Endereço</label><input name="address_line1" value="${contact.address_line1 || ""}"></div>
        <div class="field"><label>Complemento</label><input name="address_line2" value="${contact.address_line2 || ""}"></div>
        <div class="field"><label>Bairro</label><input name="neighborhood" value="${contact.neighborhood || ""}"></div>
        <div class="field"><label>CEP</label><input name="zip_code" value="${contact.zip_code || ""}"></div>
        <div class="field"><label>País</label><input name="country" value="${contact.country || "Brasil"}"></div>
        <div class="field form-full"><label>Mensagem</label><textarea name="message">${contact.message || ""}</textarea></div>
        <div class="field form-full"><label>Observações</label><textarea name="notes">${contact.notes || ""}</textarea></div>
      `
    );
  }

  if (type === "nova-campanha") {
    const campaign = state.campaigns.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      campaign.id ? "Editar campanha" : "Nova campanha",
      `
        <div class="field form-full"><label>Nome</label><input name="name" value="${campaign.name || ""}" required></div>
        <div class="field"><label>Cliente</label><select name="client_id">${clientOptions(campaign.client_id)}</select></div>
        <div class="field"><label>Canal</label><input name="channel" value="${campaign.channel || ""}" required></div>
        <div class="field form-full"><label>Público</label><input name="audience" value="${campaign.audience || ""}"></div>
        <div class="field"><label>Orçamento</label><input type="number" step="0.01" name="budget" value="${campaign.budget || ""}" required></div>
        <div class="field"><label>Início</label><input type="date" name="start_date" value="${campaign.start_date ? String(campaign.start_date).slice(0, 10) : ""}"></div>
        <div class="field form-full"><label>Objetivo</label><textarea name="objective">${campaign.objective || ""}</textarea></div>
      `
    );
  }

  if (type === "nova-entrega") {
    const material = state.materials.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      material.id ? "Editar entrega" : "Nova entrega",
      `
        <div class="field form-full"><label>Título</label><input name="title" value="${material.title || ""}" required></div>
        <div class="field"><label>Cliente</label><select name="client_id">${clientOptions(material.client_id)}</select></div>
        <div class="field"><label>Campanha</label><select name="campaign_id"><option value="">Nenhuma</option>${campaignOptions(material.client_id, material.campaign_id)}</select></div>
        <div class="field"><label>Status</label><select name="status"><option ${material.status === "Pendente" ? "selected" : ""}>Pendente</option><option ${material.status === "Aprovado" ? "selected" : ""}>Aprovado</option><option ${material.status === "Revisao" ? "selected" : ""}>Revisão</option></select></div>
        <div class="field form-full"><label>Arquivo</label><input type="file" name="file" accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.pdf,.zip,.docx,.xlsx,.mp4,.mov,.webm"><div class="field-help">Formatos aceitos: imagem, PDF, ZIP, DOCX, XLSX, MP4, MOV e WEBM.</div></div>
      `,
      material.id ? "Atualizar" : "Salvar"
    );
  }

  if (type === "novo-membro") {
    const user = state.users.find((item) => item.id === id) || {};
    const passwordHelp = user.id
      ? "Deixe em branco para manter a senha atual. Se preencher, use no minimo 12 caracteres com maiuscula, minuscula, numero e simbolo."
      : "Use no minimo 12 caracteres com maiuscula, minuscula, numero e simbolo.";
    html = modalFormWrapper(
      user.id ? "Editar membro" : "Novo membro",
      `
        <div class="field"><label>Nome</label><input name="name" value="${user.name || ""}" required></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" value="${user.email || ""}" required></div>
        <div class="field"><label>Perfil</label><select name="role"><option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option><option value="gestor" ${user.role === "gestor" ? "selected" : ""}>Gestor</option><option value="designer" ${user.role === "designer" ? "selected" : ""}>Designer</option><option value="comercial" ${user.role === "comercial" ? "selected" : ""}>Comercial</option><option value="dev" ${user.role === "dev" ? "selected" : ""}>Dev</option><option value="client" ${user.role === "client" ? "selected" : ""}>Cliente</option></select></div>
        <div class="field"><label>Cliente vinculado</label><select name="client_id"><option value="">Nenhum</option>${clientOptions(user.client_id)}</select></div>
        <div class="field form-full"><label>Senha ${user.id ? "(opcional)" : ""}</label><input type="password" name="password" ${user.id ? "" : "required"}><div class="field-help">${passwordHelp}</div></div>
      `
    );
  }

  if (type === "nova-integracao") {
    const integration = state.integrations.find((item) => item.id === id) || {};
    const scopedClients = getScopedClientOptions();
    if (!scopedClients.length) {
      html = `
        <div class="modal-title" id="modal-dialog-title">Integrações do analytics</div>
        <p class="metric-note">Cadastre pelo menos um cliente antes de registrar integrações. As conexões deste módulo sempre pertencem a um cliente específico.</p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Fechar</button></div>
      `;
      modal.innerHTML = html;
      document.getElementById("modal-overlay").classList.add("open");
      document.getElementById("modal-overlay").setAttribute("aria-hidden", "false");
      bindLegacyInlineHandlers(document.getElementById("modal-overlay"));
      return;
    }
    const defaultClientId = integration.client_id || state.filters.analyticsClient || scopedClients[0]?.id || "";
    html = modalFormWrapper(
      integration.id ? "Editar integração" : "Nova integração",
      `
        <div class="field"><label>Cliente</label><select name="client_id" required><option value="">Selecione</option>${scopedClients
          .map((client) => `<option value="${client.id}" ${String(defaultClientId) === String(client.id) ? "selected" : ""}>${client.name}</option>`)
          .join("")}</select></div>
        <div class="field"><label>Integração</label><select name="provider_key" required>${integrationProviderOptions(integration.provider_key || "ga4")}</select></div>
        <div class="field"><label>Status</label><select name="status"><option value="connected" ${integration.status === "connected" ? "selected" : ""}>Conectado</option><option value="configuring" ${(!integration.status || integration.status === "configuring") ? "selected" : ""}>Configurando</option><option value="error" ${integration.status === "error" ? "selected" : ""}>Erro</option><option value="disconnected" ${integration.status === "disconnected" ? "selected" : ""}>Desconectado</option></select></div>
        <div class="field"><label>Conta externa</label><input name="external_account_id" value="${integration.external_account_id || ""}" placeholder="Ex.: conta, workspace ou business id"></div>
        <div class="field"><label>Propriedade / recurso</label><input name="external_property_id" value="${integration.external_property_id || ""}" placeholder="Ex.: property id, dataset ou view"></div>
        <div class="field"><label>Última sincronização</label><input type="datetime-local" name="last_sync_at" value="${formatDateTimeLocalValue(integration.last_sync_at)}"></div>
        <div class="field form-full"><label>Último erro / observação</label><textarea name="last_error" placeholder="Descreva o erro atual ou uma observação de configuração.">${integration.last_error || ""}</textarea><div class="field-help">Este MVP registra o estado real no sistema por cliente. A conexão OAuth automática pode ser acoplada depois.</div></div>
      `,
      integration.id ? "Atualizar" : "Salvar"
    );
  }

  if (type === "nova-fatura") {
    html = modalFormWrapper(
      "Nova fatura",
      `
        <div class="field"><label>Cliente</label><select name="client_id">${clientOptions("")}</select></div>
        <div class="field"><label>Valor</label><input type="number" step="0.01" name="amount" required></div>
        <div class="field"><label>Status</label><select name="status"><option>Em aberto</option><option>Pago</option><option>Atrasado</option></select></div>
        <div class="field"><label>Vencimento</label><input type="date" name="due_date"></div>
      `
    );
  }

  if (type === "nova-cobranca") {
    const client = state.clients.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      "Nova cobrança",
      `
        <div class="field"><label>Cliente</label><select name="client_id">${clientOptions(client.id)}</select></div>
        <div class="field"><label>Lead vinculado</label><select name="contact_id"><option value="">Nenhum</option>${contactOptions("")}</select></div>
        <div class="field"><label>Método</label><select name="payment_method"><option value="BOLETO">Boleto</option><option value="PIX">Pix</option><option value="PAYMENT_LINK">Link de pagamento</option></select></div>
        <div class="field"><label>Valor</label><input type="number" step="0.01" name="amount" required></div>
        <div class="field"><label>Vencimento</label><input type="date" name="due_date"></div>
        <div class="field"><label>Referencia externa</label><input name="external_reference" value=""></div>
        <div class="field form-full"><label>Descrição</label><textarea name="description">Cobrança ${client.name || ""}</textarea></div>
      `
    );
  }

  if (type === "novo-custo" || type === "novo-ab") {
    html = `
      <div class="modal-title" id="modal-dialog-title">Ação auxiliar</div>
      <p class="metric-note">Os módulos principais já estão conectados à API. Esta ação pode ser expandida em cima da mesma estrutura.</p>
      <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Fechar</button></div>
    `;
  }

  modal.innerHTML = html;
  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("modal-overlay").setAttribute("aria-hidden", "false");

  const form = document.getElementById("modal-form");
  if (form) {
    form.onsubmit = (event) => submitModal(event, type, id);
    if (type === "novo-cliente") {
      initClientAddressAssist(form);
    }
    window.setTimeout(() => {
      form.querySelector("input, select, textarea, button")?.focus();
    }, 0);
  }

  bindLegacyInlineHandlers(document.getElementById("modal-overlay"));
}

async function submitModal(event, type, id) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const submitButton = document.getElementById("modal-submit-btn");

  await FORM.submit(
    event.target,
    async () => {
    if (type === "novo-cliente") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["manager_id", "started_at"]);
      payload.zip_code = formatZipCodeInput(payload.zip_code);
      payload.state = normalizeStateCode(payload.state);
      payload.country = normalizeCountry(payload.country);
      await apiFetch(id ? `/clients/${id}` : "/clients", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "nova-tarefa") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["client_id", "assigned_to", "deadline"]);
      await apiFetch(id ? `/tasks/${id}` : "/tasks", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "novo-lead") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["owner_id", "assigned_to", "estimated_value", "birth_date", "last_contact_at"]);
      await apiFetch(id ? `/contacts/${id}` : "/contacts", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "nova-campanha") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["start_date"]);
      await apiFetch(id ? `/campaigns/${id}` : "/campaigns", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "nova-entrega") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["campaign_id"]);
      let fileUrl = state.materials.find((item) => item.id === id)?.file_url || null;
      const selectedFile = formData.get("file");

      if (selectedFile && selectedFile.size > 0) {
        const uploadData = new FormData();
        uploadData.append("client_id", payload.client_id || "");
        uploadData.append("file", selectedFile);
        const uploaded = await apiFetch("/files", {
          method: "POST",
          body: uploadData
        });
        fileUrl = uploaded.access_url || uploaded.url;
      }

      await apiFetch(id ? `/materials/${id}` : "/materials", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({
          client_id: payload.client_id,
          campaign_id: payload.campaign_id || null,
          title: payload.title,
          status: payload.status,
          filename: selectedFile && selectedFile.size > 0 ? selectedFile.name : null,
          url: fileUrl
        })
      });
    }

    if (type === "novo-membro") {
      const payload = Object.fromEntries(formData.entries());
      if (!payload.password) {
        delete payload.password;
      }
      await apiFetch(id ? `/users/${id}` : "/users", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "nova-integracao") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["last_sync_at", "external_account_id", "external_property_id", "last_error"]);
      await apiFetch(id ? `/integrations/${id}` : "/integrations", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "nova-fatura") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["due_date"]);
      await apiFetch("/invoices", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "nova-cobranca") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["client_id", "contact_id", "due_date", "external_reference"]);
      await apiFetch("/charges", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    closeModal();
    await refreshData();
    showToast("Informações salvas com sucesso.");
    },
    { loadingText: "Salvando...", button: submitButton }
  )(event).catch((error) => {
    showToast(error.message);
  });
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("modal-overlay").setAttribute("aria-hidden", "true");
  lastFocusedElement?.focus?.();
}

function closeModalIfBg(event) {
  if (event.target === document.getElementById("modal-overlay")) {
    closeModal();
  }
}

async function deleteClient(id) {
  try {
    await apiFetch(`/clients/${id}`, { method: "DELETE" });
    await refreshData();
    showToast("Cliente removido com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteCampaign(id) {
  try {
    await apiFetch(`/campaigns/${id}`, { method: "DELETE" });
    await refreshData();
    showToast("Campanha removida com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteTask(id) {
  try {
    await apiFetch(`/tasks/${id}`, { method: "DELETE" });
    await refreshData();
    showToast("Tarefa removida com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteIntegration(id) {
  try {
    await apiFetch(`/integrations/${id}`, { method: "DELETE" });
    await refreshData();
    showToast("Integração removida com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteMaterial(id) {
  try {
    await apiFetch(`/materials/${id}`, { method: "DELETE" });
    await refreshData();
    showToast("Entrega removida com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteLead(id) {
  try {
    await apiFetch(`/contacts/${id}`, { method: "DELETE" });
    await refreshData();
    showToast("Lead removido com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

async function convertLead(id) {
  try {
    await apiFetch(`/contacts/${id}/convert`, {
      method: "POST",
      body: JSON.stringify({})
    });
    await refreshData();
    setTab("crm", "clientes");
    showToast("Lead convertido em cliente com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateChargeStatus(id, status) {
  try {
    await apiFetch(`/charges/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await refreshData();
    showToast("Cobrança atualizada com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

function openChargeResource(id, field) {
  const charge = state.charges.find((item) => item.id === id);
  const url = charge?.[field];
  if (!url) {
    showToast("Esta cobrança ainda não possui link disponível para acesso.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyChargePix(id) {
  const charge = state.charges.find((item) => item.id === id);
  if (!charge?.pix_copy_paste) {
    showToast("Nenhum código Pix disponível nesta cobrança.");
    return;
  }
  try {
    await navigator.clipboard.writeText(charge.pix_copy_paste);
    showToast("Código Pix copiado com sucesso.");
  } catch (error) {
    showToast("Não foi possível copiar o código Pix.");
  }
}

function openChargeModalForClient(clientId) {
  openModal("nova-cobranca", clientId);
}

async function deleteUser(id) {
  try {
    await apiFetch(`/users/${id}`, { method: "DELETE" });
    await refreshData();
    showToast("Usuário removido com sucesso.");
  } catch (error) {
    showToast(error.message);
  }
}

async function boot() {
  bindSidebarInteractions();
  bindLegacyInlineHandlers();
  syncSidebarShell();
  APP.registerActivityTracking();
  APP.onLogout((reason) => {
    clearSession();
    if (reason === "idle-timeout") {
      window.location.href = "/?session=expirada";
      return;
    }
    window.location.href = "/";
  });
  const handoff = loadInternalHandoff();

  if (handoff?.requestedAt) {
    document.getElementById("login-screen").classList.add("hidden");
    clearInternalHandoff();
    try {
      state.session = await APP.refreshSession();
      await initializeApp();
      return;
    } catch (error) {
      clearSession();
      document.getElementById("login-screen").classList.remove("hidden");
    }
  }

  clearSession();
  document.getElementById("login-screen").classList.remove("hidden");

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (document.getElementById("modal-overlay").classList.contains("open")) {
        closeModal();
        return;
      }
      closeSidebar();
    }
    trapModalFocus(event);
  });

  window.addEventListener("resize", syncSidebarShell);
  window.addEventListener("orientationchange", syncSidebarShell);

  window.addEventListener("offline", () => {
    showToast("Você está sem conexão. Verifique sua internet.");
  });

  window.addEventListener("online", () => {
    showToast("Conexão restabelecida.");
  });
}

window.doLogin = doLogin;
window.doLogout = doLogout;
window.goTo = goTo;
window.filterKanban = filterKanban;
window.setAnalyticsClientFilter = setAnalyticsClientFilter;
window.setAnalyticsPeriodFilter = setAnalyticsPeriodFilter;
window.setTab = setTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalIfBg = closeModalIfBg;
window.deleteIntegration = deleteIntegration;
window.updateInvoiceStatus = updateInvoiceStatus;
window.updateChargeStatus = updateChargeStatus;
window.openChargeResource = openChargeResource;
window.copyChargePix = copyChargePix;
window.exportFinanceCsv = exportFinanceCsv;
window.syncTrafficData = syncTrafficData;
window.deleteClient = deleteClient;
window.deleteLead = deleteLead;
window.convertLead = convertLead;
window.openChargeModalForClient = openChargeModalForClient;
window.deleteCampaign = deleteCampaign;
window.deleteTask = deleteTask;
window.deleteMaterial = deleteMaterial;
window.deleteUser = deleteUser;
window.openProtectedResource = openProtectedResource;
window.showToast = showToast;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

boot();


