const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');

fs.mkdirSync(env.uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

module.exports = multer({
  storage,
  limits: {
    fileSize: env.uploadMaxFileSizeMb * 1024 * 1024,
  },
});
