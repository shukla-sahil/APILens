const SUPPORTED_HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

function extractExampleFromContent(content) {
  if (!content || typeof content !== 'object') {
    return null;
  }

  if (content.example !== undefined) {
    return content.example;
  }

  if (content.examples && typeof content.examples === 'object') {
    const firstExample = Object.values(content.examples)[0];
    if (!firstExample) {
      return null;
    }

    return firstExample.value !== undefined ? firstExample.value : firstExample;
  }

  return null;
}

function generateExampleFromSchema(schema, depth = 0) {
  if (!schema || depth > 4) {
    return null;
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  const schemaType = schema.type || (schema.properties ? 'object' : null);

  if (schemaType === 'object') {
    const output = {};
    const props = schema.properties || {};
    Object.entries(props).forEach(([key, value]) => {
      output[key] = generateExampleFromSchema(value, depth + 1);
    });
    return output;
  }

  if (schemaType === 'array') {
    return [generateExampleFromSchema(schema.items || {}, depth + 1)];
  }

  if (schemaType === 'integer' || schemaType === 'number') {
    return 0;
  }

  if (schemaType === 'boolean') {
    return true;
  }

  if (schema.format === 'date-time') {
    return new Date().toISOString();
  }

  if (schema.format === 'date') {
    return new Date().toISOString().slice(0, 10);
  }

  return 'string';
}

function inferAuthTypeFromSecurity(securityDefinitions = {}, operationSecurity = []) {
  if (!Array.isArray(operationSecurity) || operationSecurity.length === 0) {
    return {
      type: 'none',
      required: false,
      details: 'No explicit auth security requirement found'
    };
  }

  const firstSecurity = operationSecurity[0] || {};
  const firstSchemeName = Object.keys(firstSecurity)[0];
  const scheme = securityDefinitions[firstSchemeName];

  if (!scheme) {
    return {
      type: 'unknown',
      required: true,
      details: `Security scheme ${firstSchemeName || 'unknown'} is referenced`
    };
  }

  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return { type: 'bearer', required: true, details: 'Bearer token authentication' };
  }

  if (scheme.type === 'apiKey') {
    return {
      type: 'apiKey',
      required: true,
      details: `API key in ${scheme.in || 'header'} (${scheme.name || 'x-api-key'})`
    };
  }

  if (scheme.type === 'oauth2') {
    return { type: 'oauth2', required: true, details: 'OAuth2 authentication' };
  }

  if (scheme.type === 'openIdConnect') {
    return { type: 'openIdConnect', required: true, details: 'OpenID Connect authentication' };
  }

  return {
    type: scheme.type || 'unknown',
    required: true,
    details: `Detected security type ${scheme.type || 'unknown'}`
  };
}

function inferAuthTypeFromHeaders(headers = []) {
  const authHeader = headers.find((header) => {
    return String(header.name || '').toLowerCase() === 'authorization';
  });

  if (!authHeader) {
    return {
      type: 'none',
      required: false,
      details: 'No Authorization header declared'
    };
  }

  const value = String(authHeader.value || '').toLowerCase();

  if (value.includes('bearer')) {
    return { type: 'bearer', required: true, details: 'Bearer token in Authorization header' };
  }

  if (value.includes('basic')) {
    return { type: 'basic', required: true, details: 'Basic auth in Authorization header' };
  }

  return { type: 'headerAuth', required: true, details: 'Authorization header required' };
}

function toSafePath(rawPath = '/') {
  if (!rawPath) {
    return '/';
  }

  const noProtocol = rawPath.replace(/^https?:\/\/[^/]+/i, '');
  const withLeadingSlash = noProtocol.startsWith('/') ? noProtocol : `/${noProtocol}`;
  return withLeadingSlash.replace(/\/\/+/, '/');
}

function normalizeMethod(method = 'get') {
  const normalized = String(method).toLowerCase();
  return SUPPORTED_HTTP_METHODS.includes(normalized) ? normalized : 'get';
}

module.exports = {
  SUPPORTED_HTTP_METHODS,
  extractExampleFromContent,
  generateExampleFromSchema,
  inferAuthTypeFromSecurity,
  inferAuthTypeFromHeaders,
  toSafePath,
  normalizeMethod
};
