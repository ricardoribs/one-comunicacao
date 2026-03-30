const { z } = require('zod');
const { normalizeTaskTypeValue } = require('../utils/taskTypes');

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const taskStatusEnum = z.enum(['Backlog', 'A Fazer', 'Em progresso', 'Em andamento', 'Concluido', 'Concluído']);
const taskTypeEnum = z.enum([
  'design_grafico',
  'copywriting',
  'edicao_video',
  'captacao',
  'fotografia',
  'planejamento',
  'social_media',
  'trafego_pago',
  'cobertura',
  'releases',
  'newsletter',
  'reuniao',
  'aprovacao_cliente',
  'refacao',
  'urgente',
  'geral',
  'design',
  'revisao_design',
  'edicao',
  'atendimento',
  'financeiro',
  'adm',
  'reuniao_estrategica',
  'trafego',
  'landing-page',
]);

const emptyToNullNumber = (schema = z.coerce.number().int().positive()) =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), schema.nullable());

const emptyString = (schema = z.string().max(5000)) =>
  z.preprocess((value) => (value === undefined ? '' : value), schema);

const emptyToNullDate = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.string().regex(isoDateRegex, 'Informe uma data valida no formato AAAA-MM-DD').nullable()
  );

const assignedToIdsSchema = z.preprocess(
  (value) => {
    if (value === '' || value === undefined || value === null) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  },
  z.array(z.coerce.number().int().positive()).max(20)
);

exports.taskSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  assigned_to: emptyToNullNumber().optional(),
  assigned_to_ids: assignedToIdsSchema.optional(),
  status: taskStatusEnum,
  type: z.preprocess((value) => {
    if (value === '' || value === undefined || value === null) {
      return undefined;
    }

    return normalizeTaskTypeValue(value);
  }, taskTypeEnum.default('planejamento').optional()),
  column_name: z.enum(['backlog', 'todo', 'doing', 'done']).default('backlog').optional(),
  title: z.string().trim().min(2).max(160),
  description: emptyString(z.string().max(5000)),
  deadline: emptyToNullDate().optional(),
});

exports.taskUpdateSchema = exports.taskSchema.partial();
