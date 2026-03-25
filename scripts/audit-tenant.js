const fs = require("fs");
const path = require("path");

const TENANT_FILES = new Set([
  "dashboardService.js",
  "invoiceModel.js",
  "taskModel.js",
  "materialModel.js",
  "campaignModel.js",
  "contactModel.js",
  "messageModel.js",
  "chargeModel.js",
  "reportModel.js",
  "clientModel.js",
  "fileModel.js",
  "metricModel.js",
  "access.js"
]);

const SCAN_DIRS = [
  path.resolve(__dirname, "../backend/src/models"),
  path.resolve(__dirname, "../backend/src/services"),
  path.resolve(__dirname, "../backend/src/utils")
];

const QUERY_PATTERN = /\b(?:pool|db|client)\.query\s*\(/g;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return fullPath;
  });
}

const violations = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    if (!TENANT_FILES.has(path.basename(file))) {
      continue;
    }

    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (QUERY_PATTERN.test(line)) {
        violations.push(`${file}:${index + 1}:${line.trim()}`);
      }
      QUERY_PATTERN.lastIndex = 0;
    });
  }
}

if (violations.length > 0) {
  console.error("\n[TENANT GUARD] Violacoes encontradas:\n");
  violations.forEach((violation) => console.error(`  ${violation}`));
  console.error("\nMigre essas queries para tenantDb.query antes de subir.\n");
  process.exit(1);
}

console.log("[TENANT GUARD] OK - zero violacoes.");
