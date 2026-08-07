const PASSWORD_RULES = Object.freeze([
  {
    test: (value) => String(value || '').length >= 12,
    message: 'A senha deve ter, no minimo, 12 caracteres.',
  },
  {
    test: (value) => /[A-Z]/.test(String(value || '')),
    message: 'A senha deve conter ao menos uma letra maiuscula.',
  },
  {
    test: (value) => /[a-z]/.test(String(value || '')),
    message: 'A senha deve conter ao menos uma letra minuscula.',
  },
  {
    test: (value) => /[0-9]/.test(String(value || '')),
    message: 'A senha deve conter ao menos um numero.',
  },
  {
    test: (value) => /[^A-Za-z0-9]/.test(String(value || '')),
    message: 'A senha deve conter ao menos um simbolo.',
  },
]);

function validateStrongPassword(password) {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.message);
}

function assertStrongPassword(password, envName = 'PASSWORD') {
  const errors = validateStrongPassword(password);
  if (errors.length > 0) {
    throw new Error(`${envName} invalida: ${errors.join(' ')}`);
  }
}

module.exports = {
  PASSWORD_RULES,
  validateStrongPassword,
  assertStrongPassword,
};
