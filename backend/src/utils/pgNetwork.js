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

module.exports = {
  withIpv4Stream,
};
