function buildFileAccessPath(fileId) {
  return `/api/files/${fileId}/content`;
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
  decorateFileRecord,
  decorateFileCollection,
};
