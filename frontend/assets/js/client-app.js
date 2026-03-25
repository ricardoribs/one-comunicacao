const APP = window.ONE_APP;
const FORM = window.FormUtils || window.ONE_FORM;
const CLIENT_HANDOFF_KEY = "one_client_handoff";

let currentSession = null;
let currentDashboard = null;
let loginInFlight = false;
let forgotPasswordInFlight = false;
let messageInFlight = false;

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
    if (/^-?\d+$/.test(item)) {
      return Number(item);
    }
    return item;
  });
}

function executeInlineAction(action, event) {
  const match = action.match(/^([a-zA-Z_$][\w$]*)\((.*)\)$/);
  if (!match) {
    return false;
  }

  const [, fnName, rawArgs] = match;
  const args = parseInlineArgs(rawArgs).map((arg) => (arg === "__event__" ? event : arg));

  const handlers = {
    showToast,
    updateMaterialStatus,
    sendMessage
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
      executeInlineAction(action, event);
    });
    element.dataset.boundClick = "1";
    element.removeAttribute("onclick");
  });
}

function loadClientHandoff() {
  try {
    return JSON.parse(sessionStorage.getItem(CLIENT_HANDOFF_KEY) || "null");
  } catch (_error) {
    return null;
  }
}

function saveSession(session) {
  APP.saveSession(session);
  currentSession = session;
}

function clearSession() {
  APP.clearSession();
  currentSession = null;
  currentDashboard = null;
}

function clearClientHandoff() {
  sessionStorage.removeItem(CLIENT_HANDOFF_KEY);
}

