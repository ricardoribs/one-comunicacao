const RECOVERABLE_PG_CODES = new Set([
  '42P01',
  '42703',
  '42883',
  '42501',
]);

function isRecoverableSchemaError(error) {
  if (!error) {
    return false;
  }

  if (RECOVERABLE_PG_CODES.has(error.code)) {
    return true;
  }

  const message = String(error.message || '').toLowerCase();
  const normalizedMessage = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return (
    normalizedMessage.includes('does not exist')
    || normalizedMessage.includes('nao existe')
    || normalizedMessage.includes('undefined column')
    || normalizedMessage.includes('undefined table')
    || normalizedMessage.includes('undefined function')
    || normalizedMessage.includes('permission denied')
    || normalizedMessage.includes('row-level security')
    || normalizedMessage.includes('policy')
  );
}

module.exports = isRecoverableSchemaError;
