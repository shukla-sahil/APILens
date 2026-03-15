const crypto = require('crypto');

function createId() {
  return crypto.randomUUID();
}

function createShareSlug(projectName = 'project') {
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32);

  return `${safeName || 'api-doc'}-${crypto.randomBytes(4).toString('hex')}`;
}

module.exports = {
  createId,
  createShareSlug
};
