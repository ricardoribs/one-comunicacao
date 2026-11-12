const dns = require('dns');
const net = require('net');

function createIpv4Stream() {
  const socket = new net.Socket();
  const originalConnect = socket.connect.bind(socket);

  socket.connect = function connect(port, host, callback) {
    if (typeof host !== 'string' || net.isIP(host)) {
      return originalConnect(port, host, callback);
    }

    dns.lookup(host, { family: 4 }, (error, address) => {
      if (error) {
        socket.destroy(error);
        return;
      }

      originalConnect(port, address, callback);
    });

    return socket;
  };

  return socket;
}

function withIpv4Stream(config = {}) {
  const forceIpv4 = process.env.PG_FORCE_IPV4 !== 'false';

  if (!forceIpv4 || config.stream) {
    return config;
  }

  return {
    ...config,
    stream: createIpv4Stream,
  };
}

async function resolvePgHostIpv4(config = {}) {
  const forceIpv4 = process.env.PG_FORCE_IPV4 !== 'false';

  if (!forceIpv4) {
    return config;
  }

  const nextConfig = { ...config };
  let originalHost = '';

  if (nextConfig.connectionString) {
    const url = new URL(nextConfig.connectionString);
    originalHost = url.hostname;

    if (!originalHost || net.isIP(originalHost)) {
      return nextConfig;
    }

    const { address } = await dns.promises.lookup(originalHost, { family: 4 });
    url.hostname = address;
    nextConfig.connectionString = url.toString();
  } else if (nextConfig.host) {
    originalHost = String(nextConfig.host);

    if (!originalHost || net.isIP(originalHost)) {
      return nextConfig;
    }

    const { address } = await dns.promises.lookup(originalHost, { family: 4 });
    nextConfig.host = address;
  } else {
    return nextConfig;
  }

  if (nextConfig.ssl && typeof nextConfig.ssl === 'object' && !nextConfig.ssl.servername) {
    nextConfig.ssl = {
      ...nextConfig.ssl,
      servername: originalHost,
    };
  }

  return nextConfig;
}

module.exports = {
  resolvePgHostIpv4,
  withIpv4Stream,
};
