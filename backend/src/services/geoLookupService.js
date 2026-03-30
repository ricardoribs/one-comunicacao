const { isIP } = require('node:net');
const env = require('../config/env');
const logger = require('../config/logger');

const lookupCache = new Map();
const inFlightLookups = new Map();
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

function normalizeString(value) {
  return String(value || '').trim();
}

function isPrivateIpv4(ip) {
  if (
    ip.startsWith('10.')
    || ip.startsWith('127.')
    || ip.startsWith('192.168.')
    || ip.startsWith('169.254.')
    || ip === '0.0.0.0'
  ) {
    return true;
  }

  const octets = ip.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) {
    return true;
  }

  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return true;
  }

  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
    return true;
  }

  return false;
}

function isPrivateIpv6(ip) {
  const normalized = normalizeString(ip).toLowerCase();
  return (
    normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
  );
}

function isPublicIp(ip) {
  const family = isIP(normalizeString(ip));
  if (!family) {
    return false;
  }

  if (family === 4) {
    return !isPrivateIpv4(ip);
  }

  return !isPrivateIpv6(ip);
}

function buildLookupUrl(ip) {
  return env.geoLookupUrlTemplate.replace('{ip}', encodeURIComponent(ip));
}

function buildLocationLabel(payload = {}) {
  const city = normalizeString(payload.city || payload.town);
  const region = normalizeString(
    payload.region
      || payload.region_name
      || payload.regionCode
      || payload.region_code
      || payload.state
  );
  const country = normalizeString(
    payload.country_code
      || payload.countryCode
      || payload.countryCodeIso
      || payload.country
  );
  const normalizedCountry = COUNTRY_CODE_LABELS[country.toUpperCase?.() || ''] || country;

  const locationParts = [city, region || normalizedCountry].filter(Boolean);
  if (locationParts.length) {
    return locationParts.join(', ');
  }

  return normalizedCountry;
}

async function fetchLookup(ip) {
  if (!env.geoLookupEnabled || !env.geoLookupUrlTemplate || !isPublicIp(ip)) {
    return '';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.geoLookupTimeoutMs);

  try {
    const response = await fetch(buildLookupUrl(ip), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'one-comunicacao-geo-lookup/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return '';
    }

    const payload = await response.json().catch(() => null);
    if (!payload || payload.success === false) {
      return '';
    }

    return buildLocationLabel(payload);
  } catch (error) {
    if (error.name !== 'AbortError') {
      logger.debug?.(
        {
          ip,
          error: error.message,
        },
        'Falha ao consultar geolocalizacao por IP.'
      );
    }

    return '';
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupIpLocation(ip) {
  const normalizedIp = normalizeString(ip);
  if (!normalizedIp || !env.geoLookupEnabled || !isPublicIp(normalizedIp)) {
    return '';
  }

  const now = Date.now();
  const cached = lookupCache.get(normalizedIp);
  if (cached && cached.expiresAt > now) {
    return cached.location;
  }

  if (inFlightLookups.has(normalizedIp)) {
    return inFlightLookups.get(normalizedIp);
  }

  const lookupPromise = fetchLookup(normalizedIp)
    .then((location) => {
      lookupCache.set(normalizedIp, {
        location,
        expiresAt: Date.now() + env.geoLookupCacheTtlMs,
      });
      return location;
    })
    .finally(() => {
      inFlightLookups.delete(normalizedIp);
    });

  inFlightLookups.set(normalizedIp, lookupPromise);
  return lookupPromise;
}

module.exports = {
  lookupIpLocation,
  isPublicIp,
};
