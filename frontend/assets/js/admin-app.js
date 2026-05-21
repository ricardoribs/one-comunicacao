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
  prospeccao: "Prospecção",
  contato: "Contato feito",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado"
};

const PAGE_ACCESS = {
  admin: ["home", "perfil", "kanban", "calendario", "crm", "campanhas", "producao", "trafego", "analytics", "financeiro", "acesso"],
  gestor: ["home", "perfil", "kanban", "calendario", "crm", "campanhas", "producao", "trafego", "analytics"],
  designer: ["home", "perfil", "kanban", "calendario", "producao"],
  comercial: ["home", "perfil", "kanban", "calendario", "crm", "campanhas", "producao", "financeiro"],
  dev: ["home", "perfil", "kanban", "calendario", "producao", "analytics"]
};

const PAGE_LABELS = {
  home: "Visão Geral",
  perfil: "Meu Perfil",
  kanban: "Kanban",
  calendario: "Calendário",
  crm: "CRM / Leads",
  campanhas: "Campanhas",
  producao: "Produção",
  trafego: "Tráfego Pago",
  analytics: "Analytics",
  financeiro: "Financeiro",
  acesso: "Controle de Acesso"
};

const PROFILE_CAPABILITY_LABELS = {
  manageTasks: "Criar e editar tarefas",
  manageCalendarEvents: "Criar eventos no calendário",
  manageClients: "Gerenciar clientes",
  manageMaterials: "Gerenciar entregas",
  homeFinancial: "Ver financeiro na visão geral",
  homeTeam: "Ver equipe na visão geral",
  assignableUsers: "Delegar tarefas",
  calendarEvents: "Visualizar agenda da equipe",
  clients: "Visualizar clientes",
  contacts: "Visualizar leads e CRM",
  campaigns: "Visualizar campanhas",
  tasks: "Visualizar tarefas",
  users: "Gerenciar membros",
  charges: "Visualizar cobranças",
  costs: "Visualizar custos",
  invoices: "Visualizar faturas",
  metrics: "Visualizar métricas",
  reports: "Visualizar relatórios",
  materials: "Visualizar produção",
  files: "Visualizar arquivos",
  integrations: "Visualizar integrações"
};

const ROLE_DATA_ACCESS = {
  admin: {
    manageTasks: true,
    manageCalendarEvents: true,
    manageClients: true,
    manageMaterials: true,
    homeFinancial: true,
    homeTeam: true,
    assignableUsers: true,
    calendarEvents: true,
    clients: true,
    contacts: true,
    campaigns: true,
    tasks: true,
    users: true,
    charges: true,
    costs: true,
    invoices: true,
    metrics: true,
    reports: true,
    materials: true,
    files: true,
    integrations: true
  },
  gestor: {
    manageTasks: true,
    manageCalendarEvents: true,
    manageClients: true,
    manageMaterials: true,
    homeFinancial: false,
    homeTeam: true,
    assignableUsers: true,
    calendarEvents: true,
    clients: true,
    contacts: true,
    campaigns: true,
    tasks: true,
    users: false,
    charges: true,
    costs: false,
    invoices: false,
    metrics: true,
    reports: true,
    materials: true,
    files: true,
    integrations: true
  },
  designer: {
    manageTasks: true,
    manageCalendarEvents: false,
    manageClients: false,
    manageMaterials: true,
    homeFinancial: false,
    homeTeam: false,
    assignableUsers: true,
    calendarEvents: true,
    clients: true,
    contacts: false,
    campaigns: true,
    tasks: true,
    users: false,
    charges: false,
    costs: false,
    invoices: false,
    metrics: false,
    reports: true,
    materials: true,
    files: true,
    integrations: false
  },
  comercial: {
    manageTasks: true,
    manageCalendarEvents: false,
    manageClients: true,
    manageMaterials: false,
    homeFinancial: true,
    homeTeam: false,
    assignableUsers: true,
    calendarEvents: true,
    clients: true,
    contacts: true,
    campaigns: true,
    tasks: true,
    users: false,
    charges: true,
    costs: true,
    invoices: true,
    metrics: false,
    reports: true,
    materials: true,
    files: true,
    integrations: false
  },
  dev: {
    manageTasks: true,
    manageCalendarEvents: false,
    manageClients: false,
    manageMaterials: false,
    homeFinancial: false,
    homeTeam: false,
    assignableUsers: true,
    calendarEvents: true,
    clients: true,
    contacts: false,
    campaigns: false,
    tasks: true,
    users: false,
    charges: false,
    costs: false,
    invoices: false,
    metrics: true,
    reports: true,
    materials: true,
    files: true,
    integrations: true
  }
};

const NON_BLOCKING_MODULE_FAILURES = new Set(["arquivos", "integrações", "clientes", "métricas"]);
const NOTIFICATION_POLL_MS = 10000;
const notificationRuntime = {
  pollHandle: null,
  syncingRead: false,
  open: false,
  unread: 0,
  lastToastUnread: 0,
};
const kanbanRuntime = {
  movingTaskId: null,
  dragTaskId: null,
  dragSourceEl: null,
  dragPlaceholderEl: null,
  pointerId: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  scrollSyncBound: false,
  scrollResizeObserver: null,
};
const taskAssignState = {
  selected: new Set(),
  users: [],
};

async function runAsyncTasksInBatches(taskFactories, batchSize = 4) {
  const results = [];
  for (let index = 0; index < taskFactories.length; index += batchSize) {
    const batch = taskFactories.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map((factory) => factory()));
    results.push(...batchResults);
  }
  return results;
}

const TASK_TYPE_OPTIONS = [
  { value: "design_grafico", label: "DESIGN GRÁFICO" },
  { value: "copywriting", label: "COPYWRITING" },
  { value: "edicao_video", label: "EDIÇÃO DE VÍDEO" },
  { value: "captacao", label: "CAPTAÇÃO" },
  { value: "fotografia", label: "FOTOGRAFIA" },
  { value: "planejamento", label: "PLANEJAMENTO" },
  { value: "social_media", label: "SOCIAL MEDIA" },
  { value: "trafego_pago", label: "TRÁFEGO PAGO" },
  { value: "cobertura", label: "COBERTURA" },
  { value: "releases", label: "RELEASES" },
  { value: "newsletter", label: "NEWSLETTER" },
  { value: "reuniao", label: "REUNIÃO" },
  { value: "aprovacao_cliente", label: "APROVAÇÃO CLIENTE" },
  { value: "refacao", label: "REFAÇÃO" },
  { value: "urgente", label: "URGENTE" },
];

const TASK_TYPE_LABELS = Object.fromEntries(TASK_TYPE_OPTIONS.map((option) => [option.value, option.label]));
const LEGACY_TASK_TYPE_ALIASES = {
  geral: "planejamento",
  design: "design_grafico",
  revisao_design: "refacao",
  captacao: "captacao",
  edicao: "edicao_video",
  social_media: "social_media",
  atendimento: "social_media",
  financeiro: "planejamento",
  adm: "planejamento",
  reuniao_estrategica: "reuniao",
  trafego: "trafego_pago",
  "landing-page": "copywriting",
};

const CAMPAIGN_CHANNEL_OPTIONS = [
  "Meta Ads",
  "Instagram + Meta",
  "Google Ads",
  "Instagram",
  "Facebook",
  "Google",
  "TikTok",
  "Email",
  "Outro"
];

const INVOICE_STATUS_OPTIONS = ["Em aberto", "Pago", "Atrasado", "Cancelado"];
const ON_DEMAND_SERVICE_OPTIONS = [
  "Cobertura de Eventos",
  "Releases (Imprensa)",
  "Newsletter",
  "Fotografia",
  "Tráfego Pago (como serviço isolado)"
];
const CLIENT_PLAN_GROUPS = [
  {
    label: "Planos One",
    options: [
      { value: "One Ideal", label: "One Ideal" },
      { value: "One Start", label: "One Start" },
      { value: "One Master", label: "One Master" },
    ],
  },
  {
    label: "Sob demanda",
    options: ON_DEMAND_SERVICE_OPTIONS.map((service) => ({
      value: `Sob demanda · ${service}`,
      label: service,
    })),
  },
];
const COST_CATEGORY_OPTIONS = [
  { value: "media", label: "Mídia" },
  { value: "producao", label: "Produção" },
  { value: "operacao", label: "Operação" },
  { value: "outro", label: "Outro" },
];
const COST_CATEGORY_LABELS = Object.fromEntries(COST_CATEGORY_OPTIONS.map((option) => [option.value, option.label]));

const CALENDAR_COLOR_OPTIONS = [
  { value: "pink", label: "Rosa ONE" },
  { value: "blue", label: "Azul" },
  { value: "green", label: "Verde" },
  { value: "gold", label: "Dourado" },
];
const CHECKLIST_PLACEHOLDER_LABELS = new Set([
  "fazer isso",
  "fazer aquilo",
  "depois isso",
]);
const PROFILE_NOTIFICATION_PREFERENCE_OPTIONS = [
  {
    key: "task_assigned",
    inputId: "toggle1",
    label: "Novas tarefas atribuídas",
    description: "Receba avisos quando uma nova tarefa for direcionada a você."
  },
  {
    key: "task_completed",
    inputId: "toggle2",
    label: "Conclusão de tarefas delegadas",
    description: "Receba avisos quando alguém concluir uma tarefa criada ou delegada por você."
  },
  {
    key: "calendar_24h",
    inputId: "toggle3",
    label: "Lembretes de agenda com 24h",
    description: "Receba avisos um dia antes dos eventos da equipe."
  },
  {
    key: "finance_overdue",
    inputId: "toggle4",
    label: "Inadimplência financeira",
    description: "Receba alerta imediato quando uma fatura vencer sem pagamento."
  }
];
const CALENDAR_VIEW_START_HOUR = 7;
const CALENDAR_VIEW_END_HOUR = 22;
const CALENDAR_SLOT_HEIGHT = 58;
const mfaLoginState = {
  challengeToken: "",
  mode: "",
  secret: "",
  secretRaw: "",
  secretVisible: false,
  qrCodeDataUrl: "",
  pending: false,
};

const state = {
  session: null,
  profile: null,
  profileLoading: false,
  profileAvatarAsset: {
    source: "",
    url: "",
    isObjectUrl: false,
    loading: false,
  },
  dashboard: null,
  team: [],
  assignableUsers: [],
  integrations: [],
  clients: [],
  campaigns: [],
  tasks: [],
  users: [],
  accessMembers: [],
  contacts: [],
  charges: [],
  costEntries: [],
  invoices: [],
  metrics: [],
  reports: [],
  materials: [],
  files: [],
  calendarEvents: [],
  notifications: [],
  checklist: null,
  loadFailures: new Set(),
  activePage: "home",
  calendar: {
    weekStart: null,
    loadedWeekKey: "",
    loading: false,
  },
  filters: {
    kanbanClient: "",
    analyticsClient: "",
    analyticsPeriod: "",
    financePeriod: "month"
  }
};

const UI = {
  empty: (msg = "Sem dados no período", sub = "", options = {}) => {
    const showIcon = options.icon === true || typeof options.icon === "string";
    const showSub = Boolean(sub) && options.allowSub !== false;
    return `
      <div class="empty-state${options.className ? ` ${options.className}` : ""}${showIcon ? "" : " is-no-icon"}">
        ${
          showIcon
            ? `<div class="empty-state-icon">${escapeHtml(options.icon === true ? "○" : options.icon)}</div>`
            : ""
        }
        <div class="empty-state-title">${escapeHtml(msg)}</div>
        ${showSub ? `<div class="empty-state-sub">${escapeHtml(sub)}</div>` : ""}
        ${options.actionHtml || ""}
      </div>`;
  },

  tableEmpty: (cols, msg = "Nenhum registro disponível", sub = "", options = {}) => `
    <tr>
      <td colspan="${cols}">
        ${UI.empty(msg, sub, options)}
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

  skeletonClientCards: (count = 4) =>
    Array.from(
      { length: count },
      () => `
        <article class="crm-client-card crm-client-card-skeleton" aria-hidden="true">
          <div class="crm-client-card-head">
            <div class="cell-stack crm-client-primary" style="flex:1">
              <div class="skeleton skeleton-title"></div>
              <div class="skeleton skeleton-text" style="width:52%"></div>
              <div class="skeleton skeleton-text" style="width:58%"></div>
            </div>
            <div class="skeleton skeleton-badge"></div>
          </div>
          <div class="crm-client-facts">
            <div class="crm-client-fact">
              <div class="skeleton skeleton-text" style="width:40%"></div>
              <div class="skeleton skeleton-text" style="width:72%"></div>
            </div>
            <div class="crm-client-fact">
              <div class="skeleton skeleton-text" style="width:36%"></div>
              <div class="skeleton skeleton-badge" style="width:84px"></div>
            </div>
            <div class="crm-client-fact">
              <div class="skeleton skeleton-text" style="width:34%"></div>
              <div class="skeleton skeleton-text" style="width:64%"></div>
            </div>
            <div class="crm-client-fact">
              <div class="skeleton skeleton-text" style="width:28%"></div>
              <div class="skeleton skeleton-text" style="width:56%"></div>
            </div>
          </div>
          <div class="crm-client-actions">
            <div class="skeleton skeleton-text" style="height:34px;width:100%"></div>
            <div class="skeleton skeleton-text" style="height:34px;width:100%"></div>
            <div class="skeleton skeleton-text" style="height:34px;width:100%"></div>
          </div>
        </article>
      `
    ).join(""),

  skeletonMemberCards: (count = 4) =>
    Array.from(
      { length: count },
      () => `
        <article class="access-member-card access-member-card-skeleton" aria-hidden="true">
          <div class="access-member-head">
            <div class="access-member-ident">
              <div class="avatar av-pink">○</div>
              <div class="cell-stack" style="flex:1">
                <div class="skeleton skeleton-text" style="width:58%"></div>
                <div class="skeleton skeleton-text" style="width:72%"></div>
              </div>
            </div>
            <div class="skeleton skeleton-badge" style="width:72px"></div>
          </div>
          <div class="access-member-meta">
            <div class="access-member-meta-item">
              <div class="skeleton skeleton-text" style="width:42%"></div>
              <div class="skeleton skeleton-text" style="width:64%"></div>
            </div>
            <div class="access-member-meta-item">
              <div class="skeleton skeleton-text" style="width:38%"></div>
              <div class="skeleton skeleton-badge"></div>
            </div>
          </div>
          <div class="access-member-actions">
            <div class="skeleton skeleton-text" style="height:34px;width:100%"></div>
            <div class="skeleton skeleton-text" style="height:34px;width:100%"></div>
          </div>
        </article>
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
    ).join(""),

  skeletonPipeline: (columns = 5, cards = 2) =>
    Array.from(
      { length: columns },
      () => `
        <div class="pipe-col" aria-hidden="true">
          <div class="skeleton skeleton-text" style="width:48%;height:16px;margin-bottom:12px"></div>
          ${Array.from(
            { length: cards },
            () => `
              <div class="pipe-card">
                <div class="skeleton skeleton-text" style="width:56%"></div>
                <div class="skeleton skeleton-text" style="width:72%"></div>
                <div class="skeleton skeleton-text" style="width:42%"></div>
              </div>
            `
          ).join("")}
        </div>
      `
    ).join(""),

  skeletonProgress: (rows = 4) =>
    Array.from(
      { length: rows },
      () => `
        <div aria-hidden="true">
          <div class="progress-item-head">
            <span class="skeleton skeleton-text" style="width:42%"></span>
            <span class="skeleton skeleton-text" style="width:28%"></span>
          </div>
          <div class="skeleton skeleton-text" style="height:8px;width:100%;margin-bottom:0"></div>
        </div>
      `
    ).join(""),

  skeletonCalendarGrid: () => `
    <div class="card-sm" aria-hidden="true">
      <div class="skeleton skeleton-title"></div>
      ${Array.from(
        { length: 6 },
        () => `<div class="skeleton skeleton-text" style="width:100%;height:48px"></div>`
      ).join("")}
    </div>
  `,

  skeletonCardList: (rows = 3) =>
    Array.from(
      { length: rows },
      () => `
        <div class="card card-sm" aria-hidden="true">
          <div class="skeleton skeleton-text" style="width:52%"></div>
          <div class="skeleton skeleton-text" style="width:72%"></div>
          <div class="skeleton skeleton-text" style="width:44%"></div>
        </div>
      `
    ).join("")
};
let lastFocusedElement = null;
const MOBILE_BREAKPOINT = 768;
let lastSidebarTouchAt = 0;
let pendingModalConfirmation = null;

function renderRetryAction(action = "retry-refresh", label = "Tentar novamente") {
  return `<button type="button" class="btn btn-outline btn-sm empty-state-action" data-action="${action}">${escapeHtml(label)}</button>`;
}

function hasLoadFailure(label) {
  return state.loadFailures?.has?.(label);
}

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
    shiftCalendarWeek,
    goToCalendarToday,
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
    deleteCalendarEvent,
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

