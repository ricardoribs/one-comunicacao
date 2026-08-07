const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(projectRoot, "frontend");
const jsDir = path.join(frontendRoot, "assets", "js");
const safeDomFile = path.join(jsDir, "utils", "safe-dom.js");
const internalPanelFile = path.join(frontendRoot, "painel-interno.html");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return fullPath;
  });
}

function relative(file) {
  return path.relative(projectRoot, file).replace(/\\/g, "/");
}

function lineNumberForOffset(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length;
}

function collectPatternFindings(file, source, pattern, label) {
  const findings = [];
  for (const match of source.matchAll(pattern)) {
    findings.push(`${relative(file)}:${lineNumberForOffset(source, match.index)} ${label}`);
  }
  return findings;
}

function assertSafeDomLoadOrder() {
  const html = fs.readFileSync(internalPanelFile, "utf8");
  const safeDomIndex = html.indexOf("/assets/js/utils/safe-dom.js");
  const adminAppIndex = html.indexOf("/assets/js/admin-app.js");

  if (safeDomIndex === -1) {
    return ["frontend/painel-interno.html deve carregar /assets/js/utils/safe-dom.js."];
  }

  if (adminAppIndex === -1 || safeDomIndex > adminAppIndex) {
    return ["frontend/painel-interno.html deve carregar safe-dom.js antes de admin-app.js."];
  }

  return [];
}

const jsFiles = walk(jsDir).filter((file) => file.endsWith(".js"));
const htmlFiles = fs
  .readdirSync(frontendRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => path.join(frontendRoot, entry.name));

if (jsFiles.length === 0) {
  throw new Error("Nenhum arquivo JS de frontend encontrado para validacao.");
}

for (const file of jsFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

const findings = [];
const securityPatterns = [
  { label: "uso de eval()", pattern: /\beval\s*\(/gi },
  { label: "uso de new Function()", pattern: /\bnew\s+Function\s*\(/gi },
  { label: "uso de document.write()", pattern: /\bdocument\.write\s*\(/gi },
  { label: "uso de outerHTML", pattern: /\.outerHTML\s*=/gi },
  { label: "uso de insertAdjacentHTML()", pattern: /\.insertAdjacentHTML\s*\(/gi },
  { label: "URL javascript:", pattern: /javascript\s*:/gi },
  { label: "atributo srcdoc", pattern: /\bsrcdoc\s*=/gi },
];

for (const file of [...jsFiles, ...htmlFiles]) {
  const isSafeDom = path.resolve(file) === path.resolve(safeDomFile);
  const source = fs.readFileSync(file, "utf8");

  if (!isSafeDom) {
    for (const { pattern, label } of securityPatterns) {
      findings.push(...collectPatternFindings(file, source, pattern, label));
    }
  }

  if (file.endsWith(".html")) {
    findings.push(...collectPatternFindings(file, source, /\son[a-z]+\s*=/gi, "handler inline on*"));
    findings.push(...collectPatternFindings(file, source, /\sstyle\s*=/gi, "style inline bloqueado pela CSP"));
  }
}

const directInnerHtmlFiles = jsFiles
  .filter((file) => path.resolve(file) !== path.resolve(safeDomFile))
  .filter((file) => /\.innerHTML\s*=/i.test(fs.readFileSync(file, "utf8")));

if (directInnerHtmlFiles.length > 0) {
  findings.push(...assertSafeDomLoadOrder());
}

if (findings.length > 0) {
  console.error("[FRONTEND CHECK] Falhas de seguranca encontradas:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  `[FRONTEND CHECK] ${jsFiles.length} arquivos JS e ${htmlFiles.length} HTML validados com sintaxe e varredura de seguranca.`
);
