const RECOVERABLE_PG_CODES = new Set([
  '42P01',
  '42703',
  '42883',
]);

function isRecoverableSchemaError(error) {
  if (!error) {
    return false;
  }

  if (RECOVERABLE_PG_CODES.has(error.code)) {
    return true;
  }

  const message = String(error.message || '').toLowerCase();
  return (
    message.includes('does not exist')
    || message.includes('nao existe')
    || message.includes('não existe')
    || message.includes('undefined column')
    || message.includes('undefined table')
    || message.includes('undefined function')
  );
}

module.exports = isRecoverableSchemaError;
