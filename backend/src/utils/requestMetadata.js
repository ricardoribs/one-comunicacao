const { lookupIpLocation } = require('../services/geoLookupService');

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
    req.headers['cf-connecting-ip']
      || req.headers['x-real-ip']
      || req.headers['x-forwarded-for']
      || req.ip
  );
}

function getRequestLocation(req) {
  const city = pickHeaderValue(req.headers['cf-ipcity'] || req.headers['x-vercel-ip-city'] || req.headers['x-geo-city']);
  const region = pickHeaderValue(
    req.headers['cf-region']
      || req.headers['x-vercel-ip-country-region']
      || req.headers['x-geo-region']
  );
  const country = pickHeaderValue(
    req.headers['cf-ipcountry']
      || req.headers['x-vercel-ip-country']
      || req.headers['x-country-code']
      || req.headers['x-geo-country']
  );

  const locationParts = [city, region || country].filter(Boolean);
  if (locationParts.length) {
    return locationParts.join(', ');
  }

  return country || '';
}

function buildRequestAccessMetadata(req) {
  return {
    ip: getRequestIp(req),
    userAgent: pickHeaderValue(req.headers['user-agent']),
    location: getRequestLocation(req),
  };
}

async function resolveRequestAccessMetadata(req) {
  const metadata = buildRequestAccessMetadata(req);
  if (metadata.location || !metadata.ip) {
    return metadata;
  }

  const fallbackLocation = await lookupIpLocation(metadata.ip);
  return {
    ...metadata,
    location: fallbackLocation || metadata.location,
  };
}

module.exports = {
  buildRequestAccessMetadata,
  resolveRequestAccessMetadata,
  getRequestIp,
  getRequestLocation,
};
