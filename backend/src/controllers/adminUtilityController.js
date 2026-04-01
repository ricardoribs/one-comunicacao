const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const env = require('../config/env');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

const execFileAsync = promisify(execFile);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
let showcaseIngestInFlight = null;

function assertShowcaseIngestEnabled() {
  if (!env.showcaseIngestEnabled) {
    throw new AppError('Endpoint não encontrado.', 404);
  }
}

function summarizeOutput(stdout = '', stderr = '') {
  const combinedLines = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const importantLines = combinedLines.filter(
    (line) => line.startsWith('[showcase]') || line.startsWith('- ')
  );

  return importantLines.length > 0 ? importantLines : combinedLines.slice(-20);
}

async function runShowcaseIngestion() {
  const startedAt = Date.now();
  const { stdout, stderr } = await execFileAsync(process.execPath, [path.join('scripts', 'ingest-showcase-data.js')], {
    cwd: BACKEND_ROOT,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    durationMs: Date.now() - startedAt,
    lines: summarizeOutput(stdout, stderr),
  };
}

async function ingestShowcase(req, res) {
  assertShowcaseIngestEnabled();

  if (showcaseIngestInFlight) {
    throw new AppError('A ingestão de showcase já está em execução.', 409);
  }

  showcaseIngestInFlight = runShowcaseIngestion();

  try {
    const result = await showcaseIngestInFlight;
    logger.info(
      {
        user_id: req.user?.id || null,
        duration_ms: result.durationMs,
      },
      'Ingestão de showcase executada por rota administrativa.'
    );
    res.json({
      message: 'Ingestão executada com sucesso.',
      duration_ms: result.durationMs,
      output: result.lines,
    });
  } catch (error) {
    logger.error(
      {
        user_id: req.user?.id || null,
        err: error,
      },
      'Falha ao executar ingestão de showcase por rota administrativa.'
    );
    throw new AppError(error.stderr?.trim() || error.stdout?.trim() || error.message || 'Falha ao executar ingestão.', 500);
  } finally {
    showcaseIngestInFlight = null;
  }
}

module.exports = {
  ingestShowcase,
};
