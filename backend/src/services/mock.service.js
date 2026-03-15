const { toSafePath } = require('../utils/schema.util');

function pathToRegex(path) {
  const escaped = path
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{[^/]+\\\}/g, '[^/]+')
    .replace(/:[^/]+/g, '[^/]+');

  return new RegExp(`^${escaped}$`, 'i');
}

function findMatchingEndpoint(endpoints = [], method, requestPath) {
  const normalizedMethod = String(method || 'get').toLowerCase();
  const normalizedPath = toSafePath(requestPath || '/');

  return endpoints.find((endpoint) => {
    if (endpoint.method !== normalizedMethod) {
      return false;
    }

    const pattern = pathToRegex(endpoint.path);
    return pattern.test(normalizedPath);
  });
}

function resolveMockResponse(endpoints = [], method, requestPath) {
  const endpoint = findMatchingEndpoint(endpoints, method, requestPath);
  if (!endpoint) {
    return null;
  }

  const selectedResponse =
    endpoint.responses.find((response) => String(response.statusCode).startsWith('2')) ||
    endpoint.responses[0] ||
    null;

  const statusCode = selectedResponse ? Number(selectedResponse.statusCode) || 200 : 200;
  const body = selectedResponse
    ? selectedResponse.example || { message: 'Mock response generated from schema metadata' }
    : { message: 'Mock response generated from endpoint metadata' };

  return {
    statusCode,
    body,
    endpoint: {
      id: endpoint.id,
      method: endpoint.method,
      path: endpoint.path
    }
  };
}

module.exports = {
  resolveMockResponse
};
