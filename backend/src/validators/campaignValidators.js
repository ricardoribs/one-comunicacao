const { z } = require('zod');

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const channelEnum = z.enum([
  'Meta Ads',
  'Instagram + Meta',
  'Google Ads',
  'Instagram',
  'Facebook',
  'Google',
  'TikTok',
  'Email',
  'Outro',
]);
const campaignStatusEnum = z.enum(['Ativa', 'Pausada', 'Encerrada', 'Planejamento']);

const emptyToNullString = (schema = z.string().max(255)) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), schema.nullable());

const emptyToNullDate = () =>
  emptyToNullString(z.string().regex(isoDateRegex, 'Informe uma data valida no formato AAAA-MM-DD'));

exports.campaignSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(160),
  channel: channelEnum,
  audience: emptyToNullString(z.string().max(160)).optional(),
  objective: emptyToNullString(z.string().max(1000)).optional(),
  pipeline_stage: emptyToNullString(z.string().max(80)).optional(),
  budget: z.coerce.number().min(0).max(9999999),
  start_date: emptyToNullDate().optional(),
  end_date: emptyToNullDate().optional(),
  status: z.preprocess((value) => (value === '' || value === undefined ? null : value), campaignStatusEnum.nullable()).optional(),
});

exports.campaignUpdateSchema = exports.campaignSchema.partial();
