const { z } = require('zod');

exports.campaignSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  name: z.string().min(2),
  channel: z.string().min(2),
  audience: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  pipeline_stage: z.string().optional().nullable(),
  budget: z.coerce.number().min(0),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

exports.campaignUpdateSchema = exports.campaignSchema.partial();
