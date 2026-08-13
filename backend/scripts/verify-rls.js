const crypto = require("crypto");
const { Pool } = require("pg");
const env = require("../src/config/env");
const { applyTenantContext } = require("../src/db/tenantContext");
const { buildDatabaseSslConfig } = require("../src/utils/databaseSsl");
const { resolvePgHostIpv4, withIpv4Stream } = require("../src/utils/pgNetwork");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function buildConnectionString(databaseUrl, username, password) {
  const url = new URL(databaseUrl);
  url.username = username;
  url.password = password;
  return url.toString();
}

function getConnectionUsername(config) {
  if (config.user) {
    return String(config.user);
  }

  if (config.connectionString) {
    return decodeURIComponent(new URL(config.connectionString).username);
  }

  return "";
}

function getTargetPort(config) {
  if (config.port) {
    return Number(config.port);
  }

  if (config.connectionString) {
    return Number(new URL(config.connectionString).port || 5432);
  }

  return 5432;
}

function buildBasePoolConfig() {
  const config = {};

  if (env.databaseHost && env.databaseUser && env.databaseName) {
    config.host = env.databaseHost;
    config.port = env.databasePort;
    config.database = env.databaseName;
    config.user = env.databaseUser;
    config.password = env.databasePassword;
  } else {
    config.connectionString = env.databaseUrl;
  }

  const sslConfig = buildDatabaseSslConfig({
    required: env.databaseSslRequired,
    caFilePath: env.databaseSslCaFile,
    caPem: env.databaseSslCaPem
  });
  if (sslConfig) {
    config.ssl = sslConfig;
  }

  return withIpv4Stream(config);
}

function getHostCandidates(config) {
  const candidates = [getTargetHost(config)];

  if (config.ssl && typeof config.ssl === "object" && config.ssl.servername) {
    candidates.push(String(config.ssl.servername));
  }

  return candidates.filter(Boolean);
}

function isSupabasePoolerConfig(config) {
  return getHostCandidates(config).some((host) => host.includes(".pooler.supabase.com"));
}

function buildSupabasePoolerUsername(baseConfig, username) {
  if (!isSupabasePoolerConfig(baseConfig)) {
    return username;
  }

  const baseUsername = getConnectionUsername(baseConfig);
  const externalIdIndex = baseUsername.indexOf(".");
  const externalId = externalIdIndex === -1 ? "" : baseUsername.slice(externalIdIndex + 1);

  if (!externalId) {
    throw new Error(
      "verify:rls com Supabase pooler exige usuario no formato role.project-ref, por exemplo postgres.xxxxxxxxxxxxxxxxxxxx."
    );
  }

  return `${username}.${externalId}`;
}

function buildVerifierPoolConfig(baseConfig, username, password) {
  const verifierUsername = buildSupabasePoolerUsername(baseConfig, username);

  if (baseConfig.connectionString) {
    return withIpv4Stream({
      ...baseConfig,
      connectionString: buildConnectionString(baseConfig.connectionString, verifierUsername, password)
    });
  }

  return withIpv4Stream({
    ...baseConfig,
    user: verifierUsername,
    password
  });
}

function getTargetHost(config) {
  if (config.host) {
    return String(config.host);
  }

  if (config.connectionString) {
    return new URL(config.connectionString).hostname;
  }

  return "";
}

function isSupabaseDirectHost(host) {
  return /^db\.[a-z0-9-]+\.supabase\.co$/i.test(host);
}

function validateVerificationConfig(config) {
  if (!isSupabasePoolerConfig(config)) {
    return;
  }

  if (getTargetPort(config) !== 5432) {
    throw new Error(
      "verify:rls com Supabase pooler deve usar Session pooler na porta 5432. Nao use Transaction pooler na porta 6543 para este gate."
    );
  }

  buildSupabasePoolerUsername(config, "one_rls_check");
}

