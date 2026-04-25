exports.up = (pgm) => {
  pgm.sql(`
    ALTER FUNCTION IF EXISTS app.current_role() SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.current_user_id() SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.current_client_id() SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.is_admin() SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.is_client() SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.is_internal() SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_client(INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_contact(INTEGER, INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_write_contact(INTEGER, INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER, INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER, INTEGER, INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_upload_row(INTEGER, INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_charge_row(INTEGER, INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_message(INTEGER, INTEGER) SET search_path TO public;
    ALTER FUNCTION IF EXISTS app.can_access_cost_entry_row(INTEGER, INTEGER) SET search_path TO public;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER FUNCTION IF EXISTS app.current_role() RESET search_path;
    ALTER FUNCTION IF EXISTS app.current_user_id() RESET search_path;
    ALTER FUNCTION IF EXISTS app.current_client_id() RESET search_path;
    ALTER FUNCTION IF EXISTS app.is_admin() RESET search_path;
    ALTER FUNCTION IF EXISTS app.is_client() RESET search_path;
    ALTER FUNCTION IF EXISTS app.is_internal() RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_client(INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_contact(INTEGER, INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_write_contact(INTEGER, INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER, INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER, INTEGER, INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_upload_row(INTEGER, INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_charge_row(INTEGER, INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_message(INTEGER, INTEGER) RESET search_path;
    ALTER FUNCTION IF EXISTS app.can_access_cost_entry_row(INTEGER, INTEGER) RESET search_path;
  `);
};
