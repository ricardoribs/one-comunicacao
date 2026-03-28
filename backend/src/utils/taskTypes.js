const TASK_TYPE_ALIASES = new Map([
  ['design grafico', 'design_grafico'],
  ['copywriting', 'copywriting'],
  ['edicao de video', 'edicao_video'],
  ['edicao video', 'edicao_video'],
  ['captacao', 'captacao'],
  ['fotografia', 'fotografia'],
  ['planejamento', 'planejamento'],
  ['social media', 'social_media'],
  ['trafego pago', 'trafego_pago'],
  ['cobertura', 'cobertura'],
  ['releases', 'releases'],
  ['newsletter', 'newsletter'],
  ['reuniao', 'reuniao'],
  ['aprovacao cliente', 'aprovacao_cliente'],
  ['refacao', 'refacao'],
  ['urgente', 'urgente'],
  ['geral', 'planejamento'],
  ['design', 'design_grafico'],
  ['revisao design', 'refacao'],
  ['edicao', 'edicao_video'],
  ['atendimento', 'social_media'],
  ['financeiro', 'planejamento'],
  ['adm', 'planejamento'],
  ['reuniao estrategica', 'reuniao'],
  ['trafego', 'trafego_pago'],
  ['landing page', 'copywriting'],
]);

function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeTaskTypeValue(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return 'planejamento';
  }

  return TASK_TYPE_ALIASES.get(normalizeLooseText(raw)) || raw;
}

module.exports = {
  normalizeTaskTypeValue,
};