async function resolveVerificationPoolConfig(config) {
  try {
    const resolvedConfig = await resolvePgHostIpv4(config);
    validateVerificationConfig(resolvedConfig);
    return withIpv4Stream(resolvedConfig);
  } catch (error) {
    const targetHost = getTargetHost(config);
    const fallbackConfig = buildBasePoolConfig();
    const fallbackHost = getTargetHost(fallbackConfig);

    if (isSupabaseDirectHost(targetHost) && isSupabasePoolerConfig(fallbackConfig)) {
      console.warn(
        `VERIFY_DATABASE_URL aponta para Supabase direct sem IPv4 acessivel (${targetHost}); usando ${fallbackHost} via Session pooler para verify:rls.`
      );
      const resolvedFallbackConfig = await resolvePgHostIpv4(fallbackConfig);
      validateVerificationConfig(resolvedFallbackConfig);
      return withIpv4Stream(resolvedFallbackConfig);
    }

    throw error;
  }
}

async function buildVerificationBasePoolConfig() {
  const verifyCaFile = process.env.VERIFY_DATABASE_SSL_CA_FILE || env.databaseSslCaFile;
  const verifyCaPem = process.env.VERIFY_DATABASE_SSL_CA_PEM || env.databaseSslCaPem;

  let config;
  if (process.env.VERIFY_DATABASE_URL) {
    config = { connectionString: process.env.VERIFY_DATABASE_URL };
  } else if (process.env.VERIFY_DATABASE_HOST && process.env.VERIFY_DATABASE_USER && process.env.VERIFY_DATABASE_NAME) {
    config = {
      host: process.env.VERIFY_DATABASE_HOST,
      port: Number(process.env.VERIFY_DATABASE_PORT || 5432),
      database: process.env.VERIFY_DATABASE_NAME,
      user: process.env.VERIFY_DATABASE_USER,
      password: process.env.VERIFY_DATABASE_PASSWORD || ""
    };
  } else {
    config = buildBasePoolConfig();
  }

  const sslConfig = buildDatabaseSslConfig({
    required: env.databaseSslRequired,
    caFilePath: verifyCaFile,
    caPem: verifyCaPem,
    missingConfigMessage:
      "DATABASE_SSL_REQUIRED=true exige VERIFY_DATABASE_SSL_CA_FILE ou VERIFY_DATABASE_SSL_CA_PEM configurado."
  });
  if (sslConfig) {
    config.ssl = sslConfig;
  }

  return resolveVerificationPoolConfig(config);
}

async function withTenant(pool, user, handler) {
  let client;
  let released = false;

  try {
    client = await pool.connect();
  } catch (error) {
    throw new Error(`connect: ${error.message}`);
  }

  try {
    await client.query("BEGIN");
  } catch (error) {
    client.release();
    released = true;
    throw new Error(`begin: ${error.message}`);
  }

  try {
    await client.query("SET LOCAL row_security = on");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    released = true;
    throw new Error(`set row_security: ${error.message}`);
  }

  try {
    await applyTenantContext(client, user);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    released = true;
    throw new Error(`apply tenant context: ${error.message}`);
  }

  try {
    const result = await handler(client);
    await client.query("ROLLBACK");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw new Error(`handler: ${error.message}`);
  } finally {
    if (!released) {
      client.release();
    }
  }
}

