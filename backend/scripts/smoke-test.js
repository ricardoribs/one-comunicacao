const env = require("../src/config/env");

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    data
  };
}

function getDatabaseStatus(data = {}) {
  return data.checks?.database?.status || data.database || null;
}

async function main() {
  const baseUrl = process.env.SMOKE_BASE_URL || env.appBaseUrl;
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;

  if (!baseUrl || !email || !password) {
    throw new Error("Defina SMOKE_BASE_URL, SMOKE_EMAIL e SMOKE_PASSWORD.");
  }

  const health = await requestJson(`${baseUrl}/api/health`);
  const databaseStatus = getDatabaseStatus(health.data);
  if (!health.ok || health.data.status !== "ok" || databaseStatus !== "up") {
    throw new Error(`Health check falhou: ${health.status} ${JSON.stringify(health.data)}`);
  }

  const readiness = await requestJson(`${baseUrl}/api/ready`);
  if (!readiness.ok || readiness.data.status !== "ok") {
    throw new Error(`Readiness check falhou: ${readiness.status}`);
  }

  const login = await requestJson(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!login.ok || !login.data.accessToken) {
    throw new Error(`Login falhou: ${login.status}`);
  }

  const me = await requestJson(`${baseUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${login.data.accessToken}`
    }
  });

  if (!me.ok || !me.data.user?.id) {
    throw new Error(`Consulta de sessao falhou: ${me.status}`);
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        baseUrl,
        health: health.data.status,
        user: me.data.user.email,
        role: me.data.user.role
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
