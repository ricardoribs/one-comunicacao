const jwt = require('jsonwebtoken');
const env = require('../config/env');

const FILE_ACCESS_AUDIENCE = 'one-file-access';
const FILE_ACCESS_TTL_SECONDS = 60;

function buildFileAccessPath(fileId) {
  return `/api/files/${fileId}/content`;
}

function signFileAccessToken(fileId, userId) {
  return jwt.sign(
    {
      fileId: Number(fileId),
      userId: Number(userId),
    },
    env.jwtSecret,
    {
      algorithm: env.jwtAlgorithm,
      audience: FILE_ACCESS_AUDIENCE,
      expiresIn: FILE_ACCESS_TTL_SECONDS,
      subject: String(userId),
    }
  );
}

function verifyFileAccessToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret, {
      algorithms: [env.jwtAlgorithm],
      audience: FILE_ACCESS_AUDIENCE,
    });
  } catch {
    return null;
  }
}

function buildLegacyFileAccessUrl(fileId, userId) {
  const token = signFileAccessToken(fileId, userId);
  return `${buildFileAccessPath(fileId)}?download_token=${encodeURIComponent(token)}`;
}

function decorateFileRecord(file) {
  if (!file) {
    return file;
  }

  const accessUrl = buildFileAccessPath(file.id);

  return {
    ...file,
    url: accessUrl,
    access_url: accessUrl,
  };
}

function decorateFileCollection(files = []) {
  return files.map((file) => decorateFileRecord(file));
}

module.exports = {
  buildFileAccessPath,
  buildLegacyFileAccessUrl,
  decorateFileRecord,
  decorateFileCollection,
  verifyFileAccessToken,
};