async function apiFetch(path, options = {}) {
  const data = await APP.fetchJson(path, options);
  currentSession = APP.loadSession();
  return data;
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function number(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
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

function renderResourceAction(url, missingMessage) {
  if (url) {
    if (url.startsWith("/api/files/")) {
      return `<button type="button" class="btn btn-outline" onclick="openProtectedResource('${escapeInlineMessage(
        url
      )}')">Abrir</button>`;
    }

    return `<a class="btn btn-outline" href="${url}" target="_blank" rel="noopener noreferrer">Abrir</a>`;
  }

  return `<button type="button" class="btn btn-outline" onclick="showToast('${escapeInlineMessage(
    missingMessage
  )}')">Abrir</button>`;
}

function setLoginMessage(message = "", type = "error") {
  const errorNode = document.getElementById("login-error");
  const statusNode = document.getElementById("login-status");

  if (errorNode) {
    errorNode.textContent = "";
    errorNode.style.display = "none";
  }

  if (statusNode) {
    statusNode.textContent = "";
    statusNode.classList.remove("success", "error");
    statusNode.style.display = "none";
  }

  if (!message) {
    return;
  }

  if (type === "success" && statusNode) {
    statusNode.textContent = message;
    statusNode.classList.add("success");
    statusNode.style.display = "block";
    return;
  }

  if (errorNode) {
    errorNode.textContent = message;
    errorNode.style.display = "block";
  } else if (statusNode) {
    statusNode.textContent = message;
    statusNode.classList.add("error");
    statusNode.style.display = "block";
  }
}

function renderList(containerId, items, builder, emptyMessage) {
  const container = document.getElementById(containerId);
  container.innerHTML = items.length ? items.map(builder).join("") : `<div class="empty">${emptyMessage}</div>`;
  bindLegacyInlineHandlers(container);
}

function renderKpis(summary) {
  const items = [
    { label: "Faturamento", value: currency(summary.revenue), sub: "Receita acumulada" },
    { label: "Leads", value: number(summary.leads), sub: "Leads gerados" },
    { label: "ROI", value: `${Number(summary.roi || 0).toFixed(2)}%`, sub: "Retorno consolidado" },
    { label: "Campanhas", value: number(summary.campaigns_count), sub: "Ativas e históricas" }
  ];

  document.getElementById("kpis").innerHTML = items
    .map(
      (item) => `
        <div class="kpi">
          <div class="kpi-label">${item.label}</div>
          <div class="kpi-val">${item.value}</div>
          <div class="kpi-sub">${item.sub}</div>
        </div>
      `
    )
    .join("");
}

function renderCampaigns(campaigns, tasks) {
  renderList(
    "proj-list",
    campaigns,
    (campaign) => {
      const nextTask = tasks.find((task) => String(task.client_id) === String(campaign.client_id));
      const detail = (nextTask?.title || "Sem tarefa pendente").replace(/'/g, "");
      return `
        <div class="row">
          <div>
            <div class="title">${campaign.name}</div>
            <div class="sub">${campaign.channel} · ${campaign.client_name || ""}</div>
          </div>
          <span class="badge ${campaign.status === "Ativa" ? "badge-green" : "badge-blue"}">${campaign.status}</span>
          <div class="sub">ROI ${Number(campaign.roi || 0).toFixed(2)}%</div>
          <button class="btn btn-outline" onclick="showToast('${detail}')">Ver detalhe</button>
        </div>
      `;
    },
    "Nenhuma campanha encontrada."
  );
}

function renderReports(reports) {
  renderList(
    "reports-list",
    reports,
    (report) => `
      <div class="row">
        <div>
          <div class="title">${report.title}</div>
          <div class="sub">${formatDate(report.report_month)} · ${report.summary}</div>
        </div>
        <span class="badge badge-blue">Relatório</span>
        <div></div>
        ${renderResourceAction(report.file_url, "Relatório ainda não disponível para abertura.")}
      </div>
    `,
    "Nenhum relatório disponível."
  );
}

async function updateMaterialStatus(id, status) {
  try {
    await apiFetch(`/materials/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadDashboard();
    showToast(`Material atualizado para ${status.toLowerCase()}.`);
  } catch (error) {
    showToast(error.message);
  }
}

function renderMaterials(materials) {
  renderList(
    "materials-list",
    materials,
    (material) => `
      <div class="row">
        <div>
          <div class="title">${material.title}</div>
          <div class="sub">${material.client_name || ""}</div>
        </div>
        <span class="badge ${material.status === "Aprovado" ? "badge-green" : material.status === "Revisão" ? "badge-yellow" : "badge-pink"}">${material.status}</span>
        <div class="actions">
          <button class="btn btn-outline" onclick="updateMaterialStatus(${material.id}, 'Aprovado')">Aprovar</button>
          <button class="btn btn-outline" onclick="updateMaterialStatus(${material.id}, 'Revisão')">Solicitar revisão</button>
        </div>
        ${renderResourceAction(material.url || material.file_url, "Material ainda não disponível para abertura.")}
      </div>
    `,
    "Nenhum material aguardando aprovação."
  );
}

function renderInvoices(invoices) {
  renderList(
    "invoices-list",
    invoices,
    (invoice) => `
      <div class="row">
        <div>
          <div class="title">${currency(invoice.amount)}</div>
          <div class="sub">Vencimento em ${formatDate(invoice.due_date)}</div>
        </div>
        <span class="badge ${invoice.status === "Pago" ? "badge-green" : "badge-yellow"}">${invoice.status}</span>
        <div></div>
        <button class="btn btn-outline" onclick="showToast('Fatura ${invoice.id} - ${invoice.status}')">Ver detalhe</button>
      </div>
    `,
    "Nenhuma fatura encontrada."
  );
}

function renderMessages(messages) {
  renderList(
    "messages-list",
    messages.slice(0, 8),
    (message) => `
      <div class="row">
        <div>
          <div class="title">${message.sender_name}</div>
          <div class="sub">${message.content}</div>
        </div>
        <span class="badge badge-blue">${formatDate(message.created_at)}</span>
        <div></div>
        <div class="sub">Para ${message.receiver_name}</div>
      </div>
    `,
    "Sem mensagens recentes."
  );
}

async function sendMessage() {
  if (messageInFlight) {
    return;
  }

  const textarea = document.getElementById("message-input");
  const content = textarea.value.trim();
  if (!content) {
    showToast("Digite uma mensagem antes de enviar.");
    return;
  }

  const receiverId =
    currentDashboard?.team?.[0]?.id ||
    currentDashboard?.messages?.find((message) => message.sender_id !== currentSession.user.id)?.sender_id;

  if (!receiverId) {
    showToast("Nenhum destinatário disponível.");
    return;
  }

  try {
    messageInFlight = true;
    await FORM.submit(
      { querySelector: () => document.getElementById("client-send-btn") },
      async () => {
        await apiFetch("/messages", {
          method: "POST",
          body: JSON.stringify({ receiver_id: receiverId, content })
        });
        textarea.value = "";
        await loadDashboard();
        showToast("Mensagem enviada.");
      },
      { loadingText: "Enviando...", button: document.getElementById("client-send-btn") }
    )();
  } catch (error) {
    showToast(error.message);
  } finally {
    messageInFlight = false;
  }
}

async function loadDashboard() {
  document.getElementById("kpis").innerHTML = Array.from({ length: 4 }, () => `
    <div class="kpi">
      <div class="kpi-label">Carregando...</div>
      <div class="kpi-val">--</div>
      <div class="kpi-sub">Aguarde</div>
    </div>
  `).join("");
  ["proj-list", "reports-list", "materials-list", "invoices-list", "messages-list"].forEach((id) => {
    const container = document.getElementById(id);
    if (container) {
      container.innerHTML = '<div class="empty">Carregando...</div>';
    }
  });

  const dashboard = await apiFetch("/dashboard");
  currentDashboard = dashboard;
  document.getElementById("dash-welcome").textContent = `Bem-vindo de volta, ${currentSession.user.name}.`;
  document.title = `ONE | Área do Cliente | ${currentSession.user.name}`;
  renderKpis(dashboard.summary);
  renderCampaigns(dashboard.campaigns || [], dashboard.tasks || []);
  renderReports(dashboard.reports || []);
  renderMaterials(dashboard.materials || []);
  renderInvoices(dashboard.invoices || []);
  renderMessages(dashboard.messages || []);
}

async function doLogin() {
  if (loginInFlight) {
    return;
  }

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value;
  setLoginMessage("");

  try {
    loginInFlight = true;
    await FORM.submit(
      { querySelector: () => document.getElementById("client-login-btn") },
      async () => {
        const session = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });

        if (session.user.role !== "client") {
          window.location.href = "/painel-interno.html";
          return;
        }

        saveSession(session);
        await initializeClient();
      },
      { loadingText: "Entrando...", button: document.getElementById("client-login-btn") }
    )();
  } catch (error) {
    setLoginMessage(error.message, "error");
  } finally {
    loginInFlight = false;
  }
}

async function forgotPassword() {
  if (forgotPasswordInFlight) {
    return;
  }

  const email = document.getElementById("login-email").value.trim();
  if (!email) {
    setLoginMessage("Informe seu e-mail para receber o link de redefinição.", "error");
    document.getElementById("login-email")?.focus();
    return;
  }

  try {
    forgotPasswordInFlight = true;
    setLoginMessage("");

    await FORM.submit(
      { querySelector: () => document.getElementById("client-forgot-btn") },
      async () => {
        const response = await apiFetch("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email })
        });

        setLoginMessage(
          response.message || "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.",
          "success"
        );
      },
      { loadingText: "Enviando...", button: document.getElementById("client-forgot-btn") }
    )();
  } catch (error) {
    setLoginMessage(error.message, "error");
  } finally {
    forgotPasswordInFlight = false;
  }
}

async function initializeClient() {
  const me = await apiFetch("/auth/me");
  if (me.user.role !== "client") {
    window.location.href = "/painel-interno.html";
    return;
  }

  currentSession.user = me.user;
  saveSession(currentSession);
  document.getElementById("login-screen").classList.add("hidden");
  await loadDashboard();
}

function logout() {
  APP.logout({ reason: "manual-logout" }).finally(() => {
    clearSession();
    clearClientHandoff();
    window.location.href = "/";
  });
}

async function boot() {
  APP.registerActivityTracking();
  APP.onLogout((reason) => {
    clearSession();
    clearClientHandoff();
    document.getElementById("login-screen").classList.remove("hidden");
    if (reason === "idle-timeout") {
      showToast("Sua sessão foi encerrada por inatividade.");
    }
  });

  document.getElementById("client-login-btn")?.addEventListener("click", doLogin);
  document.getElementById("client-forgot-btn")?.addEventListener("click", forgotPassword);
  document.getElementById("client-logout-btn")?.addEventListener("click", logout);
  document.getElementById("client-send-btn")?.addEventListener("click", sendMessage);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !document.getElementById("login-screen").classList.contains("hidden")) {
      doLogin();
    }
  });

  window.addEventListener("offline", () => {
    showToast("Você está sem conexão. Verifique sua internet.");
  });

  window.addEventListener("online", () => {
    showToast("Conexão restabelecida.");
  });

  const handoff = loadClientHandoff();
  if (handoff?.requestedAt && handoff?.role === "client") {
    clearClientHandoff();
    try {
      currentSession = await APP.refreshSession();
      await initializeClient();
      return;
    } catch (_error) {
      clearSession();
    }
  }

  clearSession();
  document.getElementById("login-screen").classList.remove("hidden");
}

window.doLogin = doLogin;
window.forgotPassword = forgotPassword;
window.logout = logout;
window.showToast = showToast;
window.sendMessage = sendMessage;
window.updateMaterialStatus = updateMaterialStatus;
window.openProtectedResource = openProtectedResource;

boot();
