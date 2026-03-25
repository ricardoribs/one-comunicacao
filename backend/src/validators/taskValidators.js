const { z } = require('zod');

const emptyToNullNumber = () =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  );

const emptyString = () => z.preprocess((value) => (value === undefined ? '' : value), z.string());

exports.taskSchema = z.object({
  client_id: emptyToNullNumber().optional(),
  assigned_to: emptyToNullNumber().optional(),
  status: z.string().min(2),
  type: z.string().default('geral').optional(),
  column_name: z.enum(['backlog', 'todo', 'doing', 'done']).default('backlog').optional(),
  title: z.string().min(2),
  description: emptyString(),
  deadline: z
    .preprocess((value) => (value === '' || value === undefined ? null : value), z.string().nullable())
    .optional(),
});

exports.taskUpdateSchema = exports.taskSchema.partial();