async function countRows(client, tableName, whereClause = "", values = []) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM ${tableName} ${whereClause}`, values);
  return rows[0].count;
}

async function expectRlsFailure(action, message) {
  try {
    await action();
  } catch (_error) {
    return;
  }

  throw new Error(message);
}

async function main() {
  const basePoolConfig = await buildVerificationBasePoolConfig();
  const ownerPool = new Pool(basePoolConfig);
  const suffix = crypto.randomBytes(4).toString("hex");
  const verifierRole = `one_rls_${suffix}`;
  const verifierPassword = `RlsCheck-${crypto.randomBytes(12).toString("hex")}!`;
  const verifierPool = new Pool(buildVerifierPoolConfig(basePoolConfig, verifierRole, verifierPassword));
  const ids = {
    users: [],
    clients: [],
    campaigns: [],
    invoices: [],
    contacts: [],
    charges: [],
    calendarEvents: [],
    messages: []
  };
  const step = async (label, action) => {
    try {
      return await action();
    } catch (error) {
      throw new Error(`${label}: ${error.message}`);
    }
  };

  try {
    const owner = await ownerPool.connect();

    try {
      await step("create verifier role", () => owner.query(
        `
          CREATE ROLE "${verifierRole}" LOGIN PASSWORD '${escapeSqlLiteral(verifierPassword)}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
          GRANT USAGE ON SCHEMA public TO "${verifierRole}";
          GRANT USAGE ON SCHEMA app TO "${verifierRole}";
          GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${verifierRole}";
          GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${verifierRole}";
          GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO "${verifierRole}";
        `
      ));

      const managerA = (
        await owner.query(
          `
            INSERT INTO users (name, email, password, role, email_verified_at)
            VALUES ($1, $2, $3, 'gestor', NOW())
            RETURNING id, role
          `,
          [`Gestor A ${suffix}`, `gestor-a-${suffix}@rls.local`, "hashed-password"]
        )
      ).rows[0];
      ids.users.push(managerA.id);

      const managerB = (
        await owner.query(
          `
            INSERT INTO users (name, email, password, role, email_verified_at)
            VALUES ($1, $2, $3, 'gestor', NOW())
            RETURNING id, role
          `,
          [`Gestor B ${suffix}`, `gestor-b-${suffix}@rls.local`, "hashed-password"]
        )
      ).rows[0];
      ids.users.push(managerB.id);

      const adminUser = (
        await owner.query(
          `
            INSERT INTO users (name, email, password, role, email_verified_at)
            VALUES ($1, $2, $3, 'admin', NOW())
            RETURNING id, role
          `,
          [`Admin ${suffix}`, `admin-${suffix}@rls.local`, "hashed-password"]
        )
      ).rows[0];
      ids.users.push(adminUser.id);

      const clientA = (
        await owner.query(
          `
            INSERT INTO clients (name, company, plan, mrr, segment, manager_id, started_at)
            VALUES ($1, $2, 'One Start', 1000, 'Teste', $3, CURRENT_DATE)
            RETURNING id
          `,
          [`Cliente A ${suffix}`, `Empresa A ${suffix}`, managerA.id]
        )
      ).rows[0];
      ids.clients.push(clientA.id);

      const clientB = (
        await owner.query(
          `
            INSERT INTO clients (name, company, plan, mrr, segment, manager_id, started_at)
            VALUES ($1, $2, 'One Start', 1000, 'Teste', $3, CURRENT_DATE)
            RETURNING id
          `,
          [`Cliente B ${suffix}`, `Empresa B ${suffix}`, managerB.id]
        )
      ).rows[0];
      ids.clients.push(clientB.id);

      const clientUserA = (
        await owner.query(
          `
            INSERT INTO users (client_id, name, email, password, role, email_verified_at)
            VALUES ($1, $2, $3, $4, 'client', NOW())
            RETURNING id, client_id, role
          `,
          [clientA.id, `Contato Cliente A ${suffix}`, `cliente-a-${suffix}@rls.local`, "hashed-password"]
        )
      ).rows[0];
      ids.users.push(clientUserA.id);

      const clientUserB = (
        await owner.query(
          `
            INSERT INTO users (client_id, name, email, password, role, email_verified_at)
            VALUES ($1, $2, $3, $4, 'client', NOW())
            RETURNING id, client_id, role
          `,
          [clientB.id, `Contato Cliente B ${suffix}`, `cliente-b-${suffix}@rls.local`, "hashed-password"]
        )
      ).rows[0];
      ids.users.push(clientUserB.id);

      const campaignA = (
        await owner.query(
          `
            INSERT INTO campaigns (client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status)
            VALUES ($1, $2, 'Meta Ads', 'Publico A', 'Leads', 'planejamento', 500, CURRENT_DATE, 'Ativa')
            RETURNING id
          `,
          [clientA.id, `Campanha A ${suffix}`]
        )
      ).rows[0];
      ids.campaigns.push(campaignA.id);

      const campaignB = (
        await owner.query(
          `
            INSERT INTO campaigns (client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status)
            VALUES ($1, $2, 'Meta Ads', 'Publico B', 'Leads', 'planejamento', 500, CURRENT_DATE, 'Ativa')
            RETURNING id
          `,
          [clientB.id, `Campanha B ${suffix}`]
        )
      ).rows[0];
      ids.campaigns.push(campaignB.id);

      const invoiceA = (
        await owner.query(
          `
            INSERT INTO invoices (client_id, amount, status, due_date)
            VALUES ($1, 1200, 'Em aberto', CURRENT_DATE)
            RETURNING id
          `,
          [clientA.id]
        )
      ).rows[0];
      ids.invoices.push(invoiceA.id);

      const invoiceB = (
        await owner.query(
          `
            INSERT INTO invoices (client_id, amount, status, due_date)
            VALUES ($1, 1300, 'Em aberto', CURRENT_DATE)
            RETURNING id
          `,
          [clientB.id]
        )
      ).rows[0];
      ids.invoices.push(invoiceB.id);

      const contactA = (
        await owner.query(
          `
            INSERT INTO contacts (name, phone, email, company, service, lead_stage, estimated_value, message, owner_id, assigned_to)
            VALUES ($1, '00000000000', $2, 'Lead A', 'CRM', 'Proposta', 1000, 'Contato A', $3, $3)
            RETURNING id
          `,
          [`Lead A ${suffix}`, `lead-a-${suffix}@rls.local`, managerA.id]
        )
      ).rows[0];
      ids.contacts.push(contactA.id);

      const contactB = (
        await owner.query(
          `
            INSERT INTO contacts (name, phone, email, company, service, lead_stage, estimated_value, message, owner_id, assigned_to)
            VALUES ($1, '888888888', $2, 'Lead B', 'CRM', 'Proposta', 1000, 'Contato B', $3, $3)
            RETURNING id
          `,
          [`Lead B ${suffix}`, `lead-b-${suffix}@rls.local`, managerB.id]
        )
      ).rows[0];
      ids.contacts.push(contactB.id);

      const chargeA = (
        await owner.query(
          `
            INSERT INTO charges (client_id, created_by, payment_method, description, amount, status)
            VALUES ($1, $2, 'pix', 'Cobranca A', 200, 'pending')
            RETURNING id
          `,
          [clientA.id, managerA.id]
        )
      ).rows[0];
      ids.charges.push(chargeA.id);

      const chargeB = (
        await owner.query(
          `
            INSERT INTO charges (client_id, created_by, payment_method, description, amount, status)
            VALUES ($1, $2, 'pix', 'Cobranca B', 200, 'pending')
            RETURNING id
          `,
          [clientB.id, managerB.id]
        )
      ).rows[0];
      ids.charges.push(chargeB.id);

      const teamEvent = (
        await owner.query(
          `
            INSERT INTO calendar_events (title, starts_at, ends_at, client_id, visibility, created_by)
            VALUES ($1, NOW(), NOW() + INTERVAL '1 hour', NULL, 'team', $2)
            RETURNING id
          `,
          [`Evento interno ${suffix}`, managerA.id]
        )
      ).rows[0];
      ids.calendarEvents.push(teamEvent.id);

      const calendarEventA = (
        await owner.query(
          `
            INSERT INTO calendar_events (title, starts_at, ends_at, client_id, visibility, created_by)
            VALUES ($1, NOW(), NOW() + INTERVAL '1 hour', $2, 'client', $3)
            RETURNING id
          `,
          [`Evento Cliente A ${suffix}`, clientA.id, managerA.id]
        )
      ).rows[0];
      ids.calendarEvents.push(calendarEventA.id);

      const calendarEventB = (
        await owner.query(
          `
            INSERT INTO calendar_events (title, starts_at, ends_at, client_id, visibility, created_by)
            VALUES ($1, NOW(), NOW() + INTERVAL '1 hour', $2, 'client', $3)
            RETURNING id
          `,
          [`Evento Cliente B ${suffix}`, clientB.id, managerB.id]
        )
      ).rows[0];
      ids.calendarEvents.push(calendarEventB.id);

      const messageA = (
        await owner.query(
          `
            INSERT INTO messages (sender_id, receiver_id, context_type, context_id, content)
            VALUES ($1, $2, 'campaign', $3, 'Mensagem A')
            RETURNING id
          `,
          [managerA.id, clientUserA.id, campaignA.id]
        )
      ).rows[0];
      ids.messages.push(messageA.id);

      const messageB = (
        await owner.query(
          `
            INSERT INTO messages (sender_id, receiver_id, context_type, context_id, content)
            VALUES ($1, $2, 'campaign', $3, 'Mensagem B')
            RETURNING id
          `,
          [managerB.id, clientUserB.id, campaignB.id]
        )
      ).rows[0];
      ids.messages.push(messageB.id);

      await step("verify admin scope", () => withTenant(verifierPool, { role: "admin", id: adminUser.id }, async (client) => {
        assert(
          (await countRows(client, "clients", "WHERE id = ANY($1::int[])", [ids.clients])) === 2,
          "Admin deveria enxergar todos os clients temporarios."
        );
        assert(
          (await countRows(client, "campaigns", "WHERE id = ANY($1::int[])", [ids.campaigns])) === 2,
          "Admin deveria enxergar todas as campaigns temporarias."
        );
        assert(
          (await countRows(client, "invoices", "WHERE id = ANY($1::int[])", [ids.invoices])) === 2,
          "Admin deveria enxergar todas as invoices temporarias."
        );
        assert(
          (await countRows(client, "charges", "WHERE id = ANY($1::int[])", [ids.charges])) === 2,
          "Admin deveria enxergar todas as charges temporarias."
        );
        assert(
          (await countRows(client, "calendar_events", "WHERE id = ANY($1::int[])", [ids.calendarEvents])) === 3,
          "Admin deveria enxergar todos os calendar_events temporarios."
        );
      }));

      await step("verify manager scope", () => withTenant(verifierPool, { role: "gestor", id: managerA.id }, async (client) => {
        assert((await countRows(client, "clients")) === 1, "Gestor A deveria enxergar apenas o client gerenciado.");
        assert(
          (await countRows(client, "clients", "WHERE id = $1", [clientB.id])) === 0,
          "Gestor A nao pode enxergar o client de outro gestor."
        );
        assert((await countRows(client, "campaigns")) === 1, "Gestor A deveria enxergar apenas a campaign do seu client.");
        assert((await countRows(client, "invoices")) === 1, "Gestor A deveria enxergar apenas a invoice do seu client.");
        assert((await countRows(client, "contacts")) === 1, "Gestor A deveria enxergar apenas seus contacts.");
        assert((await countRows(client, "charges")) === 1, "Gestor A deveria enxergar apenas suas charges.");
        assert(
          (await countRows(client, "calendar_events", "WHERE id = ANY($1::int[])", [ids.calendarEvents])) === 2,
          "Gestor A deveria enxergar evento interno e evento do client gerenciado."
        );
        assert(
          (await countRows(client, "calendar_events", "WHERE id = $1", [calendarEventB.id])) === 0,
          "Gestor A nao pode enxergar evento de calendario de outro client."
        );
        assert((await countRows(client, "messages")) === 1, "Gestor A deveria enxergar apenas as suas mensagens.");

        await expectRlsFailure(
          () =>
            client.query(
              `
                INSERT INTO campaigns (client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, status)
                VALUES ($1, $2, 'Meta Ads', 'Publico', 'Leads', 'planejamento', 100, CURRENT_DATE, 'Ativa')
              `,
              [clientB.id, `Campanha bloqueada ${suffix}`]
            ),
          "Gestor A nao deveria conseguir inserir campanha em client de outro gestor."
        );
      }));

      await step("verify client scope", () => withTenant(
        verifierPool,
        { role: "client", id: clientUserA.id, client_id: clientA.id },
        async (client) => {
          assert((await countRows(client, "clients")) === 1, "Client A deveria enxergar apenas seu registro.");
          assert((await countRows(client, "campaigns")) === 1, "Client A deveria enxergar apenas suas campaigns.");
          assert((await countRows(client, "invoices")) === 1, "Client A deveria enxergar apenas suas invoices.");
          assert((await countRows(client, "charges")) === 1, "Client A deveria enxergar apenas suas charges.");
          assert(
            (await countRows(client, "calendar_events", "WHERE id = ANY($1::int[])", [ids.calendarEvents])) === 1,
            "Client A deveria enxergar apenas calendar_events marcados para seu client."
          );
          assert((await countRows(client, "messages")) === 1, "Client A deveria enxergar apenas suas messages.");
          assert((await countRows(client, "contacts")) === 0, "Client A nao deveria enxergar contacts internos.");
          assert(
            (await countRows(client, "campaigns", "WHERE client_id = $1", [clientB.id])) === 0,
            "Client A nao pode enxergar campaigns de outro tenant."
          );
        }
      ));

      console.log(
        JSON.stringify(
          {
            status: "ok",
            message: "RLS validado com sucesso para admin, gestor e client.",
            verifierRole
          },
          null,
          2
        )
      );
    } finally {
      owner.release();
    }
  } finally {
    const cleanupPool = new Pool(basePoolConfig);

    try {
      await verifierPool.end().catch(() => {});

      if (ids.messages.length) {
        await step("cleanup messages", () => cleanupPool.query("DELETE FROM messages WHERE id = ANY($1::int[])", [ids.messages]));
      }
      if (ids.charges.length) {
        await step("cleanup charges", () => cleanupPool.query("DELETE FROM charges WHERE id = ANY($1::int[])", [ids.charges]));
      }
      if (ids.calendarEvents.length) {
        await step("cleanup calendar_events", () =>
          cleanupPool.query("DELETE FROM calendar_events WHERE id = ANY($1::int[])", [ids.calendarEvents])
        );
      }
      if (ids.contacts.length) {
        await step("cleanup contacts", () => cleanupPool.query("DELETE FROM contacts WHERE id = ANY($1::int[])", [ids.contacts]));
      }
      if (ids.invoices.length) {
        await step("cleanup invoices", () => cleanupPool.query("DELETE FROM invoices WHERE id = ANY($1::int[])", [ids.invoices]));
      }
      if (ids.campaigns.length) {
        await step("cleanup campaigns", () => cleanupPool.query("DELETE FROM campaigns WHERE id = ANY($1::int[])", [ids.campaigns]));
      }
      if (ids.clients.length) {
        await step("cleanup clients", () => cleanupPool.query("DELETE FROM clients WHERE id = ANY($1::int[])", [ids.clients]));
      }
      if (ids.users.length) {
        await step("cleanup users", () => cleanupPool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids.users]));
      }
      await step("cleanup revoke public schema", () => cleanupPool.query(`REVOKE USAGE ON SCHEMA public FROM "${verifierRole}"`));
      await step("cleanup revoke app schema", () => cleanupPool.query(`REVOKE USAGE ON SCHEMA app FROM "${verifierRole}"`));
      await step(
        "cleanup revoke table grants",
        () => cleanupPool.query(`REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM "${verifierRole}"`)
      );
      await step(
        "cleanup revoke sequence grants",
        () => cleanupPool.query(`REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM "${verifierRole}"`)
      );
      await step(
        "cleanup revoke function grants",
        () => cleanupPool.query(`REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM "${verifierRole}"`)
      );
      await step("cleanup drop role", () => cleanupPool.query(`DROP ROLE IF EXISTS "${verifierRole}"`));
    } finally {
      await cleanupPool.end().catch(() => {});
      await ownerPool.end().catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
