const ON_DEMAND_SERVICE_OPTIONS = [
  'Cobertura de Eventos',
  'Releases (Imprensa)',
  'Newsletter',
  'Fotografia',
  'Tr\u00e1fego Pago (como servi\u00e7o isolado)',
];

const CLIENT_PLAN_OPTIONS = [
  'One Ideal',
  'One Start',
  'One Master',
  'Sob demanda',
  ...ON_DEMAND_SERVICE_OPTIONS.map((service) => `Sob demanda \u00b7 ${service}`),
];

function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getOnDemandServiceLabel(value) {
  const normalized = normalizeLooseText(value);

  if (!normalized) {
    return '';
  }

  if (normalized.includes('evento')) {
    return 'Cobertura de Eventos';
  }
  if (normalized.includes('release') || normalized.includes('imprensa')) {
    return 'Releases (Imprensa)';
  }
  if (normalized.includes('newsletter')) {
    return 'Newsletter';
  }
  if (normalized.includes('fotografia')) {
    return 'Fotografia';
  }
  if (normalized.includes('trafego pago')) {
    return 'Tr\u00e1fego Pago (como servi\u00e7o isolado)';
  }

  return '';
}

function normalizeClientPlan(value) {
  const raw = String(value || '').trim();
  const normalized = normalizeLooseText(raw);

  if (!normalized) {
    return null;
  }

  const serviceLabel = getOnDemandServiceLabel(raw);
  if (serviceLabel) {
    return `Sob demanda \u00b7 ${serviceLabel}`;
  }

  if (normalized === 'starter' || normalized === 'one ideal' || normalized === 'combo one ideal' || normalized === 'combo one' || normalized === 'one') {
    return 'One Ideal';
  }

  if (
    normalized === 'growth'
    || normalized === 'one start'
    || normalized === 'one star'
    || normalized === 'combo one start'
    || normalized === 'start'
  ) {
    return 'One Start';
  }

  if (normalized === 'scale' || normalized === 'one master' || normalized === 'combo one master' || normalized === 'master') {
    return 'One Master';
  }

  if (normalized === 'sob demanda' || normalized.includes('complemento')) {
    return 'Sob demanda';
  }

  if (CLIENT_PLAN_OPTIONS.includes(raw)) {
    return raw;
  }

  return null;
}

module.exports = {
  ON_DEMAND_SERVICE_OPTIONS,
  CLIENT_PLAN_OPTIONS,
  normalizeClientPlan,
};
