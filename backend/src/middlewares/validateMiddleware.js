const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

module.exports =
  (schema, target = 'body') =>
  (req, res, next) => {
    try {
      req[target] = schema.parse(req[target]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new AppError(error.issues.map((issue) => issue.message).join('; '), 400));
      }
      next(error);
    }
  };
