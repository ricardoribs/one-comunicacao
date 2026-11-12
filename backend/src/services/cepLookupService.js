const AppError = require('../utils/AppError');

function normalizeCep(rawCep) {
  return String(rawCep || '').replace(/\D/g, '');
}

function formatCep(cep) {
  const digits = normalizeCep(cep);
  if (digits.length !== 8) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

async function lookupCep(rawCep) {
  const cep = normalizeCep(rawCep);

  if (cep.length !== 8) {
    throw new AppError('Informe um CEP válido com 8 dígitos.', 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new AppError('Não foi possível consultar o CEP no momento.', 502);
    }

    const data = await response.json();

    if (data?.erro) {
      throw new AppError('CEP não encontrado.', 404);
    }

    return {
      zip_code: formatCep(cep),
      address_line1: data.logradouro || '',
      address_line2: data.complemento || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      country: 'Brasil',
      ibge: data.ibge || null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new AppError('A consulta do CEP demorou mais do que o esperado. Tente novamente.', 504);
    }

    throw new AppError('Não foi possível consultar o CEP no momento.', 502);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  lookupCep,
  normalizeCep,
  formatCep,
};
