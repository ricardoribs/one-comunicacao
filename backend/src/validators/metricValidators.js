const { z } = require('zod');
const { paginationQuerySchema } = require('./commonValidators');

exports.metricQuerySchema = paginationQuerySchema.extend({
  campaign_id: z.string().optional(),
  period: z.string().optional(),
});
