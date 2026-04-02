const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const baseUrl = process.env.AUDIT_BASE_URL || "http://localhost:3210/painel-interno.html";
const outputDir = path.resolve(process.cwd(), "qa-audit-artifacts", "current-run");
const shotsDir = path.join(outputDir, "screenshots");
const metricsPath = path.join(outputDir, "metrics.json");

const scenarios = [
  {
    name: "crm-clientes",
    go: () => {
      window.goTo("crm");
      window.setTab("crm", "clientes");
    },
    ready: "#clientes-tbody tr"
  },
  {
    name: "crm-historico",
    go: () => {
      window.goTo("crm");
      window.setTab("crm", "historico");
    },
    ready: "#historico-tbody tr"
  },
  {
    name: "campanhas",
    go: () => {
      window.goTo("campanhas");
    },
    ready: "#campanhas-tbody tr"
  },
  {
    name: "producao-copy",
    go: () => {
      window.goTo("producao");
      window.setTab("prod", "copy");
    },
    ready: "#copy-tbody tr"
  },
  {
    name: "producao-lp",
    go: () => {
      window.goTo("producao");
      window.setTab("prod", "lp");
    },
    ready: "#lp-tbody tr"
  },
  {
    name: "trafego",
    go: () => {
      window.goTo("trafego");
    },
    ready: "#trafego-tbody tr"
  },
  {
    name: "analytics",
    go: () => {
      window.goTo("analytics");
    },
    ready: "#analytics-tbody tr"
  },
  {
    name: "financeiro",
    go: () => {
      window.goTo("financeiro");
    },
    ready: "#fin-clientes tr"
  },
  {
    name: "acesso-membros",
    go: () => {
      window.goTo("acesso");
      window.setTab("acesso", "membros");
    },
    ready: ".access-member-table tbody tr"
  }
];

const viewports = [
  { label: "desktop-1280", width: 1280, height: 1500 },
  { label: "tablet-1024", width: 1024, height: 1400 },
  { label: "tablet-768", width: 768, height: 1400 },
  { label: "mobile-375", width: 375, height: 1400 }
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function login(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.fill("#l-email", "admin@example.test");
  await page.fill("#l-pass", "SenhaForte@123");
  await page.click('[data-action="do-login"]');
  await page.waitForSelector("#login-screen.hidden", { state: "attached" });
  await page.waitForSelector("#page-home.active");
  await page.waitForTimeout(500);
}

async function captureScenario(page, viewport, scenario) {
  console.log(`CAPTURE ${viewport.label} ${scenario.name}`);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.evaluate(scenario.go);
  await page.waitForTimeout(300);
  await page.waitForFunction(
    (selector) => {
      const node = document.querySelector(selector);
      if (!node) {
        return false;
      }

      const target = node.matches("tr") ? node : node.querySelector("tr");
      if (!target) {
        return false;
      }

      const panel = target.closest(".app-screen, .hidden-panel");
      if (panel && getComputedStyle(panel).display === "none") {
        return false;
      }

      const rect = target.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    scenario.ready,
    { timeout: 30000 }
  );
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() => {
    const activeScreen = document.querySelector(".app-screen.active");
    const visibleTables = Array.from(activeScreen?.querySelectorAll("table") || []).map((table) => {
      const rect = table.getBoundingClientRect();
      return {
        className: table.className,
        width: Math.round(rect.width),
        scrollWidth: Math.round(table.scrollWidth),
        hasOverflow: table.scrollWidth > rect.width + 2,
        headers: Array.from(table.querySelectorAll("thead th")).map((th) => ({
          text: th.textContent.trim(),
          width: Math.round(th.getBoundingClientRect().width),
          hidden: getComputedStyle(th).display === "none"
        }))
      };
    });

    return {
      page: activeScreen?.id || null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentScrollWidth: document.documentElement.scrollWidth,
      hasHorizontalPageOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      visibleTables
    };
  });

  const screenshotPath = path.join(shotsDir, `${viewport.label}-${scenario.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return { viewport: viewport.label, scenario: scenario.name, screenshotPath, metrics };
}

async function main() {
  await ensureDir(shotsDir);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await login(page);
    const results = [];

    for (const viewport of viewports) {
      for (const scenario of scenarios) {
        results.push(await captureScenario(page, viewport, scenario));
      }
    }

    await fs.promises.writeFile(metricsPath, JSON.stringify(results, null, 2), "utf8");
    console.log(metricsPath);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