function canManageCalendarEvents() {
  return hasRoleDataAccess("manageCalendarEvents");
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

function isProtectedAssetUrl(url) {
  return String(url || "").startsWith("/api/files/") || String(url || "").startsWith("/uploads/");
}

function revokeProfileAvatarAsset() {
  if (state.profileAvatarAsset.isObjectUrl && state.profileAvatarAsset.url) {
    URL.revokeObjectURL(state.profileAvatarAsset.url);
  }

  state.profileAvatarAsset = {
    source: "",
    url: "",
    isObjectUrl: false,
    loading: false,
  };
}

async function resolveProtectedMediaUrl(url) {
  if (!url) {
    return { url: "", isObjectUrl: false };
  }

  const originUrl = typeof APP.buildOriginUrl === "function" ? APP.buildOriginUrl(url) : url;

  if (String(url).startsWith("/api/files/")) {
    const response = await apiFetch(url, { cache: "no-store" });
    if (!response?.url) {
      return { url: "", isObjectUrl: false };
    }

    return resolveProtectedMediaUrl(response.url);
  }

  if (String(url).startsWith("/uploads/")) {
    const session = await APP.ensureFreshSession();
    const accessToken = session?.accessToken || session?.token;

    if (!accessToken) {
      throw new Error("Sua sessão expirou. Faça login novamente.");
    }

    const response = await fetch(originUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Não foi possível carregar a foto do perfil.");
    }

    const blob = await response.blob();
    return { url: URL.createObjectURL(blob), isObjectUrl: true };
  }

  return { url, isObjectUrl: false };
}

async function ensureProfileAvatarAsset({ force = false, silent = true } = {}) {
  const rawUrl = String(state.profile?.avatar_url || state.session?.user?.avatar_url || "").trim();

  if (!rawUrl) {
    revokeProfileAvatarAsset();
    return "";
  }

  if (!force && state.profileAvatarAsset.source === rawUrl && state.profileAvatarAsset.url) {
    return state.profileAvatarAsset.url;
  }

  if (!force && state.profileAvatarAsset.source === rawUrl && state.profileAvatarAsset.loading) {
    return "";
  }

  if (state.profileAvatarAsset.source && state.profileAvatarAsset.source !== rawUrl) {
    revokeProfileAvatarAsset();
  }

  if (!isProtectedAssetUrl(rawUrl)) {
    state.profileAvatarAsset = {
      source: rawUrl,
      url: rawUrl,
      isObjectUrl: false,
      loading: false,
    };
    return rawUrl;
  }

  state.profileAvatarAsset = {
    source: rawUrl,
    url: "",
    isObjectUrl: false,
    loading: true,
  };

  try {
    const resolved = await resolveProtectedMediaUrl(rawUrl);
    if (state.profileAvatarAsset.source !== rawUrl) {
      if (resolved.isObjectUrl && resolved.url) {
        URL.revokeObjectURL(resolved.url);
      }
      return "";
    }

    state.profileAvatarAsset = {
      source: rawUrl,
      url: resolved.url,
      isObjectUrl: resolved.isObjectUrl,
      loading: false,
    };
    renderProfile();
    renderHome();
    return resolved.url;
  } catch (error) {
    state.profileAvatarAsset = {
      source: rawUrl,
      url: "",
      isObjectUrl: false,
      loading: false,
    };
    if (!silent) {
      showToast(error.message || "Não foi possível carregar a foto do perfil.");
    }
    return "";
  }
}

function replaceCollectionRecord(items, record) {
  return toArray(items).map((item) => (Number(item?.id) === Number(record?.id) ? { ...item, ...record } : item));
}

function syncCurrentUserProfile(record) {
  if (!record || !state.session?.user || Number(record.id) !== Number(state.session.user.id)) {
    return;
  }

  if (record.avatar_url !== undefined && String(record.avatar_url || "") !== String(state.profile?.avatar_url || state.session.user.avatar_url || "")) {
    revokeProfileAvatarAsset();
  }

  state.profile = { ...(state.profile || {}), ...record };
  state.session.user = { ...state.session.user, ...record };
  state.users = replaceCollectionRecord(state.users, record);
  state.accessMembers = replaceCollectionRecord(state.accessMembers, record);
  state.team = replaceCollectionRecord(state.team, record);
  state.assignableUsers = replaceCollectionRecord(state.assignableUsers, record);
  saveSession(state.session);
  setRoleUI(state.session.user);
}

function clearSession() {
  APP.clearSession();
  state.session = null;
  state.profile = null;
  state.profileLoading = false;
  revokeProfileAvatarAsset();
  state.calendarEvents = [];
  state.calendar = {
    weekStart: null,
    loadedWeekKey: "",
    loading: false,
  };
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

function parseCurrencyNumber(value) {
  const raw = String(value || "").replace(/\s|R\$/g, "").trim();
  if (!raw) {
    return null;
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyInputValue(value) {
  const parsed = parseCurrencyNumber(value);
  if (parsed == null) {
    return "";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parsed);
}

function formatCurrencyEditValue(value) {
  const parsed = parseCurrencyNumber(value);
  if (parsed == null) {
    return "";
  }

  return String(parsed.toFixed(2)).replace(".", ",");
}

function initMaskedCurrencyField(form, displayName, hiddenName) {
  if (!form) {
    return;
  }

  const displayField = form.querySelector(`[name="${displayName}"]`);
  const hiddenField = form.querySelector(`[name="${hiddenName}"]`);
  if (!displayField || !hiddenField) {
    return;
  }

  const syncHidden = () => {
    const parsed = parseCurrencyNumber(displayField.value);
    hiddenField.value = parsed == null ? "" : parsed.toFixed(2);
  };

  const applyDisplay = (formatter) => {
    const formatted = formatter(displayField.value);
    if (formatted) {
      displayField.value = formatted;
    }
  };

  displayField.addEventListener("focus", () => {
    applyDisplay(formatCurrencyEditValue);
    displayField.select();
  });
  displayField.addEventListener("input", syncHidden);
  displayField.addEventListener("blur", () => {
    syncHidden();
    applyDisplay(formatCurrencyInputValue);
  });

  if (displayField.value) {
    syncHidden();
    applyDisplay(formatCurrencyInputValue);
  }
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
  const normalized = String(stage || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z]/g, "");

  if (normalized.includes("pros")) return PIPELINE_STAGE_LABELS.prospeccao;
  if (normalized.includes("contato")) return PIPELINE_STAGE_LABELS.contato;
  if (normalized.includes("proposta")) return PIPELINE_STAGE_LABELS.proposta;
  if (normalized.includes("nego")) return PIPELINE_STAGE_LABELS.negociacao;
  if (normalized.includes("fech")) return PIPELINE_STAGE_LABELS.fechado;
  return stage || "—";
}

function formatCurrencyValue(value) {
  return formatCurrency(Number(value || 0));
}

function getCostCategoryLabel(value) {
  return COST_CATEGORY_LABELS[String(value || "").trim()] || "Outro";
}

function normalizeLooseText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getDisplayText(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getCampaignViewModel(campaign) {
  const matchedClient = state.clients.find((client) => Number(client.id) === Number(campaign?.client_id));
  const name = getDisplayText(campaign?.name, "Campanha sem nome");
  const clientName = getDisplayText(campaign?.client_name || matchedClient?.name, "Cliente não vinculado");
  const channel = getDisplayText(campaign?.channel, "Canal não informado");
  const audience = getDisplayText(campaign?.audience);

  return {
    ...campaign,
    name,
    client_name: clientName,
    channel,
    audience,
  };
}

function isChecklistPlaceholderLabel(value) {
  return CHECKLIST_PLACEHOLDER_LABELS.has(normalizeLooseText(value));
}

function normalizeClientPlanLabel(value) {
  const raw = String(value || "").trim();
  const normalized = normalizeLooseText(raw);

  if (!normalized) {
    return "-";
  }

  if (normalized === "combo one" || normalized === "one ideal" || normalized === "combo one ideal" || normalized === "one") {
    return "One Ideal";
  }
  if (normalized.includes("ideal")) {
    return "One Ideal";
  }
  if (normalized.includes("start") || normalized.includes("star")) {
    return "One Start";
  }
  if (normalized.includes("master")) {
    return "One Master";
  }
  if (
    normalized.includes("sob demanda")
    || normalized.includes("complemento")
    || normalized.includes("evento")
    || normalized.includes("release")
    || normalized.includes("imprensa")
    || normalized.includes("newsletter")
    || normalized.includes("fotografia")
    || normalized.includes("trafego pago")
  ) {
    return "Sob demanda";
  }

  return raw;
}

function normalizeClientPlanValue(value) {
  const raw = String(value || "").trim();
  const normalized = normalizeLooseText(raw);
  const serviceLabel = getOnDemandServiceLabel(raw);

  if (!raw) {
    return "";
  }

  if (serviceLabel) {
    return `Sob demanda · ${serviceLabel}`;
  }

  return normalizeClientPlanLabel(raw);
}

function getOnDemandServiceLabel(value) {
  const normalized = normalizeLooseText(value);

  if (!normalized || normalizeClientPlanLabel(value) !== "Sob demanda") {
    return "";
  }
  if (normalized.includes("evento")) {
    return "Cobertura de Eventos";
  }
  if (normalized.includes("release") || normalized.includes("imprensa")) {
    return "Releases (Imprensa)";
  }
  if (normalized.includes("newsletter")) {
    return "Newsletter";
  }
  if (normalized.includes("fotografia")) {
    return "Fotografia";
  }
  if (normalized.includes("trafego pago")) {
    return "Tráfego Pago (como serviço isolado)";
  }

  return normalized === "sob demanda" ? "" : String(value || "").trim();
}

function getClientPlanBadgeClass(value) {
  const planLabel = normalizeClientPlanLabel(value);

  if (planLabel === "One Master") {
    return "badge-pink";
  }
  if (planLabel === "One Start") {
    return "badge-blue";
  }
  if (planLabel === "One Ideal") {
    return "badge-dark";
  }
  if (planLabel === "Sob demanda") {
    return "badge-yellow";
  }

  return "badge-gray";
}

function clientPlanOptions(selected = "") {
  const normalized = normalizeClientPlanValue(selected);
  const knownValues = new Set();
  const groupsHtml = CLIENT_PLAN_GROUPS.map((group) => {
    const optionsHtml = group.options
      .map((option) => {
        knownValues.add(option.value);
        return `<option value="${escapeHtml(option.value)}" ${option.value === normalized ? "selected" : ""}>${escapeHtml(
          option.label
        )}</option>`;
      })
      .join("");

    return `<optgroup label="${escapeHtml(group.label)}">${optionsHtml}</optgroup>`;
  }).join("");

  if (normalized && !knownValues.has(normalized)) {
    return `${groupsHtml}<option value="${escapeHtml(normalized)}" selected>${escapeHtml(normalizeClientPlanLabel(normalized))}</option>`;
  }

  return groupsHtml;
}

function normalizeTaskStatusLabel(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "Backlog";
  }
  if (raw === "Concluído") {
    return "Concluido";
  }
  if (raw === "Em andamento") {
    return "Em progresso";
  }

  return raw;
}

function getTaskStatusBadgeClass(status) {
  const normalized = normalizeTaskStatusLabel(status);

  if (normalized === "Concluido") {
    return "badge-green";
  }
  if (normalized === "Em progresso") {
    return "badge-yellow";
  }
  if (normalized === "A Fazer") {
    return "badge-blue";
  }

  return "badge-gray";
}

function getTaskColumnConfig(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const byColumn = {
    backlog: { key: "backlog", label: "Backlog", status: "Backlog" },
    todo: { key: "todo", label: "A Fazer", status: "A Fazer" },
    doing: { key: "doing", label: "Em Progresso", status: "Em progresso" },
    done: { key: "done", label: "Concluído", status: "Concluido" },
  };
  const byStatus = {
    backlog: byColumn.backlog,
    "a fazer": byColumn.todo,
    "em progresso": byColumn.doing,
    "em andamento": byColumn.doing,
    concluido: byColumn.done,
    "concluído": byColumn.done,
  };

  return byColumn[normalized] || byStatus[normalizeLooseText(value)] || byColumn.backlog;
}

function getTaskColumnName(task) {
  return getTaskColumnConfig(task?.column_name || task?.status).key;
}

function getTaskStatusValue(taskOrStatus, fallbackColumn = "") {
  if (typeof taskOrStatus === "object" && taskOrStatus) {
    return getTaskColumnConfig(taskOrStatus.column_name || taskOrStatus.status).status;
  }

  return getTaskColumnConfig(fallbackColumn || taskOrStatus).status;
}

function getTaskStatusDisplayLabel(taskOrStatus, fallbackColumn = "") {
  if (typeof taskOrStatus === "object" && taskOrStatus) {
    return getTaskColumnConfig(taskOrStatus.column_name || taskOrStatus.status).label;
  }

  return getTaskColumnConfig(fallbackColumn || taskOrStatus).label;
}

function taskStatusOptions(selected = "") {
  const active = normalizeTaskStatusLabel(selected);
  return [
    { value: "Backlog", label: "Backlog" },
    { value: "A Fazer", label: "A Fazer" },
    { value: "Em progresso", label: "Em progresso" },
    { value: "Concluido", label: "Concluído" },
  ]
    .map((option) => `<option value="${option.value}" ${option.value === active ? "selected" : ""}>${option.label}</option>`)
    .join("");
}

function taskColumnOptions(selected = "") {
  const active = getTaskColumnConfig(selected).key;
  return [
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "A Fazer" },
    { value: "doing", label: "Em Progresso" },
    { value: "done", label: "Concluído" },
  ]
    .map((option) => `<option value="${option.value}" ${option.value === active ? "selected" : ""}>${option.label}</option>`)
    .join("");
}

function getTaskAssigneeIds(task = {}) {
  const ids = toArray(task.assigned_user_ids).length ? toArray(task.assigned_user_ids) : [task.assigned_to];
  return [...new Set(ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
}

function getTaskAssigneeNames(taskOrName) {
  if (typeof taskOrName === "object" && taskOrName) {
    const names = toArray(taskOrName.assigned_user_names).map((value) => String(value || "").trim()).filter(Boolean);
    if (names.length) {
      return names;
    }
    const fallback = String(taskOrName.assigned_to_name || "").trim();
    return fallback ? [fallback] : [];
  }

  const fallback = String(taskOrName || "").trim();
  return fallback ? [fallback] : [];
}

function formatHumanNameList(names = []) {
  if (!names.length) {
    return "Todos da equipe";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} e ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

function getTaskAssigneeTitle(taskOrName) {
  return formatHumanNameList(getTaskAssigneeNames(taskOrName));
}

function getTaskAssigneeLabel(taskOrName) {
  const names = getTaskAssigneeNames(taskOrName);
  if (!names.length) {
    return "Todos da equipe";
  }
  if (names.length <= 2) {
    return formatHumanNameList(names);
  }
  return `${names[0]} +${names.length - 1}`;
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
  const normalized = normalizeTaskTypeValue(type || "planejamento");
  return TASK_TYPE_LABELS[normalized] || normalized;
}

function normalizeTaskTypeValue(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "planejamento";
  }

  return LEGACY_TASK_TYPE_ALIASES[raw] || raw;
}

function taskTypeOptions(selected = "") {
  const rawSelected = String(selected || "").trim();
  const normalized = rawSelected ? normalizeTaskTypeValue(rawSelected) : "";
  const placeholderOption = `<option value="" ${!rawSelected ? "selected" : ""}>Escolher tipo</option>`;
  const knownOptions = TASK_TYPE_OPTIONS
    .map(
      ({ value, label }) =>
        `<option value="${value}" ${normalized === value ? "selected" : ""}>${label}</option>`
    )
    .join("");

  if (rawSelected && !TASK_TYPE_LABELS[normalized]) {
    return `${placeholderOption}${knownOptions}<option value="${escapeHtml(rawSelected)}" selected>${escapeHtml(rawSelected)}</option>`;
  }

  return `${placeholderOption}${knownOptions}`;
}

function campaignChannelOptions(selected = "") {
  const normalized = String(selected || "").trim();
  const knownOptions = CAMPAIGN_CHANNEL_OPTIONS.map(
    (option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`
  ).join("");

  if (normalized && !CAMPAIGN_CHANNEL_OPTIONS.includes(normalized)) {
    return `${knownOptions}<option value="${escapeHtml(normalized)}" selected>${escapeHtml(normalized)}</option>`;
  }

  return knownOptions;
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function startOfCalendarWeek(value = new Date()) {
  const source = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(source.getTime())) {
    return startOfCalendarWeek(new Date());
  }

  source.setHours(0, 0, 0, 0);
  const day = source.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  source.setDate(source.getDate() + diff);
  return source;
}

function addCalendarDays(value, days) {
  const next = new Date(value.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function getCalendarWeekStartDate(value = state.calendar.weekStart) {
  return startOfCalendarWeek(value || new Date());
}

function getCalendarWeekKey(value = state.calendar.weekStart) {
  const date = getCalendarWeekStartDate(value);
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function formatCalendarMonthDay(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: options.withMonth === false ? undefined : "short",
    weekday: options.weekday || undefined,
  }).format(date);
}

function formatCalendarWeekday(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  }).format(date);
}

function formatCalendarTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCalendarTimeRange(startsAt, endsAt) {
  const startLabel = formatCalendarTime(startsAt);
  const endLabel = formatCalendarTime(endsAt);
  if (!startLabel && !endLabel) {
    return "";
  }
  if (!endLabel) {
    return startLabel;
  }
  return `${startLabel} - ${endLabel}`;
}

function formatCalendarWeekLabel(weekStart) {
  const start = getCalendarWeekStartDate(weekStart);
  const end = addCalendarDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${padNumber(start.getDate())} - ${padNumber(end.getDate())} ${new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(end)}`;
  }

  return `${formatCalendarMonthDay(start)} - ${formatCalendarMonthDay(end)} ${end.getFullYear()}`;
}

function getCalendarColorConfig(value) {
  const normalized = String(value || "pink").trim().toLowerCase();
  const config = {
    pink: { className: "is-pink", badgeClass: "badge-pink", label: "Rosa ONE" },
    blue: { className: "is-blue", badgeClass: "badge-blue", label: "Azul" },
    green: { className: "is-green", badgeClass: "badge-green", label: "Verde" },
    gold: { className: "is-gold", badgeClass: "badge-yellow", label: "Dourado" },
  };

  return config[normalized] || config.pink;
}

function calendarColorOptions(selected = "pink") {
  const normalized = String(selected || "pink").trim().toLowerCase();
  return CALENDAR_COLOR_OPTIONS.map(
    (option) =>
      `<option value="${option.value}" ${option.value === normalized ? "selected" : ""}>${escapeHtml(option.label)}</option>`
  ).join("");
}

function getCalendarQueryRange(weekStart) {
  const start = getCalendarWeekStartDate(weekStart);
  const end = addCalendarDays(start, 7);
  return {
    start,
    end,
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function getCalendarEventsForWeek() {
  return [...state.calendarEvents].sort(
    (left, right) => new Date(left.starts_at || 0).getTime() - new Date(right.starts_at || 0).getTime()
  );
}

function canRenderCalendarPage() {
  return hasRoleDataAccess("calendarEvents");
}

async function loadCalendarEvents(anchorDate = null, { force = false, silent = false } = {}) {
  if (!canRenderCalendarPage()) {
    return [];
  }

  const weekStart = getCalendarWeekStartDate(anchorDate || state.calendar.weekStart || new Date());
  const weekKey = getCalendarWeekKey(weekStart);
  if (!force && state.calendar.loadedWeekKey === weekKey && state.calendarEvents.length) {
    state.calendar.weekStart = weekStart.toISOString();
    renderCalendar();
    return state.calendarEvents;
  }

  state.calendar.weekStart = weekStart.toISOString();
  state.calendar.loading = true;
  renderCalendar();

  try {
    const range = getCalendarQueryRange(weekStart);
    const events = await apiFetch(
      `/calendar-events?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      { cache: "no-store" }
    );
    state.calendarEvents = toArray(events);
    state.calendar.loadedWeekKey = weekKey;
    return state.calendarEvents;
  } catch (error) {
    console.warn("[calendar] Falha ao carregar eventos:", error);
    state.calendarEvents = [];
    state.calendar.loadedWeekKey = weekKey;
    if (!silent) {
      showToast("Não foi possível carregar o calendário agora.");
    }
    return [];
  } finally {
    state.calendar.loading = false;
    renderCalendar();
  }
}

function buildCalendarSegments(events, weekStart) {
  const daySegments = Array.from({ length: 7 }, () => []);

  events.forEach((event) => {
    const eventStart = new Date(event.starts_at);
    const eventEnd = new Date(event.ends_at);
    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime()) || eventEnd <= eventStart) {
      return;
    }

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dayStart = addCalendarDays(weekStart, dayIndex);
      const trackStart = new Date(dayStart);
      trackStart.setHours(CALENDAR_VIEW_START_HOUR, 0, 0, 0);
      const trackEnd = new Date(dayStart);
      trackEnd.setHours(CALENDAR_VIEW_END_HOUR, 0, 0, 0);

      const segmentStart = new Date(Math.max(eventStart.getTime(), trackStart.getTime()));
      const segmentEnd = new Date(Math.min(eventEnd.getTime(), trackEnd.getTime()));
      if (segmentEnd <= segmentStart) {
        continue;
      }

      const top = ((segmentStart.getTime() - trackStart.getTime()) / 3600000) * CALENDAR_SLOT_HEIGHT;
      const height = Math.max(42, ((segmentEnd.getTime() - segmentStart.getTime()) / 3600000) * CALENDAR_SLOT_HEIGHT);

      daySegments[dayIndex].push({
        ...event,
        top,
        height,
      });
    }
  });

  return daySegments;
}

function buildCalendarGridHtml(events, weekStart) {
  const hours = Array.from(
    { length: CALENDAR_VIEW_END_HOUR - CALENDAR_VIEW_START_HOUR },
    (_, index) => CALENDAR_VIEW_START_HOUR + index
  );
  const daySegments = buildCalendarSegments(events, weekStart);
  const trackHeight = hours.length * CALENDAR_SLOT_HEIGHT;
  const todayKey = getCalendarWeekKey(new Date());

  const timeColumnHtml = `
    <div class="calendar-time-column">
      <div class="calendar-time-head">Hora</div>
      <div class="calendar-time-track" style="height:${trackHeight}px">
        ${hours
          .map(
            (hour, index) => `
              <div class="calendar-hour-label" style="top:${index * CALENDAR_SLOT_HEIGHT}px">${padNumber(hour)}:00</div>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  const dayColumnsHtml = Array.from({ length: 7 }, (_, dayIndex) => {
    const dayDate = addCalendarDays(weekStart, dayIndex);
    const dayKey = getCalendarWeekKey(dayDate);
    const isToday = dayKey === todayKey;
    const segmentsHtml = daySegments[dayIndex]
      .map((event) => {
        const color = getCalendarColorConfig(event.color);
        const manageAction = canManageCalendarEvents()
          ? ` data-action="open-modal" data-modal="novo-evento" data-id="${event.id}"`
          : "";
        const interactiveClass = canManageCalendarEvents() ? " is-clickable" : "";
        return `
          <article
            class="calendar-event-block ${color.className}${interactiveClass}"
            data-calendar-event-id="${event.id}"
            style="top:${event.top}px;height:${event.height}px"
            title="${escapeHtml(`${event.title} · ${formatCalendarTimeRange(event.starts_at, event.ends_at)}`)}"${manageAction}
          >
            <strong>${escapeHtml(event.title)}</strong>
            <span>${escapeHtml(formatCalendarTimeRange(event.starts_at, event.ends_at))}</span>
            ${event.location ? `<small>${escapeHtml(event.location)}</small>` : ""}
          </article>
        `;
      })
      .join("");

    return `
      <div class="calendar-day-column ${isToday ? "is-today" : ""}">
        <div class="calendar-day-head">
          <span>${escapeHtml(formatCalendarWeekday(dayDate))}</span>
          <strong>${padNumber(dayDate.getDate())}</strong>
        </div>
        <div class="calendar-day-track" style="height:${trackHeight}px">
          ${hours
            .map(
              (_, hourIndex) =>
                `<div class="calendar-hour-slot" style="top:${hourIndex * CALENDAR_SLOT_HEIGHT}px;height:${CALENDAR_SLOT_HEIGHT}px"></div>`
            )
            .join("")}
          ${segmentsHtml}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="calendar-week-grid">
      ${timeColumnHtml}
      <div class="calendar-week-columns">${dayColumnsHtml}</div>
    </div>
  `;
}

function buildCalendarUpcomingHtml(events) {
  const items = events.slice(0, 8);
  if (!items.length) {
    return UI.empty("Nenhum evento nesta semana", "Adicione um evento para preencher a agenda compartilhada.", {
      icon: false,
      actionHtml: canManageCalendarEvents()
        ? `<button type="button" class="btn btn-pink btn-sm empty-state-action" data-action="open-modal" data-modal="novo-evento">Criar evento</button>`
        : ""
    });
  }

  return items
    .map((event) => {
      const color = getCalendarColorConfig(event.color);
      const canManage = canManageCalendarEvents();
      return `
        <article class="calendar-upcoming-card" data-calendar-event-id="${event.id}">
          <div class="calendar-upcoming-head">
            <div class="cell-stack">
              <strong class="cell-title">${escapeHtml(event.title)}</strong>
              <span class="cell-sub">${escapeHtml(
                `${formatCalendarMonthDay(event.starts_at, { weekday: "short" })} · ${formatCalendarTimeRange(
                  event.starts_at,
                  event.ends_at
                )}`
              )}</span>
            </div>
            <span class="badge ${color.badgeClass}">${escapeHtml(color.label)}</span>
          </div>
          ${event.location ? `<div class="calendar-upcoming-meta">${escapeHtml(event.location)}</div>` : ""}
          ${event.description ? `<div class="calendar-upcoming-note">${escapeHtml(event.description)}</div>` : ""}
          ${
            canManage
              ? `<div class="calendar-upcoming-actions">
                  <button type="button" class="btn btn-ghost btn-sm" data-action="open-modal" data-modal="novo-evento" data-id="${event.id}">Editar</button>
                  ${renderActionMenu(
                    [
                      renderActionMenuButton({
                        label: "Excluir evento",
                        action: "delete-calendar-event",
                        id: event.id,
                        className: "btn btn-danger-soft btn-sm"
                      })
                    ],
                    { label: "Mais ações do evento" }
                  )}
                </div>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function renderCalendar() {
  const page = document.getElementById("page-calendario");
  const grid = document.getElementById("calendar-week-grid");
  const upcoming = document.getElementById("calendar-upcoming-list");
  const weekLabel = document.getElementById("calendar-week-label");
  const weekSub = document.getElementById("calendar-week-sub");
  const newEventButton = document.getElementById("btn-new-calendar-event");

  if (!grid || !upcoming || !weekLabel || !weekSub) {
    return;
  }

  const weekStart = getCalendarWeekStartDate(state.calendar.weekStart || new Date());
  state.calendar.weekStart = weekStart.toISOString();
  weekLabel.textContent = `Semana de ${formatCalendarWeekLabel(weekStart)}`;
  weekSub.textContent = "";

  if (newEventButton) {
    newEventButton.style.display = canManageCalendarEvents() ? "" : "none";
  }

  if (!canRenderCalendarPage()) {
    grid.innerHTML = UI.empty("Calendário indisponível", "Este perfil não possui acesso ao calendário interno.");
    upcoming.innerHTML = "";
    return;
  }

  if (state.calendar.loading) {
    grid.innerHTML = UI.skeletonCalendarGrid();
    upcoming.innerHTML = UI.skeletonCardList(3);
    return;
  }

  const events = getCalendarEventsForWeek();
  grid.innerHTML = buildCalendarGridHtml(events, weekStart);
  upcoming.innerHTML = buildCalendarUpcomingHtml(events);
  if (page) {
    bindLegacyInlineHandlers(page);
  }
}

function focusCalendarEvent(eventId) {
  if (!eventId) {
    return;
  }

  window.requestAnimationFrame(() => {
    const targets = document.querySelectorAll(`[data-calendar-event-id="${eventId}"]`);
    if (!targets.length) {
      return;
    }

    const [firstTarget] = targets;
    firstTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    targets.forEach((node) => node.classList.add("is-highlighted"));
    window.setTimeout(() => targets.forEach((node) => node.classList.remove("is-highlighted")), 2200);
  });
}

async function openCalendarEventById(eventId) {
  if (!eventId || !goTo("calendario")) {
    return;
  }

  try {
    const localEvent = state.calendarEvents.find((item) => Number(item.id) === Number(eventId));
    const eventRecord = localEvent || (await apiFetch(`/calendar-events/${eventId}`, { cache: "no-store" }));
    if (eventRecord?.starts_at) {
      await loadCalendarEvents(eventRecord.starts_at, { force: true, silent: true });
    } else {
      await loadCalendarEvents(state.calendar.weekStart || new Date(), { force: true, silent: true });
    }
  } catch (_error) {
    await loadCalendarEvents(state.calendar.weekStart || new Date(), { force: true, silent: true });
  }

  focusCalendarEvent(eventId);
}

function shiftCalendarWeek(offset) {
  const currentWeek = getCalendarWeekStartDate(state.calendar.weekStart || new Date());
  const targetWeek = addCalendarDays(currentWeek, Number(offset || 0) * 7);
  loadCalendarEvents(targetWeek, { force: true }).catch(() => {});
}

function goToCalendarToday() {
  loadCalendarEvents(new Date(), { force: true }).catch(() => {});
}

function invoiceStatusOptions(selected = "") {
  const normalized = String(selected || "").trim();
  const knownOptions = INVOICE_STATUS_OPTIONS.map(
    (option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`
  ).join("");

  if (normalized && !INVOICE_STATUS_OPTIONS.includes(normalized)) {
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

function getRecentMonthBuckets(count = 6) {
  const reference = new Date();
  reference.setDate(1);
  reference.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_value, index) => {
    const date = new Date(reference.getTime());
    date.setMonth(reference.getMonth() - (count - index - 1));
    return {
      key: `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""),
      value: 0,
    };
  });
}

function appendMonthlySeriesValue(totals, referenceDate, amount) {
  const date = new Date(referenceDate);
  if (Number.isNaN(date.getTime())) {
    return;
  }

  const key = `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`;
  if (!totals.has(key)) {
    return;
  }

  totals.set(key, totals.get(key) + Number(amount || 0));
}

function getFinancialRevenueSeries(count = 6) {
  const buckets = getRecentMonthBuckets(count);
  const totals = new Map(buckets.map((bucket) => [bucket.key, 0]));

  state.invoices
    .filter((invoice) => isInvoicePaidStatus(invoice.status))
    .forEach((invoice) => {
      appendMonthlySeriesValue(totals, invoice.paid_at || invoice.due_date || invoice.created_at, invoice.amount);
    });

  state.charges
    .filter((charge) => isChargeReceivedStatus(charge.status))
    .forEach((charge) => {
      appendMonthlySeriesValue(totals, charge.received_at || charge.paid_at || charge.due_date || charge.created_at, charge.amount);
    });

  return {
    labels: buckets.map((bucket) => bucket.label),
    values: buckets.map((bucket) => totals.get(bucket.key) || 0),
  };
}

function getFinancePeriodOptions() {
  return [
    { value: "month", label: "Mês atual" },
    { value: "30d", label: "Últimos 30 dias" },
    { value: "year", label: "Ano atual" },
    { value: "all", label: "Todo o período" },
  ];
}

function getFinancePeriodRange(period = state.filters.financePeriod || "month") {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === "all") {
    return { key: "all", start: null, end: null };
  }

  if (period === "year") {
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31);
    end.setHours(23, 59, 59, 999);
    return { key: period, start, end };
  }

  if (period === "30d") {
    const start = new Date(today.getTime());
    start.setDate(start.getDate() - 29);
    return { key: period, start, end: today };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { key: "month", start, end };
}

function isWithinFinancePeriod(value, range = getFinancePeriodRange()) {
  if (!value) {
    return false;
  }

  if (!range.start || !range.end) {
    return true;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  date.setHours(0, 0, 0, 0);
  return date >= range.start && date <= range.end;
}

function getInvoiceFinanceDate(invoice) {
  return invoice?.due_date || invoice?.created_at || null;
}

function getChargeFinanceDate(charge) {
  return charge?.due_date || charge?.created_at || null;
}

function getCostFinanceDate(entry) {
  return entry?.incurred_on || entry?.created_at || null;
}

function filterFinanceRecords(records, resolveDate) {
  const range = getFinancePeriodRange();
  if (!range.start || !range.end) {
    return [...records];
  }

  return records.filter((record) => isWithinFinancePeriod(resolveDate(record), range));
}

function sumFinancialAmount(records) {
  return records.reduce((acc, record) => acc + Number(record.amount || 0), 0);
}

function isInvoiceCancelledStatus(status) {
  const raw = String(status || "").trim().toLowerCase();
  return raw === "cancelada" || raw === "cancelado";
}

function isInvoiceOpenStatus(status) {
  return !isInvoicePaidStatus(status) && !isInvoiceCancelledStatus(status);
}

function isChargeCancelledStatus(status) {
  const raw = String(status || "").trim().toUpperCase();
  return raw === "CANCELED" || raw === "CANCELLED" || raw === "CANCELED";
}

function getInvoiceOperationalStatus(invoice) {
  if (isInvoiceCancelledStatus(invoice?.status)) {
    return "Cancelada";
  }

  if (isInvoicePaidStatus(invoice?.status)) {
    return "Pago";
  }

  if (isOverdueDate(invoice?.due_date)) {
    return "Atrasada";
  }

  return "Pendente";
}

function getChargeOperationalStatus(charge) {
  if (isChargeCancelledStatus(charge?.status)) {
    return "Cancelada";
  }

  if (isChargeReceivedStatus(charge?.status)) {
    return "Recebida";
  }

  if (isOverdueDate(charge?.due_date)) {
    return "Atrasada";
  }

  return "Pendente";
}

function getFinanceStatusBadgeClass(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "recebida" || normalized === "pago" || normalized === "em dia") {
    return "badge-green";
  }
  if (normalized === "pendente") {
    return "badge-yellow";
  }
  if (normalized === "atrasada" || normalized === "atrasado") {
    return "badge-red";
  }
  return "badge-gray";
}

function buildFinanceViewModel() {
  const filteredInvoices = filterFinanceRecords(state.invoices, getInvoiceFinanceDate);
  const filteredCharges = filterFinanceRecords(state.charges, getChargeFinanceDate);
  const filteredCosts = filterFinanceRecords(state.costEntries, getCostFinanceDate);

  const paidInvoices = filteredInvoices.filter((invoice) => isInvoicePaidStatus(invoice.status));
  const openInvoices = filteredInvoices.filter((invoice) => isInvoiceOpenStatus(invoice.status));
  const overdueInvoices = openInvoices.filter((invoice) => isOverdueDate(invoice.due_date));
  const pendingInvoices = openInvoices.filter((invoice) => !isOverdueDate(invoice.due_date));

  const receivedCharges = filteredCharges.filter((charge) => isChargeReceivedStatus(charge.status));
  const openCharges = filteredCharges.filter(
    (charge) => isChargeOpenStatus(charge.status) && !isChargeCancelledStatus(charge.status)
  );
  const overdueCharges = openCharges.filter((charge) => isOverdueDate(charge.due_date));
  const pendingCharges = openCharges.filter((charge) => !isOverdueDate(charge.due_date));

  const totalBilled = sumFinancialAmount(filteredInvoices) + sumFinancialAmount(filteredCharges);
  const receivedTotal = sumFinancialAmount(paidInvoices) + sumFinancialAmount(receivedCharges);
  const pendingTotal = sumFinancialAmount(pendingInvoices) + sumFinancialAmount(pendingCharges);
  const overdueTotal = sumFinancialAmount(overdueInvoices) + sumFinancialAmount(overdueCharges);
  const totalCosts = sumFinancialAmount(filteredCosts);
  const totalMrr = state.clients.reduce((acc, client) => acc + Number(client.mrr || 0), 0);
  const netProfit = receivedTotal - totalCosts;

  const mediaCost = filteredCosts
    .filter((entry) => String(entry.category || "") === "media")
    .reduce((acc, entry) => acc + Number(entry.amount || 0), 0);
  const productionCost = filteredCosts
    .filter((entry) => String(entry.category || "") === "producao")
    .reduce((acc, entry) => acc + Number(entry.amount || 0), 0);
  const operationsCost = filteredCosts
    .filter((entry) => String(entry.category || "") === "operacao")
    .reduce((acc, entry) => acc + Number(entry.amount || 0), 0);
  const otherCost = filteredCosts
    .filter((entry) => String(entry.category || "") === "outro")
    .reduce((acc, entry) => acc + Number(entry.amount || 0), 0);

  const clientFinancials = state.clients
    .map((client) => {
      const invoices = filteredInvoices.filter(
        (invoice) => Number(invoice.client_id) === Number(client.id) || invoice.client_name === client.name
      );
      const charges = filteredCharges.filter(
        (charge) => Number(charge.client_id) === Number(client.id) || charge.client_name === client.name
      );
      const costs = filteredCosts.filter((entry) => Number(entry.client_id) === Number(client.id));

      const billedInvoices = sumFinancialAmount(invoices);
      const billedCharges = sumFinancialAmount(charges);
      const billedTotal = billedInvoices + billedCharges;
      const receivedTotalByClient =
        sumFinancialAmount(invoices.filter((invoice) => isInvoicePaidStatus(invoice.status)))
        + sumFinancialAmount(charges.filter((charge) => isChargeReceivedStatus(charge.status)));
      const pendingTotalByClient =
        sumFinancialAmount(
          invoices.filter((invoice) => isInvoiceOpenStatus(invoice.status) && !isOverdueDate(invoice.due_date))
        )
        + sumFinancialAmount(
          charges.filter(
            (charge) =>
              isChargeOpenStatus(charge.status)
              && !isChargeCancelledStatus(charge.status)
              && !isOverdueDate(charge.due_date)
          )
        );
      const overdueTotalByClient =
        sumFinancialAmount(
          invoices.filter((invoice) => isInvoiceOpenStatus(invoice.status) && isOverdueDate(invoice.due_date))
        )
        + sumFinancialAmount(
          charges.filter(
            (charge) =>
              isChargeOpenStatus(charge.status)
              && !isChargeCancelledStatus(charge.status)
              && isOverdueDate(charge.due_date)
          )
        );
      const costTotal = sumFinancialAmount(costs);
      const marginBase = billedTotal || receivedTotalByClient;
      const margin = marginBase ? Math.round(((marginBase - costTotal) / marginBase) * 100) : 0;

      let operationalStatus = "Sem movimentação";
      if (overdueTotalByClient > 0) {
        operationalStatus = "Atrasado";
      } else if (pendingTotalByClient > 0) {
        operationalStatus = "Pendente";
      } else if (billedTotal > 0 || receivedTotalByClient > 0) {
        operationalStatus = "Em dia";
      }

      return {
        client,
        billedTotal,
        receivedTotal: receivedTotalByClient,
        costTotal,
        pendingTotal: pendingTotalByClient,
        overdueTotal: overdueTotalByClient,
        margin,
        operationalStatus,
      };
    })
    .sort((left, right) => {
      if (right.overdueTotal !== left.overdueTotal) {
        return right.overdueTotal - left.overdueTotal;
      }
      if (right.pendingTotal !== left.pendingTotal) {
        return right.pendingTotal - left.pendingTotal;
      }
      if (right.receivedTotal !== left.receivedTotal) {
        return right.receivedTotal - left.receivedTotal;
      }
      return String(left.client?.name || "").localeCompare(String(right.client?.name || ""), "pt-BR");
    });

  return {
    filteredInvoices,
    filteredCharges,
    filteredCosts,
    clientFinancials,
    totalBilled,
    receivedTotal,
    pendingTotal,
    overdueTotal,
    totalCosts,
    totalMrr,
    netProfit,
    mediaCost,
    productionCost,
    operationsCost,
    otherCost,
    receivedEntries: paidInvoices.length + receivedCharges.length,
    overdueEntries: overdueInvoices.length + overdueCharges.length,
  };
}

function renderKpiCards(container, cards) {
  if (!container) {
    return;
  }

  container.innerHTML = cards
    .map(
      (item) => `
        <div class="kpi-card">
          <div class="kpi-label">${escapeHtml(item.label)}</div>
          <div class="kpi-val">${escapeHtml(item.value)}</div>
          <div class="kpi-sub${item.sub ? "" : " is-empty"}${item.subClass ? ` ${item.subClass}` : ""}">${escapeHtml(item.sub || "")}</div>
        </div>
      `
    )
    .join("");
}

function setSidebarCount(page, value) {
  const countNodes = document.querySelectorAll(`[data-count-for="${page}"]`);
  if (!countNodes.length) {
    return;
  }

  const total = Number(value || 0);
  countNodes.forEach((countNode) => {
    if (total <= 0) {
      countNode.textContent = "0";
      countNode.style.display = "none";
      return;
    }

    countNode.textContent = formatNumber(total);
    countNode.style.display = "inline-flex";
  });
}

function renderSidebarCounts() {
  const openTasks = state.tasks.filter((task) => normalizeTaskStatusLabel(task.status) !== "Concluido").length;
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
  if (raw === "OVERDUE") return "Atrasada";
  if (raw === "PENDING") return "Pendente";
  if (raw === "CANCELLED" || raw === "CANCELED") return "Cancelada";
  return String(status || "").trim();
}

function isChargeReceivedStatus(status) {
  const raw = String(status || "").trim().toUpperCase();
  return raw === "RECEIVED" || raw === "PAID";
}

function isChargeOpenStatus(status) {
  const raw = String(status || "").trim().toUpperCase();
  return raw === "PENDING" || raw === "OVERDUE";
}

function isInvoicePaidStatus(status) {
  return String(status || "").trim().toLowerCase() === "pago";
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

function getCampaignPlannerChannelClass(channel) {
  const value = normalizeLooseText(channel);
  if (value.includes("google")) return "is-google";
  if (value.includes("instagram") && value.includes("meta")) return "is-instagram-meta";
  if (value.includes("meta") || value.includes("facebook")) return "is-meta";
  return "is-neutral";
}

function getCampaignPlannerStatusClass(status) {
  const value = normalizeLooseText(status);
  if (value.includes("ativa")) return "is-active";
  if (value.includes("paus")) return "is-paused";
  return "is-planning";
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

function escapeHtmlWithBreaks(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function getDeadlineClass(task) {
  const dueDateValue = task.due_date || task.deadline;
  if (normalizeTaskStatusLabel(task.status) === "Concluido") {
    return "deadline-done";
  }

  if (!dueDateValue) {
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

function getTaskDeadlineLabel(task) {
  const dueDateValue = task?.due_date || task?.deadline;
  if (!dueDateValue) {
  return "—";
  }

  const dueDate = new Date(dueDateValue);
  if (Number.isNaN(dueDate.getTime())) {
    return `Prazo · ${formatDate(dueDateValue)}`;
  }

  dueDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate - today) / 86400000);
  const dateLabel = formatDate(dueDateValue);
  const isDone = normalizeTaskStatusLabel(task?.status) === "Concluido";

  if (isDone) {
    return `Concluída · ${dateLabel}`;
  }

  if (diffDays < 0) {
    return `Atrasada · ${dateLabel}`;
  }
  if (diffDays === 0) {
    return `Hoje · ${dateLabel}`;
  }
  if (diffDays === 1) {
    return `Amanhã · ${dateLabel}`;
  }

  return `Prazo · ${dateLabel}`;
}

function getKanbanCardBadge(task) {
  if (normalizeTaskStatusLabel(task?.status) === "Concluido") {
    return { className: "badge badge-green", label: "Concluída", title: getTaskDeadlineLabel(task) };
  }

  const deadlineLabel = getTaskDeadlineLabel(task).split(" · ")[0];

  if (deadlineLabel === "Atrasada") {
    return { className: "badge badge-red", label: "Atrasada", title: getTaskDeadlineLabel(task) };
  }
  if (deadlineLabel === "Hoje") {
    return { className: "badge badge-yellow", label: "Hoje", title: getTaskDeadlineLabel(task) };
  }
  if (deadlineLabel === "Amanhã") {
    return { className: "badge badge-yellow", label: "Amanhã", title: getTaskDeadlineLabel(task) };
  }
  if (deadlineLabel === "Concluída") {
    return { className: "badge badge-green", label: "Concluída", title: getTaskDeadlineLabel(task) };
  }

  const typeLabel = formatTaskTypeLabel(task?.type);
  return { className: "badge badge-kanban-type", label: typeLabel, title: typeLabel };
}

function getTaskAssigneeUsers(task = {}) {
  const userMap = new Map();
  [...toArray(state.team), ...toArray(state.users)].forEach((user) => {
    const id = Number(user?.id);
    if (Number.isInteger(id) && id > 0 && !userMap.has(id)) {
      userMap.set(id, user);
    }
  });

  return getTaskAssigneeIds(task)
    .map((id) => userMap.get(Number(id)))
    .filter(Boolean);
}

function renderKanbanAssigneeStack(task) {
  const assigneeUsers = getTaskAssigneeUsers(task);
  const assigneeNames = assigneeUsers.length ? assigneeUsers.map((user) => user.name).filter(Boolean) : getTaskAssigneeNames(task);
  const title = getTaskAssigneeTitle(task);
  const palette = ["av-blue", "av-pink", "av-green", "av-yellow"];
  const visibleUsers = assigneeUsers.slice(0, 2);
  const visibleNames = assigneeNames.slice(0, 2);
  const totalCount = assigneeNames.length;

  let avatarsHtml = "";

  if (visibleUsers.length) {
    avatarsHtml = visibleUsers
      .map((user, index) => renderUserAvatar(user, `avatar ${palette[index % palette.length]} kanban-assignee-avatar`))
      .join("");
  } else if (visibleNames.length) {
    avatarsHtml = visibleNames
      .map(
        (name, index) =>
          `<div class="avatar ${palette[index % palette.length]} kanban-assignee-avatar">${escapeHtml(getInitials(name || "ONE"))}</div>`
      )
      .join("");
  } else {
    avatarsHtml = '<div class="avatar av-blue kanban-assignee-avatar">EQ</div>';
  }

  if (totalCount > 2) {
    avatarsHtml += `<div class="avatar kanban-assignee-avatar kanban-assignee-more">+${totalCount - 2}</div>`;
  }

  return `<div class="kanban-assignee-stack" title="${escapeHtml(title)}">${avatarsHtml}</div>`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function sortNotifications(items = []) {
  return [...items].sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime());
}

function isUnreadNotification(item) {
  return Boolean(item) && !item.read_at;
}

function formatNotificationTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absoluteMinutes = Math.abs(diffMinutes);
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (absoluteMinutes < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, "day");
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getNotificationTimeLabel(item) {
  if (item?.entity_type === "calendar_event" && item.entity_id) {
    const event = state.calendarEvents.find((record) => Number(record.id) === Number(item.entity_id));
    if (event?.starts_at) {
      return formatNotificationTime(event.starts_at);
    }
  }

  return formatNotificationTime(item.created_at);
}

function buildNotificationPanelHtml() {
  const notifications = sortNotifications(state.notifications).slice(0, 30);
  const unreadCount = Number(notificationRuntime.unread || 0);
  const itemsHtml = notifications.length
    ? notifications
        .map((item) => {
          const unreadClass = isUnreadNotification(item) ? " is-unread" : "";
          const action =
            item.entity_type === "task" && item.entity_id
              ? "Abrir tarefa"
              : item.entity_type === "calendar_event" && item.entity_id
                ? "Abrir calendário"
                : "Abrir";

          return `
            <button
              type="button"
              class="notification-item${unreadClass}"
              data-notification-item="1"
              data-notification-id="${item.id}"
              data-notification-entity-type="${escapeHtml(item.entity_type || "")}"
              data-notification-entity-id="${item.entity_id || ""}"
            >
              <div class="notification-item-head">
                <span class="notification-dot" aria-hidden="true"></span>
                <div class="notification-item-main">
                  <div class="notification-item-title">${escapeHtml(item.title || "Notificação")}</div>
                  ${item.body ? `<div class="notification-item-body">${escapeHtml(item.body)}</div>` : ""}
                  <div class="notification-item-meta">
                    <span>${escapeHtml(getNotificationTimeLabel(item))}</span>
                    <span class="notification-item-action">${action}</span>
                  </div>
                </div>
              </div>
            </button>
          `;
        })
        .join("")
    : `
        <div class="notification-empty">
          <strong>Nenhuma notificação recente</strong>
          <span>Quando houver movimentações, elas aparecem aqui.</span>
        </div>
      `;

  return `
    <button type="button" class="notification-trigger" data-notification-toggle="1" aria-label="Abrir notificações" aria-expanded="${
      notificationRuntime.open ? "true" : "false"
    }">
      <span class="notification-trigger-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M12 3a5 5 0 0 0-5 5v2.6c0 .7-.2 1.4-.6 2l-1.2 1.9A1 1 0 0 0 6 16h12a1 1 0 0 0 .8-1.5l-1.2-1.9a3.8 3.8 0 0 1-.6-2V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.3-1.5h-4.6A2.5 2.5 0 0 0 12 21Z"></path>
        </svg>
      </span>
      ${unreadCount ? `<span class="notification-badge">${unreadCount > 9 ? "9+" : unreadCount}</span>` : ""}
    </button>
    <div class="notification-panel" role="dialog" aria-label="Notificações">
      <div class="notification-panel-head">
        <div>
          <strong>Notificações</strong>
          <span>${unreadCount ? `${unreadCount} nova${unreadCount > 1 ? "s" : ""}` : "Sem pendências"}</span>
        </div>
        <button type="button" class="notification-mark-all" data-notification-mark-all="1">Marcar como lidas</button>
      </div>
      <div class="notification-list">${itemsHtml}</div>
    </div>
  `;
}

function renderNotifications() {
  document.querySelectorAll("[data-notification-shell]").forEach((shell) => {
    shell.classList.toggle("open", notificationRuntime.open);
    shell.innerHTML = buildNotificationPanelHtml();
  });
  renderProfileActivityCard();
}

function extractNotificationTaskTitle(item) {
  const body = String(item?.body || "");
  const bodyMatch = body.match(/"([^"]+)"/);
  if (bodyMatch?.[1]) {
    return bodyMatch[1].trim();
  }

  return String(item?.title || "").trim();
}

function showNewNotificationToast(delta = 0) {
  const nextUnread = Number(notificationRuntime.unread || 0);
  if (delta <= 0 || nextUnread <= notificationRuntime.lastToastUnread) {
    notificationRuntime.lastToastUnread = nextUnread;
    return;
  }

  const unreadItems = sortNotifications(state.notifications).filter(isUnreadNotification);
  const taskAssignedItems = unreadItems.filter((item) => item.type === "task_assigned");
  const calendarReminderItems = unreadItems.filter((item) => String(item.type || "").startsWith("calendar_event_reminder"));
  const titles = taskAssignedItems
    .slice(0, Math.max(1, Math.min(delta, 3)))
    .map((item) => extractNotificationTaskTitle(item))
    .filter(Boolean);

  if (titles.length === 1) {
    showToast(`Nova tarefa para você: ${titles[0]}`);
  } else if (titles.length > 1) {
    const suffix = delta > titles.length ? " ..." : "";
    showToast(`Novas tarefas para você: ${titles.join(" · ")}${suffix}`);
  } else if (calendarReminderItems.length === 1) {
    showToast(`Evento próximo: ${extractNotificationTaskTitle(calendarReminderItems[0])}`);
  } else if (calendarReminderItems.length > 1) {
    showToast(`Você recebeu ${calendarReminderItems.length} lembretes de agenda.`);
  } else if (delta === 1) {
    showToast("Você recebeu 1 nova notificação.");
  } else {
    showToast(`Você recebeu ${delta} novas notificações.`);
  }

  notificationRuntime.lastToastUnread = nextUnread;
}

function closeNotifications() {
  if (!notificationRuntime.open) {
    return;
  }

  notificationRuntime.open = false;
  renderNotifications();
}

async function markNotificationsRead() {
  if (notificationRuntime.syncingRead || !state.session?.user?.id) {
    return;
  }

  notificationRuntime.syncingRead = true;

  try {
    await apiFetch("/notifications/read-all", { method: "PATCH" });

    const readAt = new Date().toISOString();
    state.notifications = state.notifications.map((item) => ({
      ...item,
      read_at: item.read_at || readAt,
    }));
    notificationRuntime.unread = 0;
    notificationRuntime.lastToastUnread = 0;
    renderNotifications();
  } catch (error) {
    console.warn("[notifications] Falha ao marcar notificações como lidas:", error);
  } finally {
    notificationRuntime.syncingRead = false;
  }
}

function ensureNotificationUi() {
  document.querySelectorAll(".topbar-actions").forEach((actions) => {
    let shell = actions.querySelector("[data-notification-shell]");
    if (!shell) {
      shell = document.createElement("div");
      shell.className = "notification-shell";
      shell.dataset.notificationShell = "1";
    }

    actions.append(shell);

    if (shell.dataset.notificationBound === "1") {
      return;
    }

    shell.addEventListener("click", async (event) => {
      const toggle = event.target.closest("[data-notification-toggle]");
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        notificationRuntime.open = !notificationRuntime.open;
        renderNotifications();
        if (notificationRuntime.open) {
          await refreshNotifications({ suppressErrors: true });
        }
        return;
      }

      const markAllButton = event.target.closest("[data-notification-mark-all]");
      if (markAllButton) {
        event.preventDefault();
        event.stopPropagation();
        await markNotificationsRead();
        return;
      }

      const item = event.target.closest("[data-notification-item]");
      if (!item) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      await handleNotificationClick(
        Number(item.dataset.notificationId),
        item.dataset.notificationEntityType || "",
        Number(item.dataset.notificationEntityId || 0)
      );
    });

    shell.dataset.notificationBound = "1";
  });

  if (document.body.dataset.notificationGlobalBound !== "1") {
    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-notification-shell]")) {
        closeNotifications();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNotifications();
      }
    });

    document.body.dataset.notificationGlobalBound = "1";
  }

  renderNotifications();
}

async function refreshNotifications({ silent = false, suppressErrors = false } = {}) {
  if (!state.session?.user?.id) {
    return [];
  }

  try {
    const [notifications, unreadCount] = await Promise.all([
      apiFetch("/notifications?limit=30", { cache: "no-store" }),
      apiFetch("/notifications/unread-count", { cache: "no-store" }),
    ]);
    const normalized = sortNotifications(toArray(notifications));
    state.notifications = normalized;
    notificationRuntime.unread = Number(unreadCount?.total || 0);
    if (notificationRuntime.unread < notificationRuntime.lastToastUnread) {
      notificationRuntime.lastToastUnread = notificationRuntime.unread;
    }
    ensureNotificationUi();
    if (!notificationRuntime.open && notificationRuntime.lastToastUnread === 0 && notificationRuntime.unread > 0) {
      showNewNotificationToast(notificationRuntime.unread);
    }

    return normalized;
  } catch (error) {
    console.warn("[notifications] Falha ao carregar notificações:", error);
    ensureNotificationUi();
    if (!silent && !suppressErrors) {
      showToast("Não foi possível atualizar as notificações agora.");
    }
    return [];
  }
}

function stopNotificationPolling() {
  if (notificationRuntime.pollHandle) {
    clearInterval(notificationRuntime.pollHandle);
    notificationRuntime.pollHandle = null;
  }

  notificationRuntime.syncingRead = false;
  notificationRuntime.open = false;
  notificationRuntime.unread = 0;
  notificationRuntime.lastToastUnread = 0;
  state.notifications = [];
  renderNotifications();
}

function startNotificationPolling() {
  stopNotificationPolling();
  ensureNotificationUi();

  if (document.body.dataset.notificationRefreshBound !== "1") {
    window.addEventListener("focus", () => {
      refreshNotificationUnreadCount({ suppressErrors: true }).catch(() => {});
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshNotificationUnreadCount({ suppressErrors: true }).catch(() => {});
      }
    });

    document.body.dataset.notificationRefreshBound = "1";
  }

  refreshNotifications({ silent: true, suppressErrors: true }).catch(() => {});

  notificationRuntime.pollHandle = window.setInterval(() => {
    if (document.hidden) {
      return;
    }

    refreshNotificationUnreadCount({ suppressErrors: true }).catch(() => {});
  }, NOTIFICATION_POLL_MS);
}

async function refreshNotificationUnreadCount({ suppressErrors = false } = {}) {
  if (!state.session?.user?.id) {
    return 0;
  }

  try {
    const previousUnread = Number(notificationRuntime.unread || 0);
    const data = await apiFetch("/notifications/unread-count", {
      cache: "no-store",
    });
    notificationRuntime.unread = Number(data?.total || 0);
    if (notificationRuntime.unread < notificationRuntime.lastToastUnread) {
      notificationRuntime.lastToastUnread = notificationRuntime.unread;
    }
    renderNotifications();
    const unreadIncreased = notificationRuntime.unread > previousUnread;

    if (notificationRuntime.open || unreadIncreased || !state.notifications.length) {
      const notifications = await apiFetch("/notifications?limit=30", { cache: "no-store" });
      state.notifications = sortNotifications(toArray(notifications));
      renderNotifications();
    }

    if (unreadIncreased) {
      showNewNotificationToast(notificationRuntime.unread - previousUnread);
    }

    return notificationRuntime.unread;
  } catch (error) {
    console.warn("[notifications] Falha ao carregar contagem:", error);
    if (!suppressErrors) {
      showToast("Não foi possível atualizar a contagem de notificações agora.");
    }
    return 0;
  }
}

function focusTaskCard(taskId) {
  if (!taskId) {
    return;
  }

  window.requestAnimationFrame(() => {
    const card = document.querySelector(`[data-task-card][data-task-id="${taskId}"]`);
    if (!card) {
      return;
    }

    card.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    card.classList.add("is-highlighted");
    window.setTimeout(() => card.classList.remove("is-highlighted"), 2200);
  });
}

async function handleNotificationClick(id, entityType, entityId) {
  if (id && isUnreadNotification(state.notifications.find((item) => Number(item.id) === Number(id)))) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      state.notifications = state.notifications.map((item) =>
        Number(item.id) === Number(id)
          ? {
              ...item,
              read_at: item.read_at || new Date().toISOString(),
            }
          : item
      );
      notificationRuntime.unread = Math.max(0, Number(notificationRuntime.unread || 0) - 1);
      notificationRuntime.lastToastUnread = Math.min(notificationRuntime.lastToastUnread, notificationRuntime.unread);
    } catch (error) {
      console.warn("[notifications] Falha ao marcar item como lido:", error);
    }
  }

  closeNotifications();
  renderNotifications();

  if (entityType === "task" && entityId) {
    goTo("kanban");
    focusTaskCard(entityId);
    return;
  }

  if (entityType === "calendar_event" && entityId) {
    await openCalendarEventById(entityId);
  }
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
    if (url.startsWith("/api/files/") || url.startsWith("/uploads/")) {
      return `<button type="button" class="${className}" data-action="open-protected-resource" data-url="${escapeHtml(
        url
      )}">${escapeHtml(label)}</button>`;
    }

    return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  }

  return `<button type="button" class="${className}" data-action="toast" data-message="${escapeHtml(
    missingMessage
  )}">${escapeHtml(label)}</button>`;
}

function renderActionMenu(actions = [], { label = "Mais ações" } = {}) {
  const items = actions.filter(Boolean).join("");
  if (!items) {
    return "";
  }

  return `
    <details class="action-menu">
      <summary class="btn btn-outline btn-sm action-menu-trigger" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span aria-hidden="true">⋯</span></summary>
      <div class="action-menu-panel" data-floating-menu-panel="1">
        ${items}
      </div>
    </details>
  `;
}

function renderActionMenuButton({
  label,
  action,
  id,
  modal,
  className = "btn btn-ghost btn-sm",
  extra = "",
  type = "button"
}) {
  const attributes = [
    `type="${type}"`,
    `class="${className}"`,
    action ? `data-action="${action}"` : "",
    modal ? `data-modal="${modal}"` : "",
    id != null ? `data-id="${id}"` : "",
    extra || ""
  ]
    .filter(Boolean)
    .join(" ");

  return `<button ${attributes}>${escapeHtml(label)}</button>`;
}

const FLOATING_ACTION_MENU_SELECTOR = "details.action-menu, details.prod-menu, details.analytics-menu, details.finance-menu, details.access-menu";

function getFloatingActionMenuPanel(menu) {
  if (!menu) {
    return null;
  }

  return (
    menu.querySelector("[data-floating-menu-panel]") ||
    Array.from(menu.children).find((child) => child.tagName !== "SUMMARY") ||
    null
  );
}

function clearFloatingActionMenuPosition(menu) {
  const panel = getFloatingActionMenuPanel(menu);
  if (!panel) {
    return;
  }

  panel.style.position = "";
  panel.style.left = "";
  panel.style.top = "";
  panel.style.right = "";
  panel.style.bottom = "";
  panel.style.zIndex = "";
  panel.style.maxWidth = "";
}

function positionFloatingActionMenu(menu) {
  if (!menu?.open) {
    clearFloatingActionMenuPosition(menu);
    return;
  }

  const summary = menu.querySelector("summary");
  const panel = getFloatingActionMenuPanel(menu);
  if (!summary || !panel) {
    return;
  }

  panel.style.position = "fixed";
  panel.style.left = "0";
  panel.style.top = "0";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.zIndex = "260";
  panel.style.maxWidth = "min(220px, calc(100vw - 24px))";

  const triggerRect = summary.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 12;

  let left = triggerRect.right - panelRect.width;
  if (left < viewportPadding) {
    left = viewportPadding;
  }
  if (left + panelRect.width > window.innerWidth - viewportPadding) {
    left = Math.max(viewportPadding, window.innerWidth - viewportPadding - panelRect.width);
  }

  let top = triggerRect.bottom + gap;
  if (top + panelRect.height > window.innerHeight - viewportPadding) {
    top = Math.max(viewportPadding, triggerRect.top - gap - panelRect.height);
  }

  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
}

function syncFloatingActionMenus() {
  document.querySelectorAll(`${FLOATING_ACTION_MENU_SELECTOR}[open]`).forEach((menu) => {
    positionFloatingActionMenu(menu);
  });
}

function closeFloatingActionMenus(exceptMenu = null) {
  document.querySelectorAll(`${FLOATING_ACTION_MENU_SELECTOR}[open]`).forEach((menu) => {
    if (menu !== exceptMenu) {
      menu.open = false;
      clearFloatingActionMenuPosition(menu);
    }
  });
}

function bindFloatingActionMenus() {
  if (document.body.dataset.boundFloatingActionMenus !== "1") {
    document.addEventListener(
      "toggle",
      (event) => {
        const menu = event.target;
        if (!menu?.matches?.(FLOATING_ACTION_MENU_SELECTOR)) {
          return;
        }

        if (menu.open) {
          closeFloatingActionMenus(menu);
          requestAnimationFrame(() => positionFloatingActionMenu(menu));
          return;
        }

        clearFloatingActionMenuPosition(menu);
      },
      true
    );

    document.addEventListener("click", (event) => {
      const menu = event.target.closest(FLOATING_ACTION_MENU_SELECTOR);
      if (!menu) {
        closeFloatingActionMenus();
        return;
      }

      if (event.target.closest("summary")) {
        return;
      }

      if (event.target.closest("button, a")) {
        requestAnimationFrame(() => {
          if (menu.open) {
            menu.open = false;
            clearFloatingActionMenuPosition(menu);
          }
        });
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeFloatingActionMenus();
      }
    });

    window.addEventListener("resize", syncFloatingActionMenus);
    document.addEventListener("scroll", syncFloatingActionMenus, true);

    document.body.dataset.boundFloatingActionMenus = "1";
  }

  syncFloatingActionMenus();
}

const ACCESS_COUNTRY_LABELS = {
  BR: "Brasil",
  US: "Estados Unidos",
  PT: "Portugal",
  ES: "Espanha",
  AR: "Argentina",
  CA: "Canadá",
  FR: "França",
  DE: "Alemanha",
  IT: "Itália",
  GB: "Reino Unido",
};

const ROLE_PROFILE_DESCRIPTIONS = {
  admin: "Administração, governança e visão completa do painel.",
  gestor: "Coordenação operacional e acompanhamento de entregas.",
  designer: "Execução de tarefas, produção e rotina operacional.",
  comercial: "Relacionamento, CRM, campanhas e receita.",
  dev: "Suporte técnico, integrações e analytics.",
};

const PROFILE_ACCESS_STATUS_LABELS = {
  admin: "Administrador Master",
  gestor: "Gestor Operacional",
  designer: "Designer",
  comercial: "Comercial",
  dev: "Desenvolvimento",
  client: "Cliente",
};
const PANEL_THEME_STORAGE_KEY = "one-panel-theme";
const LEGACY_PANEL_THEME_STORAGE_KEY = "one-theme";

const PROFILE_ACTIVITY_PLACEHOLDERS = [];

function hasMeaningfulAccessLocation(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }

  const lowerValue = normalized.toLowerCase();
  if (lowerValue.includes("não identificada") || lowerValue.includes("nao identificada")) {
    return false;
  }

  if (/^[A-Z]{2}$/.test(normalized)) {
    return false;
  }

  if (normalized === "Brasil" || normalized === ACCESS_COUNTRY_LABELS.BR) {
    return false;
  }

  return true;
}

function formatAccessLocationLabel(value) {
  const normalized = String(value || "").trim();
  if (!hasMeaningfulAccessLocation(normalized)) {
    return "";
  }

  return normalized;
}

function getMemberPresenceMeta(user) {
  if (!user.is_active) {
    return { label: "Inativo", tone: "is-inactive" };
  }

  if (user.is_online) {
    return { label: "Online agora", tone: "is-online" };
  }

  return { label: "Ativo", tone: "is-active" };
}

function renderAccessMembersTable(bodyHtml) {
  return `
    <div class="access-member-table-wrap table-wrap">
      <table class="access-member-table">
        <thead>
          <tr>
            <th>Membro</th>
            <th class="hide-mobile">Perfil</th>
            <th>Presença</th>
            <th class="hide-tablet">Último acesso</th>
            <th class="cell-actions" data-align="right">Ações</th>
          </tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

function bindAccessMemberActions() {
  const membersRoot = document.getElementById("membros-tbody");
  if (!membersRoot || membersRoot.dataset.bound === "1") {
    return;
  }

  membersRoot.addEventListener("click", (event) => {
    const editTrigger = event.target.closest("[data-access-edit]");
    if (editTrigger) {
      const userId = Number(editTrigger.dataset.accessEdit);
      if (Number.isFinite(userId)) {
        openModal("novo-membro", userId);
      }
      return;
    }

    const removeTrigger = event.target.closest("[data-access-remove]");
    if (removeTrigger) {
      const userId = Number(removeTrigger.dataset.accessRemove);
      if (Number.isFinite(userId)) {
        deleteUser(userId);
      }
    }
  });

  membersRoot.dataset.bound = "1";
}

function renderMemberRow(user, currentUserId) {
  const lastAccess = user.last_seen_at || user.last_login_at;
  const lastAccessLabel = lastAccess ? formatDateTime(lastAccess) : "—";
  const presence = getMemberPresenceMeta(user);
  const locationLabel = formatAccessLocationLabel(user.last_seen_location);
  const canRemoveUser = Number(user.id) !== Number(currentUserId) && String(user.role || "").toLowerCase() !== "admin";
  const lastAccessMeta = locationLabel
    ? `<span class="access-member-last-location" title="${escapeHtml(locationLabel)}">${escapeHtml(locationLabel)}</span>`
    : "";

  return `
    <tr>
      <td>
        <div class="access-member-ident">
          <div class="avatar av-pink">${getInitials(user.name)}</div>
          <div class="cell-stack">
            <strong class="cell-title" title="${escapeHtml(user.name)}">${escapeHtml(user.name)}</strong>
            <span class="cell-sub" title="${escapeHtml(user.email)}">${escapeHtml(user.email)}</span>
          </div>
        </div>
      </td>
      <td class="hide-mobile"><span class="sb-role-badge ${getRoleBadgeClass(user.role)}">${ROLE_LABELS[user.role] || user.role}</span></td>
      <td>
        <span class="access-member-presence ${presence.tone}">
          <span class="access-member-presence-dot" aria-hidden="true"></span>
          <span>${escapeHtml(presence.label)}</span>
        </span>
      </td>
      <td class="hide-tablet">
        <div class="access-member-last-access">
          <span class="access-member-last-time" title="${escapeHtml(lastAccessLabel)}">${escapeHtml(lastAccessLabel)}</span>
          ${lastAccessMeta}
        </div>
      </td>
      <td class="cell-actions" data-align="right">
        <div class="access-member-actions">
          <button class="btn btn-outline btn-sm" type="button" data-access-edit="${user.id}">Editar</button>
          ${canRemoveUser
            ? renderActionMenu(
                [
                  `<button class="access-remove-link" type="button" data-access-remove="${user.id}">Remover membro</button>`
                ],
                { label: "Mais ações do membro" }
              )
            : ""}
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

function formatPhoneDisplay(value) {
  const normalized = String(value || "").trim();
  return normalized;
}

function normalizeProfileNotificationPreferences(preferences = {}) {
  return {
    task_assigned: preferences.task_assigned !== false,
    task_completed: preferences.task_completed !== false,
    calendar_24h: preferences.calendar_24h !== false,
    finance_overdue: preferences.finance_overdue !== false,
  };
}

function renderProfileAvatar(profile) {
  const avatarUrl = String(profile?.avatar_url || "").trim();
  const fallback = `<div class="profile-avatar-fallback">${escapeHtml(getInitials(profile?.name || "ONE"))}</div>`;

  if (!avatarUrl) {
    return fallback;
  }

  if (state.profileAvatarAsset.source === avatarUrl && state.profileAvatarAsset.url) {
    return `<img class="profile-avatar-image" src="${escapeHtml(state.profileAvatarAsset.url)}" alt="${escapeHtml(profile?.name || "Foto do perfil")}" loading="lazy" referrerpolicy="no-referrer">`;
  }

  if (isProtectedAssetUrl(avatarUrl)) {
    if (!state.profileAvatarAsset.loading || state.profileAvatarAsset.source !== avatarUrl) {
      window.setTimeout(() => {
        ensureProfileAvatarAsset({ silent: true }).catch(() => {});
      }, 0);
    }
    return fallback;
  }

  return `<img class="profile-avatar-image" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(profile?.name || "Foto do perfil")}" loading="lazy" referrerpolicy="no-referrer">`;
}

function renderUserAvatar(user, className = "avatar av-pink") {
  const safeClassName = escapeHtml(className);
  const fallback = `<div class="${safeClassName}">${escapeHtml(getInitials(user?.name || "ONE"))}</div>`;
  const avatarUrl = String(user?.avatar_url || "").trim();

  if (!avatarUrl) {
    return fallback;
  }

  const isCurrentUser = Number(user?.id) === Number(state.session?.user?.id);

  if (isCurrentUser && state.profileAvatarAsset.source === avatarUrl && state.profileAvatarAsset.url) {
    return `<img class="${safeClassName} avatar-photo" src="${escapeHtml(state.profileAvatarAsset.url)}" alt="${escapeHtml(user?.name || "Foto do membro")}" loading="lazy" referrerpolicy="no-referrer">`;
  }

  if (!isProtectedAssetUrl(avatarUrl)) {
    return `<img class="${safeClassName} avatar-photo" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(user?.name || "Foto do membro")}" loading="lazy" referrerpolicy="no-referrer">`;
  }

  if (isCurrentUser && (!state.profileAvatarAsset.loading || state.profileAvatarAsset.source !== avatarUrl)) {
    window.setTimeout(() => {
      ensureProfileAvatarAsset({ silent: true }).catch(() => {});
    }, 0);
  }

  return fallback;
}

function getProfileModuleLabels(role) {
  return (PAGE_ACCESS[role] || [])
    .map((page) => PAGE_LABELS[page])
    .filter(Boolean);
}

function getProfileCapabilityLabels(role) {
  return Object.entries(ROLE_DATA_ACCESS[role] || {})
    .filter(([, allowed]) => Boolean(allowed))
    .map(([key]) => PROFILE_CAPABILITY_LABELS[key] || key)
    .filter(Boolean);
}

function getProfileScreenCapabilityLabels(role) {
  const access = ROLE_DATA_ACCESS[role] || {};
  const labels = [];

  if (access.manageTasks) {
    labels.push("Criar e editar tarefas");
  }
  if (access.manageClients) {
    labels.push("Gerenciar clientes");
  }
  if (access.homeFinancial) {
    labels.push("Ver financeiro na visão geral");
  }
  if (access.costs || access.invoices || access.charges) {
    labels.push("Visualizar custos e faturas");
  }
  if (access.users) {
    labels.push("Gerenciar membros do time");
  }
  if (access.metrics || access.reports || access.integrations) {
    labels.push("Acesso total às métricas");
  }

  return labels;
}

function renderProfileSummaryCard(profile) {
  const jobTitle = String(profile.job_title || ROLE_LABELS[profile.role] || "Membro").trim();
  const clientLabel = profile.client_name || profile.client_company || "Equipe Interna";
  const emailLabel = String(profile.email || "").trim() || "—";
  const emailStatusLabel = profile.email_verified_at ? "Verificado" : "Pendente";
  const lastAccessLabel = profile.last_seen_at || profile.last_login_at ? formatDateTime(profile.last_seen_at || profile.last_login_at) : "—";
  const locationLabel = formatAccessLocationLabel(profile.last_seen_location) || "—";
  const phoneLabel = formatPhoneDisplay(profile.phone) || "—";

  return `
    <div class="flex items-center gap-4 mb-10">
      <div class="profile-avatar">${renderProfileAvatar(profile)}</div>
      <div class="flex flex-col justify-center min-w-0">
        <h2 class="text-[16px] font-bold ink-black leading-none mb-1">${escapeHtml(profile.name || "Usuário interno")}</h2>
        <p class="text-[14px] ash-gray font-medium leading-none">${escapeHtml(jobTitle)}</p>
      </div>
    </div>

    <div class="space-y-5">
      <div class="border-b border-[#dddddd] pb-4">
        <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Localização</p>
        <p class="text-[15px] font-medium ink-black">${escapeHtml(locationLabel)}</p>
      </div>

      <div class="border-b border-[#dddddd] pb-4">
        <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">E-mail de acesso</p>
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-[15px] font-medium ink-black">${escapeHtml(emailLabel)}</p>
          <span class="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest">${escapeHtml(emailStatusLabel)}</span>
        </div>
      </div>

      <div class="border-b border-[#dddddd] pb-4">
        <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Telefone</p>
        <p class="text-[15px] font-medium ink-black">${escapeHtml(phoneLabel)}</p>
      </div>

      <div class="border-b border-[#dddddd] pb-4">
        <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Vínculo</p>
        <p class="text-[15px] font-medium ink-black">${escapeHtml(clientLabel)}</p>
      </div>

      <div class="pb-2">
        <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Último Acesso</p>
        <p class="text-[15px] font-medium ink-black">${escapeHtml(lastAccessLabel)}</p>
      </div>
    </div>

    <div class="pt-8 mt-6 border-t border-[#dddddd] flex gap-3">
      <button type="button" class="flex-1 py-3 text-[14px] font-semibold ink-black bg-white hairline-border rounded-[8px] hover:bg-gray-50 transition-colors" data-action="open-modal" data-modal="editar-perfil">
        Editar perfil
      </button>
      <button type="button" class="flex-1 py-3 text-[14px] font-semibold ink-black bg-white hairline-border rounded-[8px] hover:bg-gray-50 transition-colors" data-action="open-modal" data-modal="alterar-senha">
        Alterar senha
      </button>
    </div>
  `;
}

function renderProfilePermissionsCard(profile) {
  const modules = getProfileModuleLabels(profile.role);
  const capabilities = getProfileScreenCapabilityLabels(profile.role);
  const statusLabel = PROFILE_ACCESS_STATUS_LABELS[profile.role] || ROLE_LABELS[profile.role] || "Membro";

  return `
    <div class="mb-8">
      <h3 class="text-[21px] font-bold ink-black">Permissões de Acesso</h3>
      <p class="text-[14px] font-medium ash-gray mt-1">Status: <span class="text-green-600 font-semibold">${escapeHtml(statusLabel)}</span></p>
    </div>

    <div class="mb-8">
      <p class="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-4">Módulos Disponíveis</p>
      <div class="flex flex-wrap gap-2">
        ${modules.map((label) => `<span class="px-3 py-1.5 bg-[#f2f2f2] text-[#222222] text-[13px] font-medium rounded-full">${escapeHtml(label)}</span>`).join("")}
      </div>
    </div>

    <div>
      <p class="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-4">Ações Liberadas${capabilities.length >= 6 ? " (Acesso Completo)" : ""}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
        ${capabilities.map((label) => `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span class="text-[14px] font-medium ink-black">${escapeHtml(label)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderProfileNotificationCard(profile) {
  const preferences = normalizeProfileNotificationPreferences(profile.notification_preferences);
  const isDarkTheme = getStoredPanelTheme() === "dark";

  return `
    <div class="mb-6">
      <h3 class="text-[21px] font-bold ink-black">Preferências de Notificação</h3>
      <p class="text-[14px] font-medium ash-gray mt-1">Gerencie os alertas que chegam no seu sino interno e e-mail.</p>
    </div>

    <div class="space-y-0">
      ${PROFILE_NOTIFICATION_PREFERENCE_OPTIONS.map((option, index) => `
        <div class="flex items-center justify-between py-5${index < PROFILE_NOTIFICATION_PREFERENCE_OPTIONS.length - 1 ? " border-b border-[#dddddd]" : ""}">
          <div class="pr-4">
            <h4 class="text-[15px] font-semibold ink-black mb-1">${escapeHtml(option.label)}</h4>
            <p class="text-[13px] font-medium ash-gray">${escapeHtml(option.description)}</p>
          </div>
          <div class="relative inline-block w-11 h-6 align-middle select-none transition duration-200 ease-in flex-shrink-0">
            <input type="checkbox" name="${escapeHtml(option.key)}" id="${escapeHtml(option.inputId)}" class="profile-notification-toggle toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-[#dddddd] appearance-none cursor-pointer" ${preferences[option.key] ? "checked" : ""}/>
            <label for="${escapeHtml(option.inputId)}" class="toggle-label block overflow-hidden h-6 rounded-full bg-[#dddddd] cursor-pointer"></label>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="mt-8 pt-6 border-t border-[#dddddd]">
      <div class="flex items-center justify-between py-1">
        <div class="pr-4">
          <h4 class="text-[15px] font-semibold ink-black mb-1">Modo escuro do painel</h4>
          <p class="text-[13px] font-medium ash-gray">Ative o visual escuro em todas as telas internas.</p>
        </div>
        <div class="relative inline-block w-11 h-6 align-middle select-none transition duration-200 ease-in flex-shrink-0">
          <input type="checkbox" id="toggle-theme-profile" class="profile-theme-toggle toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-[#dddddd] appearance-none cursor-pointer" ${isDarkTheme ? "checked" : ""}/>
          <label for="toggle-theme-profile" class="toggle-label block overflow-hidden h-6 rounded-full bg-[#dddddd] cursor-pointer"></label>
        </div>
      </div>
    </div>
  `;
}

function bindProfileNotificationToggleHandlers() {
  const root = document.getElementById("page-perfil");
  if (!root) {
    return;
  }

  root.querySelectorAll(".profile-notification-toggle").forEach((toggle) => {
    if (toggle.dataset.bound === "true") {
      return;
    }

    toggle.dataset.bound = "true";
    toggle.addEventListener("change", async () => {
      const payload = Object.fromEntries(
        PROFILE_NOTIFICATION_PREFERENCE_OPTIONS.map((option) => [option.key, root.querySelector(`[name="${option.key}"]`)?.checked === true])
      );
      await persistProfileNotificationPreferences(payload, { silentSuccess: true });
    });
  });
}

function bindProfileThemeToggleHandlers() {
  const root = document.getElementById("page-perfil");
  if (!root) {
    return;
  }

  root.querySelectorAll(".profile-theme-toggle").forEach((toggle) => {
    if (toggle.dataset.bound === "true") {
      return;
    }

    toggle.dataset.bound = "true";
    toggle.addEventListener("change", () => {
      setPanelTheme(toggle.checked);
    });
  });
}

function renderProfileSecurityCard(profile) {
  const items = [
    {
      title: "Status da conta",
      value: profile.is_active === false ? "Inativa" : "Ativa",
      meta: profile.is_online ? "Há atividade recente no painel." : "",
    },
    {
      title: "Último acesso confirmado",
      value: profile.last_seen_at || profile.last_login_at ? formatDateTime(profile.last_seen_at || profile.last_login_at) : "—",
      meta: formatAccessLocationLabel(profile.last_seen_location),
    },
    {
      title: "E-mail de acesso",
      value: profile.email || "—",
      meta: profile.email_verified_at ? "Endereço verificado." : "Verificação pendente.",
    },
  ];

  return `
    <div class="section-header">
      <div>
        <div class="section-title">Acesso e segurança</div>
        <div class="section-sub">Estado atual da sua conta e do seu acesso.</div>
      </div>
    </div>
    <div class="profile-security-list">
      ${items
        .map(
          (item) => `
            <div class="profile-security-item">
              <div class="profile-security-head">
                <strong class="profile-security-title">${escapeHtml(item.title)}</strong>
                <span class="profile-security-meta">${escapeHtml(item.value)}</span>
              </div>
              ${item.meta ? `<div class="profile-security-meta">${escapeHtml(item.meta)}</div>` : ""}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function isMeaningfulProfileActivity(item) {
  if (!item) {
    return false;
  }

  const text = `${item.title || ""} ${item.body || ""}`.toLowerCase();
  return !PROFILE_ACTIVITY_PLACEHOLDERS.some((placeholder) => text.includes(placeholder));
}

function renderProfileActivityCard() {
  const container = document.getElementById("profile-activity-card");
  if (!container) {
    return;
  }

  const items = sortNotifications(state.notifications).filter(isMeaningfulProfileActivity).slice(0, 4);
  const secondaryGrid = container.parentElement;
  if (secondaryGrid) {
    secondaryGrid.classList.toggle("is-single-column", items.length === 0);
  }
  container.style.display = items.length === 0 ? "none" : "";
  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Últimas notificações</div>
        <div class="section-sub">Atualizações recentes do seu painel interno.</div>
      </div>
    </div>
    ${
      items.length
        ? `<div class="profile-activity-list">
            ${items
              .map(
                (item) => `
                  <article class="profile-activity-item">
                    <div class="profile-activity-head">
                      <strong class="profile-activity-title">${escapeHtml(item.title || "Nova notificação")}</strong>
                      <span class="profile-activity-meta">${escapeHtml(formatNotificationTime(item.created_at))}</span>
                    </div>
                    ${item.body ? `<div class="profile-activity-body">${escapeHtml(item.body)}</div>` : ""}
                  </article>
                `
              )
              .join("")}
          </div>`
        : ""
    }
  `;
  bindLegacyInlineHandlers(container);
}

function renderProfile() {
  const summaryCard = document.getElementById("profile-summary-card");
  const permissionsCard = document.getElementById("profile-permissions-card");
  const notificationCard = document.getElementById("profile-notification-card");
  if (!summaryCard || !permissionsCard || !notificationCard || !state.session?.user) {
    return;
  }

  if (state.profileLoading) {
    summaryCard.innerHTML = `
      <div class="flex items-center gap-4 mb-10">
        <div class="profile-avatar"><div class="profile-avatar-fallback">○</div></div>
        <div class="flex-1">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width:52%;margin-top:8px"></div>
        </div>
      </div>
    `;
    permissionsCard.innerHTML = UI.empty("Carregando permissões...", "", { icon: false, className: "profile-plain-empty is-plain" });
    notificationCard.innerHTML = UI.empty("Carregando preferências...", "", { icon: false, className: "profile-plain-empty is-plain" });
    return;
  }

  const profile = state.profile || state.session.user;
  summaryCard.innerHTML = renderProfileSummaryCard(profile);
  permissionsCard.innerHTML = renderProfilePermissionsCard(profile);
  notificationCard.innerHTML = renderProfileNotificationCard(profile);
  bindProfileNotificationToggleHandlers();
  bindProfileThemeToggleHandlers();
  syncPanelTheme();
  bindLegacyInlineHandlers(document.getElementById("page-perfil"));
}

async function loadMyProfile({ force = false, silent = false } = {}) {
  if (!state.session?.user?.id) {
    return null;
  }

  if (state.profile && !force) {
    renderProfile();
    return state.profile;
  }

  state.profileLoading = true;
  renderProfile();

  try {
    const response = await apiFetch("/users/me/profile", { cache: "no-store" });
    const profile = response?.user || response;
    syncCurrentUserProfile(profile);
    await ensureProfileAvatarAsset({ force, silent: true });
    return state.profile;
  } catch (error) {
    if (!silent) {
      showToast(error.message || "Não foi possível carregar seu perfil agora.");
    }
    return null;
  } finally {
    state.profileLoading = false;
    renderProfile();
  }
}

async function persistProfileNotificationPreferences(payload, { silentSuccess = false } = {}) {
  try {
    const response = await apiFetch("/users/me/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    syncCurrentUserProfile({
      id: state.session.user.id,
      notification_preferences: response.preferences || payload
    });
    renderProfile();
    if (!silentSuccess) {
      showToast(response.message || "Preferências atualizadas com sucesso.");
    }
    return response.preferences || payload;
  } catch (error) {
    renderProfile();
    showToast(error.message || "Não foi possível salvar suas preferências.");
    throw error;
  }
}

async function saveProfileNotificationPreferences(event) {
  event.preventDefault();
  const form = event.target;
  const payload = Object.fromEntries(
    PROFILE_NOTIFICATION_PREFERENCE_OPTIONS.map((option) => [option.key, form.elements[option.key]?.checked === true])
  );

  await persistProfileNotificationPreferences(payload);
}

function setRoleUI(user) {
  document.getElementById("sb-name").textContent = user.name;
  document.getElementById("sb-role-label").textContent =
    user.job_title || ROLE_LABELS[user.role] || user.role || "Software Engineer";
  const badge = document.getElementById("sb-badge");
  badge.textContent = ROLE_LABELS[user.role] || user.role;
  badge.className = `sb-role-badge ${getRoleBadgeClass(user.role)}`;

  const kanbanUserName = document.getElementById("kanban-shell-user-name");
  const kanbanUserRole = document.getElementById("kanban-shell-user-role");
  if (kanbanUserName) {
    kanbanUserName.textContent = user.name || "Ricardo Ribeiro";
  }
  if (kanbanUserRole) {
    kanbanUserRole.textContent = user.job_title || ROLE_LABELS[user.role] || user.role || "Software Engineer";
  }
}

function getStoredPanelTheme() {
  const storedTheme = localStorage.getItem(PANEL_THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_PANEL_THEME_STORAGE_KEY);
  return storedTheme === "dark" ? "dark" : "light";
}

function persistPanelTheme(theme) {
  localStorage.setItem(PANEL_THEME_STORAGE_KEY, theme);
  localStorage.removeItem(LEGACY_PANEL_THEME_STORAGE_KEY);
}

function syncPanelTheme() {
  const kanbanPage = document.getElementById("page-kanban");
  const kanbanRoot = document.getElementById("kanban-exact-root");
  const isDark = getStoredPanelTheme() === "dark";

  document.body.classList.toggle("panel-dark-theme", isDark);
  document.body.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("dark", isDark);

  if (kanbanPage) {
    kanbanPage.classList.toggle("dark", isDark);
  }
  if (kanbanRoot) {
    kanbanRoot.classList.toggle("dark", isDark);
  }

  document.querySelectorAll(".profile-theme-toggle").forEach((toggle) => {
    toggle.checked = isDark;
  });
}

function setPanelTheme(enabled) {
  persistPanelTheme(enabled ? "dark" : "light");
  syncPanelTheme();
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
  document.body.dataset.activePage = state.activePage;

  document.querySelectorAll(".sb-link").forEach((link) => {
    const page = link.dataset.page;
    link.style.display = allowed.includes(page) ? "flex" : "none";
    link.classList.toggle("active", page === state.activePage);
  });

  document.querySelectorAll(".mobile-tab-link").forEach((link) => {
    const page = link.dataset.page;
    const isAllowed = allowed.includes(page);
    link.style.display = isAllowed ? "inline-flex" : "none";
    link.classList.toggle("active", page === state.activePage);
  });

  const mobileTabbar = document.querySelector(".mobile-tabbar");
  if (mobileTabbar) {
    const visibleCount = Array.from(mobileTabbar.querySelectorAll(".mobile-tab-link")).filter(
      (link) => link.style.display !== "none"
    ).length;
    mobileTabbar.style.gridTemplateColumns = visibleCount
      ? `repeat(${visibleCount}, minmax(0, 1fr))`
      : "";
  }

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

  ensureNotificationUi();
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
  if (page === "perfil") {
    loadMyProfile({ silent: true }).catch(() => {});
  }
  if (page === "calendario") {
    loadCalendarEvents(state.calendar.weekStart || new Date(), { silent: true }).catch(() => {});
  }
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
    container.innerHTML = UI.empty("Sem dados no período", "", { icon: false });
    return;
  }

  const max = Math.max(...values, 1);
  const hasAnyValue = values.some((value) => Number(value || 0) > 0);
  const peak = hasAnyValue ? Math.max(...values.map((value) => Number(value || 0)), 0) : 0;
  container.innerHTML = values
    .map(
      (value, index) => `
        <div class="bar-item${peak > 0 && Number(value || 0) === peak ? " is-peak" : ""}">
          <div class="bar-meta">
            <div class="bar-label">${escapeHtml(labels[index])}</div>
            <div class="bar-val">${escapeHtml(formatter(value))}</div>
          </div>
          <div class="bar-track">
            <div class="bar-fill${hasAnyValue ? "" : " is-zero"}" style="width:${hasAnyValue ? ((value / max) * 100).toFixed(1) : 100}%"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderHomeQuickActions() {
  const container = document.getElementById("home-quick-actions");
  if (!container) {
    return;
  }

  const actions = [];
  if (canManageClients()) {
    actions.push(`<button class="btn btn-outline btn-sm" data-action="open-modal" data-modal="novo-cliente">+ Novo cliente</button>`);
  }
  if (hasRoleDataAccess("contacts")) {
    actions.push(`<button class="btn btn-pink btn-sm" data-action="open-modal" data-modal="novo-lead">+ Novo lead</button>`);
  }
  if (canManageCalendarEvents()) {
    actions.push(`<button class="btn btn-outline btn-sm" data-action="open-modal" data-modal="novo-evento">+ Novo evento</button>`);
  }

  container.innerHTML = actions.join("");
  container.style.display = actions.length ? "flex" : "none";
}

function renderHome() {
  const grid = document.querySelector("#page-home .kpi-grid");
  if (grid && state.dashboard) {
    const openTasks = state.tasks.filter((task) => normalizeTaskStatusLabel(task.status) !== "Concluido").length;
    const activeCampaignCount = getActiveCampaigns().length;
    const campaignClientCount = new Set(state.campaigns.map((campaign) => Number(campaign.client_id || 0)).filter(Boolean)).size;
    const scopedClientsCount = hasRoleDataAccess("clients") && state.clients.length
      ? state.clients.length
      : Number(state.dashboard.summary.clients_count || 0);
    const homeCards = [
      {
        label: "Clientes Ativos",
        value: scopedClientsCount,
        sub: hasRoleDataAccess("clients") ? `${scopedClientsCount} cadastrados` : "escopo atual do perfil",
        page: "crm",
        tabGroup: "crm",
        tab: "clientes"
      },
      {
        label: "Campanhas",
        value: Number(state.dashboard.summary.campaigns_count || activeCampaignCount),
        sub: activeCampaignCount
          ? `${formatNumber(campaignClientCount)} ${campaignClientCount === 1 ? "cliente em mídia" : "clientes em mídia"}`
          : "Nenhuma campanha em andamento",
        page: "campanhas"
      }
    ];

    if (hasRoleDataAccess("contacts")) {
      homeCards.push({
        label: "Leads",
        value: state.dashboard.summary.leads,
        sub: state.contacts.length ? `${state.contacts.length} contatos capturados` : "Nenhum lead capturado",
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
        sub: state.invoices.length ? `${state.invoices.length} faturas no sistema` : "Sem faturas lançadas",
        page: "financeiro",
        valueClass: " is-currency"
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
            <div class="kpi-label">${escapeHtml(item.label)}</div>
            <div class="kpi-val${item.valueClass || ""}">${escapeHtml(item.label === "Faturamento" ? item.value : formatNumber(item.value))}</div>
            <div class="kpi-sub">${escapeHtml(item.sub)}</div>
          </button>
        `
      )
      .join("");
    bindHomeCardInteractions(grid);
  }

  renderHomeQuickActions();

  const topCards = document.querySelectorAll("#page-home .two-col .card");
  if (topCards[0]) {
    const urgentTasks = state.tasks
      .filter((task) => normalizeTaskStatusLabel(task.status) !== "Concluido")
      .slice(0, 4)
      .map(
        (task) => `
          <div class="item-row">
            <div>
              <div class="block-title-sm">${escapeHtml(task.title)}</div>
              <div class="block-text-xs">${escapeHtml(task.client_name || "Interno")} · ${formatDate(task.due_date || task.deadline)}</div>
            </div>
            <span class="badge ${getTaskStatusBadgeClass(task.status)}">${escapeHtml(getTaskStatusDisplayLabel(task))}</span>
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
      const revenueSeries = getFinancialRevenueSeries(6);
      topCards[1].innerHTML = `
        <div class="section-header"><div><div class="section-title">Faturamento — Últimos 6 meses</div></div></div>
        <div class="chart-bar-wrap" id="home-chart"></div>
      `;
      renderBarChart(
        "home-chart",
        revenueSeries.values,
        revenueSeries.labels,
        (value) => formatCurrencyValue(value)
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
        <div class="section-header"><div class="section-title">Pipeline resumido</div><button class="btn btn-ghost btn-sm btn-link-arrow" data-action="go-to" data-page="crm">Ver CRM <span>→</span></button></div>
        ${stages
          .map((stage) => {
            const stageContacts = state.contacts.filter((contact) => normalizePipelineStage(contact.lead_stage) === stage);
            const totalValue = stageContacts.reduce((acc, contact) => acc + Number(contact.estimated_value || 0), 0);
            const isEmpty = stageContacts.length === 0;
            return `
              <div class="inline-metrics ${isEmpty ? "inline-metrics-empty" : ""}">
                <span class="inline-metrics-label">${stage}</span>
                <div class="inline-metrics-meta"><span class="inline-metrics-count">${formatLeadCount(stageContacts.length)}</span><span class="inline-metrics-value">${formatCurrency(totalValue)}</span></div>
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
                <div class="block-title-sm">${escapeHtml(item.title)}</div>
                <div class="block-text-xs">${escapeHtml(item.client_name || "Operação interna")}</div>
              </div>
              <span class="badge ${item.status === "Aprovado" ? "badge-green" : item.status === "Revisao" ? "badge-yellow" : "badge-gray"}">${escapeHtml(item.report_month ? "Relatório" : normalizeMaterialStatus(item.status || "Pendente"))}</span>
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
                  ${renderUserAvatar(user)}
                  <div class="team-member-info">
                    <div class="team-member-name">${escapeHtml(user.name)}</div>
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
                <div class="block-title-sm">${escapeHtml(file.original_name)}</div>
                <div class="block-text-xs">${escapeHtml(file.client_name || "Interno")} · ${Math.round((file.size || 0) / 1024)} KB</div>
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
                <div class="block-title-sm">${escapeHtml(metric.campaign_name)}</div>
                <div class="block-text-xs">${escapeHtml(metric.client_name)} · ${formatDate(metric.period)}</div>
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
                <div class="block-title-sm">${escapeHtml(report.title)}</div>
                <div class="block-text-xs">${escapeHtml(report.client_name)} · ${formatDate(report.report_month)}</div>
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
  if (!label || isChecklistPlaceholderLabel(label)) {
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

async function clearChecklistHistory() {
  if (!window.confirm("Limpar todo o histórico concluído do checklist?")) {
    return;
  }

  const currentStore = getChecklistStore();
  state.checklist = {
    ...currentStore,
    history: []
  };
  renderKanban();

  try {
    const snapshot = await apiFetch("/checklists/daily/history", {
      method: "DELETE",
      cache: "no-store",
    });
    state.checklist = normalizeChecklistSnapshot(snapshot);
    renderKanban();
    showToast("Histórico do checklist limpo.");
  } catch (error) {
    state.checklist = currentStore;
    renderKanban();
    showToast(error.message);
  }
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
  const scopedTasks = filteredTasks.filter((task) => {
    const assigneeIds = getTaskAssigneeIds(task);
    return !assigneeIds.length || assigneeIds.includes(currentUserId);
  });
  const source = scopedTasks.length ? scopedTasks : filteredTasks;

  return source
    .filter((task) => normalizeDateKey(task.due_date || task.deadline))
    .filter((task) => {
      const dateKey = normalizeDateKey(task.due_date || task.deadline);
      const todayKey = new Date().toISOString().slice(0, 10);
      return dateKey <= todayKey && normalizeTaskStatusLabel(task.status) !== "Concluido";
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
    const historyToggle = event.target.closest("[data-checklist-history-toggle]");
    if (historyToggle) {
      event.preventDefault();
      const panel = container.querySelector("[data-checklist-history-panel]");
      if (!panel) {
        return;
      }

      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      historyToggle.setAttribute("aria-expanded", String(willOpen));
      historyToggle.textContent = willOpen ? "Ocultar histórico" : "Ver histórico";
      return;
    }

    const clearHistoryButton = event.target.closest("[data-checklist-clear-history]");
    if (clearHistoryButton) {
      event.preventDefault();
      await clearChecklistHistory();
      return;
    }

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
  const form = document.getElementById("kanban-focus-form");
  const input = document.getElementById("kanban-focus-input");
  const overdueContainer = document.getElementById("kanban-exact-overdue");

  if (!form || !input || !overdueContainer) {
    return;
  }

  if (form.dataset.boundChecklist !== "1") {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const nextLabel = String(input.value || "").trim();
      if (!nextLabel) {
        showToast("Digite um item para adicionar ao checklist.");
        input.focus();
        return;
      }

      try {
        const currentStore = getChecklistStore();
        await persistChecklistItems([...currentStore.activeItems, createChecklistItem(nextLabel)]);
        input.value = "";
        renderKanban();
        showToast("Item adicionado ao foco do dia.");
      } catch (error) {
        showToast(error.message);
      }
    });

    form.dataset.boundChecklist = "1";
  }

  const dueTasks = getKanbanTasksForToday(filteredTasks);
  const overdueTasks = dueTasks.filter((task) => isOverdueDate(task.due_date || task.deadline));
  const dueSummaryTask = overdueTasks[0] || dueTasks[0] || null;
  const summaryCount = overdueTasks.length || (dueSummaryTask ? 1 : 0);
  const summaryPrefix = overdueTasks.length
    ? "Tarefa atrasada:"
    : dueSummaryTask
      ? "Acompanhamento:"
      : "Tudo em dia:";
  const summaryTitle = dueSummaryTask ? dueSummaryTask.title : "Sem tarefas atrasadas no momento.";
  const reviewButtonHtml = dueSummaryTask && canManageTasks()
    ? `<button type="button" data-action="open-modal" data-modal="nova-tarefa" data-id="${dueSummaryTask.id}" class="text-[12px] font-bold text-red-700 dark:text-red-400 hover:underline">Revisar</button>`
    : '<button type="button" class="text-[12px] font-bold text-red-700 dark:text-red-400 hover:underline invisible">Revisar</button>';

  overdueContainer.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold">${summaryCount}</span>
      <p class="text-[13px] font-medium text-red-700 dark:text-red-400${dueSummaryTask ? "" : " kanban-exact-overdue-empty"}">${summaryPrefix} <span class="font-bold">${escapeHtml(summaryTitle)}</span></p>
    </div>
    ${reviewButtonHtml}
  `;
}

function resolveKanbanClient(filteredTasks) {
  const selectedClientId = state.filters.kanbanClient;
  if (selectedClientId) {
    return state.clients.find((client) => String(client.id) === String(selectedClientId)) || null;
  }

  return null;
}

function renderKanbanBrandManual(filteredTasks) {
  const container = document.getElementById("kanban-brand-manual");
  if (!container) {
    return;
  }

  const manualCard = container.closest(".brand-manual-card");
  const topGrid = container.closest(".kanban-top-grid");
  const client = resolveKanbanClient(filteredTasks);
  if (!client) {
    if (manualCard) {
      manualCard.classList.add("is-hidden");
    }
    if (topGrid) {
      topGrid.classList.add("is-single-card");
    }
    container.innerHTML = "";
    return;
  }

  if (manualCard) {
    manualCard.classList.remove("is-hidden");
  }
  if (topGrid) {
    topGrid.classList.remove("is-single-card");
  }

  const brandManual = String(client.brand_manual || "").trim();
  const contactBits = [client.company || null, client.contact_name || null].filter(Boolean).join(" · ");

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">${escapeHtml(client.name || "Cliente")}</div>
        <div class="section-sub">${escapeHtml(contactBits || "Manual operacional da marca")}</div>
      </div>
      ${canManageClients() ? `<button type="button" class="btn btn-outline btn-sm" data-action="open-modal" data-modal="novo-cliente" data-id="${client.id}">Editar</button>` : ""}
    </div>
    ${
      brandManual
        ? `<div class="muted-panel">${escapeHtmlWithBreaks(brandManual)}</div>`
        : UI.empty(
            "Adicione o manual da marca",
            "Centralize tom de voz, referências e orientações práticas da conta neste bloco.",
            {
              icon: false,
              className: "is-plain",
              actionHtml: canManageClients()
                ? `<button type="button" class="btn btn-pink btn-sm empty-state-action" data-action="open-modal" data-modal="novo-cliente" data-id="${client.id}">Editar cliente</button>`
                : ""
            }
      )
    }
  `;
}

function getKanbanCardMenuButton(task, canEditTasks) {
  if (!canEditTasks) {
    return `
      <button type="button" class="text-gray-400 hover:text-[#222222] dark:hover:text-white" tabindex="-1" aria-hidden="true">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/></svg>
      </button>
    `;
  }

  return `
    <button type="button" data-action="open-modal" data-modal="nova-tarefa" data-id="${task.id}" class="text-gray-400 hover:text-[#222222] dark:hover:text-white">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/></svg>
    </button>
  `;
}

function getKanbanPrimaryAssigneeInitials(task) {
  const assigneeUsers = getTaskAssigneeUsers(task);
  const assigneeNames = assigneeUsers.length ? assigneeUsers.map((user) => user.name).filter(Boolean) : getTaskAssigneeNames(task);
  const fallbackName = state.session?.user?.name || "Ricardo Ribeiro";
  return getInitials(assigneeNames[0] || fallbackName) || "RR";
}

function getKanbanDeadlineChip(task) {
  const deadlineLabel = getTaskDeadlineLabel(task).split(" · ")[0];

  if (deadlineLabel === "Atrasada") {
    return '<span class="text-[11px] font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">Atrasada</span>';
  }
  if (deadlineLabel === "Hoje") {
    return '<span class="text-[11px] font-bold bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">Hoje</span>';
  }
  if (deadlineLabel === "Amanhã") {
    return '<span class="text-[11px] font-bold bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">Amanhã</span>';
  }

  return "";
}

function renderKanbanCard(task, columnKey, canEditTasks) {
  const cardBaseClass = columnKey === "done"
    ? "bg-white dark:bg-[#222222] border border-[#dddddd] dark:border-[#333333] rounded-[8px] p-4 shadow-sm cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
    : "bg-white dark:bg-[#222222] border border-[#dddddd] dark:border-[#333333] rounded-[8px] p-4 shadow-sm cursor-pointer hover:shadow-[rgba(0,0,0,0.06)_0_4px_12px] transition-shadow";
  const titleClass = columnKey === "done"
    ? "text-[14px] font-bold leading-tight mb-2 line-through text-[#6a6a6a] dark:text-gray-400"
    : "text-[14px] font-bold leading-tight mb-2";
  const descriptionHtml = task.description && columnKey !== "done"
    ? `<p class="text-[13px] font-medium text-[#6a6a6a] dark:text-gray-400 leading-relaxed">${escapeHtml(task.description)}</p>`
    : "";
  const cardBadge = getKanbanCardBadge(task);
  const badgeHtml = cardBadge
    ? `<span class="${cardBadge.className}" title="${escapeHtml(cardBadge.title || cardBadge.label)}">${escapeHtml(cardBadge.label)}</span>`
    : '<span class="text-[11px] font-bold px-2 py-0.5 rounded opacity-0">Info</span>';
  const footerHtml = `
    <div class="flex items-center justify-between mt-4 pt-4 border-t border-[#f2f2f2] dark:border-[#333333]">
      ${badgeHtml}
      ${renderKanbanAssigneeStack(task)}
    </div>
  `;

  return `
    <div class="k-card ${cardBaseClass}${canEditTasks ? " is-draggable" : ""}" data-task-card="1" data-task-id="${task.id}">
      <div class="flex justify-between items-start mb-2">
        <span class="text-[10px] font-bold text-[#6a6a6a] dark:text-gray-400 uppercase tracking-widest">${escapeHtml(task.client_name || "Interno")}</span>
        ${getKanbanCardMenuButton(task, canEditTasks)}
      </div>
      <h4 class="${titleClass}">${escapeHtml(task.title)}</h4>
      ${descriptionHtml}
      ${footerHtml}
    </div>
  `;
}

function renderKanban() {
  const columns = [
    { key: "backlog", label: "Backlog", dotClass: "bg-gray-300 dark:bg-gray-600" },
    { key: "todo", label: "A Fazer", dotClass: "bg-blue-400" },
    { key: "doing", label: "Em Progresso", dotClass: "bg-yellow-400" },
    { key: "done", label: "Concluído", dotClass: "bg-green-500" }
  ];
  const filtered = state.filters.kanbanClient
    ? state.tasks.filter((task) => String(task.client_id) === String(state.filters.kanbanClient))
    : state.tasks;
  const canEditTasks = canManageTasks();

  syncPanelTheme();
  renderKanbanChecklist(filtered);

  document.getElementById("kanban-board").innerHTML = columns
    .map((column) => {
      const tasks = filtered.filter((task) => getTaskColumnName(task) === column.key);
      return `
        <div class="w-[300px] flex-shrink-0 flex flex-col kanban-col" data-kanban-column="${column.key}" data-kanban-dropzone="${column.key}">
          <div class="flex justify-between items-center mb-4 px-1">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full ${column.dotClass}"></div>
              <h3 class="text-[11px] font-bold text-[#6a6a6a] dark:text-gray-400 uppercase tracking-widest">${column.label}</h3>
            </div>
            <span class="text-[11px] font-bold bg-[#f2f2f2] dark:bg-[#333333] text-[#6a6a6a] dark:text-gray-300 px-2 py-0.5 rounded-full">${tasks.length}</span>
          </div>
          <div class="kanban-exact-column-body flex flex-col gap-3 overflow-y-auto custom-scroll pr-1 pb-2" data-kanban-dropzone="${column.key}">
            ${
              tasks
                .map((task) => renderKanbanCard(task, column.key, canEditTasks))
                .join("")
                || `<div class="rounded-[8px] border border-dashed border-[#dddddd] dark:border-[#333333] px-4 py-6 text-[13px] font-medium text-[#6a6a6a] dark:text-gray-400 bg-transparent">Sem tarefas nesta etapa.</div>`
            }
            <div class="kanban-col-dropzone" data-kanban-dropzone="${column.key}" aria-hidden="true"></div>
          </div>
        </div>
      `;
    })
    .join("");

  bindKanbanBoardInteractions();
  bindLegacyInlineHandlers(document.getElementById("page-kanban"));
  setupKanbanScrollSync();
}

async function moveTaskToColumn(taskId, nextColumn) {
  const taskIndex = state.tasks.findIndex((item) => Number(item.id) === Number(taskId));
  const task = taskIndex >= 0 ? state.tasks[taskIndex] : null;
  const nextConfig = getTaskColumnConfig(nextColumn);

  if (!task || kanbanRuntime.movingTaskId === Number(taskId)) {
    return;
  }

  if (getTaskColumnName(task) === nextConfig.key && normalizeTaskStatusLabel(task.status) === nextConfig.status) {
    return;
  }

  kanbanRuntime.movingTaskId = Number(taskId);
  const previousTask = { ...task };
  state.tasks[taskIndex] = {
    ...task,
    column_name: nextConfig.key,
    status: nextConfig.status,
  };
  renderKanban();
  renderSidebarCounts();

  try {
    const updatedTask = await apiFetch(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({
        column_name: nextConfig.key,
        status: nextConfig.status,
      }),
    });

    if (updatedTask) {
      state.tasks[taskIndex] = {
        ...state.tasks[taskIndex],
        ...updatedTask,
      };
      renderKanban();
      renderSidebarCounts();
    }

    refreshNotifications({ silent: true, suppressErrors: true }).catch(() => {});
    showToast(`Tarefa movida para ${nextConfig.label}.`);
  } catch (error) {
    state.tasks[taskIndex] = previousTask;
    renderKanban();
    renderSidebarCounts();
    showToast(error.message);
  } finally {
    kanbanRuntime.movingTaskId = null;
  }
}

function clearKanbanDragArtifacts() {
  if (kanbanRuntime.dragSourceEl) {
    if (kanbanRuntime.dragPlaceholderEl?.parentElement) {
      kanbanRuntime.dragPlaceholderEl.replaceWith(kanbanRuntime.dragSourceEl);
    }
    kanbanRuntime.dragSourceEl.classList.remove("is-dragging", "is-drag-source", "is-pointer-dragging");
    kanbanRuntime.dragSourceEl.style.width = "";
    kanbanRuntime.dragSourceEl.style.height = "";
    kanbanRuntime.dragSourceEl.style.left = "";
    kanbanRuntime.dragSourceEl.style.top = "";
    kanbanRuntime.dragSourceEl.style.position = "";
    kanbanRuntime.dragSourceEl.style.zIndex = "";
    kanbanRuntime.dragSourceEl.style.pointerEvents = "";
    kanbanRuntime.dragSourceEl = null;
  }

  if (kanbanRuntime.dragPlaceholderEl) {
    kanbanRuntime.dragPlaceholderEl.remove();
    kanbanRuntime.dragPlaceholderEl = null;
  }

  kanbanRuntime.dragTaskId = null;
  kanbanRuntime.pointerId = null;
  kanbanRuntime.dragOffsetX = 0;
  kanbanRuntime.dragOffsetY = 0;
}

function resolveKanbanColumnFromPoint(board, clientX, clientY) {
  if (!board || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null;
  }

  const pointEl = document.elementFromPoint(clientX, clientY);
  const pointColumn = pointEl?.closest?.("[data-kanban-column]");
  if (pointColumn?.dataset?.kanbanColumn) {
    return pointColumn;
  }

  const columns = Array.from(board.querySelectorAll("[data-kanban-column]"));
  for (const column of columns) {
    const rect = column.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return column;
    }
  }

  return null;
}

function setupKanbanScrollSync() {
  const board = document.getElementById("kanban-board");
  const topScroll = document.getElementById("kanban-top-scroll");
  const topTrack = document.getElementById("kanban-top-scroll-track");

  if (!board || !topScroll || !topTrack) {
    return;
  }

  const syncWidths = () => {
    topTrack.style.width = `${Math.max(board.scrollWidth, board.clientWidth)}px`;
    topScroll.classList.toggle("is-hidden", board.scrollWidth <= board.clientWidth + 4);
    if (Math.abs(topScroll.scrollLeft - board.scrollLeft) > 1) {
      topScroll.scrollLeft = board.scrollLeft;
    }
  };

  if (!kanbanRuntime.scrollSyncBound) {
    let syncingFromTop = false;
    let syncingFromBoard = false;

    board.addEventListener("scroll", () => {
      if (syncingFromTop) {
        return;
      }
      syncingFromBoard = true;
      topScroll.scrollLeft = board.scrollLeft;
      syncingFromBoard = false;
    });

    topScroll.addEventListener("scroll", () => {
      if (syncingFromBoard) {
        return;
      }
      syncingFromTop = true;
      board.scrollLeft = topScroll.scrollLeft;
      syncingFromTop = false;
    });

    window.addEventListener("resize", () => window.requestAnimationFrame(syncWidths));
    kanbanRuntime.scrollSyncBound = true;
  }

  if ("ResizeObserver" in window) {
    if (!kanbanRuntime.scrollResizeObserver) {
      kanbanRuntime.scrollResizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(syncWidths);
      });
    }
    kanbanRuntime.scrollResizeObserver.disconnect();
    kanbanRuntime.scrollResizeObserver.observe(board);
  }

  window.requestAnimationFrame(syncWidths);
  window.setTimeout(syncWidths, 80);
}

function bindKanbanBoardInteractions() {
  const board = document.getElementById("kanban-board");
  if (!board) {
    clearKanbanDragArtifacts();
    return;
  }

  const clearDropTargets = () => {
    board.querySelectorAll("[data-kanban-column]").forEach((column) => column.classList.remove("is-drop-target"));
  };

  const placeKanbanPlaceholderInColumn = (column) => {
    if (!column || !kanbanRuntime.dragPlaceholderEl) {
      return;
    }

    const body = column.querySelector(".kanban-col-body");
    if (!body) {
      return;
    }

    if (kanbanRuntime.dragPlaceholderEl.parentElement !== body) {
      body.appendChild(kanbanRuntime.dragPlaceholderEl);
    }
  };

  const handlePointerMove = (event) => {
    if (!kanbanRuntime.dragTaskId || event.pointerId !== kanbanRuntime.pointerId || !kanbanRuntime.dragSourceEl) {
      return;
    }

    const left = Number(event.clientX || 0) - kanbanRuntime.dragOffsetX;
    const top = Number(event.clientY || 0) - kanbanRuntime.dragOffsetY;
    kanbanRuntime.dragSourceEl.style.left = `${left}px`;
    kanbanRuntime.dragSourceEl.style.top = `${top}px`;

    const column = resolveKanbanColumnFromPoint(board, Number(event.clientX), Number(event.clientY));
    clearDropTargets();
    if (column?.dataset?.kanbanColumn) {
      column.classList.add("is-drop-target");
      placeKanbanPlaceholderInColumn(column);
    }
  };

  const handlePointerUp = (event) => {
    if (!kanbanRuntime.dragTaskId || event.pointerId !== kanbanRuntime.pointerId) {
      return;
    }

    const column = resolveKanbanColumnFromPoint(board, Number(event.clientX), Number(event.clientY));
    const taskId = Number(kanbanRuntime.dragTaskId || 0);
    clearDropTargets();
    document.body.classList.remove("kanban-drag-active");
    document.removeEventListener("pointermove", handlePointerMove, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    document.removeEventListener("pointercancel", handlePointerUp, true);
    clearKanbanDragArtifacts();

    if (!taskId || !column?.dataset.kanbanColumn) {
      return;
    }

    void moveTaskToColumn(taskId, column.dataset.kanbanColumn);
  };

  board.querySelectorAll(".k-card.is-draggable[data-task-card='1']").forEach((card) => {
    if (card.dataset.boundKanbanDrag === "1") {
      return;
    }

    card.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      if (event.target?.closest?.("button, a, input, select, textarea, [data-action]")) {
        return;
      }

      const rect = card.getBoundingClientRect();
      const placeholder = document.createElement("div");
      placeholder.className = "k-card k-card-placeholder";
      placeholder.style.height = `${Math.ceil(rect.height)}px`;
      placeholder.style.width = "100%";
      placeholder.setAttribute("aria-hidden", "true");

      kanbanRuntime.dragTaskId = Number(card.dataset.taskId);
      kanbanRuntime.dragSourceEl = card;
      kanbanRuntime.dragPlaceholderEl = placeholder;
      kanbanRuntime.pointerId = event.pointerId;
      kanbanRuntime.dragOffsetX = Number(event.clientX) - rect.left;
      kanbanRuntime.dragOffsetY = Number(event.clientY) - rect.top;

      card.insertAdjacentElement("afterend", placeholder);
      card.classList.add("is-dragging", "is-pointer-dragging");
      card.style.width = `${Math.ceil(rect.width)}px`;
      card.style.height = `${Math.ceil(rect.height)}px`;
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.top}px`;
      card.style.position = "fixed";
      card.style.zIndex = "1200";
      card.style.pointerEvents = "none";
      document.body.appendChild(card);
      document.body.classList.add("kanban-drag-active");

      document.addEventListener("pointermove", handlePointerMove, true);
      document.addEventListener("pointerup", handlePointerUp, true);
      document.addEventListener("pointercancel", handlePointerUp, true);
      event.preventDefault();
    });

    card.dataset.boundKanbanDrag = "1";
  });
}

function renderCRM() {
  const crmKpiGrid = document.getElementById("crm-kpi-grid");
  const pipelineBoard = document.getElementById("pipeline-board");
  const clientsBody = document.getElementById("clientes-tbody");
  const historyBody = document.getElementById("historico-tbody");
  const newClientButton = document.getElementById("btn-new-client");
  const newLeadButton = document.getElementById("btn-new-lead-crm");
  const topbarSeparator = document.getElementById("crm-topbar-separator");
  const canEditClients = canManageClients();
  const canManageLeads = hasRoleDataAccess("contacts");

  if (newClientButton) {
    newClientButton.style.display = canEditClients ? "" : "none";
  }
  if (newLeadButton) {
    newLeadButton.style.display = canManageLeads ? "" : "none";
  }
  if (topbarSeparator) {
    topbarSeparator.style.display = canEditClients && canManageLeads ? "" : "none";
  }

  const closedContacts = state.contacts.filter((contact) => normalizePipelineStage(contact.lead_stage) === "Fechado");
  const activeContacts = state.contacts.filter((contact) => normalizePipelineStage(contact.lead_stage) !== "Fechado");
  const activePipelineValue = sumBy(activeContacts, (contact) => contact.estimated_value);
  const closedPipelineValue = sumBy(closedContacts, (contact) => contact.estimated_value);
  const conversionRate = state.contacts.length ? (closedContacts.length / state.contacts.length) * 100 : 0;
  const averageTicket = closedContacts.length ? closedPipelineValue / closedContacts.length : 0;
  const averageCycle = getAverageSalesCycleDays(closedContacts);

  if (crmKpiGrid) {
    const crmCards = [
      {
        label: "Total no Funil",
        value: formatNumber(activeContacts.length),
        sub: `${formatLeadCount(activeContacts.length)}`
      },
      {
        label: "Valor Potencial",
        value: formatCurrency(activePipelineValue),
        sub: "no pipeline",
        valueClass: " is-currency"
      },
      {
        label: "Taxa de Conversão",
        value: `${conversionRate.toFixed(2)}%`,
        sub: `${formatNumber(closedContacts.length)} ${closedContacts.length === 1 ? "conversão" : "conversões"}`
      },
      {
        label: "Ticket Médio",
        value: formatCurrency(averageTicket),
        sub: "por lead convertido",
        valueClass: " is-currency"
      }
    ];

    if (closedContacts.length) {
      crmCards.push({
        label: "Ciclo de Venda",
        value: `${formatNumber(averageCycle)}d`,
        sub: "em média"
      });
    }

    crmKpiGrid.innerHTML = crmCards
      .map(
        (item) => `
          <div class="crm-kpi-card">
            <div class="crm-kpi-label">${escapeHtml(item.label)}</div>
            <div class="crm-kpi-value${item.valueClass || ""}">${escapeHtml(item.value)}</div>
            <div class="crm-kpi-sub">${escapeHtml(item.sub)}</div>
          </div>
        `
      )
      .join("");
  }

  if (pipelineBoard) {
    const pipelineStages = ["Prospecção", "Contato feito", "Proposta", "Negociação", "Fechado"];
    pipelineBoard.innerHTML = pipelineStages
      .map((stage) => {
        const contacts = state.contacts.filter((contact) => normalizePipelineStage(contact.lead_stage) === stage);
        return `
          <div class="crm-pipeline-col">
            <div class="crm-pipeline-head">
              <h3 class="crm-pipeline-stage">${escapeHtml(stage)}</h3>
              <span class="crm-pipeline-count">${contacts.length}</span>
            </div>
            <div class="crm-pipeline-body">
              ${
                contacts.length
                  ? contacts
                      .map((contact) => {
                        const canConvert = normalizePipelineStage(contact.lead_stage) !== "Fechado";
                        const menuHtml = canManageLeads
                          ? renderActionMenu(
                              [
                                canConvert
                                  ? renderActionMenuButton({
                                      label: "Converter lead",
                                      action: "convert-lead",
                                      id: contact.id
                                    })
                                  : "",
                                renderActionMenuButton({
                                  label: "Excluir lead",
                                  action: "delete-lead",
                                  id: contact.id,
                                  className: "btn btn-danger-soft btn-sm"
                                })
                              ],
                              { label: "Mais ações do lead" }
                            )
                          : "";

                        return `
                          <div class="crm-pipeline-card">
                            <p class="crm-pipeline-name" title="${escapeHtml(contact.name || "Lead sem nome")}">${escapeHtml(contact.name || "Lead sem nome")}</p>
                            <p class="crm-pipeline-company" title="${escapeHtml(contact.company || "—")}">${escapeHtml(contact.company || "—")}</p>
                            <p class="crm-pipeline-value">${escapeHtml(formatCurrency(contact.estimated_value))}</p>
                            <div class="crm-pipeline-footer">
                              ${
                                canManageLeads
                                  ? `<button type="button" class="crm-text-action" data-action="open-modal" data-modal="novo-lead" data-id="${contact.id}">Editar</button>`
                                  : '<span class="crm-text-action">Lead</span>'
                              }
                              ${menuHtml}
                            </div>
                          </div>
                        `;
                      })
                      .join("")
                  : '<div class="crm-pipeline-empty">Sem leads nesta etapa.</div>'
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  if (clientsBody) {
    if (!state.clients.length) {
      clientsBody.innerHTML = `
        <tr>
          <td colspan="6" class="crm-empty-row">
            ${
              hasLoadFailure("clientes")
                ? UI.empty("Não foi possível carregar os clientes.", "Atualize a listagem para tentar novamente.", {
                    icon: false,
                    actionHtml: renderRetryAction()
                  })
                : UI.empty("Nenhum cliente cadastrado", "Cadastre o primeiro cliente para organizar cobrança, plano e histórico.", {
                    icon: false,
                    actionHtml: canEditClients
                      ? '<button type="button" class="btn btn-pink btn-sm empty-state-action" data-action="open-modal" data-modal="novo-cliente">Criar primeiro cliente</button>'
                      : ""
                  })
            }
          </td>
        </tr>
      `;
    } else {
      clientsBody.innerHTML = state.clients
        .map((client) => {
          const segmentLabel = String(client.segment || "").trim() || "—";
          const planLabel = normalizeClientPlanLabel(client.plan);
          const campaignsCount = Number(client.campaigns_count || 0);
          const campaignsLabel = `${formatNumber(campaignsCount)} ${campaignsCount === 1 ? "campanha vinculada" : "campanhas vinculadas"}`;
          const startedAtLabel = client.started_at ? formatDate(client.started_at) : "—";
          const mrrValue = formatCurrencyValue(client.mrr);
          const actionMenu = canEditClients
            ? renderActionMenu(
                [
                  renderActionMenuButton({
                    label: "Registrar cobrança",
                    action: "open-charge-modal",
                    id: client.id
                  }),
                  renderActionMenuButton({
                    label: "Excluir cliente",
                    action: "delete-client",
                    id: client.id,
                    className: "btn btn-danger-soft btn-sm"
                  })
                ],
                { label: "Mais ações do cliente" }
              )
            : "";

          return `
            <tr>
              <td class="crm-client-cell-primary">
                <p class="crm-row-title" title="${escapeHtml(client.name || "—")}">${escapeHtml(client.name || "—")}</p>
                <p class="crm-row-sub" title="${escapeHtml(client.company || "—")}">${escapeHtml(client.company || "—")}</p>
                <p class="crm-row-meta">${escapeHtml(campaignsLabel)}</p>
              </td>
              <td>
                <p class="crm-row-sub is-dark">${escapeHtml(segmentLabel)}</p>
              </td>
              <td>
                <span class="badge ${getClientPlanBadgeClass(client.plan)}">${escapeHtml(planLabel)}</span>
              </td>
              <td>
                <p class="crm-row-sub is-dark">${escapeHtml(startedAtLabel)}</p>
              </td>
              <td class="crm-cell-right">
                <p class="crm-mrr-value">${escapeHtml(mrrValue)}</p>
                <p class="crm-mrr-sub">receita mensal</p>
              </td>
              <td class="crm-cell-right crm-actions-cell">
                <div class="crm-row-actions">
                  ${
                    canEditClients
                      ? `<button type="button" class="crm-text-action" data-action="open-modal" data-modal="novo-cliente" data-id="${client.id}">Editar</button>`
                      : ""
                  }
                  ${actionMenu}
                </div>
              </td>
            </tr>
          `;
        })
        .join("");
    }
  }

  if (historyBody) {
    const historyItems = [
      ...state.charges.map((charge) => ({
        key: `charge-${charge.id}`,
        title: charge.description || `Cobrança ${charge.client_name || charge.contact_name || ""}`.trim(),
        clientName: charge.client_name || charge.contact_name || "—",
        typeLabel: "Cobrança",
        statusLabel: getChargeOperationalStatus(charge),
        badgeClass: getFinanceStatusBadgeClass(getChargeOperationalStatus(charge)),
        dateValue: charge.due_date || charge.created_at,
        actionHtml: charge.payment_link
          ? renderResourceAction(charge.payment_link, {
              label: "Abrir",
              className: "crm-text-action"
            })
          : renderActionMenuButton({
              label: "Abrir",
              action: "open-charge-modal",
              id: charge.client_id,
              className: "crm-text-action"
            })
      })),
      ...state.materials.map((material) => ({
        key: `material-${material.id}`,
        title: material.title,
        clientName: material.client_name || "Operação interna",
        typeLabel: "Entrega",
        statusLabel: normalizeMaterialStatus(material.status),
        badgeClass:
          material.status === "Aprovado"
            ? "badge-green"
            : material.status === "Revisao"
              ? "badge-yellow"
              : "badge-gray",
        dateValue: material.due_date || material.created_at,
        actionHtml: renderResourceAction(material.url || material.file_url, {
          label: "Abrir",
          className: "crm-text-action",
          missingMessage: "Arquivo ainda não disponível para abertura."
        })
      })),
      ...state.reports.map((report) => ({
        key: `report-${report.id}`,
        title: report.title,
        clientName: report.client_name || "—",
        typeLabel: "Relatório",
        statusLabel: "Publicado",
        badgeClass: "badge-blue",
        dateValue: report.report_month,
        actionHtml: renderResourceAction(report.file_url, {
          label: "Abrir",
          className: "crm-text-action",
          missingMessage: "Relatório ainda não disponível para abertura."
        })
      }))
    ]
      .sort((left, right) => new Date(right.dateValue || 0).getTime() - new Date(left.dateValue || 0).getTime())
      .slice(0, 8);

    if (!historyItems.length) {
      historyBody.innerHTML = `
        <tr>
          <td colspan="6" class="crm-empty-row">
            ${
              hasLoadFailure("relatórios") || hasLoadFailure("produção") || hasLoadFailure("cobranças")
                ? UI.empty("Não foi possível carregar o histórico.", "Atualize a tela para tentar novamente.", {
                    icon: false,
                    actionHtml: renderRetryAction()
                  })
                : UI.empty("Nenhum histórico disponível", "Relatórios, entregas e cobranças registradas aparecerão aqui.", {
                    icon: false,
                    actionHtml: canManageLeads
                      ? '<button type="button" class="btn btn-pink btn-sm empty-state-action" data-action="open-modal" data-modal="novo-lead">Criar primeiro lead</button>'
                      : ""
                  })
            }
          </td>
        </tr>
      `;
    } else {
      historyBody.innerHTML = historyItems
        .map(
          (item) => `
            <tr>
              <td class="crm-history-cell-primary">
                <p class="crm-row-title" title="${escapeHtml(item.title || "—")}">${escapeHtml(item.title || "—")}</p>
              </td>
              <td>
                <p class="crm-row-sub is-tight">${escapeHtml(item.clientName || "—")}</p>
              </td>
              <td>
                <span class="badge badge-gray">${escapeHtml(item.typeLabel)}</span>
              </td>
              <td>
                <span class="badge ${item.badgeClass}">${escapeHtml(item.statusLabel)}</span>
              </td>
              <td>
                <span class="crm-history-date">${escapeHtml(formatDate(item.dateValue))}</span>
              </td>
              <td class="crm-cell-right">${item.actionHtml}</td>
            </tr>
          `
        )
        .join("");
    }
  }
}

function renderCampaigns() {
  const campaignsKpiGrid = document.getElementById("campaigns-kpi-grid");
  const activeCampaigns = getActiveCampaigns();
  const campaignsForSummary = activeCampaigns;
  const totalBudget = sumBy(campaignsForSummary, (campaign) => campaign.budget);
  const totalLeads = sumBy(campaignsForSummary, (campaign) => campaign.leads);
  const clientsCount = new Set(campaignsForSummary.map((campaign) => campaign.client_id).filter(Boolean)).size;
  const averageCpl = totalLeads ? totalBudget / totalLeads : 0;

  if (campaignsKpiGrid) {
    campaignsKpiGrid.innerHTML = [
      {
        label: "Campanhas Ativas",
        value: formatNumber(activeCampaigns.length),
        sub: `${formatNumber(clientsCount)} ${clientsCount === 1 ? "cliente em mídia" : "clientes em mídia"}`
      },
      {
        label: "Orçamento Total",
        value: formatCurrency(totalBudget),
        sub: "em tráfego pago"
      },
      {
        label: "Leads Gerados",
        value: formatNumber(totalLeads),
        sub: "dados consolidados"
      },
      {
        label: "CPL Médio",
        value: formatCurrency(averageCpl),
        sub: `${formatNumber(totalLeads)} leads no período`
      }
    ]
      .map(
        (item) => `
          <div class="campaigns-kpi-card">
            <div class="campaigns-kpi-label">${escapeHtml(item.label)}</div>
            <div class="campaigns-kpi-value">${escapeHtml(item.value)}</div>
            <div class="campaigns-kpi-sub">${escapeHtml(item.sub)}</div>
          </div>
        `
      )
      .join("");
  }

  const campaignsTableShell = document.getElementById("campaigns-table-shell");
  if (campaignsTableShell) {
    campaignsTableShell.classList.toggle("is-empty", state.campaigns.length === 0);
  }

  const campaignsBody = document.getElementById("campanhas-tbody");
  if (!campaignsBody) {
    return;
  }

  if (!state.campaigns.length) {
    campaignsBody.innerHTML = `
      <tr>
        <td colspan="6" class="campaigns-empty-row">
          ${
            hasLoadFailure("campanhas")
              ? UI.empty("Não foi possível carregar as campanhas.", "Atualize a tela para tentar novamente.", {
                  icon: false,
                  className: "campaign-empty-panel",
                  actionHtml: renderRetryAction()
                })
              : UI.empty(
                  "Nenhuma campanha cadastrada.",
                  "Crie a primeira campanha para iniciar o planejamento e a operação de mídia.",
                  {
                    icon: false,
                    className: "campaign-empty-panel",
                    actionHtml: '<button type="button" class="btn btn-pink btn-sm empty-state-action" data-action="open-modal" data-modal="nova-campanha">Criar primeira campanha</button>',
                  }
                )
          }
        </td>
      </tr>
    `;
    return;
  }

  campaignsBody.innerHTML = state.campaigns
    .map((campaign) => {
      const view = getCampaignViewModel(campaign);
      const audienceLabel = view.audience && view.audience !== "—" ? view.audience : "Público não definido";
      const statusLabel = getDisplayText(view.status, "Planejamento");

      return `
        <tr>
          <td>
            <p class="campaigns-name" title="${escapeHtml(view.name)}">${escapeHtml(view.name)}</p>
            <p class="campaigns-client" title="${escapeHtml(view.client_name)}">${escapeHtml(view.client_name)}</p>
          </td>
          <td>
            <span class="campaigns-channel-badge ${getCampaignPlannerChannelClass(view.channel)}">${escapeHtml(view.channel)}</span>
          </td>
          <td class="campaigns-audience-cell">
            <div class="campaigns-audience-group">
              <p class="campaigns-audience">${escapeHtml(audienceLabel)}</p>
              <div class="campaigns-audience-tooltip">${escapeHtml(audienceLabel)}</div>
            </div>
          </td>
          <td>
            <p class="campaigns-budget">${escapeHtml(formatCurrencyValue(view.budget))}</p>
          </td>
          <td>
            <span class="campaigns-status-pill ${getCampaignPlannerStatusClass(statusLabel)}">
              <span class="campaigns-status-dot" aria-hidden="true"></span>${escapeHtml(statusLabel)}
            </span>
          </td>
          <td class="campaigns-actions-cell">
            <div class="campaigns-row-actions">
              ${renderActionMenu(
                [
                  renderActionMenuButton({
                    label: "Editar campanha",
                    action: "open-modal",
                    modal: "nova-campanha",
                    id: view.id
                  }),
                  renderActionMenuButton({
                    label: "Excluir campanha",
                    action: "delete-campaign",
                    id: view.id,
                    className: "btn btn-danger-soft btn-sm"
                  })
                ],
                { label: "Mais ações da campanha" }
              )}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderProduction() {
  const canEditProduction = canManageMaterials();
  const productionTableEmpty = (cols, title, sub, actionHtml = "") => `
    <tr>
      <td colspan="${cols}" class="px-6 py-10 text-center">
        <div class="text-[15px] font-semibold text-[#222222]">${escapeHtml(title)}</div>
        ${sub ? `<div class="text-[13px] text-[#6a6a6a] font-medium mt-1">${escapeHtml(sub)}</div>` : ""}
        ${actionHtml ? `<div class="mt-4 flex items-center justify-center">${actionHtml}</div>` : ""}
      </td>
    </tr>
  `;
  const getProductionStatusClasses = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "aprovado" || normalized === "concluído" || normalized === "concluido") {
      return "bg-green-50 text-green-700";
    }
    if (normalized === "revisão" || normalized === "revisao") {
      return "bg-yellow-50 text-yellow-700";
    }
    return "bg-red-50 text-red-600";
  };
  const renderProductionMenuButton = ({ label, action, id, modal, extra = "", type = "button" }) => `
    <button
      type="${type}"
      class="prod-menu-item"
      ${action ? `data-action="${action}"` : ""}
      ${modal ? `data-modal="${modal}"` : ""}
      ${id != null ? `data-id="${id}"` : ""}
      ${extra || ""}
    >
      ${escapeHtml(label)}
    </button>
  `;
  const renderProductionMenu = (actions = [], label = "Mais ações") => {
    const items = actions.filter(Boolean).join("");
    if (!items) {
      return "";
    }

    return `
      <details class="prod-menu relative">
        <summary
          class="w-8 h-8 rounded-full hairline-border flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          aria-label="${escapeHtml(label)}"
          title="${escapeHtml(label)}"
        >
          <span class="text-gray-500 font-bold mb-1">...</span>
        </summary>
        <div class="prod-menu-panel" data-floating-menu-panel="1">
          ${items}
        </div>
      </details>
    `;
  };
  document.getElementById("prod-design-tbody").innerHTML = state.materials
    .map((material, index) => {
      const deadlineValue = material.due_date || material.deadline || null;
      const deadlineLabel = deadlineValue ? formatDate(deadlineValue) : "—";
      const isOverdue = deadlineValue ? isOverdueDate(deadlineValue) : false;
      const statusLabel = normalizeMaterialStatus(material.status);

      return `
        <tr class="${index < state.materials.length - 1 ? "border-b border-[#dddddd]" : ""} hover:bg-gray-50 transition-colors">
          <td class="px-6 py-4 align-middle w-full max-w-0">
            <p class="text-[15px] font-semibold ink-black leading-tight mb-1 truncate">${escapeHtml(material.title)}</p>
            <p class="text-[13px] ash-gray font-medium truncate">${escapeHtml(material.client_name || "Interno")}</p>
          </td>
          <td class="px-6 py-4 align-middle whitespace-nowrap w-px">
            <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${getProductionStatusClasses(statusLabel)}">${escapeHtml(statusLabel)}</span>
          </td>
          <td class="px-6 py-4 align-middle text-center whitespace-nowrap w-px">
            <span class="text-[14px] ${isOverdue ? "text-red-600" : "text-gray-400"} font-medium">${escapeHtml(deadlineLabel)}</span>
          </td>
          <td class="px-6 py-4 align-middle text-right whitespace-nowrap w-px">
            <div class="flex items-center gap-2 justify-end">
              ${renderResourceAction(material.url || material.file_url, {
                label: "Arquivo",
                className: "px-3 py-1.5 text-[13px] font-semibold ink-black hairline-border rounded-[8px] hover:bg-gray-50",
                missingMessage: "Arquivo ainda não disponível para abertura."
              })}
              ${canEditProduction
                ? renderProductionMenu(
                    [
                      renderProductionMenuButton({
                        label: "Editar entrega",
                        action: "open-modal",
                        modal: "nova-entrega",
                        id: material.id
                      }),
                      renderProductionMenuButton({
                        label: "Excluir entrega",
                        action: "delete-material",
                        id: material.id
                      })
                    ],
                    "Mais ações da entrega"
                  )
                : ""}
            </div>
          </td>
        </tr>
      `;
    })
    .join("") || (hasLoadFailure("produção")
      ? productionTableEmpty(4, "Não foi possível carregar as entregas.", "Atualize a tela para tentar novamente.", renderRetryAction())
      : productionTableEmpty(4, "Nenhuma entrega cadastrada", "Cadastre a primeira entrega para iniciar o fluxo de produção.", canEditProduction
        ? '<button type="button" class="px-5 py-2 text-sm font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="nova-entrega">+ Nova entrega</button>'
        : ""));

  document.getElementById("copy-tbody").innerHTML = state.files
    .map(
      (file, index) => `
        <tr class="${index < state.files.length - 1 ? "border-b border-[#dddddd]" : ""} hover:bg-gray-50 transition-colors">
          <td class="px-6 py-5 align-middle w-1/3 max-w-0">
            <p class="text-[14px] font-semibold ink-black truncate">${escapeHtml(file.original_name)}</p>
          </td>
          <td class="px-6 py-5 align-middle w-1/3 max-w-0">
            <p class="text-[13px] ash-gray font-medium truncate">${escapeHtml(file.client_name || "Interno")}</p>
          </td>
          <td class="px-6 py-5 align-middle whitespace-nowrap w-px">
            <p class="text-[13px] font-medium ink-black">${escapeHtml(file.mime_type || "—")}</p>
          </td>
          <td class="px-6 py-5 align-middle whitespace-nowrap w-px">
            <p class="text-[13px] font-medium ink-black">${Math.round((file.size || 0) / 1024)} KB</p>
          </td>
          <td class="px-6 py-5 align-middle whitespace-nowrap w-px">
            <p class="text-[13px] font-medium ash-gray">${escapeHtml(file.uploaded_by_name || "-")}</p>
          </td>
          <td class="px-6 py-5 align-middle text-right whitespace-nowrap w-px">
            ${renderResourceAction(file.url, {
              label: "Abrir",
              className: "text-[13px] font-semibold ink-black hover:underline"
            })}
          </td>
        </tr>
      `
    )
    .join("") || (hasLoadFailure("arquivos")
      ? productionTableEmpty(6, "Não foi possível carregar os arquivos.", "Atualize a tela para tentar novamente.", renderRetryAction())
      : productionTableEmpty(6, "Nenhum arquivo disponível", "Os arquivos internos e aprovados aparecerão aqui.", canEditProduction
        ? '<button type="button" class="px-5 py-2 text-sm font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="nova-entrega">+ Nova entrega</button>'
        : ""));

  document.getElementById("lp-tbody").innerHTML = state.reports
    .map(
      (report, index) => `
        <tr class="${index < state.reports.length - 1 ? "border-b border-[#dddddd]" : ""} hover:bg-gray-50 transition-colors">
          <td class="px-6 py-5 align-middle w-1/3 max-w-0">
            <p class="text-[14px] font-semibold ink-black leading-tight mb-1 truncate">${escapeHtml(report.title)}</p>
            <p class="text-[13px] ash-gray font-medium truncate">${escapeHtml(report.client_name || "Interno")}</p>
          </td>
          <td class="px-6 py-5 align-middle whitespace-nowrap w-px">
            <p class="text-[14px] font-medium ink-black">${formatDate(report.report_month)}</p>
          </td>
          <td class="px-6 py-5 align-middle w-full max-w-0">
            ${
              report.summary
                ? `
                  <div class="group relative">
                    <p class="text-[14px] font-medium ink-black truncate cursor-default">${escapeHtml(report.summary)}</p>
                    <div class="absolute left-0 bottom-full mb-2 hidden group-hover:block w-auto min-w-[300px] bg-gray-800 text-white text-[12px] p-3 rounded-[8px] z-10 shadow-lg whitespace-normal">
                      ${escapeHtml(report.summary)}
                    </div>
                  </div>
                `
                : '<p class="text-[14px] font-medium text-gray-400">—</p>'
            }
          </td>
          <td class="px-6 py-5 align-middle text-right whitespace-nowrap w-px">
            ${renderResourceAction(report.file_url, {
              label: "Abrir",
              className: "text-[13px] font-semibold ink-black hover:underline",
              missingMessage: "Relatório ainda não disponível para abertura."
            })}
          </td>
        </tr>
      `
    )
    .join("") || (hasLoadFailure("relatórios")
      ? productionTableEmpty(4, "Não foi possível carregar os relatórios.", "Atualize a tela para tentar novamente.", renderRetryAction())
      : productionTableEmpty(4, "Nenhum relatório disponível", "Os relatórios publicados e compartilhados aparecerão aqui.", '<button type="button" class="px-4 py-2 text-sm font-medium text-[#222222] bg-white border border-[#dddddd] rounded-[8px] hover:bg-gray-50 transition-colors" data-action="go-to" data-page="analytics">Abrir analytics</button>'));
}

function renderTraffic() {
  const trafficKpiGrid = document.getElementById("traffic-kpi-grid");
  const platformBreakdown = document.getElementById("traffic-platform-breakdown");
  const abList = document.getElementById("ab-list");
  const trafficBody = document.getElementById("trafego-tbody");
  const activeCampaigns = getActiveCampaigns().map((campaign) => getCampaignViewModel(campaign));
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

  const getTrafficChannelClasses = (channel) => {
    const value = normalizeLooseText(channel);
    if (value.includes("instagram") && value.includes("meta")) {
      return "bg-[#f0f4f8] text-[#3366cc]";
    }
    if (value.includes("meta") || value.includes("facebook")) {
      return "bg-blue-50 text-blue-600";
    }
    if (value.includes("instagram")) {
      return "bg-pink-50 text-pink-600";
    }
    return "bg-gray-100 text-gray-600";
  };

  const getTrafficStatusClasses = (status) => {
    const value = normalizeLooseText(status);
    if (value.includes("ativa")) {
      return "bg-green-50 text-green-700";
    }
    if (value.includes("paus")) {
      return "bg-yellow-50 text-yellow-700";
    }
    return "bg-gray-100 text-gray-600";
  };

  if (trafficKpiGrid) {
    trafficKpiGrid.innerHTML = [
      {
        label: "Investimento Total",
        value: formatCurrency(totalBudget),
        sub: `${formatNumber(activeCampaigns.length)} campanhas ativas`,
        extraClass: "tracking-tight"
      },
      {
        label: "ROAS Médio",
        value: `${roas.toFixed(2)}x`,
        sub: `${formatNumber(activeClients)} contas acompanhadas`
      },
      {
        label: "CTR Médio",
        value: `${ctr.toFixed(2)}%`,
        sub: `${formatNumber(totalClicks)} cliques`
      },
      {
        label: "Impressões",
        value: formatCompactNumber(totalImpressions),
        sub: "este mês",
        extraClass: "tracking-tight"
      }
    ]
      .map(
        (item) => `
          <div class="bg-white hairline-border rounded-[14px] p-6">
            <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">${escapeHtml(item.label)}</p>
            <span class="text-3xl font-bold ink-black block mb-1 ${item.extraClass || ""}">${escapeHtml(item.value)}</span>
            <p class="text-[13px] ash-gray font-medium">${escapeHtml(item.sub)}</p>
          </div>
        `
      )
      .join("");
  }

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
            const width = maxBudget ? (platform.budget / maxBudget) * 100 : 0;
            return `
              <div>
                <div class="flex justify-between items-end mb-2">
                  <span class="text-[14px] font-semibold ink-black">${escapeHtml(platform.label)}</span>
                  <span class="text-[13px] font-bold ink-black">${escapeHtml(formatCurrencyValue(platform.budget))} <span class="text-[12px] font-medium text-gray-400 ml-1">· ROAS ${platformRoas.toFixed(2)}x</span></span>
                </div>
                <div class="w-full bg-gray-100 h-[6px] rounded-full overflow-hidden">
                  <div class="bg-[#222222] h-full rounded-full" style="width:${width.toFixed(1)}%"></div>
                </div>
              </div>
            `;
          })
          .join("")
      : '<div class="text-[14px] font-medium ash-gray">Sem campanhas ativas no período.</div>';
  }

  if (abList) {
    abList.innerHTML = activeCampaigns.length
      ? activeCampaigns
          .slice(0, 3)
          .map((campaign, index, list) => {
            const campaignMetrics = state.metrics.filter((metric) => Number(metric.campaign_id) === Number(campaign.id));
            const revenue = campaignMetrics.length ? sumBy(campaignMetrics, (metric) => metric.revenue) : Number(campaign.revenue || 0);
            const budget = Number(campaign.budget || 0);
            const roi = budget ? ((revenue - budget) / budget) * 100 : 0;
            const rowClasses = [
              "flex items-center justify-between py-3",
              index === 0 ? "border-b border-[#dddddd] first:pt-0" : "",
              index < list.length - 1 && index !== 0 ? "border-b border-[#dddddd]" : ""
            ].filter(Boolean).join(" ");

            return `
              <div class="${rowClasses}">
                <div>
                  <p class="text-[14px] font-semibold ink-black mb-0.5">${escapeHtml(campaign.name)}</p>
                  <p class="text-[12px] ash-gray font-medium">${escapeHtml(campaign.client_name)}</p>
                </div>
                <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700">ROI ${roi.toFixed(2)}%</span>
              </div>
            `;
          })
          .join("")
      : '<div class="text-[14px] font-medium ash-gray">Nenhum teste ativo no momento.</div>';
  }

  if (!trafficBody) {
    return;
  }

  if (!activeCampaigns.length) {
    trafficBody.innerHTML = `
      <tr>
        <td colspan="9" class="px-6 py-10 text-center">
          <div class="text-[15px] font-semibold text-[#222222]">Nenhum dado de tráfego disponível</div>
          <div class="text-[13px] text-[#6a6a6a] font-medium mt-1">Publique campanhas para visualizar métricas e evolução de mídia.</div>
        </td>
      </tr>
    `;
    return;
  }

  trafficBody.innerHTML = activeCampaigns
    .map((campaign, index, list) => {
      const campaignMetrics = state.metrics.filter((metric) => Number(metric.campaign_id) === Number(campaign.id));
      const impressions = sumBy(campaignMetrics, (metric) => metric.impressions);
      const clicks = sumBy(campaignMetrics, (metric) => metric.clicks);
      const leads = sumBy(campaignMetrics, (metric) => metric.leads);
      const revenue = campaignMetrics.length ? sumBy(campaignMetrics, (metric) => metric.revenue) : Number(campaign.revenue || 0);
      const budget = Number(campaign.budget || 0);
      const cpc = clicks ? budget / clicks : 0;
      const ctrValue = impressions ? (clicks / impressions) * 100 : 0;
      const conversionValue = clicks ? (leads / clicks) * 100 : 0;
      const roasValue = budget ? revenue / budget : 0;
      const statusLabel = getDisplayText(campaign.status, "Planejamento");
      const zeroTextClass = "text-[14px] font-medium text-gray-400";
      const rowClass = index < list.length - 1
        ? "border-b border-[#dddddd] hover:bg-gray-50 transition-colors"
        : "hover:bg-gray-50 transition-colors";

      return `
        <tr class="${rowClass}">
          <td class="pl-6 pr-4 py-4 align-middle w-[30%] max-w-0">
            <div class="group relative">
              <p class="text-[14px] font-semibold ink-black truncate cursor-default">${escapeHtml(campaign.name)}</p>
              <div class="absolute left-0 bottom-full mb-2 hidden group-hover:block w-auto min-w-[max-content] bg-gray-800 text-white text-[12px] p-2 rounded-[8px] z-10 shadow-lg">
                ${escapeHtml(campaign.name)}
              </div>
            </div>
          </td>
          <td class="px-4 py-4 align-middle w-[25%] max-w-0">
            <div class="group relative">
              <p class="text-[13px] ash-gray font-medium truncate cursor-default">${escapeHtml(campaign.client_name)}</p>
              <div class="absolute left-0 bottom-full mb-2 hidden group-hover:block w-auto min-w-[max-content] bg-gray-800 text-white text-[12px] p-2 rounded-[8px] z-10 shadow-lg">
                ${escapeHtml(campaign.client_name)}
              </div>
            </div>
          </td>
          <td class="px-4 py-4 align-middle whitespace-nowrap w-px">
            <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded ${getTrafficChannelClasses(campaign.channel)}">${escapeHtml(campaign.channel)}</span>
          </td>
          <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
            <p class="text-[14px] font-bold ink-black">${escapeHtml(formatCurrencyValue(budget))}</p>
          </td>
          <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
            <p class="${cpc > 0 ? "text-[14px] font-medium ink-black" : zeroTextClass}">${escapeHtml(formatCurrencyValue(cpc))}</p>
          </td>
          <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
            <p class="${ctrValue > 0 ? "text-[14px] font-medium ink-black" : zeroTextClass}">${ctrValue.toFixed(2)}%</p>
          </td>
          <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
            <p class="${conversionValue > 0 ? "text-[14px] font-medium ink-black" : zeroTextClass}">${conversionValue.toFixed(2)}%</p>
          </td>
          <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
            <p class="${roasValue > 0 ? "text-[14px] font-bold ink-black" : "text-[14px] font-bold text-gray-400"}">${roasValue.toFixed(2)}x</p>
          </td>
          <td class="pl-4 pr-6 py-4 align-middle text-center whitespace-nowrap w-px">
            <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${getTrafficStatusClasses(statusLabel)}">${escapeHtml(statusLabel)}</span>
          </td>
        </tr>
      `;
    })
    .join("");
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
  const revenue = filteredMetrics.reduce((acc, metric) => acc + Number(metric.revenue || 0), 0);
  const impressions = filteredMetrics.reduce((acc, metric) => acc + Number(metric.impressions || 0), 0);
  const clicks = filteredMetrics.reduce((acc, metric) => acc + Number(metric.clicks || 0), 0);
  const leads = filteredMetrics.reduce((acc, metric) => acc + Number(metric.leads || 0), 0);
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
  const conversion = clicks ? ((leads / clicks) * 100).toFixed(2) : "0.00";
  const analyticsGrid = document.getElementById("analytics-kpi-grid");
  const sessionsContainer = document.getElementById("ga-chart");
  const integrationsContainer = document.getElementById("analytics-integrations");
  const analyticsBody = document.getElementById("analytics-tbody");
  const integrationsBody = document.getElementById("integrations-tbody");
  const analyticsProviders = INTEGRATION_PROVIDERS.filter((provider) => provider.key !== "looker_studio");

  const performanceMap = filteredMetrics.reduce((accumulator, metric) => {
    const clientName = getDisplayText(metric.client_name, "Cliente não vinculado");
    const campaignName = getDisplayText(metric.campaign_name, "Sem campanha");
    const key = `${metric.client_id || clientName}::${campaignName}`;

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        clientName,
        campaignName,
        leads: 0,
        revenue: 0,
        impressions: 0,
        clicks: 0,
        period: metric.period || null
      });
    }

    const bucket = accumulator.get(key);
    bucket.leads += Number(metric.leads || 0);
    bucket.revenue += Number(metric.revenue || 0);
    bucket.impressions += Number(metric.impressions || 0);
    bucket.clicks += Number(metric.clicks || 0);

    if (metric.period && (!bucket.period || new Date(metric.period) > new Date(bucket.period))) {
      bucket.period = metric.period;
    }

    return accumulator;
  }, new Map());

  const performanceRows = Array.from(performanceMap.values()).sort((left, right) => {
    if (right.revenue !== left.revenue) {
      return right.revenue - left.revenue;
    }
    if (right.leads !== left.leads) {
      return right.leads - left.leads;
    }
    return String(left.clientName || "").localeCompare(String(right.clientName || ""), "pt-BR");
  });

  const getAnalyticsScoreClasses = (score) => {
    if (score >= 80) {
      return "text-green-700 bg-green-50";
    }
    if (score >= 50) {
      return "text-yellow-700 bg-yellow-50";
    }
    return "text-red-700 bg-red-50";
  };

  const getAnalyticsIntegrationStatusClasses = (status) => {
    const value = String(status || "").trim().toLowerCase();
    if (value === "connected") {
      return "bg-green-50 text-green-700";
    }
    if (value === "configuring") {
      return "bg-yellow-50 text-yellow-700";
    }
    if (value === "error") {
      return "bg-red-50 text-red-700";
    }
    return "bg-gray-100 text-gray-600";
  };

  const renderAnalyticsMenuButton = ({ label, action, id, className = "" }) => `
    <button
      type="button"
      class="w-full text-left px-3 py-2 text-[13px] font-medium rounded-[8px] hover:bg-gray-50 transition-colors ${className}"
      ${action ? `data-action="${action}"` : ""}
      ${id != null ? `data-id="${id}"` : ""}
    >
      ${escapeHtml(label)}
    </button>
  `;

  const renderAnalyticsMenu = (actions = [], label = "Mais ações") => {
    const items = actions.filter(Boolean).join("");
    if (!items) {
      return "";
    }

    return `
      <details class="analytics-menu relative">
        <summary class="w-8 h-8 rounded-full hairline-border inline-flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer" aria-label="${escapeHtml(label)}">
          <span class="text-gray-500 font-bold mb-1">...</span>
        </summary>
        <div class="absolute right-0 top-[calc(100%+8px)] z-30 flex flex-col gap-1 min-w-[188px] p-2 bg-white border border-[#dddddd] rounded-[10px] shadow-[0_16px_32px_rgba(0,0,0,0.12)] analytics-menu-panel" data-floating-menu-panel="1">
          ${items}
        </div>
      </details>
    `;
  };

  if (analyticsGrid) {
    analyticsGrid.innerHTML = [
      { label: "Receita", value: formatCurrency(revenue), sub: `${filteredMetrics.length} registros`, tracking: true },
      { label: "Impressões", value: formatNumber(impressions), sub: "volume consolidado" },
      { label: "CTR Médio", value: `${ctr}%`, sub: `${formatNumber(clicks)} cliques` },
      { label: "Conversão", value: `${conversion}%`, sub: `${formatNumber(leads)} leads`, tracking: true }
    ]
      .map(
        (item) => `
          <div class="bg-white hairline-border rounded-[14px] p-6 shadow-sm">
            <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">${escapeHtml(item.label)}</p>
            <span class="text-3xl font-bold ink-black block mb-1 ${item.tracking ? "tracking-tight" : ""}">${escapeHtml(item.value)}</span>
            <p class="text-[13px] ash-gray font-medium">${escapeHtml(item.sub)}</p>
          </div>
        `
      )
      .join("");
  }

  if (sessionsContainer) {
    const topMetrics = performanceRows.slice(0, 5);
    const maxRevenue = Math.max(...topMetrics.map((metric) => metric.revenue), 1);

    sessionsContainer.innerHTML = topMetrics.length
      ? topMetrics
          .map((metric) => {
            const width = maxRevenue ? (metric.revenue / maxRevenue) * 100 : 0;
            const metricLabel = metric.revenue >= 1000 ? `${Math.round(metric.revenue / 1000)}k` : formatNumber(metric.revenue);

            return `
              <div>
                <div class="flex justify-between items-end mb-2">
                  <span class="text-[13px] font-semibold ink-black">${escapeHtml(metric.campaignName)}</span>
                  <span class="text-[13px] font-bold ink-black">${escapeHtml(metricLabel)}</span>
                </div>
                <div class="w-full bg-gray-100 h-[6px] rounded-full overflow-hidden">
                  <div class="bg-[#222222] h-full rounded-full" style="width:${width.toFixed(1)}%"></div>
                </div>
              </div>
            `;
          })
          .join("")
      : '<div class="text-[14px] font-medium ash-gray">Sem sessões consolidadas para exibir.</div>';
  }

  if (integrationsContainer) {
    integrationsContainer.innerHTML = analyticsProviders
      .map((provider, index, list) => {
        const providerIntegrations = filteredIntegrations.filter((item) => item.provider_key === provider.key);
        const connectedCount = providerIntegrations.filter((item) => item.status === "connected").length;
        const configuringCount = providerIntegrations.filter((item) => item.status === "configuring").length;
        const errorCount = providerIntegrations.filter((item) => item.status === "error").length;

        let status = "disconnected";
        let subtitle = "Nenhum cliente configurado";
        let badgeLabel = "Não configurado";

        if (connectedCount > 0) {
          status = "connected";
          subtitle = `${connectedCount} ${connectedCount === 1 ? "cliente conectado" : "clientes conectados"}`;
          badgeLabel = "Conectado";
        } else if (configuringCount > 0) {
          status = "configuring";
          subtitle = `${configuringCount} ${configuringCount === 1 ? "cliente em configuração" : "clientes em configuração"}`;
          badgeLabel = "Configurando";
        } else if (errorCount > 0) {
          status = "error";
          subtitle = `${errorCount} ${errorCount === 1 ? "cliente com falha" : "clientes com falha"}`;
          badgeLabel = "Erro";
        }

        const rowClass = [
          "flex items-center justify-between py-4",
          index === 0 ? "first:pt-0" : "",
          index < list.length - 1 ? "border-b border-[#dddddd]" : ""
        ].filter(Boolean).join(" ");

        return `
          <div class="${rowClass}">
            <div>
              <p class="text-[14px] font-semibold ink-black mb-0.5">${escapeHtml(provider.name)}</p>
              <p class="text-[12px] ash-gray font-medium">${escapeHtml(subtitle)}</p>
            </div>
            <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded ${getAnalyticsIntegrationStatusClasses(status)}">${escapeHtml(badgeLabel)}</span>
          </div>
        `;
      })
      .join("");
  }

  if (analyticsBody) {
    analyticsBody.innerHTML = performanceRows.length
      ? performanceRows
          .map((metric, index, list) => {
            const score = Math.min(Math.round(Number(metric.leads || 0)), 100);
            const rowClass = index < list.length - 1
              ? "border-b border-[#dddddd] hover:bg-gray-50 transition-colors"
              : "hover:bg-gray-50 transition-colors";

            return `
              <tr class="${rowClass}">
                <td class="pl-6 pr-4 py-4 align-middle w-full max-w-0">
                  <div class="group relative">
                    <p class="text-[14px] font-semibold ink-black truncate cursor-default">${escapeHtml(metric.clientName)}</p>
                    <p class="text-[12px] ash-gray font-medium truncate mt-0.5">${escapeHtml(metric.campaignName)}</p>
                    <div class="absolute left-0 bottom-full mb-2 hidden group-hover:block w-auto min-w-[max-content] bg-gray-800 text-white text-[12px] p-2 rounded-[8px] z-10 shadow-lg">
                      ${escapeHtml(`${metric.clientName} - ${metric.campaignName}`)}
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
                  <p class="text-[14px] font-bold ink-black">${escapeHtml(formatNumber(metric.leads))}</p>
                </td>
                <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
                  <p class="text-[14px] font-bold ink-black">${escapeHtml(formatCurrencyValue(metric.revenue))}</p>
                </td>
                <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
                  <p class="text-[14px] font-medium ink-black">${escapeHtml(formatNumber(metric.impressions))}</p>
                </td>
                <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
                  <p class="text-[14px] font-medium ink-black">${escapeHtml(formatNumber(metric.clicks))}</p>
                </td>
                <td class="px-4 py-4 align-middle text-center whitespace-nowrap w-px">
                  <p class="text-[13px] font-medium ash-gray">${escapeHtml(formatDate(metric.period))}</p>
                </td>
                <td class="pl-4 pr-6 py-4 align-middle text-center whitespace-nowrap w-px">
                  <span class="inline-block text-[12px] font-bold px-2 py-0.5 rounded ${getAnalyticsScoreClasses(score)}">${score}/100</span>
                </td>
              </tr>
            `;
          })
          .join("")
      : `
          <tr>
            <td colspan="7" class="px-6 py-10 text-center">
              <div class="text-[15px] font-semibold text-[#222222]">${escapeHtml(hasLoadFailure("métricas") ? "Não foi possível carregar as métricas." : "Nenhuma métrica consolidada.")}</div>
              <div class="text-[13px] text-[#6a6a6a] font-medium mt-1">${escapeHtml(hasLoadFailure("métricas") ? "Atualize a tela para tentar novamente." : "Conecte clientes e publique campanhas para ver a leitura por conta.")}</div>
              <div class="mt-4 flex items-center justify-center">
                ${
                  hasLoadFailure("métricas")
                    ? renderRetryAction()
                    : hasScopedClients()
                      ? '<button type="button" class="px-5 py-2 text-sm font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="nova-integracao">+ Nova integração</button>'
                      : '<button type="button" class="px-5 py-2 text-sm font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="novo-cliente">Criar cliente</button>'
                }
              </div>
            </td>
          </tr>
        `;
  }

  if (integrationsBody) {
    integrationsBody.innerHTML = filteredIntegrations.length
      ? filteredIntegrations
          .slice()
          .sort((left, right) => {
            const clientComparison = String(left.client_name || "").localeCompare(String(right.client_name || ""), "pt-BR");
            if (clientComparison !== 0) {
              return clientComparison;
            }
            return getIntegrationProviderLabel(left.provider_key).localeCompare(getIntegrationProviderLabel(right.provider_key), "pt-BR");
          })
          .map((integration, index, list) => {
            const rowClass = index < list.length - 1
              ? "border-b border-[#dddddd] hover:bg-gray-50 transition-colors"
              : "hover:bg-gray-50 transition-colors";
            const actionHtml = canManageIntegrations()
              ? `
                  <div class="flex items-center gap-2 justify-end">
                    <button class="text-[13px] font-semibold ink-black hover:underline" data-action="open-modal" data-modal="nova-integracao" data-id="${integration.id}">Editar</button>
                    ${renderAnalyticsMenu([
                      renderAnalyticsMenuButton({
                        label: "Excluir integração",
                        action: "delete-integration",
                        id: integration.id,
                        className: "text-[#c24141] hover:bg-red-50 hover:text-[#991b1b]"
                      })
                    ])}
                  </div>
                `
              : '<div class="flex items-center justify-end"><span class="text-[13px] font-medium ash-gray">Somente leitura</span></div>';

            return `
              <tr class="${rowClass}">
                <td class="pl-6 pr-4 py-4 align-middle w-1/3 max-w-0">
                  <div class="group relative">
                    <p class="text-[14px] font-semibold ink-black truncate cursor-default">${escapeHtml(integration.client_name || "—")}</p>
                  </div>
                </td>
                <td class="px-4 py-4 align-middle w-1/4 max-w-0">
                  <p class="text-[14px] font-semibold ink-black truncate">${escapeHtml(getIntegrationProviderLabel(integration.provider_key))}</p>
                </td>
                <td class="px-4 py-4 align-middle text-center whitespace-nowrap w-px">
                  <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${getAnalyticsIntegrationStatusClasses(integration.status)}">${escapeHtml(INTEGRATION_STATUS_LABELS[integration.status] || integration.status || "Desconectado")}</span>
                </td>
                <td class="px-4 py-4 align-middle w-1/3 max-w-0">
                  <p class="text-[14px] font-semibold ink-black truncate">${escapeHtml(integration.external_account_id || "—")}</p>
                  ${integration.external_property_id ? `<p class="text-[12px] ash-gray truncate mt-0.5">${escapeHtml(integration.external_property_id)}</p>` : ""}
                </td>
                <td class="px-4 py-4 align-middle text-right whitespace-nowrap w-px">
                  <p class="text-[13px] font-medium ash-gray">${escapeHtml(formatDateTime(integration.last_sync_at))}</p>
                </td>
                <td class="pl-4 pr-6 py-4 align-middle text-right whitespace-nowrap w-px">
                  ${actionHtml}
                </td>
              </tr>
            `;
          })
          .join("")
      : `
          <tr>
            <td colspan="6" class="px-6 py-10 text-center">
              <div class="text-[15px] font-semibold text-[#222222]">${escapeHtml(hasLoadFailure("integrações") ? "Não foi possível carregar as integrações" : hasScopedClients() ? "Nenhuma integração registrada" : "Nenhum cliente cadastrado")}</div>
              <div class="text-[13px] text-[#6a6a6a] font-medium mt-1">${escapeHtml(
                hasLoadFailure("integrações")
                  ? "Atualize a tela para tentar novamente."
                  : hasScopedClients()
                    ? "Registre a primeira integração para habilitar leitura e sincronização."
                    : "Cadastre pelo menos um cliente para vincular integrações."
              )}</div>
              <div class="mt-4 flex items-center justify-center">
                ${
                  hasLoadFailure("integrações")
                    ? renderRetryAction()
                    : hasScopedClients()
                      ? '<button type="button" class="px-5 py-2 text-sm font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="nova-integracao">+ Nova integração</button>'
                      : '<button type="button" class="px-5 py-2 text-sm font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="novo-cliente">Criar cliente</button>'
                }
              </div>
            </td>
          </tr>
        `;
  }
}

function renderFinance() {
  const finance = buildFinanceViewModel();
  const financeGrid = document.getElementById("finance-kpis");
  const financeTableEmpty = (cols, title, sub, actionHtml = "") => `
    <tr>
      <td colspan="${cols}" class="px-6 py-10 text-center">
        <div class="text-[15px] font-semibold text-[#222222]">${escapeHtml(title)}</div>
        ${sub ? `<div class="text-[13px] text-[#6a6a6a] font-medium mt-1">${escapeHtml(sub)}</div>` : ""}
        ${actionHtml ? `<div class="mt-4 flex items-center justify-center">${actionHtml}</div>` : ""}
      </td>
    </tr>
  `;
  const getFinancePillClasses = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "recebida" || normalized === "pago" || normalized === "em dia") {
      return "bg-green-50 text-green-700";
    }
    if (normalized === "pendente" || normalized === "revisão" || normalized === "revisao") {
      return "bg-yellow-50 text-yellow-700";
    }
    if (normalized === "atrasada" || normalized === "atrasado") {
      return "bg-red-50 text-red-700";
    }
    return "bg-gray-100 text-gray-600";
  };
  const getFinanceLaunchTypeClasses = (type) => {
    const normalized = String(type || "").trim().toLowerCase();
    if (normalized === "fatura") {
      return "bg-[#f7f7f7] text-[#222222] border border-[#dddddd]";
    }
    if (normalized === "cobrança" || normalized === "cobranca") {
      return "bg-gray-100 text-gray-700";
    }
    return "bg-gray-100 text-gray-700";
  };
  const renderFinanceMenuButton = ({ label, action, id, extra = "", type = "button" }) => `
    <button
      type="${type}"
      class="finance-menu-item"
      ${action ? `data-action="${action}"` : ""}
      ${id != null ? `data-id="${id}"` : ""}
      ${extra || ""}
    >
      ${escapeHtml(label)}
    </button>
  `;
  const renderFinanceMenu = (actions = [], label = "Mais ações") => {
    const items = actions.filter(Boolean).join("");
    if (!items) {
      return "";
    }

    return `
      <details class="finance-menu relative">
        <summary
          class="w-8 h-8 rounded-full hairline-border flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="${escapeHtml(label)}"
          title="${escapeHtml(label)}"
        >
          <span class="text-gray-500 font-bold mb-1">...</span>
        </summary>
        <div class="finance-menu-panel" data-floating-menu-panel="1">
          ${items}
        </div>
      </details>
    `;
  };
  const financeRows = [...finance.clientFinancials];

  if (financeGrid) {
    financeGrid.innerHTML = [
      {
        label: "Faturado",
        value: formatCurrency(finance.totalBilled),
        sub: finance.totalMrr ? `MRR ativo ${formatCurrency(finance.totalMrr)}` : "Sem MRR ativo",
        cardClass: "bg-white hairline-border rounded-[14px] p-6 shadow-[rgba(0,0,0,0.02)_0_2px_6px]",
        subClass: "ash-gray"
      },
      {
        label: "Recebido",
        value: formatCurrency(finance.receivedTotal),
        sub: finance.receivedEntries
          ? `${finance.receivedEntries} ${finance.receivedEntries === 1 ? "registro recebido" : "registros recebidos"}`
          : "Nenhum recebimento no período",
        cardClass: "bg-white hairline-border rounded-[14px] p-6 shadow-[rgba(0,0,0,0.02)_0_2px_6px]",
        subClass: "ash-gray"
      },
      {
        label: "Inadimplência",
        value: formatCurrency(finance.overdueTotal),
        sub: finance.overdueEntries
          ? `${finance.overdueEntries} ${finance.overdueEntries === 1 ? "título em atraso" : "títulos em atraso"}`
          : "Nenhum título atrasado",
        cardClass: "bg-white hairline-border rounded-[14px] p-6 shadow-[rgba(0,0,0,0.02)_0_2px_6px] relative overflow-hidden",
        subClass: finance.overdueEntries ? "text-red-600" : "ash-gray",
        accent: true
      },
      {
        label: "Lucro Líquido",
        value: formatCurrency(finance.netProfit),
        sub: `${formatCurrency(finance.pendingTotal)} a receber no prazo`,
        cardClass: "bg-white hairline-border rounded-[14px] p-6 shadow-[rgba(0,0,0,0.02)_0_2px_6px]",
        subClass: "ash-gray"
      }
    ]
      .map(
        (card) => `
          <div class="${card.cardClass}">
            ${card.accent ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-red-500 opacity-50"></div>' : ""}
            <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">${escapeHtml(card.label)}</p>
            <span class="text-3xl font-bold ink-black block mb-1 tracking-tight">${escapeHtml(card.value)}</span>
            <p class="text-[13px] font-medium ${card.subClass}">${escapeHtml(card.sub)}</p>
          </div>
        `
      )
      .join("");
  }

  document.getElementById("fin-clientes").innerHTML = finance.clientFinancials
    .map(
      ({ client, billedTotal, receivedTotal, costTotal, pendingTotal, overdueTotal, margin, operationalStatus }, index) => `
        <tr class="${index < financeRows.length - 1 ? "border-b border-[#dddddd]" : ""} hover:bg-gray-50 transition-colors">
          <td class="pl-6 pr-4 py-5 align-middle w-[30%] max-w-0">
            <div class="group relative">
              <p class="text-[14px] font-semibold ink-black truncate cursor-default">${escapeHtml(client.name)}</p>
              <p class="text-[12px] ash-gray font-medium truncate mt-0.5">${escapeHtml(client.company || client.name || "Conta interna")}</p>
              <div class="absolute left-0 bottom-full mb-2 hidden group-hover:block w-auto min-w-[max-content] bg-gray-800 text-white text-[12px] p-2 rounded-[8px] z-10 shadow-lg">
                ${escapeHtml(client.company || client.name || "Conta interna")}
              </div>
            </div>
          </td>
          <td class="px-4 py-5 align-middle text-right whitespace-nowrap w-px">
            <p class="${Number(billedTotal || 0) > 0 ? "text-[14px] font-semibold ink-black" : "text-[14px] font-medium text-gray-400"}">${formatCurrencyValue(billedTotal)}</p>
          </td>
          <td class="px-4 py-5 align-middle text-right whitespace-nowrap w-px">
            <p class="${Number(costTotal || 0) > 0 ? "text-[14px] font-semibold ink-black" : "text-[14px] font-medium text-gray-400"}">${formatCurrencyValue(costTotal)}</p>
          </td>
          <td class="px-4 py-5 align-middle text-right whitespace-nowrap w-px">
            <p class="${Number(receivedTotal || 0) > 0 ? "text-[14px] font-semibold ink-black" : "text-[14px] font-medium text-gray-400"}">${formatCurrencyValue(receivedTotal)}</p>
          </td>
          <td class="px-4 py-5 align-middle text-center whitespace-nowrap w-px">
            <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded ${getFinancePillClasses(operationalStatus)}">${escapeHtml(operationalStatus)}</span>
          </td>
          <td class="px-4 py-5 align-middle w-[20%]">
            <p class="text-[13px] font-bold ${margin > 0 ? "text-green-700" : "text-red-600"} mb-1">${escapeHtml(`${margin}%`)}</p>
            ${
              margin > 0
                ? '<div class="w-full h-[6px] rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500"></div>'
                : '<div class="w-full h-[6px] rounded-full bg-[#f2f2f2]"></div>'
            }
          </td>
          <td class="pl-4 pr-6 py-5 align-middle whitespace-nowrap w-px">
            <div class="flex items-center justify-center">
              <button
                class="px-4 py-1.5 text-[13px] font-semibold ink-black hairline-border bg-white rounded-[8px] hover:bg-gray-50 transition-colors"
                data-action="open-charge-modal"
                data-id="${client.id}"
                type="button"
              >
                Cobrar
              </button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || ((hasLoadFailure("clientes") || hasLoadFailure("cobranças") || hasLoadFailure("custos") || hasLoadFailure("faturas"))
      ? financeTableEmpty(7, "Não foi possível carregar a margem por cliente.", "Atualize a tela para tentar novamente.", renderRetryAction())
      : financeTableEmpty(7, "Nenhum cliente disponível", "Cadastre clientes para acompanhar receitas, custos e margem.", '<button type="button" class="h-[36px] inline-flex items-center justify-center px-4 text-[13px] font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="novo-cliente">Criar cliente</button>'));

  const costBuckets = [
    { label: "Mídia", value: finance.mediaCost },
    { label: "Produção", value: finance.productionCost },
    { label: "Operação", value: finance.operationsCost },
    { label: "Outros", value: finance.otherCost },
    { label: "Total de custos", value: finance.totalCosts }
  ];

  document.getElementById("fin-custos").innerHTML = costBuckets
    .map(
      (bucket, index) => `
        <div class="flex justify-between ${index < costBuckets.length - 1 ? "py-3 border-b border-[#dddddd]" : "py-4 mt-2"}">
          <span class="${index < costBuckets.length - 1 ? "text-[14px] font-medium ink-black" : "text-[15px] font-bold ink-black"}">${escapeHtml(bucket.label)}</span>
          <span class="${index < costBuckets.length - 1 ? "text-[14px] font-bold ink-black" : "text-[15px] font-bold ink-black"}">${formatCurrency(bucket.value)}</span>
        </div>
      `
    )
    .join("");

  const canManageInvoices = ["admin", "comercial"].includes(state.session.user.role);
  const launchRows = [
    ...finance.filteredCharges.map((charge) => {
      const chargeStatus = getChargeOperationalStatus(charge);
      const isChargeReceived = isChargeReceivedStatus(charge.status);
      const canMarkReceived = canManageInvoices && !isChargeReceived;
      const canMarkPending =
        canManageInvoices
        && !isChargeReceived
        && !isChargeCancelledStatus(charge.status)
        && String(chargeStatus).toLowerCase() !== "pendente";

      const primaryAction = charge.payment_link
        ? `<button type="button" class="h-8 px-3 flex items-center justify-center text-[13px] font-semibold ink-black rounded-[8px] hover:bg-gray-100 transition-colors" data-action="open-charge-resource" data-id="${charge.id}" data-resource="payment_link">Abrir</button>`
        : charge.boleto_url
          ? `<button type="button" class="h-8 px-3 flex items-center justify-center text-[13px] font-semibold ink-black rounded-[8px] hover:bg-gray-100 transition-colors" data-action="open-charge-resource" data-id="${charge.id}" data-resource="boleto_url">Abrir</button>`
          : "";

      return {
        type: "Cobrança",
        title: charge.description || `Cobrança ${charge.client_name || charge.contact_name || ""}`.trim(),
        clientName: charge.client_name || charge.contact_name || "—",
        detail: `${charge.payment_method} · vencimento ${formatDate(charge.due_date)}`,
        value: Number(charge.amount || 0),
        statusLabel: chargeStatus,
        statusClass: getFinancePillClasses(chargeStatus),
        actionHtml: `
          <div class="flex items-center gap-2 justify-end">
            ${primaryAction}
            ${renderFinanceMenu(
              [
                canManageInvoices
                  ? renderFinanceMenuButton({
                      label: "Marcar recebida",
                      action: "update-charge-status",
                      id: charge.id,
                      extra: canMarkReceived ? 'data-status="RECEIVED"' : "disabled"
                    })
                  : "",
                canManageInvoices
                  ? renderFinanceMenuButton({
                      label: "Voltar para pendente",
                      action: "update-charge-status",
                      id: charge.id,
                      extra: canMarkPending ? 'data-status="PENDING"' : "disabled"
                    })
                  : ""
              ],
              "Mais ações da cobrança"
            )}
          </div>
        `
      };
    }),
    ...finance.filteredInvoices.map((invoice) => {
      const statusLabel = getInvoiceOperationalStatus(invoice);
      const isInvoicePaid = isInvoicePaidStatus(invoice.status);
      const canMarkInvoicePaid = canManageInvoices && !isInvoicePaid;
      const canMarkInvoiceOpen = canManageInvoices && !isInvoicePaid && !isInvoiceCancelledStatus(invoice.status) && !isInvoiceOpenStatus(invoice.status);

      return {
        type: "Fatura",
        title: `Fatura ${invoice.client_name || "—"}`,
        clientName: invoice.client_name || "—",
        detail: `Vencimento ${formatDate(invoice.due_date)}`,
        value: Number(invoice.amount || 0),
        statusLabel,
        statusClass: getFinancePillClasses(statusLabel),
        actionHtml: canManageInvoices
          ? `
            <div class="flex items-center gap-2 justify-end">
              ${renderFinanceMenu(
              [
                renderFinanceMenuButton({
                  label: "Marcar como paga",
                  action: "update-invoice-status",
                  id: invoice.id,
                  extra: canMarkInvoicePaid ? 'data-status="Pago"' : "disabled"
                }),
                renderFinanceMenuButton({
                  label: "Voltar para em aberto",
                  action: "update-invoice-status",
                  id: invoice.id,
                  extra: canMarkInvoiceOpen ? 'data-status="Em aberto"' : "disabled"
                })
              ],
              "Mais ações da fatura"
            )}
            </div>
          `
          : '<div class="flex items-center justify-end"><span class="text-[13px] font-medium text-gray-400">—</span></div>'
      };
    })
  ];

  document.getElementById("fin-comissoes").innerHTML =
    launchRows
      .map(
        (row, index) => `
          <tr class="${index < launchRows.length - 1 ? "border-b border-[#dddddd]" : ""} hover:bg-gray-50 transition-colors">
            <td class="pl-6 pr-4 py-5 align-middle whitespace-nowrap w-px">
              <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded ${getFinanceLaunchTypeClasses(row.type)}">${escapeHtml(row.type)}</span>
            </td>
            <td class="px-4 py-5 align-middle w-[30%] max-w-0">
              <div class="group relative">
                <p class="text-[14px] font-semibold ink-black truncate cursor-default">${escapeHtml(row.title || "—")}</p>
              </div>
            </td>
            <td class="px-4 py-5 align-middle w-[25%] max-w-0">
              <p class="text-[13px] ash-gray font-medium truncate">${escapeHtml(row.clientName)}</p>
            </td>
            <td class="px-4 py-5 align-middle w-[20%] max-w-0">
              <p class="text-[13px] ash-gray font-medium truncate">${escapeHtml(row.detail)}</p>
            </td>
            <td class="px-4 py-5 align-middle text-right whitespace-nowrap w-px">
              <p class="${Number(row.value || 0) > 0 ? "text-[14px] font-bold ink-black" : "text-[14px] font-medium text-gray-400"}">${formatCurrencyValue(row.value)}</p>
            </td>
            <td class="px-4 py-5 align-middle text-center whitespace-nowrap w-px">
              <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded ${row.statusClass}">${escapeHtml(row.statusLabel)}</span>
            </td>
            <td class="pl-4 pr-6 py-5 align-middle text-right whitespace-nowrap w-px finance-launch-actions-cell">
              ${row.actionHtml}
            </td>
          </tr>
        `
      )
      .join("")
    || ((hasLoadFailure("cobranças") || hasLoadFailure("faturas"))
      ? financeTableEmpty(7, "Não foi possível carregar os lançamentos financeiros.", "Atualize a tela para tentar novamente.", renderRetryAction())
      : financeTableEmpty(7, "Nenhum lançamento financeiro cadastrado", "Registre cobranças ou faturas para alimentar o histórico financeiro.", '<button type="button" class="h-[36px] inline-flex items-center justify-center px-4 text-[13px] font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="nova-fatura">Nova fatura</button>'));

  bindLegacyInlineHandlers(document.getElementById("page-financeiro"));
}

function renderAll() {
  const sections = [
    ["contadores", renderSidebarCounts],
    ["home", renderHome],
    ["perfil", renderProfile],
    ["kanban", renderKanban],
    ["calendario", renderCalendar],
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
  bindDataActions();
  bindFloatingActionMenus();
  hardenInputPrivacy(document);
  ensureNotificationUi();
}

function bindDataActions() {
  if (document.body.dataset.boundDataActions === "1") {
    return;
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) {
      return;
    }

    if (target.disabled) {
      event.preventDefault();
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id ? Number(target.dataset.id) : null;

    if (action === "close-modal-bg" && event.target !== target) {
      return;
    }

    event.preventDefault();

    switch (action) {
      case "do-login":
        return doLogin();
      case "submit-mfa-login":
        return submitMfaLogin();
      case "cancel-mfa-login":
        return resetMfaLoginState();
      case "toggle-mfa-secret":
        return toggleMfaSecret();
      case "copy-mfa-secret":
        return copyMfaSecret();
      case "do-logout":
        return doLogout();
      case "go-to":
        return goTo(target.dataset.page || "");
      case "set-tab":
        return setTab(target.dataset.group || "", target.dataset.tab || "");
      case "open-modal":
        return openModal(target.dataset.modal || "", id || null);
      case "shift-calendar":
        return shiftCalendarWeek(Number(target.dataset.offset || 0));
      case "calendar-today":
        return goToCalendarToday();
      case "export-finance":
        return exportFinanceCsv();
      case "sync-traffic":
        return syncTrafficData();
      case "open-protected-resource":
        return openProtectedResource(target.dataset.url || "");
      case "toast":
        return showToast(target.dataset.message || "");
      case "open-charge-resource":
        return openChargeResource(id, target.dataset.resource || "");
      case "copy-charge-pix":
        return copyChargePix(id);
      case "update-charge-status":
        return updateChargeStatus(id, target.dataset.status || "");
      case "update-invoice-status":
        return updateInvoiceStatus(id, target.dataset.status || "");
      case "delete-task":
        return deleteTask(id);
      case "delete-lead":
        return deleteLead(id);
      case "convert-lead":
        return convertLead(id);
      case "delete-client":
        return deleteClient(id);
      case "delete-campaign":
        return deleteCampaign(id);
      case "delete-integration":
        return deleteIntegration(id);
      case "delete-material":
        return deleteMaterial(id);
      case "delete-calendar-event":
        return deleteCalendarEvent(id);
      case "open-charge-modal":
        return openChargeModalForClient(id);
      case "retry-refresh":
        return refreshData();
      case "retry-calendar":
        return loadCalendarEvents(state.calendar.weekStart || new Date(), { force: true });
      case "confirm-modal-action":
        return confirmModalAction();
      case "close-modal":
        return closeModal();
      case "close-modal-bg":
        return closeModalIfBg(event);
      default:
        return;
    }
  });

  document.body.dataset.boundDataActions = "1";
}

function renderAccessV2() {
  if (state.session.user.role !== "admin") {
    return;
  }

  bindAccessMemberActions();

  const sortedUsers = [...(state.accessMembers.length ? state.accessMembers : state.users)].sort((left, right) => {
    if (Boolean(left.is_online) !== Boolean(right.is_online)) {
      return Number(Boolean(right.is_online)) - Number(Boolean(left.is_online));
    }

    const leftSeen = left.last_seen_at || left.last_login_at || "";
    const rightSeen = right.last_seen_at || right.last_login_at || "";
    if (leftSeen !== rightSeen) {
      return String(rightSeen).localeCompare(String(leftSeen));
    }

    return String(left.name || "").localeCompare(String(right.name || ""), "pt-BR");
  });

  const membersBody = document.getElementById("membros-tbody");
  const profilesGrid = document.getElementById("perfis-grid");

  const roleConfig = {
    admin: {
      label: "Admin",
      badgeClass: "bg-red-50 text-red-700",
      avatarClass: "bg-pink-50 text-pink-700",
      avatarBorder: ""
    },
    dev: {
      label: "Desenvolvimento",
      badgeClass: "bg-blue-50 text-blue-700",
      avatarClass: "bg-[#f2f2f2] text-[#222222]",
      avatarBorder: ""
    },
    comercial: {
      label: "Comercial",
      badgeClass: "bg-orange-50 text-orange-700",
      avatarClass: "bg-[#f2f2f2] text-[#222222]",
      avatarBorder: ""
    },
    gestor: {
      label: "Gestor",
      badgeClass: "bg-green-50 text-green-700",
      avatarClass: "bg-[#f2f2f2] text-[#222222]",
      avatarBorder: ""
    },
    designer: {
      label: "Designer",
      badgeClass: "bg-[#f0f4f8] text-[#3366cc]",
      avatarClass: "bg-[#f2f2f2] text-[#222222]",
      avatarBorder: ""
    },
    client: {
      label: "Cliente",
      badgeClass: "bg-gray-100 text-gray-600 hairline-border",
      avatarClass: "bg-gray-100 text-gray-600",
      avatarBorder: "hairline-border"
    }
  };

  const getMemberRoleConfig = (role) => roleConfig[String(role || "").toLowerCase()] || {
    label: ROLE_LABELS[String(role || "").toLowerCase()] || getDisplayText(role, "Membro"),
    badgeClass: "bg-gray-100 text-gray-600 hairline-border",
    avatarClass: "bg-[#f2f2f2] text-[#222222]",
    avatarBorder: ""
  };

  const getPresenceDotClass = (presenceTone) => {
    if (presenceTone === "is-online") {
      return "bg-green-500";
    }
    if (presenceTone === "is-inactive") {
      return "bg-red-400";
    }
    return "bg-gray-300";
  };

  const renderAccessMenuButton = ({ label, action, id, className = "" }) => `
    <button
      type="button"
      class="w-full text-left px-3 py-2 text-[13px] font-medium rounded-[8px] hover:bg-gray-50 transition-colors ${className}"
      ${action ? `data-action="${action}"` : ""}
      ${id != null ? `data-id="${id}"` : ""}
    >
      ${escapeHtml(label)}
    </button>
  `;

  const renderAccessMenu = (actions = [], label = "Mais ações") => {
    const items = actions.filter(Boolean).join("");
    if (!items) {
      return `
        <button type="button" class="w-8 h-8 rounded-full hairline-border flex items-center justify-center text-gray-400 cursor-default" aria-label="${escapeHtml(label)}" disabled>
          <span class="text-gray-500 font-bold mb-1">...</span>
        </button>
      `;
    }

    return `
      <details class="access-menu relative">
        <summary class="w-8 h-8 rounded-full hairline-border flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer" aria-label="${escapeHtml(label)}">
          <span class="text-gray-500 font-bold mb-1">...</span>
        </summary>
        <div class="absolute right-0 top-[calc(100%+8px)] z-30 flex flex-col gap-1 min-w-[188px] p-2 bg-white border border-[#dddddd] rounded-[10px] shadow-[0_16px_32px_rgba(0,0,0,0.12)] access-menu-panel" data-floating-menu-panel="1">
          ${items}
        </div>
      </details>
    `;
  };

  if (membersBody) {
    membersBody.innerHTML = sortedUsers.length
      ? sortedUsers
          .map((user, index, list) => {
            const roleMeta = getMemberRoleConfig(user.role);
            const presence = getMemberPresenceMeta(user);
            const lastAccess = user.last_seen_at || user.last_login_at;
            const lastAccessLabel = lastAccess ? formatDateTime(lastAccess) : "—";
            const locationLabel = formatAccessLocationLabel(user.last_seen_location);
            const canRemoveUser = Number(user.id) !== Number(state.session.user.id) && String(user.role || "").toLowerCase() !== "admin";
            const rowClass = index < list.length - 1
              ? "border-b border-[#dddddd] hover:bg-gray-50 transition-colors"
              : "hover:bg-gray-50 transition-colors";

            return `
              <tr class="${rowClass}">
                <td class="pl-6 pr-4 py-4 align-middle w-[35%] max-w-0">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full ${roleMeta.avatarClass} ${roleMeta.avatarBorder} flex flex-shrink-0 items-center justify-center text-[13px] font-bold">${escapeHtml(getInitials(user.name || "ONE"))}</div>
                    <div class="group relative truncate w-full">
                      <p class="text-[14px] font-semibold ink-black truncate cursor-default">${escapeHtml(user.name || "—")}</p>
                      <p class="text-[13px] ash-gray font-medium truncate mt-0.5">${escapeHtml(user.email || "—")}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 align-middle whitespace-nowrap w-px">
                  <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${roleMeta.badgeClass}">${escapeHtml(roleMeta.label)}</span>
                </td>
                <td class="px-4 py-4 align-middle whitespace-nowrap w-px">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${getPresenceDotClass(presence.tone)}"></span>
                    <span class="text-[13px] font-medium ink-black">${escapeHtml(presence.label)}</span>
                  </div>
                </td>
                <td class="px-4 py-4 align-middle w-[35%] max-w-0">
                  <p class="text-[13px] font-medium ${lastAccess ? "ink-black" : "ash-gray"} truncate">${escapeHtml(lastAccessLabel)}</p>
                  ${locationLabel ? `<p class="text-[12px] ash-gray truncate mt-0.5">${escapeHtml(locationLabel)}</p>` : ""}
                </td>
                <td class="pl-4 pr-6 py-4 align-middle whitespace-nowrap w-px">
                  <div class="flex items-center justify-end gap-2">
                    <button class="h-8 px-3 flex items-center justify-center text-[13px] font-semibold ink-black hairline-border bg-white rounded-[8px] hover:bg-gray-50 transition-colors" type="button" data-access-edit="${user.id}">Editar</button>
                    ${renderAccessMenu(
                      canRemoveUser
                        ? [
                            renderAccessMenuButton({
                              label: "Remover membro",
                              action: "noop",
                              id: user.id,
                              className: "text-[#c24141] hover:bg-red-50 hover:text-[#991b1b]"
                            }).replace('data-action="noop"', `data-access-remove="${user.id}"`)
                          ]
                        : [],
                      "Mais ações do membro"
                    )}
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")
      : `
          <tr>
            <td colspan="5" class="px-6 py-10 text-center">
              <div class="text-[15px] font-semibold text-[#222222]">${escapeHtml(hasLoadFailure("controle de acesso") ? "Não foi possível carregar os membros." : "Nenhum membro cadastrado")}</div>
              <div class="text-[13px] text-[#6a6a6a] font-medium mt-1">${escapeHtml(hasLoadFailure("controle de acesso") ? "Atualize a tela para tentar novamente." : "Crie o primeiro usuário interno para liberar o acesso da equipe.")}</div>
              <div class="mt-4 flex items-center justify-center">
                ${
                  hasLoadFailure("controle de acesso")
                    ? renderRetryAction()
                    : '<button type="button" class="h-[36px] px-5 text-[13px] font-medium text-white bg-[#ff385c] rounded-[8px] hover:scale-[0.98] transition-transform" data-action="open-modal" data-modal="novo-membro">+ Novo membro</button>'
                }
              </div>
            </td>
          </tr>
        `;
  }

  const roleCards = [
    { title: "Admin", badge: "Admin", badgeClass: "bg-red-50 text-red-700", permissions: ["Clientes", "Campanhas", "Kanban", "Produção", "Tráfego", "Analytics", "Financeiro", "Controle de acesso"] },
    { title: "Gestor", badge: "Gestor", badgeClass: "bg-green-50 text-green-700", permissions: ["Dashboard interno", "Kanban", "CRM", "Campanhas", "Produção", "Tráfego", "Analytics", "Cobranças"] },
    { title: "Designer", badge: "Designer", badgeClass: "bg-[#f0f4f8] text-[#3366cc]", permissions: ["Dashboard interno", "Kanban", "Produção"] },
    { title: "Comercial", badge: "Comercial", badgeClass: "bg-orange-50 text-orange-700", permissions: ["Dashboard interno", "Kanban", "CRM", "Campanhas", "Produção", "Financeiro"] },
    { title: "Dev", badge: "Dev", badgeClass: "bg-blue-50 text-blue-700", permissions: ["Dashboard interno", "Kanban", "Produção", "Analytics"] },
    { title: "Cliente", badge: "Cliente", badgeClass: "bg-gray-100 text-gray-600 hairline-border", permissions: ["Dashboard", "Campanhas", "Relatórios", "Faturas", "Mensagens"] }
  ];

  if (profilesGrid) {
    profilesGrid.innerHTML = roleCards
      .map(
        (role) => `
          <div class="bg-white hairline-border rounded-[14px] shadow-[rgba(0,0,0,0.02)_0_2px_6px] p-6 flex flex-col h-full">
            <div class="flex justify-between items-center pb-4 border-b border-[#dddddd] mb-4">
              <h3 class="text-[16px] font-bold ink-black">${escapeHtml(role.title)}</h3>
              <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${role.badgeClass}">${escapeHtml(role.badge)}</span>
            </div>
            <ul class="space-y-3 text-[14px] font-medium ink-black">
              ${role.permissions.map((permission) => `<li>${escapeHtml(permission)}</li>`).join("")}
            </ul>
          </div>
        `
      )
      .join("");
  }
}

async function refreshData() {
  const roleDataAccess = ROLE_DATA_ACCESS[state.session.user.role] || {};
  const resourceFailures = [];
  const fetchFailures = [];
  const loadResource = async (label, loader, fallback) => {
    try {
      return await loader();
    } catch (error) {
      resourceFailures.push(label);
      if (!NON_BLOCKING_MODULE_FAILURES.has(label)) {
        fetchFailures.push(label);
      }
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
    campaignsKpis.innerHTML = Array.from({ length: 4 }, () => `
      <div class="campaigns-kpi-card">
        <div class="skeleton skeleton-text" style="width:52%"></div>
        <div class="skeleton skeleton-kpi"></div>
        <div class="skeleton skeleton-text" style="width:42%"></div>
      </div>
    `).join("");
  }

  const trafficKpis = document.getElementById("traffic-kpi-grid");
  if (trafficKpis) {
    trafficKpis.innerHTML = UI.skeletonKpis(4);
  }

  const financeKpis = document.getElementById("finance-kpis");
  if (financeKpis) {
    financeKpis.innerHTML = UI.skeletonKpis(4);
  }

  const analyticsKpis = document.querySelector("#page-analytics .kpi-grid");
  if (analyticsKpis) {
    analyticsKpis.innerHTML = UI.skeletonKpis(4);
  }

  const campaignsBody = document.getElementById("campanhas-tbody");
  if (campaignsBody) {
    campaignsBody.innerHTML = UI.skeletonRows(6, 4);
  }

  const membersBody = document.getElementById("membros-tbody");
  if (membersBody) {
    membersBody.innerHTML = UI.skeletonRows(5, 5);
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
    clientsBody.innerHTML = UI.skeletonRows(6, 4);
  }

  const historyBody = document.getElementById("historico-tbody");
  if (historyBody) {
    historyBody.innerHTML = UI.skeletonRows(6, 4);
  }

  const financeClientsBody = document.getElementById("fin-clientes");
  if (financeClientsBody) {
    financeClientsBody.innerHTML = UI.skeletonRows(7, 4);
  }

  const financeLaunchesBody = document.getElementById("fin-comissoes");
  if (financeLaunchesBody) {
    financeLaunchesBody.innerHTML = UI.skeletonRows(7, 4);
  }

  const designBody = document.getElementById("prod-design-tbody");
  if (designBody) {
    designBody.innerHTML = UI.skeletonRows(4, 4);
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
    trafficBody.innerHTML = UI.skeletonRows(9, 4);
  }

  const pipelineBoard = document.getElementById("pipeline-board");
  if (pipelineBoard) {
    pipelineBoard.innerHTML = UI.skeletonPipeline(5, 2);
  }

  const platformBreakdown = document.getElementById("traffic-platform-breakdown");
  if (platformBreakdown) {
    platformBreakdown.innerHTML = UI.skeletonProgress(4);
  }

  const resourceLoaders = [
    () => loadResource("dashboard", () => apiFetch("/dashboard"), () => createEmptyDashboard()),
    () => (roleDataAccess.homeTeam ? loadResource("equipe", () => apiFetch("/users/team", { cache: "no-store" }), []) : Promise.resolve([])),
    () => (roleDataAccess.assignableUsers ? loadResource("responsáveis", () => apiFetch("/users/assignable", { cache: "no-store" }), []) : Promise.resolve([])),
    () => (roleDataAccess.clients ? loadResource("clientes", () => apiFetch("/clients", { cache: "no-store" }), []) : Promise.resolve([])),
    () => (roleDataAccess.campaigns ? loadResource("campanhas", () => apiFetch("/campaigns"), []) : Promise.resolve([])),
    () => (roleDataAccess.tasks ? loadResource("tarefas", () => apiFetch("/tasks"), []) : Promise.resolve([])),
    () => (roleDataAccess.tasks ? loadResource("checklist", () => apiFetch("/checklists/daily", { cache: "no-store" }), () => createEmptyChecklistSnapshot()) : Promise.resolve(createEmptyChecklistSnapshot())),
    () => (roleDataAccess.users ? loadResource("usuários", () => apiFetch("/users", { cache: "no-store" }), []) : Promise.resolve([])),
    () => (roleDataAccess.users ? loadResource("controle de acesso", () => apiFetch("/users/access-overview", { cache: "no-store" }), []) : Promise.resolve([])),
    () => (roleDataAccess.contacts ? loadResource("CRM", () => apiFetch("/contacts"), []) : Promise.resolve([])),
    () => (roleDataAccess.invoices ? loadResource("faturas", () => apiFetch("/invoices"), []) : Promise.resolve([])),
    () => (roleDataAccess.costs ? loadResource("custos", () => apiFetch("/cost-entries"), []) : Promise.resolve([])),
    () => (roleDataAccess.metrics ? loadResource("métricas", () => apiFetch("/metrics", { cache: "no-store" }), []) : Promise.resolve([])),
    () => (roleDataAccess.reports ? loadResource("relatórios", () => apiFetch("/reports"), []) : Promise.resolve([])),
    () => (roleDataAccess.materials ? loadResource("produção", () => apiFetch("/materials"), []) : Promise.resolve([])),
    () => (roleDataAccess.files ? loadResource("arquivos", () => apiFetch("/files"), []) : Promise.resolve([])),
    () => (roleDataAccess.charges ? loadResource("cobranças", () => apiFetch("/charges"), []) : Promise.resolve([])),
    () => (roleDataAccess.integrations ? loadResource("integrações", () => apiFetch("/integrations"), []) : Promise.resolve([])),
  ];

  const [dashboard, team, assignableUsers, clients, campaigns, tasks, checklist, users, accessMembers, contacts, invoices, costEntries, metrics, reports, materials, files, charges, integrations] = await runAsyncTasksInBatches(resourceLoaders, 4);

  state.dashboard = dashboard && typeof dashboard === "object" ? dashboard : createEmptyDashboard();
  state.team = mergeInternalUsers(toArray(team), toArray(assignableUsers), toArray(state.dashboard?.team), toArray(users));
  state.assignableUsers = mergeInternalUsers(toArray(assignableUsers), toArray(team));
  state.clients = toArray(clients);
  state.campaigns = toArray(campaigns);
  state.tasks = toArray(tasks);
  state.users = toArray(users).length ? toArray(users) : [state.session.user];
  state.accessMembers = toArray(accessMembers);
  state.contacts = toArray(contacts);
  state.invoices = toArray(invoices);
  state.costEntries = toArray(costEntries);
  state.metrics = toArray(metrics);
  state.reports = toArray(reports);
  state.materials = toArray(materials);
  state.files = toArray(files);
  state.charges = toArray(charges);
  state.integrations = toArray(integrations);
  state.checklist = normalizeChecklistSnapshot(checklist);
  state.loadFailures = new Set(resourceFailures);

  const scopedClients = getScopedClientOptions();
  const hasSelectedKanbanClient = scopedClients.some((client) => String(client.id) === String(state.filters.kanbanClient));
  const hasSelectedAnalyticsClient = scopedClients.some((client) => String(client.id) === String(state.filters.analyticsClient));
  if (state.filters.kanbanClient && !hasSelectedKanbanClient) {
    state.filters.kanbanClient = "";
  }
  if (state.filters.analyticsClient && !hasSelectedAnalyticsClient) {
    state.filters.analyticsClient = "";
  }

  const kanbanFilter = document.getElementById("kanban-client-filter");
  if (kanbanFilter) {
    kanbanFilter.innerHTML = `<option value="">Todos os clientes</option>${scopedClients
      .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`)
      .join("")}`;
    kanbanFilter.value = state.filters.kanbanClient;
  }

  const analyticsClientFilter = document.getElementById("analytics-client-filter");
  if (analyticsClientFilter) {
    analyticsClientFilter.innerHTML = `<option value="">Todos os clientes</option>${scopedClients
      .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`)
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

  const financePeriodFilter = document.getElementById("finance-period-filter");
  if (financePeriodFilter) {
    financePeriodFilter.innerHTML = getFinancePeriodOptions()
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join("");
    financePeriodFilter.value = state.filters.financePeriod;
  }

  const analyticsActions = document.querySelector("#page-analytics .topbar-actions");
  const integrationsButton = document.getElementById("btn-manage-integrations");
  if (analyticsActions && canManageIntegrations() && hasScopedClients() && !integrationsButton) {
    const button = document.createElement("button");
    button.id = "btn-manage-integrations";
    button.className = "btn btn-pink btn-sm";
    button.textContent = "+ Nova integração";
    button.dataset.action = "open-modal";
    button.dataset.modal = "nova-integracao";
    analyticsActions.append(button);
  }
  if (integrationsButton && (!canManageIntegrations() || !hasScopedClients())) {
    integrationsButton.remove();
  }

  const crmActions = document.querySelector("#page-crm .crm-topbar-actions");
  const newClientButton = document.getElementById("btn-new-client");
  if (crmActions && canManageClients() && !newClientButton) {
    const button = document.createElement("button");
    button.id = "btn-new-client";
    button.className = "btn btn-outline btn-sm";
    button.textContent = "+ Novo cliente";
    button.dataset.action = "open-modal";
    button.dataset.modal = "novo-cliente";
    crmActions.prepend(button);
  }
  if (newClientButton) {
    newClientButton.style.display = canManageClients() ? "" : "none";
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

function setLoginError(message = "") {
  const errorNode = document.getElementById("login-error");
  if (!errorNode) {
    return;
  }

  errorNode.textContent = message;
  errorNode.style.display = message ? "block" : "none";
}

function formatMfaSecret(secret) {
  return String(secret || "")
    .replace(/\s+/g, "")
    .match(/.{1,4}/g)
    ?.join(" ")
    || "";
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "readonly");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  helper.style.pointerEvents = "none";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  document.body.removeChild(helper);
}

function syncMfaLoginView() {
  const emailField = document.getElementById("l-email")?.closest(".login-field");
  const passwordField = document.getElementById("l-pass")?.closest(".login-field");
  const loginButton = document.getElementById("login-submit-btn");
  const mfaSubmitButton = document.getElementById("mfa-submit-btn");
  const mfaStep = document.getElementById("mfa-step");
  const mfaSetupHelp = document.getElementById("mfa-setup-help");
  const mfaStatusText = document.getElementById("mfa-status-text");
  const mfaSecret = document.getElementById("mfa-secret");
  const mfaSecretToggle = document.getElementById("mfa-secret-toggle");
  const mfaQrShell = document.getElementById("mfa-qr-shell");
  const mfaQrImage = document.getElementById("mfa-qr-image");
  const isMfaStepActive = Boolean(mfaLoginState.challengeToken);

  [emailField, passwordField].filter(Boolean).forEach((field) => {
    field.hidden = isMfaStepActive;
  });

  if (loginButton) {
    loginButton.hidden = isMfaStepActive;
  }
  if (mfaSubmitButton) {
    mfaSubmitButton.hidden = !isMfaStepActive;
  }

  if (!mfaStep) {
    return;
  }

  mfaStep.hidden = !isMfaStepActive;

  if (!isMfaStepActive) {
    if (mfaSetupHelp) {
      mfaSetupHelp.hidden = true;
    }
    if (mfaStatusText) {
      mfaStatusText.hidden = true;
      mfaStatusText.textContent = "";
    }
    if (mfaSecret) {
      mfaSecret.textContent = "";
      mfaSecret.hidden = true;
    }
    if (mfaSecretToggle) {
      mfaSecretToggle.textContent = "Mostrar chave manual";
    }
    if (mfaQrShell) {
      mfaQrShell.hidden = true;
    }
    if (mfaQrImage) {
      mfaQrImage.removeAttribute("src");
    }
    return;
  }

  const enrollmentMode = mfaLoginState.mode === "enroll";
  if (mfaSetupHelp) {
    mfaSetupHelp.hidden = !enrollmentMode;
  }
  if (mfaStatusText) {
    mfaStatusText.hidden = !enrollmentMode;
    mfaStatusText.textContent = enrollmentMode
      ? "Cadastre o autenticador e valide o primeiro código de verificação para concluir o primeiro acesso."
      : "";
  }
  if (mfaQrShell) {
    mfaQrShell.hidden = !(enrollmentMode && mfaLoginState.qrCodeDataUrl);
  }
  if (mfaQrImage) {
    if (enrollmentMode && mfaLoginState.qrCodeDataUrl) {
      mfaQrImage.src = mfaLoginState.qrCodeDataUrl;
    } else {
      mfaQrImage.removeAttribute("src");
    }
  }
  if (mfaSecret) {
    const shouldShowSecret = enrollmentMode && mfaLoginState.secretVisible && Boolean(mfaLoginState.secret);
    mfaSecret.textContent = shouldShowSecret ? mfaLoginState.secret : "";
    mfaSecret.hidden = !shouldShowSecret;
  }
  if (mfaSecretToggle) {
    mfaSecretToggle.hidden = !enrollmentMode;
    mfaSecretToggle.textContent = mfaLoginState.secretVisible ? "Ocultar chave manual" : "Mostrar chave manual";
  }
}

function resetMfaLoginState() {
  mfaLoginState.challengeToken = "";
  mfaLoginState.mode = "";
  mfaLoginState.secret = "";
  mfaLoginState.secretRaw = "";
  mfaLoginState.secretVisible = false;
  mfaLoginState.qrCodeDataUrl = "";
  mfaLoginState.pending = false;

  const otpInput = document.getElementById("mfa-otp");
  if (otpInput) {
    otpInput.value = "";
  }

  syncMfaLoginView();
}

async function showMfaChallenge(session) {
  mfaLoginState.challengeToken = session.challenge_token || session.challengeToken || "";
  mfaLoginState.mode = session.mfa_enrollment_required || session.mfaEnrollmentRequired ? "enroll" : "login";
  mfaLoginState.secret = "";
  mfaLoginState.secretRaw = "";
  mfaLoginState.secretVisible = false;
  mfaLoginState.qrCodeDataUrl = "";

  if (mfaLoginState.mode === "enroll") {
    const setup = await apiFetch("/auth/mfa/totp/setup", {
      method: "POST",
      body: JSON.stringify({
        challenge_token: mfaLoginState.challengeToken,
      }),
      auth: false,
      timeoutMs: 20000
    });

    mfaLoginState.secretRaw = setup.secret || "";
    mfaLoginState.secret = setup.secret_formatted || formatMfaSecret(setup.secret || "");
    mfaLoginState.qrCodeDataUrl = setup.qr_code_data_url || "";
  }

  syncMfaLoginView();
  document.getElementById("mfa-otp")?.focus();
}

function toggleMfaSecret() {
  if (mfaLoginState.mode !== "enroll" || !mfaLoginState.secret) {
    return;
  }

  mfaLoginState.secretVisible = !mfaLoginState.secretVisible;
  syncMfaLoginView();
}

async function copyMfaSecret() {
  if (mfaLoginState.mode !== "enroll" || !mfaLoginState.secretRaw) {
    return;
  }

  try {
    await copyTextToClipboard(mfaLoginState.secretRaw);
    showToast("Chave manual copiada. Guarde-a com cuidado e finalize o cadastro no autenticador.");
  } catch (_error) {
    showToast("Não foi possível copiar a chave manual agora.");
  }
}

async function submitMfaLogin() {
  const otp = document.getElementById("mfa-otp")?.value?.trim() || "";
  const submitButton = document.querySelector('[data-action="submit-mfa-login"]');

  await FORM.submit(
    { querySelector: () => submitButton },
    async () => {
      if (!mfaLoginState.challengeToken) {
        throw new Error("Reinicie o login para continuar.");
      }

      if (!/^\d{6}$/.test(otp)) {
        throw new Error("Informe um código de verificação válido com 6 dígitos.");
      }

      const path = mfaLoginState.mode === "enroll" ? "/auth/mfa/totp/enroll" : "/auth/mfa/totp/verify";
      const session = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify({
          challenge_token: mfaLoginState.challengeToken,
          otp,
        }),
        auth: false,
        timeoutMs: 20000
      });

      if (session.user.role === "client") {
        throw new Error("Este painel é restrito aos perfis internos.");
      }

      resetMfaLoginState();
      saveSession(session);
      await initializeApp();
    },
    { loadingText: "Validando...", button: submitButton }
  )().catch((error) => {
    const message = String(error?.message || "").trim();
    setLoginError(message || "Não foi possível validar o MFA.");
  });
}

async function doLogin() {
  const email = document.getElementById("l-email").value.trim();
  const password = document.getElementById("l-pass").value;
  setLoginError("");
  const submitButton = document.getElementById("login-submit-btn");

  await FORM.submit(
    { querySelector: () => submitButton },
    async () => {
      if (!email || !password) {
        throw new Error("Digite um e-mail e uma senha.");
      }

      const session = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false,
        timeoutMs: 20000
      });

      if (session.mfa_required || session.mfaRequired || session.mfa_enrollment_required || session.mfaEnrollmentRequired) {
        await showMfaChallenge(session);
        return;
      }

      if (session.user.role === "client") {
        throw new Error("Este painel é restrito aos perfis internos.");
      }

      saveSession(session);
      await initializeApp();
    },
    { loadingText: "Entrando...", button: submitButton }
  )().catch((error) => {
    const message = String(error?.message || "").trim();
    const normalizedMessage = /digite um e-mail e( uma)? senha/i.test(message)
      ? "Digite um e-mail e uma senha."
      : /login ou senha incorretos|e-mail ou senha inv[aá]lidos|informe um e-mail v[aá]lido|senha obrigat[oó]ria/i.test(message)
        ? "Login ou senha incorretos."
        : /c[oó]digo totp|c[oó]digo mfa|mfa/i.test(message)
          ? message
        : message || "Erro ao entrar no painel.";
    setLoginError(normalizedMessage);
  });
}

function bindLoginForm() {
  const loginForm = document.getElementById("login-form");
  if (!loginForm || loginForm.dataset.bound === "1") {
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (mfaLoginState.challengeToken) {
      await submitMfaLogin();
      return;
    }

    await doLogin();
  });

  loginForm.dataset.bound = "1";
}

async function initializeApp() {
  const me = await apiFetch("/auth/me");
  state.session.user = me.user;
  saveSession(state.session);
  syncPanelTheme();
  setRoleUI(me.user);
  document.getElementById("home-date").textContent = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full"
  }).format(new Date());
  document.getElementById("login-screen").classList.add("hidden");
  syncNavigation();
  bindSidebarInteractions();
  bindLegacyInlineHandlers();
  await refreshData();
  await refreshNotifications({ silent: true, suppressErrors: true });
  startNotificationPolling();
}

function doLogout() {
  closeSidebar();
  stopNotificationPolling();
  resetMfaLoginState();
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
    const prodPanels = {
      design: document.getElementById("prod-design"),
      copy: document.getElementById("prod-copy"),
      lp: document.getElementById("prod-lp")
    };
    Object.entries(prodPanels).forEach(([panelTab, panel]) => {
      if (!panel) {
        return;
      }
      const isActive = panelTab === tab;
      panel.style.display = isActive ? "block" : "none";
      panel.classList.toggle("block", isActive);
      panel.classList.toggle("hidden", !isActive);
    });
  }

  if (group === "acesso") {
    const accessPanels = {
      membros: document.getElementById("acesso-membros"),
      perfis: document.getElementById("acesso-perfis")
    };
    Object.entries(accessPanels).forEach(([panelTab, panel]) => {
      if (!panel) {
        return;
      }
      const isActive = panelTab === tab;
      panel.style.display = isActive ? "block" : "none";
      panel.classList.toggle("block", isActive);
      panel.classList.toggle("hidden", !isActive);
    });
  }

  document.querySelectorAll(`[id^="${group}-tab-"]`).forEach((node) => {
    const isActive = node.id === `${group}-tab-${tab}`;
    node.classList.toggle("active", isActive);
    if (group === "prod" && node.classList.contains("prod-tab-btn")) {
      node.classList.toggle("border-[#222222]", isActive);
      node.classList.toggle("text-[#222222]", isActive);
      node.classList.toggle("font-semibold", isActive);
      node.classList.toggle("border-transparent", !isActive);
      node.classList.toggle("text-[#6a6a6a]", !isActive);
      node.classList.toggle("font-medium", !isActive);
    }
    if (group === "acesso" && node.classList.contains("access-tab-btn")) {
      node.classList.toggle("border-[#222222]", isActive);
      node.classList.toggle("text-[#222222]", isActive);
      node.classList.toggle("font-semibold", isActive);
      node.classList.toggle("border-transparent", !isActive);
      node.classList.toggle("text-[#6a6a6a]", !isActive);
      node.classList.toggle("font-medium", !isActive);
    }
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

function setFinancePeriodFilter(period) {
  state.filters.financePeriod = period || "month";
  renderFinance();
}

async function syncTrafficData() {
  await refreshData();
  showToast("Painel atualizado com sucesso.");
}

async function updateInvoiceStatus(id, status) {
  try {
    const invoice = state.invoices.find((item) => Number(item.id) === Number(id));
    if (!invoice) {
      showToast("Fatura não encontrada.");
      return;
    }

    const normalizedStatus = String(status || "").trim().toLowerCase();
    const invoicePaid = isInvoicePaidStatus(invoice.status);

    if (invoicePaid) {
      showToast("Esta fatura já está paga.");
      return;
    }

    if (normalizedStatus === "pago" && invoicePaid) {
      showToast("Esta fatura já está paga.");
      return;
    }

    if (normalizedStatus === "em aberto" && isInvoiceOpenStatus(invoice.status)) {
      showToast("Esta fatura já está em aberto.");
      return;
    }

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
  const finance = buildFinanceViewModel();
  const rows = [
    ["tipo", "cliente", "classe", "valor", "status", "data", "referencia"],
    ...finance.filteredCosts.map((entry) => [
      "custo",
      entry.client_name || "",
      getCostCategoryLabel(entry.category),
      Number(entry.amount || 0),
      "lançado",
      formatDate(entry.incurred_on || entry.created_at),
      entry.description || ""
    ]),
    ...finance.filteredCharges.map((charge) => [
      "cobrança",
      charge.client_name || charge.contact_name || "",
      charge.payment_method || "",
      Number(charge.amount || 0),
      getChargeOperationalStatus(charge),
      formatDate(charge.due_date),
      charge.provider_charge_id || charge.external_reference || ""
    ]),
    ...finance.filteredInvoices.map((invoice) => [
      "fatura",
      invoice.client_name,
      "",
      Number(invoice.amount || 0),
      getInvoiceOperationalStatus(invoice),
      formatDate(invoice.due_date),
      invoice.id
    ])
  ];
  const csv = rows.map((row) => row.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `financeiro-${state.filters.financePeriod || "month"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function modalFormWrapper(title, body, submitLabel = "Salvar") {
  return `
    <form id="modal-form" autocomplete="off">
      <div class="modal-title" id="modal-dialog-title">${escapeHtml(title)}</div>
      <div class="form-grid">${body}</div>
      <div class="form-status" id="modal-form-status" role="alert"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-action="close-modal">Cancelar</button>
        <button type="submit" id="modal-submit-btn" class="btn btn-pink">${escapeHtml(submitLabel)}</button>
      </div>
    </form>
  `;
}

function setFormStatus(form, message = "") {
  const statusNode = form?.querySelector("#modal-form-status");
  if (!statusNode) {
    return;
  }

  statusNode.textContent = message;
  statusNode.classList.toggle("is-visible", Boolean(message));
}

function clearFieldError(field) {
  const wrapper = field?.closest?.(".field");
  if (!wrapper) {
    return;
  }

  wrapper.classList.remove("is-error");
  field.removeAttribute("aria-invalid");
  wrapper.querySelector(".field-error")?.remove();
}

function showFieldError(field, message) {
  const wrapper = field?.closest?.(".field");
  if (!wrapper) {
    return;
  }

  clearFieldError(field);
  wrapper.classList.add("is-error");
  field.setAttribute("aria-invalid", "true");

  const errorNode = document.createElement("div");
  errorNode.className = "field-error";
  errorNode.textContent = message;
  wrapper.appendChild(errorNode);
}

function clearFormErrors(form) {
  if (!form) {
    return;
  }

  setFormStatus(form, "");
  form.querySelectorAll(".field input, .field select, .field textarea").forEach(clearFieldError);
}

function validateFormFields(form) {
  if (!form) {
    return true;
  }

  clearFormErrors(form);

  const fields = [...form.querySelectorAll("input, select, textarea")].filter((field) => field.willValidate !== false);
  let firstInvalidField = null;

  fields.forEach((field) => {
    if (field.checkValidity()) {
      return;
    }

    showFieldError(field, field.validationMessage || "Revise este campo.");
    if (!firstInvalidField) {
      firstInvalidField = field;
    }
  });

  if (firstInvalidField) {
    firstInvalidField.focus();
    return false;
  }

  return true;
}

function bindModalFieldValidation(form) {
  if (!form || form.dataset.boundFieldValidation === "1") {
    return;
  }

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field));
    field.addEventListener("change", () => clearFieldError(field));
    field.addEventListener(
      "invalid",
      (event) => {
        event.preventDefault();
        showFieldError(field, field.validationMessage || "Revise este campo.");
      },
      true
    );
  });

  form.dataset.boundFieldValidation = "1";
}

function openConfirmationModal({
  title,
  description,
  confirmLabel = "Confirmar ação",
  confirmClassName = "btn btn-danger"
}) {
  const modal = document.getElementById("modal-content");
  lastFocusedElement = document.activeElement;
  modal.innerHTML = `
    <div class="modal-title" id="modal-dialog-title">${escapeHtml(title)}</div>
    <p class="metric-note">${escapeHtml(description)}</p>
    <div class="form-status" id="modal-form-status" role="alert"></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-outline" data-action="close-modal">Cancelar</button>
      <button type="button" id="modal-confirm-btn" class="${confirmClassName}" data-action="confirm-modal-action">${escapeHtml(confirmLabel)}</button>
    </div>
  `;
  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("modal-overlay").setAttribute("aria-hidden", "false");
  bindLegacyInlineHandlers(document.getElementById("modal-overlay"));
}

async function confirmModalAction() {
  if (!pendingModalConfirmation) {
    closeModal();
    return;
  }

  const button = document.getElementById("modal-confirm-btn");
  const statusNode = document.getElementById("modal-form-status");
  if (statusNode) {
    statusNode.textContent = "";
    statusNode.classList.remove("is-visible");
  }

  await FORM.submit(
    { querySelector: () => button },
    async () => {
      try {
        await pendingModalConfirmation();
        closeModal();
      } catch (error) {
        if (statusNode) {
          statusNode.textContent = error.message;
          statusNode.classList.add("is-visible");
        }
      }
    },
    { button, loadingText: "Confirmando..." }
  )();
}

function clientOptions(selectedId) {
  return state.clients
    .map(
      (client) =>
        `<option value="${client.id}" ${String(selectedId) === String(client.id) ? "selected" : ""}>${escapeHtml(client.name)}</option>`
    )
    .join("");
}

function getAssignableUserSource() {
  return (state.assignableUsers.length ? state.assignableUsers : state.team.length ? state.team : state.users)
    .filter((user) => user && user.is_active !== false)
    .filter((user) => user.role !== "client");
}

function userOptions(selectedId) {
  return getAssignableUserSource()
    .map((user) => `<option value="${user.id}" ${String(selectedId) === String(user.id) ? "selected" : ""}>${escapeHtml(user.name)}</option>`)
    .join("");
}

function formatAssigneeOptionLabel(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "Equipe interna";
  }

  const normalized = words
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());

  if (normalized.length === 1) {
    return normalized[0];
  }

  return normalized.slice(0, 2).join(" ");
}

function taskAssigneeCheckboxes(selectedIds = []) {
  return `
    <div class="task-assignee-picker" data-task-assignee-picker="1">
      <div class="responsaveis-pills" id="responsaveis-pills"></div>
      <p class="responsaveis-resumo" id="responsaveis-resumo">Nenhum responsável selecionado</p>
      <input type="hidden" id="task-assigned-ids" name="assigned_ids" value="${escapeHtml(JSON.stringify(selectedIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)))}">
    </div>
  `;
}

function getResponsaveisIds() {
  return [...taskAssignState.selected].map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
}

function renderResponsaveisPills() {
  const wrap = document.getElementById("responsaveis-pills");
  const resumo = document.getElementById("responsaveis-resumo");
  const hidden = document.getElementById("task-assigned-ids");

  if (!wrap) {
    return;
  }

  const users = taskAssignState.users;
  wrap.innerHTML = "";

  if (!users.length) {
    wrap.innerHTML = '<div class="field-help">Nenhum responsável interno disponível no momento.</div>';
    if (resumo) {
      resumo.textContent = "";
    }
    if (hidden) {
      hidden.value = "[]";
    }
    return;
  }

  users.forEach((user) => {
    const id = Number(user.id);
    const isSelected = taskAssignState.selected.has(id);
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `resp-pill${isSelected ? " selected" : ""}`;
    pill.dataset.id = String(user.id);
    pill.setAttribute("aria-pressed", isSelected ? "true" : "false");
    pill.innerHTML = `
      <span class="resp-av">${escapeHtml(getInitials(user.name || ""))}</span>
      <span class="resp-nome">${escapeHtml(formatAssigneeOptionLabel(user.name))}</span>
    `;
    pill.addEventListener("click", () => {
      if (taskAssignState.selected.has(id)) {
        taskAssignState.selected.delete(id);
      } else {
        taskAssignState.selected.add(id);
      }
      renderResponsaveisPills();
    });
    wrap.appendChild(pill);
  });

  const selectedUsers = users.filter((user) => taskAssignState.selected.has(Number(user.id)));
  if (resumo) {
    if (!selectedUsers.length) {
      resumo.textContent = "Nenhum responsável selecionado";
    } else if (selectedUsers.length === 1) {
      resumo.textContent = `${formatAssigneeOptionLabel(selectedUsers[0].name)} selecionado`;
    } else {
      resumo.textContent = `${selectedUsers.map((user) => formatAssigneeOptionLabel(user.name).split(" ")[0]).join(", ")} selecionados`;
    }
  }

  if (hidden) {
    hidden.value = JSON.stringify(getResponsaveisIds());
  }
}

function initResponsaveisPills(users, selectedIds = []) {
  taskAssignState.users = users;
  taskAssignState.selected = new Set(
    selectedIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  );
  renderResponsaveisPills();
}

function initTaskAssigneePicker(form) {
  if (!form) {
    return;
  }

  const hidden = form.querySelector("#task-assigned-ids");
  let selectedIds = [];

  if (hidden?.value) {
    try {
      const parsed = JSON.parse(hidden.value);
      if (Array.isArray(parsed)) {
        selectedIds = parsed;
      }
    } catch (_error) {
      selectedIds = [];
    }
  }

  initResponsaveisPills(getAssignableUserSource(), selectedIds);
}

function contactOptions(selectedId) {
  return state.contacts
    .map(
      (contact) =>
        `<option value="${contact.id}" ${String(selectedId) === String(contact.id) ? "selected" : ""}>${escapeHtml(contact.name)}${
          contact.company ? ` · ${escapeHtml(contact.company)}` : ""
        }</option>`
    )
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
    .map(
      (campaign) =>
        `<option value="${campaign.id}" ${String(selectedId) === String(campaign.id) ? "selected" : ""}>${escapeHtml(campaign.name)}</option>`
    )
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
        <input name="zip_code" inputmode="numeric" autocomplete="off" maxlength="9" placeholder="00000-000" value="${escapeHtml(formatZipCodeInput(client.zip_code || ""))}">
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

function clearAddressFieldValue(field) {
  if (!field) {
    return false;
  }

  const currentValue = String(field.value || "").trim();
  const canClear = currentValue && field.dataset.autofilled === "1" && field.dataset.userEdited !== "1";

  if (!canClear) {
    return false;
  }

  field.dataset.settingValue = "1";
  field.value = "";
  field.dataset.autofilled = "0";
  field.dataset.userEdited = "0";
  delete field.dataset.settingValue;
  return true;
}

async function fetchCepSuggestion(cep) {
  const mapCepResponse = (data) => {
    if (data?.erro) {
      throw new Error("CEP não encontrado.");
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
      throw new Error("Não foi possível consultar o CEP no momento.");
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

  const clearAutofilledAddressFields = () => {
    [stateField, cityField, neighborhoodField, addressField, complementField].forEach(clearAddressFieldValue);
  };

  const applyAddressLookup = async (force = false) => {
    const cep = normalizeZipCode(zipField.value);

    if (cep.length !== 8) {
      setCepFeedback(feedbackNode, "Informe um CEP válido com 8 dígitos para buscar o endereço.", "error");
      return;
    }

    if (!force && cep === lastResolvedCep) {
      setCepFeedback(feedbackNode, "CEP já localizado. Você pode ajustar os campos manualmente, se necessário.");
      return;
    }

    if (lookupInFlightCep === cep) {
      return;
    }

    if (lookupButton) {
      lookupButton.disabled = true;
    }
    lookupInFlightCep = cep;
    setCepFeedback(feedbackNode, "Buscando endereço pelo CEP...");

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
          ? "CEP localizado. Confira e ajuste os campos, se necessário."
          : "CEP localizado. Os campos já tinham dados preenchidos manualmente.",
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
    const normalizedCep = normalizeZipCode(formatted);

    if (!normalizedCep) {
      lastResolvedCep = "";
      clearAutofilledAddressFields();
      setCepFeedback(feedbackNode, "Informe o CEP para sugerir estado, cidade, bairro e rua. Todos os campos continuam editáveis manualmente.");
      return;
    }

    if (normalizedCep !== lastResolvedCep) {
      setCepFeedback(feedbackNode, "Informe o CEP para sugerir estado, cidade, bairro e rua. Todos os campos continuam editáveis manualmente.");
    }
    if (normalizedCep.length === 8) {
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

function initTaskStatusAssist(form) {
  if (!form || form.dataset.boundTaskStatusAssist === "1") {
    return;
  }

  const statusField = form.querySelector('[name="status"]');
  const columnField = form.querySelector('[name="column_name"]');

  if (!statusField || !columnField) {
    return;
  }

  columnField.addEventListener("change", () => {
    statusField.value = getTaskStatusValue(columnField.value);
  });

  statusField.addEventListener("change", () => {
    columnField.value = getTaskColumnConfig(statusField.value).key;
  });

  form.dataset.boundTaskStatusAssist = "1";
}

function hardenInputPrivacy(root = document) {
  if (!root?.querySelectorAll) {
    return;
  }

  root.querySelectorAll("form").forEach((form) => {
    form.setAttribute("autocomplete", "new-password");
    form.setAttribute("data-form-type", "other");
  });

  root.querySelectorAll("input, textarea").forEach((field) => {
    const type = String(field.getAttribute("type") || "").toLowerCase();
    const isTextualField = !["checkbox", "radio", "file", "hidden", "date", "datetime-local", "number", "time"].includes(type);
    if (!["checkbox", "radio", "file", "hidden"].includes(type)) {
      field.setAttribute("autocomplete", isTextualField ? "new-password" : "off");
      field.setAttribute("autocorrect", "off");
      field.setAttribute("autocapitalize", "none");
      field.setAttribute("spellcheck", "false");
      field.setAttribute("aria-autocomplete", "none");
      field.setAttribute("data-lpignore", "true");
      field.setAttribute("data-1p-ignore", "true");
      field.setAttribute("data-bwignore", "true");
      field.setAttribute("data-form-type", "other");
      field.setAttribute("list", "");
    }

    if (isTextualField && field.dataset.privacyReady !== "1") {
      const unlockField = () => {
        field.removeAttribute("readonly");
      };

      field.setAttribute("readonly", "readonly");
      field.addEventListener("focus", unlockField, { once: true });
      field.addEventListener("pointerdown", unlockField, { once: true });
      field.dataset.privacyReady = "1";
    }

    if (isTextualField && !String(field.value || "").trim()) {
      [0, 150, 500].forEach((delay) => {
        window.setTimeout(() => {
          if (document.activeElement !== field) {
            field.value = "";
          }
        }, delay);
      });
    }
  });
}

function openModal(type, id = null) {
  const modal = document.getElementById("modal-content");
  lastFocusedElement = document.activeElement;
  let html = "";

  if (type === "editar-perfil") {
    const profile = state.profile || state.session?.user || {};
    html = modalFormWrapper(
      "Editar perfil",
      `
        <div class="field"><label>Nome</label><input name="name" autocomplete="off" value="${escapeHtml(profile.name || "")}" required></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" autocomplete="off" value="${escapeHtml(profile.email || "")}" required></div>
        <div class="field"><label>Cargo / função</label><input name="job_title" autocomplete="off" value="${escapeHtml(profile.job_title || "")}" placeholder="Ex.: Diretor de Operações"></div>
        <div class="field"><label>Telefone</label><input name="phone" autocomplete="off" value="${escapeHtml(profile.phone || "")}" placeholder="+55 98 99999-0000"></div>
        <div class="field form-full">
          <label>Foto do perfil</label>
          <div class="profile-avatar-upload">
            <div class="profile-avatar">${renderProfileAvatar(profile)}</div>
            <div class="profile-avatar-upload-copy">
              <input type="file" name="avatar_file" accept="image/png,image/jpeg,image/webp,image/gif">
              <div class="profile-avatar-upload-note">Envie uma imagem em JPG, PNG, WEBP ou GIF. A foto atual substitui as iniciais do seu perfil.</div>
              ${
                profile.avatar_url
                  ? `<label class="profile-avatar-upload-remove"><input type="checkbox" name="remove_avatar" value="1">Remover foto atual</label>`
                  : ""
              }
            </div>
          </div>
        </div>
      `,
      "Salvar alterações"
    );
  }

  if (type === "alterar-senha") {
    html = modalFormWrapper(
      "Alterar senha",
      `
        <div class="field form-full"><label>Senha atual</label><input type="password" name="current_password" autocomplete="new-password" required></div>
        <div class="field form-full"><label>Nova senha</label><input type="password" name="new_password" autocomplete="new-password" required><div class="field-help">Use no mínimo 12 caracteres, com letra maiúscula, letra minúscula, número e símbolo.</div></div>
      `,
      "Atualizar senha"
    );
  }

  if (type === "novo-cliente") {
    const client = state.clients.find((item) => item.id === id) || {};
    const selectedPlan = client.id ? client.plan || "" : "One Start";
    html = modalFormWrapper(
      client.id ? "Editar cliente" : "Novo cliente",
      `
        <div class="field"><label>Nome</label><input name="name" value="${escapeHtml(client.name || "")}" required></div>
        <div class="field"><label>Empresa</label><input name="company" value="${escapeHtml(client.company || "")}" required></div>
        <div class="field">
          <label>Plano</label>
          <select name="plan">
            ${clientPlanOptions(selectedPlan)}
          </select>
        </div>
        <div class="field"><label>MRR</label><input type="number" step="0.01" name="mrr" value="${client.mrr || ""}"></div>
        <div class="field"><label>Segmento</label><input name="segment" value="${escapeHtml(client.segment || "")}"></div>
        <div class="field"><label>Responsável</label><select name="manager_id"><option value="">Selecione</option>${userOptions(client.manager_id)}</select></div>
        <div class="field"><label>Início</label><input type="date" name="started_at" value="${client.started_at ? String(client.started_at).slice(0, 10) : ""}"></div>
        <div class="field"><label>Documento</label><input name="legal_document" value="${escapeHtml(client.legal_document || "")}"></div>
        <div class="field"><label>Contato principal</label><input name="contact_name" value="${escapeHtml(client.contact_name || "")}"></div>
        <div class="field"><label>Email contato</label><input type="email" name="contact_email" value="${escapeHtml(client.contact_email || "")}"></div>
        <div class="field"><label>Telefone contato</label><input name="contact_phone" value="${escapeHtml(client.contact_phone || "")}"></div>
        <div class="field"><label>Email financeiro</label><input type="email" name="billing_email" value="${escapeHtml(client.billing_email || "")}"></div>
        ${buildClientAddressFields(client)}
        <div class="field form-full"><label>Manual da marca</label><textarea name="brand_manual" placeholder="Tom de voz, referências, restrições, roteiro da marca, orientações de gravação, edição, design e postagem.">${escapeHtml(client.brand_manual || "")}</textarea></div>
        <div class="field form-full"><label>Observações</label><textarea name="notes">${escapeHtml(client.notes || "")}</textarea></div>
      `,
      client.id ? "Salvar cliente" : "Criar cliente"
    );
  }

  if (type === "nova-tarefa") {
    const task = state.tasks.find((item) => item.id === id) || {};
    const selectedAssigneeIds = getTaskAssigneeIds(task);
    html = modalFormWrapper(
      task.id ? "Editar tarefa" : "Nova tarefa",
      `
        <div class="field form-full"><label>Título</label><input name="title" value="${escapeHtml(task.title || "")}" required></div>
        <div class="field"><label>Cliente</label><select name="client_id"><option value="">Interno</option>${clientOptions(task.client_id)}</select></div>
        <div class="field form-full">
          <label>Responsáveis</label>
          ${taskAssigneeCheckboxes(selectedAssigneeIds)}
        </div>
        <div class="field"><label>Tipo</label><select name="type">${taskTypeOptions(task.type || "")}</select></div>
        <div class="field"><label>Status</label><select name="status">${taskStatusOptions(task.status || getTaskStatusValue(task))}</select></div>
        <div class="field"><label>Coluna</label><select name="column_name">${taskColumnOptions(task.column_name || getTaskColumnName(task))}</select></div>
        <div class="field"><label>Prazo</label><input type="date" name="deadline" value="${(task.deadline || task.due_date) ? String(task.deadline || task.due_date).slice(0, 10) : ""}"></div>
        <div class="field form-full"><label>Descrição</label><textarea name="description">${escapeHtml(task.description || "")}</textarea></div>
      `,
      task.id ? "Salvar tarefa" : "Criar tarefa"
    );
  }

  if (type === "novo-evento") {
    if (!canManageCalendarEvents()) {
      showToast("Somente admin e gestor podem cadastrar eventos.");
      return;
    }

    const eventRecord = state.calendarEvents.find((item) => item.id === id) || {};
    const defaultStart = new Date();
    defaultStart.setMinutes(0, 0, 0);
    defaultStart.setHours(defaultStart.getHours() + 1);
    const defaultEnd = new Date(defaultStart.getTime());
    defaultEnd.setHours(defaultEnd.getHours() + 1);
    html = modalFormWrapper(
      eventRecord.id ? "Editar evento" : "Novo evento",
      `
        <div class="field form-full"><label>Título</label><input name="title" value="${escapeHtml(eventRecord.title || "")}" required></div>
        <div class="field"><label>Início</label><input type="datetime-local" name="starts_at" value="${formatDateTimeLocalValue(
          eventRecord.starts_at || defaultStart
        )}" required></div>
        <div class="field"><label>Fim</label><input type="datetime-local" name="ends_at" value="${formatDateTimeLocalValue(
          eventRecord.ends_at || defaultEnd
        )}" required></div>
        <div class="field"><label>Local</label><input name="location" value="${escapeHtml(eventRecord.location || "")}" placeholder="Ex.: reunião online, estúdio, cliente, auditório"></div>
        <div class="field"><label>Cor</label><select name="color">${calendarColorOptions(eventRecord.color || "pink")}</select></div>
        <div class="field form-full"><label>Descrição</label><textarea name="description" placeholder="Contexto do evento, entregas esperadas, pauta ou observações.">${escapeHtml(
          eventRecord.description || ""
        )}</textarea></div>
      `,
      eventRecord.id ? "Salvar evento" : "Criar evento"
    );
  }

  if (type === "novo-lead") {
    const contact = state.contacts.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      contact.id ? "Editar lead" : "Novo lead",
      `
        <div class="field"><label>Nome</label><input name="name" value="${escapeHtml(contact.name || "")}" required></div>
        <div class="field"><label>Empresa</label><input name="company" value="${escapeHtml(contact.company || "")}"></div>
        <div class="field"><label>Serviço</label><input name="service" value="${escapeHtml(contact.service || "")}"></div>
        <div class="field"><label>Telefone</label><input name="phone" value="${escapeHtml(contact.phone || "")}" required></div>
        <div class="field"><label>WhatsApp</label><input name="whatsapp" value="${escapeHtml(contact.whatsapp || "")}"></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" value="${escapeHtml(contact.email || "")}" required></div>
        <div class="field"><label>Documento</label><input name="document" value="${escapeHtml(contact.document || "")}"></div>
        <div class="field"><label>Origem</label><input name="source" value="${escapeHtml(contact.source || "")}"></div>
        <div class="field"><label>Owner</label><select name="owner_id"><option value="">Selecione</option>${userOptions(contact.owner_id)}</select></div>
        <div class="field"><label>Responsável</label><select name="assigned_to"><option value="">Selecione</option>${userOptions(contact.assigned_to)}</select></div>
        <div class="field"><label>Etapa</label><select name="lead_stage"><option ${contact.lead_stage === "Prospeccao" ? "selected" : ""}>Prospecção</option><option ${contact.lead_stage === "Contato feito" ? "selected" : ""}>Contato feito</option><option ${contact.lead_stage === "Proposta" ? "selected" : ""}>Proposta</option><option ${contact.lead_stage === "Negociacao" ? "selected" : ""}>Negociação</option><option ${contact.lead_stage === "Fechado" ? "selected" : ""}>Fechado</option></select></div>
        <div class="field"><label>Valor estimado</label><input type="number" step="0.01" name="estimated_value" value="${contact.estimated_value || ""}"></div>
        <div class="field"><label>Data nascimento</label><input type="date" name="birth_date" value="${contact.birth_date ? String(contact.birth_date).slice(0, 10) : ""}"></div>
        <div class="field"><label>Último contato</label><input type="datetime-local" name="last_contact_at" value="${contact.last_contact_at ? new Date(contact.last_contact_at).toISOString().slice(0, 16) : ""}"></div>
        <div class="field"><label>Cidade</label><input name="city" value="${escapeHtml(contact.city || "")}"></div>
        <div class="field"><label>Estado</label><input name="state" value="${escapeHtml(contact.state || "")}"></div>
        <div class="field form-full"><label>Endereço</label><input name="address_line1" value="${escapeHtml(contact.address_line1 || "")}"></div>
        <div class="field"><label>Complemento</label><input name="address_line2" value="${escapeHtml(contact.address_line2 || "")}"></div>
        <div class="field"><label>Bairro</label><input name="neighborhood" value="${escapeHtml(contact.neighborhood || "")}"></div>
        <div class="field"><label>CEP</label><input name="zip_code" value="${escapeHtml(contact.zip_code || "")}"></div>
        <div class="field"><label>País</label><input name="country" value="${escapeHtml(contact.country || "Brasil")}"></div>
        <div class="field form-full"><label>Mensagem</label><textarea name="message">${escapeHtml(contact.message || "")}</textarea></div>
        <div class="field form-full"><label>Observações</label><textarea name="notes">${escapeHtml(contact.notes || "")}</textarea></div>
      `,
      contact.id ? "Salvar lead" : "Criar lead"
    );
  }

  if (type === "nova-campanha") {
    const campaign = state.campaigns.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      campaign.id ? "Editar campanha" : "Nova campanha",
      `
        <div class="field form-full"><label>Nome</label><input name="name" value="${escapeHtml(campaign.name || "")}" required></div>
        <div class="field"><label>Cliente</label><select name="client_id">${clientOptions(campaign.client_id)}</select></div>
        <div class="field"><label>Canal</label><select name="channel" required>${campaignChannelOptions(campaign.channel || "Meta Ads")}</select></div>
        <div class="field form-full"><label>Público</label><input name="audience" value="${escapeHtml(campaign.audience || "")}"></div>
        <div class="field"><label>Orçamento</label><input type="number" step="0.01" name="budget" value="${campaign.budget || ""}" required></div>
        <div class="field"><label>Início</label><input type="date" name="start_date" value="${campaign.start_date ? String(campaign.start_date).slice(0, 10) : ""}"></div>
        <div class="field"><label>Status</label><select name="status"><option value="Ativa" ${campaign.status === "Ativa" ? "selected" : ""}>Ativa</option><option value="Pausada" ${campaign.status === "Pausada" ? "selected" : ""}>Pausada</option><option value="Encerrada" ${campaign.status === "Encerrada" ? "selected" : ""}>Encerrada</option><option value="Planejamento" ${campaign.status === "Planejamento" ? "selected" : ""}>Planejamento</option></select></div>
        <div class="field form-full"><label>Objetivo</label><textarea name="objective">${escapeHtml(campaign.objective || "")}</textarea></div>
      `,
      campaign.id ? "Salvar campanha" : "Criar campanha"
    );
  }

  if (type === "nova-entrega") {
    const material = state.materials.find((item) => item.id === id) || {};
    html = modalFormWrapper(
      material.id ? "Editar entrega" : "Nova entrega",
      `
        <div class="field form-full"><label>Título</label><input name="title" value="${escapeHtml(material.title || "")}" required></div>
        <div class="field"><label>Cliente</label><select name="client_id">${clientOptions(material.client_id)}</select></div>
        <div class="field"><label>Campanha</label><select name="campaign_id"><option value="">Nenhuma</option>${campaignOptions(material.client_id, material.campaign_id)}</select></div>
        <div class="field"><label>Status</label><select name="status"><option value="Pendente" ${material.status === "Pendente" ? "selected" : ""}>Pendente</option><option value="Aprovado" ${material.status === "Aprovado" ? "selected" : ""}>Aprovado</option><option value="Revisao" ${material.status === "Revisao" ? "selected" : ""}>Revisão</option><option value="Rejeitado" ${material.status === "Rejeitado" ? "selected" : ""}>Rejeitado</option></select></div>
        <div class="field form-full"><label>Arquivo</label><input type="file" name="file" accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.pdf,.zip,.docx,.xlsx,.mp4,.mov,.webm"><div class="field-help">Formatos aceitos: imagem, PDF, ZIP, DOCX, XLSX, MP4, MOV e WEBM.</div></div>
      `,
      material.id ? "Salvar entrega" : "Criar entrega"
    );
  }

  if (type === "novo-membro") {
    const user = state.users.find((item) => item.id === id) || {};
    const passwordHelp = user.id
      ? "Deixe em branco para manter a senha atual. Se preencher, use no mínimo 12 caracteres, com letra maiúscula, letra minúscula, número e símbolo."
      : "Use no mínimo 12 caracteres, com letra maiúscula, letra minúscula, número e símbolo.";
    html = modalFormWrapper(
      user.id ? "Editar membro" : "Novo membro",
      `
        <div class="field"><label>Nome</label><input name="name" value="${escapeHtml(user.name || "")}" required></div>
        <div class="field"><label>E-mail</label><input type="email" name="email" value="${escapeHtml(user.email || "")}" required></div>
        <div class="field"><label>Cargo / função</label><input name="job_title" value="${escapeHtml(user.job_title || "")}" placeholder="Ex.: Atendimento, Operações, Design"></div>
        <div class="field"><label>Perfil</label><select name="role"><option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option><option value="gestor" ${user.role === "gestor" ? "selected" : ""}>Gestor</option><option value="designer" ${user.role === "designer" ? "selected" : ""}>Designer</option><option value="comercial" ${user.role === "comercial" ? "selected" : ""}>Comercial</option><option value="dev" ${user.role === "dev" ? "selected" : ""}>Dev</option><option value="client" ${user.role === "client" ? "selected" : ""}>Cliente</option></select></div>
        <div class="field"><label>Cliente vinculado</label><select name="client_id"><option value="">Nenhum</option>${clientOptions(user.client_id)}</select></div>
        <div class="field form-full"><label>Senha ${user.id ? "(opcional)" : ""}</label><input type="password" name="password" ${user.id ? "" : "required"}><div class="field-help">${passwordHelp}</div></div>
      `,
      user.id ? "Salvar membro" : "Adicionar membro"
    );
  }

  if (type === "nova-integracao") {
    const integration = state.integrations.find((item) => item.id === id) || {};
    const scopedClients = getScopedClientOptions();
    if (!scopedClients.length) {
      html = `
        <div class="modal-title" id="modal-dialog-title">Integrações do analytics</div>
        <p class="metric-note">Cadastre pelo menos um cliente antes de registrar integrações. As conexões deste módulo sempre pertencem a um cliente específico.</p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Fechar</button></div>
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
          .map((client) => `<option value="${client.id}" ${String(defaultClientId) === String(client.id) ? "selected" : ""}>${escapeHtml(client.name)}</option>`)
          .join("")}</select></div>
        <div class="field"><label>Integração</label><select name="provider_key" required>${integrationProviderOptions(integration.provider_key || "ga4")}</select></div>
        <div class="field"><label>Status</label><select name="status"><option value="connected" ${integration.status === "connected" ? "selected" : ""}>Conectado</option><option value="configuring" ${(!integration.status || integration.status === "configuring") ? "selected" : ""}>Configurando</option><option value="error" ${integration.status === "error" ? "selected" : ""}>Erro</option><option value="disconnected" ${integration.status === "disconnected" ? "selected" : ""}>Desconectado</option></select></div>
        <div class="field"><label>Conta externa</label><input name="external_account_id" value="${escapeHtml(integration.external_account_id || "")}" placeholder="Ex.: conta, workspace ou business id"></div>
        <div class="field"><label>Propriedade / recurso</label><input name="external_property_id" value="${escapeHtml(integration.external_property_id || "")}" placeholder="Ex.: property id, dataset ou view"></div>
        <div class="field"><label>Última sincronização</label><input type="datetime-local" name="last_sync_at" value="${formatDateTimeLocalValue(integration.last_sync_at)}"></div>
        <div class="field form-full"><label>Último erro / observação</label><textarea name="last_error" placeholder="Descreva o erro atual ou uma observação de configuração.">${escapeHtml(integration.last_error || "")}</textarea><div class="field-help">Este MVP registra o estado real no sistema por cliente. A conexão OAuth automática pode ser acoplada depois.</div></div>
      `,
      integration.id ? "Salvar integração" : "Criar integração"
    );
  }

  if (type === "nova-fatura") {
    html = modalFormWrapper(
      "Nova fatura",
      `
        <div class="field"><label>Vínculo</label><select name="client_id"><option value="">Equipe interna</option>${clientOptions("")}</select></div>
        <div class="field"><label>Valor</label><input type="number" step="0.01" name="amount" required></div>
        <div class="field"><label>Status</label><select name="status">${invoiceStatusOptions("Em aberto")}</select></div>
        <div class="field"><label>Vencimento</label><input type="date" name="due_date"></div>
      `,
      "Criar fatura"
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
        <div class="field"><label>Referência externa</label><input name="external_reference" value=""></div>
        <div class="field form-full"><label>Descrição</label><textarea name="description">${escapeHtml(`Cobrança ${client.name || ""}`)}</textarea></div>
      `,
      "Criar cobrança"
    );
  }

  if (type === "novo-custo") {
    html = modalFormWrapper(
      "Novo custo",
      `
        <div class="field"><label>Cliente</label><select name="client_id">${clientOptions("")}</select></div>
        <div class="field"><label>Categoria</label><select name="category">${COST_CATEGORY_OPTIONS.map(
          (option) => `<option value="${option.value}">${option.label}</option>`
        ).join("")}</select></div>
        <div class="field"><label>Valor</label><input type="text" name="amount_display" inputmode="decimal" autocomplete="off" placeholder="0,00" required><input type="hidden" name="amount" value=""></div>
        <div class="field"><label>Data</label><input type="date" name="incurred_on" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="field form-full"><label>Descrição</label><textarea name="description" required placeholder="Ex.: impulsionamento do cliente, diária de produção, deslocamento."></textarea></div>
      `,
      "Registrar custo"
    );
  }

  if (type === "novo-ab") {
    html = `
      <div class="modal-title" id="modal-dialog-title">Ação auxiliar</div>
      <p class="metric-note">Este atalho ainda não foi habilitado no painel.</p>
      <div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Fechar</button></div>
    `;
  }

  modal.innerHTML = html;
  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("modal-overlay").setAttribute("aria-hidden", "false");

  const form = document.getElementById("modal-form");
  if (form) {
    form.onsubmit = (event) => submitModal(event, type, id);
    bindModalFieldValidation(form);
    hardenInputPrivacy(form);
    if (type === "novo-cliente") {
      initClientAddressAssist(form);
    }
    if (type === "nova-tarefa") {
      initTaskStatusAssist(form);
      initTaskAssigneePicker(form);
    }
    if (type === "novo-custo") {
      initMaskedCurrencyField(form, "amount_display", "amount");
    }
    if (type === "novo-evento") {
      window.setTimeout(() => {
        const startInput = form.querySelector('[name="starts_at"]');
        const endInput = form.querySelector('[name="ends_at"]');
        if (startInput && endInput && !endInput.value && startInput.value) {
          const startDate = new Date(startInput.value);
          if (!Number.isNaN(startDate.getTime())) {
            startDate.setHours(startDate.getHours() + 1);
            endInput.value = formatDateTimeLocalValue(startDate);
          }
        }
      }, 0);
    }
    window.setTimeout(() => {
      form.querySelector("input, select, textarea, button")?.focus();
    }, 0);
  }

  bindLegacyInlineHandlers(document.getElementById("modal-overlay"));
  hardenInputPrivacy(document.getElementById("modal-overlay"));
}

async function submitModal(event, type, id) {
  event.preventDefault();
  clearFormErrors(event.target);
  if (!validateFormFields(event.target)) {
    return;
  }
  const formData = new FormData(event.target);
  const submitButton = document.getElementById("modal-submit-btn");

  await FORM.submit(
    event.target,
    async () => {
    if (type === "editar-perfil") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["phone", "job_title"]);
      delete payload.avatar_file;
      delete payload.remove_avatar;

      const response = await apiFetch("/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      let latestUser = response.user;
      const removeAvatar = formData.get("remove_avatar") === "1";
      const avatarFile = formData.get("avatar_file");

      if (removeAvatar) {
        const removeResponse = await apiFetch("/users/me/avatar", {
          method: "DELETE"
        });
        latestUser = removeResponse.user || latestUser;
      }

      if (avatarFile instanceof File && avatarFile.size > 0) {
        const uploadData = new FormData();
        uploadData.append("file", avatarFile);
        const uploadResponse = await apiFetch("/users/me/avatar", {
          method: "POST",
          body: uploadData
        });
        latestUser = uploadResponse.user || latestUser;
      }

      syncCurrentUserProfile(latestUser);
      await ensureProfileAvatarAsset({ force: true, silent: true });
      closeModal();
      renderProfile();
      showToast(response.message || "Perfil atualizado com sucesso.");
      return;
    }

    if (type === "alterar-senha") {
      const payload = Object.fromEntries(formData.entries());
      const response = await apiFetch("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      closeModal();
      showToast(response.message || "Senha atualizada com sucesso.");
      return;
    }

    if (type === "novo-cliente") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["manager_id", "started_at"]);
      payload.plan = payload.plan ? normalizeClientPlanValue(payload.plan) : null;
      payload.zip_code = formatZipCodeInput(payload.zip_code);
      payload.state = normalizeStateCode(payload.state);
      payload.country = normalizeCountry(payload.country);
      await apiFetch(id ? `/clients/${id}` : "/clients", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "nova-tarefa") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["client_id", "deadline"]);
      delete payload.assigned_ids;
      payload.assigned_to_ids = getResponsaveisIds();
      payload.type = normalizeTaskTypeValue(payload.type);
      payload.column_name = getTaskColumnConfig(payload.column_name || payload.status).key;
      payload.status = getTaskStatusValue(payload.status || payload.column_name, payload.column_name);
      await apiFetch(id ? `/tasks/${id}` : "/tasks", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "novo-evento") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["description", "location"]);
      payload.starts_at = payload.starts_at ? new Date(payload.starts_at).toISOString() : payload.starts_at;
      payload.ends_at = payload.ends_at ? new Date(payload.ends_at).toISOString() : payload.ends_at;
      await apiFetch(id ? `/calendar-events/${id}` : "/calendar-events", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      closeModal();
      await loadCalendarEvents(state.calendar.weekStart || new Date(), { force: true });
      showToast("Evento salvo com sucesso.");
      return;
    }

    if (type === "novo-lead") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["owner_id", "assigned_to", "estimated_value", "birth_date", "last_contact_at"]);
      await apiFetch(id ? `/contacts/${id}` : "/contacts", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
    }

    if (type === "nova-campanha") {
      const payload = {
        name: String(formData.get("name") || "").trim(),
        client_id: formData.get("client_id") || null,
        channel: String(formData.get("channel") || "").trim(),
        audience: String(formData.get("audience") || "").trim() || null,
        budget: formData.get("budget") || 0,
        start_date: formData.get("start_date") || null,
        status: String(formData.get("status") || "").trim() || null,
        objective: String(formData.get("objective") || "").trim() || null,
      };
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
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["client_id", "job_title"]);
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

    if (type === "novo-custo") {
      const payload = normalizeFormPayload(Object.fromEntries(formData.entries()), ["client_id", "incurred_on"]);
      delete payload.amount_display;
      await apiFetch("/cost-entries", {
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
    setFormStatus(event.target, error.message);
  });
}

function closeModal() {
  pendingModalConfirmation = null;
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("modal-overlay").setAttribute("aria-hidden", "true");
  lastFocusedElement?.focus?.();
}

function closeModalIfBg(event) {
  if (event.target === document.getElementById("modal-overlay")) {
    closeModal();
  }
}

function requestDestructiveConfirmation({
  title,
  description,
  confirmLabel,
  successMessage,
  request
}) {
  pendingModalConfirmation = async () => {
    await request();
    if (successMessage) {
      showToast(successMessage);
    }
  };

  openConfirmationModal({
    title,
    description,
    confirmLabel,
    confirmClassName: "btn btn-danger"
  });
}

async function deleteClient(id) {
  const client = state.clients.find((item) => Number(item.id) === Number(id));
  requestDestructiveConfirmation({
    title: "Excluir cliente",
    description: `Remova ${client?.name || "este cliente"} e os vínculos exibidos no painel. Esta ação não deve competir com a edição normal.`,
    confirmLabel: "Excluir cliente",
    successMessage: "Cliente removido com sucesso.",
    request: async () => {
      await apiFetch(`/clients/${id}`, { method: "DELETE" });
      await refreshData();
    }
  });
}

async function deleteCalendarEvent(id) {
  const eventItem = state.calendarEvents.find((item) => Number(item.id) === Number(id));
  requestDestructiveConfirmation({
    title: "Excluir evento",
    description: `Remova ${eventItem?.title || "este evento"} da agenda da equipe.`,
    confirmLabel: "Excluir evento",
    successMessage: "Evento removido com sucesso.",
    request: async () => {
      await apiFetch(`/calendar-events/${id}`, { method: "DELETE" });
      await loadCalendarEvents(state.calendar.weekStart || new Date(), { force: true });
    }
  });
}

async function deleteCampaign(id) {
  const campaign = state.campaigns.find((item) => Number(item.id) === Number(id));
  requestDestructiveConfirmation({
    title: "Excluir campanha",
    description: `Remova ${campaign?.name || "esta campanha"} do planejamento e do acompanhamento de mídia.`,
    confirmLabel: "Excluir campanha",
    successMessage: "Campanha removida com sucesso.",
    request: async () => {
      await apiFetch(`/campaigns/${id}`, { method: "DELETE" });
      await refreshData();
    }
  });
}

async function deleteTask(id) {
  const task = state.tasks.find((item) => Number(item.id) === Number(id));
  requestDestructiveConfirmation({
    title: "Excluir tarefa",
    description: `Remova ${task?.title || "esta tarefa"} do fluxo do kanban.`,
    confirmLabel: "Excluir tarefa",
    successMessage: "Tarefa removida com sucesso.",
    request: async () => {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" });
      await refreshData();
    }
  });
}

async function deleteIntegration(id) {
  const integration = state.integrations.find((item) => Number(item.id) === Number(id));
  requestDestructiveConfirmation({
    title: "Excluir integração",
    description: `Remova a conexão ${getIntegrationProviderLabel(integration?.provider_key)} deste cliente.`,
    confirmLabel: "Excluir integração",
    successMessage: "Integração removida com sucesso.",
    request: async () => {
      await apiFetch(`/integrations/${id}`, { method: "DELETE" });
      await refreshData();
    }
  });
}

async function deleteMaterial(id) {
  const material = state.materials.find((item) => Number(item.id) === Number(id));
  requestDestructiveConfirmation({
    title: "Excluir entrega",
    description: `Remova ${material?.title || "esta entrega"} da produção.`,
    confirmLabel: "Excluir entrega",
    successMessage: "Entrega removida com sucesso.",
    request: async () => {
      await apiFetch(`/materials/${id}`, { method: "DELETE" });
      await refreshData();
    }
  });
}

async function deleteLead(id) {
  const lead = state.contacts.find((item) => Number(item.id) === Number(id));
  requestDestructiveConfirmation({
    title: "Excluir lead",
    description: `Remova ${lead?.name || "este lead"} do pipeline comercial.`,
    confirmLabel: "Excluir lead",
    successMessage: "Lead removido com sucesso.",
    request: async () => {
      await apiFetch(`/contacts/${id}`, { method: "DELETE" });
      await refreshData();
    }
  });
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
    const charge = state.charges.find((item) => Number(item.id) === Number(id));
    if (!charge) {
      showToast("Cobrança não encontrada.");
      return;
    }

    const normalizedStatus = String(status || "").toUpperCase();
    const chargeReceived = isChargeReceivedStatus(charge.status);

    if (normalizedStatus === "RECEIVED" && chargeReceived) {
      showToast("Esta cobrança já está recebida.");
      return;
    }

    if (chargeReceived) {
      showToast("Esta cobrança já está recebida.");
      return;
    }

    if (normalizedStatus === "PENDING" && getChargeOperationalStatus(charge) === "Pendente") {
      showToast("Esta cobrança já está pendente.");
      return;
    }

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
  const user = state.users.find((item) => Number(item.id) === Number(id));
  requestDestructiveConfirmation({
    title: "Remover membro",
    description: `Remova ${user?.name || "este membro"} do painel interno.`,
    confirmLabel: "Remover membro",
    successMessage: "Usuário removido com sucesso.",
    request: async () => {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      await refreshData();
    }
  });
}

async function boot() {
  bindSidebarInteractions();
  bindLegacyInlineHandlers();
  bindDataActions();
  bindFloatingActionMenus();
  syncPanelTheme();
  syncSidebarShell();
  APP.registerActivityTracking();
  APP.onLogout((reason) => {
    clearSession();
    resetMfaLoginState();
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
  resetMfaLoginState();
  document.getElementById("login-screen").classList.remove("hidden");
  bindLoginForm();

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
window.setFinancePeriodFilter = setFinancePeriodFilter;
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
window.clearChecklistHistory = clearChecklistHistory;
window.showToast = showToast;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

boot();


