const { taskAssigneeExistsSql } = require('./taskAssignments');

function getInternalClientScope(clientAlias = 'c') {
  return [
    `${clientAlias}.manager_id = $TENANT`,
    `${clientAlias}.id IN (
      SELECT scoped_tasks.client_id
      FROM tasks scoped_tasks
      WHERE scoped_tasks.assigned_to = $TENANT
         OR ${taskAssigneeExistsSql('scoped_tasks')}
         OR scoped_tasks.created_by = $TENANT
    )`,
    `${clientAlias}.id IN (SELECT scoped_materials.client_id FROM materials scoped_materials WHERE scoped_materials.uploaded_by = $TENANT)`,
    `${clientAlias}.id IN (SELECT scoped_files.client_id FROM files scoped_files WHERE scoped_files.uploaded_by = $TENANT)`,
    `${clientAlias}.id IN (SELECT scoped_user.client_id FROM users scoped_user WHERE scoped_user.id = $TENANT AND scoped_user.client_id IS NOT NULL)`,
  ];
}

function getInternalClientAccessScope(clientIdExpression) {
  return [
    `${clientIdExpression} IN (SELECT scoped_clients.id FROM clients scoped_clients WHERE scoped_clients.manager_id = $TENANT)`,
    `${clientIdExpression} IN (
      SELECT scoped_tasks.client_id
      FROM tasks scoped_tasks
      WHERE scoped_tasks.assigned_to = $TENANT
         OR ${taskAssigneeExistsSql('scoped_tasks')}
         OR scoped_tasks.created_by = $TENANT
    )`,
    `${clientIdExpression} IN (SELECT scoped_materials.client_id FROM materials scoped_materials WHERE scoped_materials.uploaded_by = $TENANT)`,
    `${clientIdExpression} IN (SELECT scoped_files.client_id FROM files scoped_files WHERE scoped_files.uploaded_by = $TENANT)`,
    `${clientIdExpression} IN (SELECT scoped_user.client_id FROM users scoped_user WHERE scoped_user.id = $TENANT AND scoped_user.client_id IS NOT NULL)`,
  ];
}

module.exports = {
  getInternalClientScope,
  getInternalClientAccessScope,
};
