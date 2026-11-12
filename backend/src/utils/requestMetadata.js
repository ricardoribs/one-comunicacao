const { lookupIpLocation } = require('../services/geoLookupService');

const COUNTRY_CODE_LABELS = {
  BR: 'Brasil',
  US: 'Estados Unidos',
  PT: 'Portugal',
  ES: 'Espanha',
  AR: 'Argentina',
  CA: 'Canadá',
  FR: 'França',
  DE: 'Alemanha',
  IT: 'Itália',
  GB: 'Reino Unido',
};

function pickHeaderValue(value) {
  if (Array.isArray(value)) {
    return pickHeaderValue(value[0]);
  }

  return String(value || '').trim();
}

function normalizeIp(value) {
  const firstValue = pickHeaderValue(value).split(',')[0].trim();
  if (!firstValue) {
    return '';
  }

  return firstValue.startsWith('::ffff:') ? firstValue.slice(7) : firstValue;
}

function getRequestIp(req) {
  return normalizeIp(
    req.ip
      || req.headers['cf-connecting-ip']
      || req.headers['x-real-ip']
      || req.headers['x-forwarded-for']
  );
}

function getRequestLocation(req) {
  const city = pickHeaderValue(req.headers['cf-ipcity'] || req.headers['x-geo-city']);
  const region = pickHeaderValue(req.headers['cf-region'] || req.headers['x-geo-region']);
  const country = pickHeaderValue(
    req.headers['cf-ipcountry']
      || req.headers['x-country-code']
      || req.headers['x-geo-country']
  );

  const locationParts = [city, region || country].filter(Boolean);
  if (locationParts.length) {
    return locationParts.join(', ');
  }

  return country || '';
}

function normalizeLocationLabel(value) {
  const normalized = pickHeaderValue(value);
  if (!normalized) {
    return '';
  }

  const upperValue = normalized.toUpperCase();
  if (/^[A-Z]{2}$/.test(upperValue)) {
    return COUNTRY_CODE_LABELS[upperValue] || upperValue;
  }

  return normalized;
}

function isWeakLocation(value) {
  const normalized = pickHeaderValue(value);
  if (!normalized) {
    return true;
  }

  const upperValue = normalized.toUpperCase();
  if (/^[A-Z]{2}$/.test(upperValue)) {
    return true;
  }

  return Object.values(COUNTRY_CODE_LABELS).includes(normalized);
}

function buildRequestAccessMetadata(req) {
  return {
    ip: getRequestIp(req),
    userAgent: pickHeaderValue(req.headers['user-agent']),
    location: normalizeLocationLabel(getRequestLocation(req)),
  };
}

async function resolveRequestAccessMetadata(req) {
  const metadata = buildRequestAccessMetadata(req);
  const normalizedLocation = normalizeLocationLabel(metadata.location);

  if (!metadata.ip || (normalizedLocation && !isWeakLocation(normalizedLocation))) {
    return {
      ...metadata,
      location: normalizedLocation,
    };
  }

  const fallbackLocation = await lookupIpLocation(metadata.ip);
  return {
    ...metadata,
    location: fallbackLocation || normalizedLocation,
  };
}

module.exports = {
  buildRequestAccessMetadata,
  resolveRequestAccessMetadata,
  getRequestIp,
  getRequestLocation,
  normalizeLocationLabel,
};
