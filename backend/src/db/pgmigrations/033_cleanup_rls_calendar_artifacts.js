exports.up = (pgm) => {
  pgm.sql(`
    SELECT
      set_config('app.current_role', 'admin', false),
      set_config('app.current_user_id', '', false),
      set_config('app.current_client_id', '', false),
      set_config('app.current_tenant', '', false);

    DELETE FROM notifications
    WHERE entity_type = 'calendar_event'
      AND (
        body ~ '"Evento (interno|Cliente [AB]) [0-9a-f]{8}"'
        OR entity_id IN (
          SELECT id
          FROM calendar_events
          WHERE title ~ '^Evento (interno|Cliente [AB]) [0-9a-f]{8}$'
        )
      );

    DELETE FROM notifications
    WHERE entity_type = 'calendar_event'
      AND entity_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM calendar_events
        WHERE calendar_events.id = notifications.entity_id
      );

    DELETE FROM calendar_event_reminders
    WHERE event_id IN (
      SELECT id
      FROM calendar_events
      WHERE title ~ '^Evento (interno|Cliente [AB]) [0-9a-f]{8}$'
    );

    DELETE FROM calendar_events
    WHERE title ~ '^Evento (interno|Cliente [AB]) [0-9a-f]{8}$';

    DELETE FROM notifications
    WHERE entity_type = 'calendar_event'
      AND entity_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM calendar_events
        WHERE calendar_events.id = notifications.entity_id
      );
  `);
};

exports.down = () => {};
