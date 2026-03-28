const validator = require('validator');

function sanitizeValue(value, key = '') {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeValue(childValue, childKey)])
    );
  }

  if (typeof value === 'string') {
    const normalized = validator.stripLow(value.replace(/\0/g, ''), true).trim();
    if (
      ['password', 'token', 'refreshToken', 'email', 'contact_email', 'billing_email', 'url', 'file_url'].includes(key)
    ) {
      return normalized;
    }
    return normalized
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>]/g, '');
  }

  return value;
}

module.exports = (req, res, next) => {
  if (req.body && typeof req.body === 'object' && !(req.body instanceof Buffer)) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }

  next();
};
