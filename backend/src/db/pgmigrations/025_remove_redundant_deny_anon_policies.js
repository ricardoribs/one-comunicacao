const RLS_TABLES = [
  'calendar_events',
  'campaigns',
  'charges',
  'client_integrations',
  'clients',
  'contacts',
  'cost_entries',
  'files',
  'invoices',
  'materials',
  'messages',
  'metrics',
  'reports',
  'tasks',
];

function policySql(statementFactory) {
  return RLS_TABLES.map(statementFactory).join('\n');
}

exports.up = (pgm) => {
  pgm.sql(policySql((tableName) => `DROP POLICY IF EXISTS deny_anon ON ${tableName};`));
};

exports.down = (pgm) => {
  pgm.sql(
    policySql(
      (tableName) => `
        DROP POLICY IF EXISTS deny_anon ON ${tableName};
        CREATE POLICY deny_anon ON ${tableName}
          AS RESTRICTIVE
          FOR ALL
          TO anon
          USING (false)
          WITH CHECK (false);
      `
    )
  );
};
