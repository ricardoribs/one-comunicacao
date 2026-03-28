const { z } = require('zod');

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const taskStatusEnum = z.enum(['Backlog', 'Em progresso', 'Em andamento', 'Concluido']);
const taskTypeEnum = z.enum([
  'geral',
  'design',
  'revisao_design',
  'captacao',
  'edicao',
  'social_media',
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

exports.taskSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  assigned_to: emptyToNullNumber().optional(),
  status: taskStatusEnum,
  type: taskTypeEnum.default('geral').optional(),
  column_name: z.enum(['backlog', 'todo', 'doing', 'done']).default('backlog').optional(),
  title: z.string().trim().min(2).max(160),
  description: emptyString(z.string().max(5000)),
  deadline: emptyToNullDate().optional(),
});

exports.taskUpdateSchema = exports.taskSchema.partial();
