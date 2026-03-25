const API_BASE = window.ONE_CONFIG?.apiBase || "/api";
const APP = window.ONE_APP;
const FORM = window.FormUtils || window.ONE_FORM;
const INTERNAL_HANDOFF_KEY = "one_internal_handoff";
const CLIENT_HANDOFF_KEY = "one_client_handoff";
const CLIENT_LOGIN_PATH = "area-cliente.html";
const INTERNAL_LOGIN_PATH = "painel-interno.html";

let currentRole = "client";
let currentSession = null;
let currentDashboard = null;
let lastFocusedElement = null;

function trapModalFocus(event) {
  const modalBg = document.getElementById("modal-bg");
  if (!modalBg.classList.contains("open") || event.key !== "Tab") {
    return;
  }

  const focusable = modalBg.querySelectorAll(
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
    if (/^-?\d+$/.test(item)) {
      return Number(item);
    }
    return item;
  });
}

function scrollToContact() {
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
}

function goToInternalLogin() {
  window.location.href = INTERNAL_LOGIN_PATH;
}

function goToClientLogin() {
  window.location.href = CLIENT_LOGIN_PATH;
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
    className = "btn btn-outline",
    style = "",
    missingMessage = "Arquivo ainda não disponível."
  } = {}
) {
  const styleAttr = style ? ` style="${style}"` : "";

  if (url) {
    if (url.startsWith("/api/files/")) {
      return `<button type="button" class="${className}"${styleAttr} onclick="openProtectedResource('${escapeInlineMessage(
        url
      )}')">${label}</button>`;
    }

    return `<a class="${className}"${styleAttr} href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  return `<button type="button" class="${className}"${styleAttr} onclick="showToast('${escapeInlineMessage(
    missingMessage
  )}')">${label}</button>`;
}

function buildWhatsappUrl(payload) {
  const messageLines = [
    "Olá, equipe ONE! Quero falar sobre uma proposta.",
    "",
    `Nome: ${payload.name}`,
    `WhatsApp: ${payload.phone}`,
    `E-mail: ${payload.email}`
  ];

  if (payload.company) {
    messageLines.push(`Empresa: ${payload.company}`);
  }

  if (payload.service) {
    messageLines.push(`Serviço de interesse: ${payload.service}`);
  }

  if (payload.message) {
    messageLines.push(`Mensagem: ${payload.message}`);
  }

  return `https://wa.me/5599985480961?text=${encodeURIComponent(messageLines.join("\n"))}`;
}

function validateContactPayload(payload) {
  if (!payload.name) {
    throw new Error("Preencha seu nome.");
  }

  const phoneDigits = payload.phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    throw new Error("Preencha um WhatsApp válido com DDD.");
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("Preencha um e-mail válido.");
  }
}

