const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return fullPath;
  });
}

const jsDir = path.resolve(__dirname, "../frontend/assets/js");
const jsFiles = walk(jsDir).filter((file) => file.endsWith(".js"));

if (jsFiles.length === 0) {
  throw new Error("Nenhum arquivo JS de frontend encontrado para validacao.");
}

for (const file of jsFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`[FRONTEND CHECK] ${jsFiles.length} arquivos JS validados com sucesso.`);
