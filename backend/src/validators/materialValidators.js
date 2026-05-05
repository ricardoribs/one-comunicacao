const { z } = require('zod');

const MATERIAL_STATUS_VALUES = ['Pendente', 'Aprovado', 'Revisao', 'Rejeitado'];

function normalizeMaterialStatus(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized === 'pendente') return 'Pendente';
  if (normalized === 'aprovado') return 'Aprovado';
  if (normalized === 'revisao') return 'Revisao';
  if (normalized === 'rejeitado') return 'Rejeitado';

  return value;
}

const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const emptyToNullString = () =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().nullable());

const materialStatusEnum = z.preprocess(normalizeMaterialStatus, z.enum(MATERIAL_STATUS_VALUES));

exports.materialSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  campaign_id: emptyToNullNumber().optional(),
  uploaded_by: emptyToNullNumber().optional(),
  title: z.string().min(2),
  filename: emptyToNullString().optional(),
  url: emptyToNullString().optional(),
  status: materialStatusEnum,
  feedback: emptyToNullString().optional(),
});

exports.materialUpdateSchema = exports.materialSchema.partial();

exports.materialStatusSchema = z.object({
  status: materialStatusEnum,
  feedback: emptyToNullString().optional(),
});
