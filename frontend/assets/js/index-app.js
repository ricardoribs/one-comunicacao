const APP = window.ONE_APP;
const FORM = window.FormUtils || window.ONE_FORM;
const MOBILE_BREAKPOINT = 768;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3500);
}

function isMobileViewport() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function closeMobile() {
  const menu = document.getElementById("mobile-menu");
  const trigger = document.querySelector(".hamburger");
  menu?.classList.remove("open");
  menu?.setAttribute("aria-hidden", "true");
  trigger?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
}

function toggleMobile(forceState) {
  const menu = document.getElementById("mobile-menu");
  const trigger = document.querySelector(".hamburger");

  if (!menu) {
    return;
  }

  const shouldOpen = typeof forceState === "boolean" ? forceState : !menu.classList.contains("open");
  menu.classList.toggle("open", shouldOpen);
  menu.setAttribute("aria-hidden", String(!shouldOpen));
  trigger?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("nav-open", shouldOpen);
}

function syncPublicShell() {
  if (!isMobileViewport()) {
    closeMobile();
  }
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

async function handleForm(event) {
  event.preventDefault();
  const form = event.target;
  const payload = {
    name: document.getElementById("f-name")?.value.trim() || "",
    phone: document.getElementById("f-phone")?.value.trim() || "",
    email: document.getElementById("f-email")?.value.trim() || "",
    company: document.getElementById("f-company")?.value.trim() || "",
    service: document.getElementById("f-service")?.value || "",
    message: document.getElementById("f-msg")?.value.trim() || ""
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

function bootRevealObserver() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  elements.forEach((element) => observer.observe(element));
}

function bootNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) {
    return;
  }

  const syncNavbar = () => navbar.classList.toggle("scrolled", window.scrollY > 60);
  syncNavbar();
  window.addEventListener("scroll", syncNavbar, { passive: true });
}

function bootMessageCounter() {
  const messageField = document.getElementById("f-msg");
  const messageCounter = document.getElementById("f-msg-count");

  if (!messageField || !messageCounter) {
    return;
  }

  messageField.addEventListener("input", () => {
    messageCounter.textContent = `${messageField.value.length}/1000 caracteres`;
  });
}

function bootLogoCarousels() {
  const carousels = document.querySelectorAll("[data-logo-carousel]");
  if (!carousels.length) {
    return;
  }

  carousels.forEach((carousel) => {
    const track = carousel.querySelector(".marquee-track");
    if (!track) {
      return;
    }

    if (!track.dataset.loopReady) {
      const originals = Array.from(track.children);
      originals.forEach((item) => {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("img").forEach((img) => {
          img.alt = "";
        });
        track.appendChild(clone);
      });
      track.dataset.loopReady = "true";
    }

    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;
    let rafId = 0;
    let lastFrame = 0;
    let isDragging = false;

    const getLoopWidth = () => track.scrollWidth / 2;

    const normalizeScroll = () => {
      const loopWidth = getLoopWidth();
      if (!loopWidth) {
        return;
      }

      if (carousel.scrollLeft >= loopWidth) {
        carousel.scrollLeft -= loopWidth;
      } else if (carousel.scrollLeft < 0) {
        carousel.scrollLeft += loopWidth;
      }
    };

    const tick = (timestamp) => {
      if (!lastFrame) {
        lastFrame = timestamp;
      }

      const elapsed = timestamp - lastFrame;
      lastFrame = timestamp;

      if (!isDragging) {
        carousel.scrollLeft += elapsed * 0.045;
        normalizeScroll();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const stopDragging = () => {
      pointerId = null;
      isDragging = false;
      carousel.classList.remove("dragging");
    };

    carousel.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    carousel.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      pointerId = event.pointerId;
      isDragging = true;
      startX = event.clientX;
      startScrollLeft = carousel.scrollLeft;
      carousel.classList.add("dragging");
      carousel.setPointerCapture(event.pointerId);
    });

    carousel.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) {
        return;
      }

      carousel.scrollLeft = startScrollLeft - (event.clientX - startX);
      normalizeScroll();
    });

    carousel.addEventListener("pointerup", stopDragging);
    carousel.addEventListener("pointercancel", stopDragging);
    carousel.addEventListener("lostpointercapture", stopDragging);

    rafId = window.requestAnimationFrame(tick);
  });
}

function bootWorkflowCards() {
  const grids = document.querySelectorAll(".workflow-grid");
  if (!grids.length) {
    return;
  }

  grids.forEach((grid) => {
    const cards = Array.from(grid.querySelectorAll(".workflow-card"));
    if (!cards.length) {
      return;
    }

    const defaultCard = grid.querySelector(".workflow-card-featured") || cards[0];

    const setActive = (targetCard) => {
      cards.forEach((card) => {
        card.classList.toggle("is-active", card === targetCard);
      });
    };

    setActive(defaultCard);

    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => setActive(card));
      card.addEventListener("focusin", () => setActive(card));
      card.addEventListener("pointerdown", () => setActive(card));
    });

    grid.addEventListener("mouseleave", () => setActive(defaultCard));
    grid.addEventListener("focusout", () => {
      window.requestAnimationFrame(() => {
        if (!grid.contains(document.activeElement)) {
          setActive(defaultCard);
        }
      });
    });
  });
}

function bootGlobalEvents() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById("mobile-menu")?.classList.contains("open")) {
      closeMobile();
    }
  });

  window.addEventListener("resize", syncPublicShell);
  window.addEventListener("orientationchange", syncPublicShell);
  window.addEventListener("offline", () => {
    showToast("Você está sem conexão. Verifique sua internet.");
  });
  window.addEventListener("online", () => {
    showToast("Conexão restabelecida.");
  });
}

function boot() {
  document.title = "ONE Comunicação Integrada";
  APP?.registerActivityTracking?.();
  syncPublicShell();
  bootNavbar();
  bootRevealObserver();
  bootLogoCarousels();
  bootWorkflowCards();
  bootMessageCounter();
  bootGlobalEvents();
}

window.toggleMobile = toggleMobile;
window.handleForm = handleForm;
window.showToast = showToast;

boot();
