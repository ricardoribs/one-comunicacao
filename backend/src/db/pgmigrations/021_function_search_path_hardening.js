exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF to_regprocedure('app.current_role()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.current_role() SET search_path TO public';
      END IF;
      IF to_regprocedure('app.current_user_id()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.current_user_id() SET search_path TO public';
      END IF;
      IF to_regprocedure('app.current_client_id()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.current_client_id() SET search_path TO public';
      END IF;
      IF to_regprocedure('app.is_admin()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.is_admin() SET search_path TO public';
      END IF;
      IF to_regprocedure('app.is_client()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.is_client() SET search_path TO public';
      END IF;
      IF to_regprocedure('app.is_internal()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.is_internal() SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_client(integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_client(INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_contact(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_contact(INTEGER, INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_write_contact(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_write_contact(INTEGER, INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_task(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_task(INTEGER, INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_task(integer,integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_task(INTEGER, INTEGER, INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_task(integer,integer,integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_task(INTEGER, INTEGER, INTEGER, INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_upload_row(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_upload_row(INTEGER, INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_charge_row(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_charge_row(INTEGER, INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_message(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_message(INTEGER, INTEGER) SET search_path TO public';
      END IF;
      IF to_regprocedure('app.can_access_cost_entry_row(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_cost_entry_row(INTEGER, INTEGER) SET search_path TO public';
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF to_regprocedure('app.current_role()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.current_role() RESET search_path';
      END IF;
      IF to_regprocedure('app.current_user_id()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.current_user_id() RESET search_path';
      END IF;
      IF to_regprocedure('app.current_client_id()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.current_client_id() RESET search_path';
      END IF;
      IF to_regprocedure('app.is_admin()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.is_admin() RESET search_path';
      END IF;
      IF to_regprocedure('app.is_client()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.is_client() RESET search_path';
      END IF;
      IF to_regprocedure('app.is_internal()') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.is_internal() RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_client(integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_client(INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_contact(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_contact(INTEGER, INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_write_contact(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_write_contact(INTEGER, INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_task(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_task(INTEGER, INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_task(integer,integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_task(INTEGER, INTEGER, INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_task(integer,integer,integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_task(INTEGER, INTEGER, INTEGER, INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_upload_row(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_upload_row(INTEGER, INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_charge_row(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_charge_row(INTEGER, INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_message(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_message(INTEGER, INTEGER) RESET search_path';
      END IF;
      IF to_regprocedure('app.can_access_cost_entry_row(integer,integer)') IS NOT NULL THEN
        EXECUTE 'ALTER FUNCTION app.can_access_cost_entry_row(INTEGER, INTEGER) RESET search_path';
      END IF;
    END
    $$;
  `);
};
