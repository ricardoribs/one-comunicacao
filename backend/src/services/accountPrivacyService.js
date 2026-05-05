const AppError = require('../utils/AppError');
const { withTransaction } = require('../utils/db');

async function loadAllRecords(loader, pageSize = 100) {
  const allRecords = [];
  let offset = 0;

  while (true) {
    const page = await loader({ limit: pageSize, offset });
    const normalizedPage = Array.isArray(page) ? page : [];

    allRecords.push(...normalizedPage);

    if (normalizedPage.length < pageSize) {
      break;
    }

    offset += normalizedPage.length;
  }

  return allRecords;
}

async function anonymizeAccount(userId, hashedPassword) {
  if (!userId) {
    throw new AppError('Usuario invalido para anonimizacao.', 400);
  }

  const anonymizedEmail = `deleted-user-${userId}-${Date.now()}@anon.invalid`;

  await withTransaction(async (dbClient) => {
    await dbClient.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    await dbClient.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
    await dbClient.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    await dbClient.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await dbClient.query('DELETE FROM user_daily_checklists WHERE user_id = $1', [userId]);
    await dbClient.query('DELETE FROM calendar_event_reminders WHERE user_id = $1', [userId]);
    await dbClient.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
    await dbClient.query('DELETE FROM task_assignees WHERE user_id = $1', [userId]);

    await dbClient.query('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
    await dbClient.query('UPDATE tasks SET created_by = NULL WHERE created_by = $1', [userId]);
    await dbClient.query('UPDATE clients SET manager_id = NULL WHERE manager_id = $1', [userId]);
    await dbClient.query('UPDATE contacts SET owner_id = NULL WHERE owner_id = $1', [userId]);
    await dbClient.query('UPDATE contacts SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
    await dbClient.query('UPDATE materials SET uploaded_by = NULL WHERE uploaded_by = $1', [userId]);
    await dbClient.query('UPDATE files SET uploaded_by = NULL WHERE uploaded_by = $1', [userId]);
    await dbClient.query('UPDATE calendar_events SET created_by = NULL WHERE created_by = $1', [userId]);
    await dbClient.query('UPDATE calendar_events SET updated_by = NULL WHERE updated_by = $1', [userId]);
    await dbClient.query('UPDATE client_integrations SET created_by = NULL WHERE created_by = $1', [userId]);
    await dbClient.query('UPDATE client_integrations SET updated_by = NULL WHERE updated_by = $1', [userId]);

    await dbClient.query(
      `UPDATE users
         SET name = 'Conta removida',
             email = $2,
             phone = NULL,
             job_title = NULL,
             avatar_url = NULL,
             password = $3,
             client_id = NULL,
             is_active = false,
             email_verified_at = NULL,
             failed_login_attempts = 0,
             locked_until = NULL,
             last_login_at = NULL,
             last_seen_at = NULL,
             last_seen_ip = NULL,
             last_seen_location = NULL,
             mfa_totp_secret_encrypted = NULL,
             mfa_totp_pending_secret_encrypted = NULL,
             mfa_enabled_at = NULL
       WHERE id = $1`,
      [userId, anonymizedEmail, hashedPassword]
    );
  });
}

module.exports = {
  loadAllRecords,
  anonymizeAccount,
};