function executeInlineAction(action, event, element) {
  if (action === "document.getElementById('contact').scrollIntoView({behavior:'smooth'})") {
    scrollToContact();
    return true;
  }

  if (action === "goToClientLogin();toggleMobile()") {
    goToClientLogin();
    toggleMobile();
    return true;
  }

  const match = action.match(/^([a-zA-Z_$][\w$]*)\((.*)\)$/);
  if (!match) {
    return false;
  }

  const [, fnName, rawArgs] = match;
  const args = parseInlineArgs(rawArgs).map((arg) => (arg === "__event__" ? event : arg));

  const handlers = {
    toggleMobile,
    openModal,
    goToClientLogin,
    goToInternalLogin,
    closeModal,
    closeModalBg,
    doLogin,
    logout,
    handleForm,
    updateMaterialStatus,
    sendMessage,
    showToast
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

  root.querySelectorAll("[onsubmit]").forEach((element) => {
    if (element.dataset.boundSubmit === "1") {
      return;
    }
    const action = element.getAttribute("onsubmit");
    element.addEventListener("submit", (event) => {
      executeInlineAction(action, event, element);
    });
    element.dataset.boundSubmit = "1";
    element.removeAttribute("onsubmit");
  });
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

function saveInternalHandoff(session) {
  // sessionStorage e usado intencionalmente aqui apenas para handoff
  // de metadados nao sensiveis (requestedAt, role) entre paginas do mesmo dominio.
  // O access token nunca entra no sessionStorage - fica em memoria em app-core.js.
  sessionStorage.setItem(INTERNAL_HANDOFF_KEY, JSON.stringify({ requestedAt: Date.now(), role: session?.user?.role || "internal" }));
}

function loadClientHandoff() {
  try {
    return JSON.parse(sessionStorage.getItem(CLIENT_HANDOFF_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function clearClientHandoff() {
  sessionStorage.removeItem(CLIENT_HANDOFF_KEY);
}

function saveClientHandoff(session) {
  sessionStorage.setItem(CLIENT_HANDOFF_KEY, JSON.stringify({ requestedAt: Date.now(), role: session?.user?.role || "client" }));
}

async function apiFetch(path, options = {}) {
  const data = await APP.fetchJson(path, options);
  const session = APP.loadSession();
  if (session) {
    currentSession = session;
  }
  return data;
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
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
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function toggleMobile() {
  const menu = document.getElementById("mobile-menu");
  const trigger = document.querySelector(".hamburger");
  const isOpen = menu.classList.toggle("open");
  trigger?.setAttribute("aria-expanded", String(isOpen));
}

function openModal(type) {
  currentRole = type;
  lastFocusedElement = document.activeElement;
  document.getElementById("modal-title").textContent =
    type === "admin" ? "Painel Administrativo" : "Área do Cliente";
  document.getElementById("modal-sub").textContent =
    type === "admin"
      ? "Acesso restrito à equipe ONE"
      : "Acesse sua conta para acompanhar projetos";
  document.getElementById("login-email").value = "";
  document.getElementById("login-pass").value = "";
  const whatsappLink = document.getElementById("modal-whatsapp-link");
  if (whatsappLink) {
    whatsappLink.style.display = type === "admin" ? "none" : "inline-flex";
  }
  document.getElementById("modal-bg").classList.add("open");
  document.getElementById("modal-bg").setAttribute("aria-hidden", "false");
  bindLegacyInlineHandlers(document.getElementById("modal-bg"));
  window.setTimeout(() => document.getElementById("login-email")?.focus(), 0);
}

function closeModal() {
  document.getElementById("modal-bg").classList.remove("open");
  document.getElementById("modal-bg").setAttribute("aria-hidden", "true");
  lastFocusedElement?.focus?.();
}

function closeModalBg(event) {
  if (event.target === document.getElementById("modal-bg")) {
    closeModal();
  }
}

async function handleForm(event) {
  event.preventDefault();
  const form = event.target;

  const payload = {
    name: document.getElementById("f-name").value.trim(),
    phone: document.getElementById("f-phone").value.trim(),
    email: document.getElementById("f-email").value.trim(),
    company: document.getElementById("f-company").value.trim(),
    service: document.getElementById("f-service").value,
    message: document.getElementById("f-msg").value.trim()
  };

  const submitButton = document.getElementById("contact-submit");

  await FORM.submit(
    form,
    async () => {
      validateContactPayload(payload);

      if (!document.getElementById("f-consent")?.checked) {
        throw new Error("Você precisa aceitar a Política de Privacidade antes de enviar.");
      }

      const whatsappUrl = buildWhatsappUrl(payload);

      form.reset();
      const messageCounter = document.getElementById("f-msg-count");
      if (messageCounter) {
        messageCounter.textContent = "0/1000 caracteres";
      }

      showToast("Abrindo WhatsApp para concluir o contato.");
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    },
    { loadingText: "Enviando...", button: submitButton }
  )(event).catch((error) => {
    showToast(error.message);
  });
}

async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value;
  const submitButton = document.getElementById("login-submit");

  await FORM.submit(
    { querySelector: () => submitButton },
    async () => {
      const session = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false
      });

      if (currentRole === "admin" && session.user.role === "client") {
        throw new Error("Acesso interno permitido apenas para perfis da equipe.");
      }

      if (currentRole === "client" && session.user.role !== "client") {
        window.location.href = INTERNAL_LOGIN_PATH;
        return;
      }

      saveSession(session);
      closeModal();

      if (session.user.role === "client") {
        saveClientHandoff(session);
        window.location.href = CLIENT_LOGIN_PATH;
      } else {
        saveInternalHandoff(session);
        window.location.href = INTERNAL_LOGIN_PATH;
      }
    },
    { loadingText: "Entrando...", button: submitButton }
  )().catch((error) => {
    showToast(error.message);
  });
}

function renderKpis(summary) {
  const items = [
    { label: "Faturamento", value: currency(summary.revenue), sub: "Receita acumulada" },
    { label: "Leads", value: number(summary.leads), sub: "Leads gerados" },
    { label: "ROI", value: `${Number(summary.roi || 0).toFixed(2)}%`, sub: "Retorno consolidado" },
    { label: "Campanhas", value: number(summary.campaigns_count), sub: "Campanhas ativas e históricas" }
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
  const taskMap = tasks.reduce((acc, task) => {
    if (!task.client_id) {
      return acc;
    }
    acc.push(task);
    return acc;
  }, []);

  document.getElementById("proj-list").innerHTML =
    campaigns
      .map((campaign) => {
        const relatedTasks = taskMap
          .filter((task) => String(task.client_id) === String(campaign.client_id))
          .slice(0, 1);
        const taskLabel = relatedTasks.length ? relatedTasks[0].title : "Sem tarefa pendente";
        return `
          <div class="proj-row">
            <div>
              <div class="proj-name">${campaign.name}</div>
              <div class="proj-type">${campaign.channel} · ${campaign.client_name || ""}</div>
            </div>
            <span class="badge ${campaign.status === "Ativa" ? "badge-green" : "badge-blue"}">${campaign.status}</span>
            <div class="progress-wrap">
              <div class="progress-bg"><div class="progress-fill" style="width:${Math.min(Number(campaign.roi || 0), 100)}%"></div></div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px;text-align:right">ROI ${Number(campaign.roi || 0).toFixed(2)}%</div>
            </div>
            <button class="btn btn-outline" style="padding:8px 16px;font-size:13px" onclick="showToast('${taskLabel.replace(/'/g, "")}')">Ver detalhe</button>
          </div>
        `;
      })
      .join("") || '<div class="proj-row"><div>Nenhuma campanha encontrada.</div></div>';
}

function renderSimpleList(containerId, items, builder, emptyMessage) {
  document.getElementById(containerId).innerHTML =
    items.length > 0
      ? items.map(builder).join("")
      : `<div class="proj-row"><div>${emptyMessage}</div></div>`;
}

function renderReports(reports) {
  renderSimpleList(
    "reports-list",
    reports,
    (report) => `
      <div class="proj-row">
        <div>
          <div class="proj-name">${report.title}</div>
          <div class="proj-type">${formatDate(report.report_month)} · ${report.summary}</div>
        </div>
        <span class="badge badge-blue">Relatório</span>
        <div></div>
        ${renderResourceAction(report.file_url, {
          style: "padding:8px 16px;font-size:13px",
          missingMessage: "Relatório ainda não disponível para abertura."
        })}
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
    await loadClientDashboard(false);
    showToast(`Material marcado como ${status.toLowerCase()}.`);
  } catch (error) {
    showToast(error.message);
  }
}

function renderMaterials(materials) {
  renderSimpleList(
    "materials-list",
    materials,
    (material) => `
      <div class="proj-row">
        <div>
          <div class="proj-name">${material.title}</div>
          <div class="proj-type">${material.client_name || ""}</div>
        </div>
        <span class="badge ${material.status === "Aprovado" ? "badge-green" : material.status === "Revisão" ? "badge-yellow" : "badge-pink"}">${material.status}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline" style="padding:8px 12px;font-size:13px" onclick="updateMaterialStatus(${material.id}, 'Aprovado')">Aprovar</button>
          <button class="btn btn-outline" style="padding:8px 12px;font-size:13px" onclick="updateMaterialStatus(${material.id}, 'Revisão')">Solicitar revisão</button>
        </div>
        ${renderResourceAction(material.url || material.file_url, {
          style: "padding:8px 16px;font-size:13px",
          missingMessage: "Material ainda não disponível para abertura."
        })}
      </div>
    `,
    "Nenhum material aguardando ação."
  );
}

function renderInvoices(invoices) {
  renderSimpleList(
    "invoices-list",
    invoices,
    (invoice) => `
      <div class="proj-row">
        <div>
          <div class="proj-name">${currency(invoice.amount)}</div>
          <div class="proj-type">Vencimento em ${formatDate(invoice.due_date)}</div>
        </div>
        <span class="badge ${invoice.status === "Pago" ? "badge-green" : "badge-yellow"}">${invoice.status}</span>
        <div></div>
        <button class="btn btn-outline" style="padding:8px 16px;font-size:13px" onclick="showToast('Fatura ${invoice.id} - ${invoice.status}')">Detalhe</button>
      </div>
    `,
    "Nenhuma fatura encontrada."
  );
}

async function sendMessage() {
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
    await apiFetch("/messages", {
      method: "POST",
      body: JSON.stringify({ receiver_id: receiverId, content })
    });
    textarea.value = "";
    await loadClientDashboard(false);
    showToast("Mensagem enviada.");
  } catch (error) {
    showToast(error.message);
  }
}

function renderMessages(messages) {
  const composer = `
    <div class="proj-row">
      <div style="width:100%">
        <div class="proj-name">Nova mensagem</div>
        <div class="proj-type">Envie um comentário direto para a equipe.</div>
        <textarea id="message-input" style="width:100%;margin-top:14px;padding:12px;border:1px solid var(--border);min-height:110px"></textarea>
      </div>
      <span class="badge badge-pink">Mensagens</span>
      <div></div>
      <button class="btn btn-primary" style="padding:8px 16px;font-size:13px" onclick="sendMessage()">Enviar</button>
    </div>
  `;

  const list = messages
    .slice(0, 6)
    .map(
      (message) => `
        <div class="proj-row">
          <div>
            <div class="proj-name">${message.sender_name}</div>
            <div class="proj-type">${message.content}</div>
          </div>
          <span class="badge badge-blue">${formatDate(message.created_at)}</span>
          <div></div>
          <span style="font-size:12px;color:var(--muted)">Para ${message.receiver_name}</span>
        </div>
      `
    )
    .join("");

  document.getElementById("messages-list").innerHTML =
    composer + (list || '<div class="proj-row"><div>Sem mensagens recentes.</div></div>');
}

async function loadClientDashboard(scroll = true) {
  document.getElementById("dashboard").classList.add("visible");
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
      container.innerHTML = '<div class="proj-row"><div>Carregando...</div></div>';
    }
  });

  const dashboard = await apiFetch("/dashboard");
  currentDashboard = dashboard;

  document.getElementById("dashboard").classList.add("visible");
  document.getElementById("dash-welcome").textContent = `Bem-vindo de volta, ${currentSession.user.name}.`;
  document.getElementById("dash-badge").textContent = "Cliente";

  renderKpis(dashboard.summary);
  renderCampaigns(dashboard.campaigns, dashboard.tasks);
  renderReports(dashboard.reports);
  renderMaterials(dashboard.materials);
  renderInvoices(dashboard.invoices);
  renderMessages(dashboard.messages);
  bindLegacyInlineHandlers(document.getElementById("dashboard"));

  if (scroll) {
    document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" });
  }
}

function logout() {
  APP.logout({ reason: "manual" }).finally(() => {
    clearSession();
    document.getElementById("dashboard").classList.remove("visible");
    showToast("Sessão encerrada.");
  });
}

async function boot() {
  document.title = "ONE Comunicação Integrada";
  bindLegacyInlineHandlers();
  APP.registerActivityTracking();
  APP.onLogout((reason) => {
    clearSession();
    document.getElementById("dashboard").classList.remove("visible");
    if (reason === "idle-timeout") {
      showToast("Sua sessão foi encerrada por inatividade.");
    }
  });

  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => navbar.classList.toggle("scrolled", scrollY > 60));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("visible"), index * 80);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById("modal-bg").classList.contains("open")) {
      closeModal();
      return;
    }

    trapModalFocus(event);

    if (event.key === "Enter" && document.getElementById("modal-bg").classList.contains("open")) {
      doLogin();
    }
  });

  const messageField = document.getElementById("f-msg");
  const messageCounter = document.getElementById("f-msg-count");
  messageField?.addEventListener("input", () => {
    if (messageCounter) {
      messageCounter.textContent = `${messageField.value.length}/1000 caracteres`;
    }
  });

  window.addEventListener("offline", () => {
    showToast("Você está sem conexão. Verifique sua internet.");
  });

  window.addEventListener("online", () => {
    showToast("Conexão restabelecida.");
  });

  clearClientHandoff();
  clearSession();
  document.getElementById("dashboard").classList.remove("visible");
}

window.toggleMobile = toggleMobile;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalBg = closeModalBg;
window.doLogin = doLogin;
window.logout = logout;
window.handleForm = handleForm;
window.updateMaterialStatus = updateMaterialStatus;
window.sendMessage = sendMessage;
window.showToast = showToast;
window.openProtectedResource = openProtectedResource;

boot();


