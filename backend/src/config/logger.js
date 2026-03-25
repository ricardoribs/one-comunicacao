const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: process.env.LOG_LEVEL || (env.isProduction ? 'info' : 'debug'),
  redact: {
    paths: [
      '*.password',
      '*.senha',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.cpf',
      '*.cnpj',
      '*.credit_card',
      '*.creditCard',
      '*.card_number',
      '*.cardNumber',
      '*.cvv',
      '*.cvc',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
