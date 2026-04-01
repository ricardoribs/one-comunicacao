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
    throw new AppError('Endpoint nao encontrado.', 404);
  }
}

function summarizeOutput(stdout = '', stderr = '') {
  const combinedLines = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const importantLines = combinedLines.filter((line) => line.startsWith('[showcase]') || line.startsWith('- '));
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
    throw new AppError('A ingestao de showcase ja esta em execucao.', 409);
  }

  showcaseIngestInFlight = runShowcaseIngestion();

  try {
    const result = await showcaseIngestInFlight;
    logger.info(
      {
        user_id: req.user?.id || null,
        duration_ms: result.durationMs,
      },
      'Ingestao de showcase executada por rota administrativa.'
    );
    res.json({
      message: 'Ingestao executada com sucesso.',
      duration_ms: result.durationMs,
      output: result.lines,
    });
  } catch (error) {
    logger.error(
      {
        user_id: req.user?.id || null,
        err: error,
      },
      'Falha ao executar ingestao de showcase por rota administrativa.'
    );
    res.status(500).json({
      message: 'Falha ao executar ingestao.',
      request_id: req.requestId,
      details: summarizeOutput(error.stdout, error.stderr),
    });
  } finally {
    showcaseIngestInFlight = null;
  }
}

module.exports = {
  ingestShowcase,
};
