exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS task_assignees (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (task_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id
      ON task_assignees(task_id);

    CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id_task_id
      ON task_assignees(user_id, task_id);

    INSERT INTO task_assignees (task_id, user_id)
    SELECT tasks.id, tasks.assigned_to
    FROM tasks
    WHERE tasks.assigned_to IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM task_assignees task_assignee
        WHERE task_assignee.task_id = tasks.id
          AND task_assignee.user_id = tasks.assigned_to
      );

    CREATE OR REPLACE FUNCTION app.can_access_task(
      task_id INTEGER,
      task_client_id INTEGER,
      assigned_user_id INTEGER,
      created_user_id INTEGER
    )
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (
          app.is_client()
          AND task_client_id = app.current_client_id()
          AND (
            assigned_user_id IS NOT NULL
            OR EXISTS (
              SELECT 1
              FROM task_assignees task_assignee
              WHERE task_assignee.task_id = task_id
            )
          )
        )
        OR (
          app.is_internal()
          AND (
            assigned_user_id = app.current_user_id()
            OR EXISTS (
              SELECT 1
              FROM task_assignees task_assignee
              WHERE task_assignee.task_id = task_id
                AND task_assignee.user_id = app.current_user_id()
            )
            OR created_user_id = app.current_user_id()
            OR (
              assigned_user_id IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM task_assignees task_assignee
                WHERE task_assignee.task_id = task_id
              )
            )
            OR app.can_access_client(task_client_id)
          )
        );
    $$;

    DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
    CREATE POLICY tasks_tenant_isolation ON tasks
      USING (app.can_access_task(id, client_id, assigned_to, created_by))
      WITH CHECK (app.can_access_task(id, client_id, assigned_to, created_by));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
    CREATE POLICY tasks_tenant_isolation ON tasks
      USING (app.can_access_task(client_id, assigned_to, created_by))
      WITH CHECK (app.can_access_task(client_id, assigned_to, created_by));

    DROP FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER, INTEGER, INTEGER);

    CREATE OR REPLACE FUNCTION app.can_access_task(task_client_id INTEGER, assigned_user_id INTEGER, created_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (app.is_client() AND task_client_id = app.current_client_id() AND assigned_user_id IS NOT NULL)
        OR (
          app.is_internal()
          AND (
            assigned_user_id = app.current_user_id()
            OR created_user_id = app.current_user_id()
            OR assigned_user_id IS NULL
            OR app.can_access_client(task_client_id)
          )
        );
    $$;

    DROP INDEX IF EXISTS idx_task_assignees_user_id_task_id;
    DROP INDEX IF EXISTS idx_task_assignees_task_id;
    DROP TABLE IF EXISTS task_assignees;
  `);
};
