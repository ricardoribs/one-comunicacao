const { spawnSync } = require('child_process');
const path = require('path');

const migrateScript = path.join(__dirname, 'migrate.js');
const result = spawnSync(process.execPath, [migrateScript, 'up'], { stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status || 1);
}
