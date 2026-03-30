function normalizeAssignedUserIds(value, fallbackAssignedTo = null) {
  const source = Array.isArray(value)
    ? value
    : value == null || value === ''
      ? fallbackAssignedTo == null || fallbackAssignedTo === ''
        ? []
        : [fallbackAssignedTo]
      : [value];

  return [...new Set(source.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];
}

function taskAssigneeExistsSql(taskAlias = 't', userExpression = '$TENANT') {
  return `${taskAlias}.id IN (
    SELECT task_assignee.task_id
    FROM task_assignees task_assignee
    WHERE task_assignee.user_id = ${userExpression}
  )`;
}

function taskHasAnyAssigneeSql(taskAlias = 't') {
  return `(
    ${taskAlias}.assigned_to IS NOT NULL
    OR ${taskAlias}.id IN (
      SELECT task_assignee.task_id
      FROM task_assignees task_assignee
    )
  )`;
}

function taskHasNoAssigneeSql(taskAlias = 't') {
  return `(
    ${taskAlias}.assigned_to IS NULL
    AND ${taskAlias}.id NOT IN (
      SELECT task_assignee.task_id
      FROM task_assignees task_assignee
    )
  )`;
}

function taskAssignedUserIdsSql(taskAlias = 't') {
  return `COALESCE(
    (
      SELECT ARRAY_AGG(task_assignee.user_id ORDER BY task_assignee.id ASC)
      FROM task_assignees task_assignee
      WHERE task_assignee.task_id = ${taskAlias}.id
    ),
    CASE
      WHEN ${taskAlias}.assigned_to IS NOT NULL THEN ARRAY[${taskAlias}.assigned_to]
      ELSE ARRAY[]::INTEGER[]
    END
  )`;
}

function taskAssignedUserNamesSql(taskAlias = 't', fallbackUserAlias = 'u') {
  return `COALESCE(
    (
      SELECT ARRAY_AGG(assignee.name ORDER BY task_assignee.id ASC)
      FROM task_assignees task_assignee
      INNER JOIN users assignee ON assignee.id = task_assignee.user_id
      WHERE task_assignee.task_id = ${taskAlias}.id
    ),
    CASE
      WHEN ${fallbackUserAlias}.name IS NOT NULL THEN ARRAY[${fallbackUserAlias}.name]
      ELSE ARRAY[]::TEXT[]
    END
  )`;
}

module.exports = {
  normalizeAssignedUserIds,
  taskAssigneeExistsSql,
  taskHasAnyAssigneeSql,
  taskHasNoAssigneeSql,
  taskAssignedUserIdsSql,
  taskAssignedUserNamesSql,
};
