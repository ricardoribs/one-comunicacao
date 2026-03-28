const { z } = require('zod');
const { paginationQuerySchema } = require('./commonValidators');

const contextTypeEnum = z.enum(['general', 'task_assignment', 'task', 'campaign', 'client', 'contact']);

exports.messageSchema = z.object({
  receiver_id: z.coerce.number().int().positive(),
  context_type: contextTypeEnum.default('general').optional(),
  context_id: z.coerce.number().int().positive().optional().nullable(),
  content: z.string().trim().min(1).max(2000),
});

exports.messageReadSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).max(100).optional(),
  context_type: contextTypeEnum.optional(),
  context_id: z.coerce.number().int().positive().optional().nullable(),
});

exports.messageQuerySchema = paginationQuerySchema.extend({
  context_type: contextTypeEnum.optional(),
  context_id: z.coerce.number().int().positive().optional(),
});
