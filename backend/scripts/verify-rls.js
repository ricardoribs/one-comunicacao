const crypto = require("crypto");
const { Pool } = require("pg");
const env = require("../src/config/env");
const { applyTenantContext } = require("../src/db/tenantContext");

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

async function withTenant(pool, user, handler) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL row_security = on");
    await applyTenantContext(client, user);
    const result = await handler(client);
    await client.query("ROLLBACK");
    return result;
  } finally {
    client.release();
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
  const ownerPool = new Pool({ connectionString: env.databaseUrl });
  const suffix = crypto.randomBytes(4).toString("hex");
  const verifierRole = `one_rls_${suffix}`;
  const verifierPassword = `RlsCheck-${crypto.randomBytes(12).toString("hex")}!`;
  const verifierPool = new Pool({
    connectionString: buildConnectionString(env.databaseUrl, verifierRole, verifierPassword)
  });
  const ids = {
    users: [],
    clients: [],
    campaigns: [],
    invoices: [],
    contacts: [],
    charges: [],
    messages: []
  };

  try {
    const owner = await ownerPool.connect();

    try {
      await owner.query(
        `
          CREATE ROLE "${verifierRole}" LOGIN PASSWORD '${escapeSqlLiteral(verifierPassword)}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
          GRANT USAGE ON SCHEMA public TO "${verifierRole}";
          GRANT USAGE ON SCHEMA app TO "${verifierRole}";
          GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${verifierRole}";
          GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${verifierRole}";
          GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO "${verifierRole}";
        `
      );

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

      const clientA = (
        await owner.query(
          `
            INSERT INTO clients (name, company, plan, mrr, segment, manager_id, started_at)
            VALUES ($1, $2, 'growth', 1000, 'Teste', $3, CURRENT_DATE)
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
            VALUES ($1, $2, 'growth', 1000, 'Teste', $3, CURRENT_DATE)
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

      await withTenant(verifierPool, { role: "admin", id: managerA.id }, async (client) => {
        assert((await countRows(client, "clients")) === 2, "Admin deveria enxergar todos os clients.");
        assert((await countRows(client, "campaigns")) === 2, "Admin deveria enxergar todas as campaigns.");
        assert((await countRows(client, "invoices")) === 2, "Admin deveria enxergar todas as invoices.");
        assert((await countRows(client, "charges")) === 2, "Admin deveria enxergar todas as charges.");
      });

      await withTenant(verifierPool, { role: "gestor", id: managerA.id }, async (client) => {
        assert((await countRows(client, "clients")) === 1, "Gestor A deveria enxergar apenas o client gerenciado.");
        assert(
          (await countRows(client, "clients", "WHERE id = $1", [clientB.id])) === 0,
          "Gestor A nao pode enxergar o client de outro gestor."
        );
        assert((await countRows(client, "campaigns")) === 1, "Gestor A deveria enxergar apenas a campaign do seu client.");
        assert((await countRows(client, "invoices")) === 1, "Gestor A deveria enxergar apenas a invoice do seu client.");
        assert((await countRows(client, "contacts")) === 1, "Gestor A deveria enxergar apenas seus contacts.");
        assert((await countRows(client, "charges")) === 1, "Gestor A deveria enxergar apenas suas charges.");
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
      });

      await withTenant(
        verifierPool,
        { role: "client", id: clientUserA.id, client_id: clientA.id },
        async (client) => {
          assert((await countRows(client, "clients")) === 1, "Client A deveria enxergar apenas seu registro.");
          assert((await countRows(client, "campaigns")) === 1, "Client A deveria enxergar apenas suas campaigns.");
          assert((await countRows(client, "invoices")) === 1, "Client A deveria enxergar apenas suas invoices.");
          assert((await countRows(client, "charges")) === 1, "Client A deveria enxergar apenas suas charges.");
          assert((await countRows(client, "messages")) === 1, "Client A deveria enxergar apenas suas messages.");
          assert((await countRows(client, "contacts")) === 0, "Client A nao deveria enxergar contacts internos.");
          assert(
            (await countRows(client, "campaigns", "WHERE client_id = $1", [clientB.id])) === 0,
            "Client A nao pode enxergar campaigns de outro tenant."
          );
        }
      );

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
    const cleanupPool = new Pool({ connectionString: env.databaseUrl });

    try {
      await verifierPool.end().catch(() => {});

      if (ids.messages.length) {
        await cleanupPool.query("DELETE FROM messages WHERE id = ANY($1::int[])", [ids.messages]);
      }
      if (ids.charges.length) {
        await cleanupPool.query("DELETE FROM charges WHERE id = ANY($1::int[])", [ids.charges]);
      }
      if (ids.contacts.length) {
        await cleanupPool.query("DELETE FROM contacts WHERE id = ANY($1::int[])", [ids.contacts]);
      }
      if (ids.invoices.length) {
        await cleanupPool.query("DELETE FROM invoices WHERE id = ANY($1::int[])", [ids.invoices]);
      }
      if (ids.campaigns.length) {
        await cleanupPool.query("DELETE FROM campaigns WHERE id = ANY($1::int[])", [ids.campaigns]);
      }
      if (ids.users.length) {
        await cleanupPool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids.users]);
      }
      if (ids.clients.length) {
        await cleanupPool.query("DELETE FROM clients WHERE id = ANY($1::int[])", [ids.clients]);
      }
      await cleanupPool.query(`DROP ROLE IF EXISTS "${verifierRole}"`);
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
