const SwaggerParser = require('swagger-parser');
const yaml = require('js-yaml');
const { Collection } = require('postman-collection');

const AppError = require('../utils/app-error');
const { createId } = require('../utils/id.util');
const {
  SUPPORTED_HTTP_METHODS,
  extractExampleFromContent,
  generateExampleFromSchema,
  inferAuthTypeFromSecurity,
  inferAuthTypeFromHeaders,
  normalizeMethod,
  toSafePath
} = require('../utils/schema.util');

function parseRawSpec(rawContent, filename = 'spec.json') {
  if (typeof rawContent === 'object' && rawContent !== null) {
    return rawContent;
  }

  const input = String(rawContent || '').trim();
  if (!input) {
    throw new AppError('Uploaded specification file is empty', 400);
  }

  const extension = filename.split('.').pop()?.toLowerCase();

  if (extension === 'yaml' || extension === 'yml') {
    try {
      return yaml.load(input);
    } catch (error) {
      throw new AppError('Invalid YAML specification file', 400, error.message);
    }
  }

  try {
    return JSON.parse(input);
  } catch (jsonError) {
    try {
      return yaml.load(input);
    } catch (yamlError) {
      throw new AppError('Specification must be valid JSON or YAML', 400);
    }
  }
}

function detectSpecificationType(parsedSpec) {
  if (!parsedSpec || typeof parsedSpec !== 'object') {
    throw new AppError('Specification file is not a valid object', 400);
  }

  if (parsedSpec.openapi || parsedSpec.swagger || parsedSpec.paths) {
    return 'openapi';
  }

  if (parsedSpec.info && Array.isArray(parsedSpec.item)) {
    return 'postman';
  }

  throw new AppError('Unsupported specification format. Use Postman Collection or OpenAPI/Swagger.', 400);
}

function parseOpenApiParameters(parameters = []) {
  const out = {
    path: [],
    query: [],
    header: []
  };

  parameters.forEach((parameter) => {
    if (!parameter || !parameter.name) {
      return;
    }

    const entry = {
      name: parameter.name,
      required: Boolean(parameter.required),
      description: parameter.description || '',
      schema: parameter.schema || null,
      example:
        parameter.example !== undefined
          ? parameter.example
          : generateExampleFromSchema(parameter.schema || {})
    };

    if (parameter.in === 'path') {
      out.path.push(entry);
      return;
    }

    if (parameter.in === 'query') {
      out.query.push(entry);
      return;
    }

    if (parameter.in === 'header') {
      out.header.push(entry);
    }
  });

  return out;
}

function parseOpenApiRequestBody(requestBody) {
  if (!requestBody || !requestBody.content) {
    return {
      required: false,
      contentType: null,
      schema: null,
      example: null
    };
  }

  const firstContentType = Object.keys(requestBody.content)[0];
  const contentEntry = requestBody.content[firstContentType] || {};
  const schema = contentEntry.schema || null;
  const example = extractExampleFromContent(contentEntry) || generateExampleFromSchema(schema);

  return {
    required: Boolean(requestBody.required),
    contentType: firstContentType || null,
    schema,
    example
  };
}

function parseOpenApiResponses(responses = {}) {
  return Object.entries(responses).map(([statusCode, response]) => {
    const firstContentType = Object.keys(response.content || {})[0] || null;
    const contentEntry = firstContentType ? response.content[firstContentType] : null;
    const schema = contentEntry?.schema || null;
    const example =
      (contentEntry ? extractExampleFromContent(contentEntry) : null) ||
      generateExampleFromSchema(schema);

    return {
      statusCode,
      description: response.description || '',
      contentType: firstContentType,
      schema,
      example
    };
  });
}

function normalizeOpenApiPatchVersion(parsedSpec) {
  const version = String(parsedSpec?.openapi || '');
  const match = version.match(/^3\.0\.(\d+)$/);

  if (!match) {
    return null;
  }

  // swagger-parser v10 rejects patch versions above 3.0.3 even though they are compatible.
  if (Number(match[1]) <= 3) {
    return null;
  }

  return {
    ...parsedSpec,
    openapi: '3.0.3'
  };
}

function isUnsupportedOpenApiVersionError(error) {
  const message = String(error?.message || '');
  return message.includes('Unsupported OpenAPI version');
}

async function parseOpenApiSpec(parsedSpec) {
  let dereferenced;

  try {
    dereferenced = await SwaggerParser.dereference(parsedSpec);
  } catch (error) {
    const normalizedSpec = normalizeOpenApiPatchVersion(parsedSpec);
    if (!normalizedSpec || !isUnsupportedOpenApiVersionError(error)) {
      throw error;
    }

    dereferenced = await SwaggerParser.dereference(normalizedSpec);
  }

  const securityDefinitions = dereferenced.components?.securitySchemes || {};

  const endpoints = [];

  Object.entries(dereferenced.paths || {}).forEach(([path, pathItem]) => {
    SUPPORTED_HTTP_METHODS.forEach((method) => {
      const operation = pathItem?.[method];
      if (!operation) {
        return;
      }

      const mergedParameters = [
        ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
        ...(Array.isArray(operation.parameters) ? operation.parameters : [])
      ];

      const parameters = parseOpenApiParameters(mergedParameters);
      const requestBody = parseOpenApiRequestBody(operation.requestBody);
      const responses = parseOpenApiResponses(operation.responses || {});
      const operationSecurity = operation.security || dereferenced.security || [];

      const authentication = inferAuthTypeFromSecurity(securityDefinitions, operationSecurity);

      endpoints.push({
        id: createId(),
        group: (operation.tags && operation.tags[0]) || 'default',
        method,
        path: toSafePath(path),
        summary: operation.summary || operation.operationId || '',
        description: operation.description || '',
        parameters,
        requestBody,
        responses,
        authentication,
        examples: {
          request: requestBody.example,
          response: responses[0]?.example || null
        }
      });
    });
  });

  return {
    sourceType: 'openapi',
    title: dereferenced.info?.title || 'OpenAPI Project',
    description: dereferenced.info?.description || '',
    version: dereferenced.info?.version || '1.0.0',
    baseUrl: dereferenced.servers?.[0]?.url || 'https://api.example.com',
    endpoints
  };
}

function parsePostmanBody(body) {
  if (!body) {
    return {
      required: false,
      contentType: null,
      schema: null,
      example: null
    };
  }

  if (body.mode === 'raw') {
    try {
      return {
        required: true,
        contentType: 'application/json',
        schema: null,
        example: JSON.parse(body.raw || '{}')
      };
    } catch (error) {
      return {
        required: true,
        contentType: 'text/plain',
        schema: null,
        example: body.raw || ''
      };
    }
  }

  if (body.mode === 'urlencoded' && Array.isArray(body.urlencoded)) {
    const payload = Object.fromEntries(
      body.urlencoded.filter((entry) => entry && entry.key).map((entry) => [entry.key, entry.value || ''])
    );

    return {
      required: true,
      contentType: 'application/x-www-form-urlencoded',
      schema: null,
      example: payload
    };
  }

  if (body.mode === 'formdata' && Array.isArray(body.formdata)) {
    const payload = Object.fromEntries(
      body.formdata.filter((entry) => entry && entry.key).map((entry) => [entry.key, entry.value || ''])
    );

    return {
      required: true,
      contentType: 'multipart/form-data',
      schema: null,
      example: payload
    };
  }

  return {
    required: false,
    contentType: null,
    schema: null,
    example: null
  };
}

function parsePostmanResponses(postmanItem) {
  const responses = [];

  if (!postmanItem.responses || typeof postmanItem.responses.each !== 'function') {
    return responses;
  }

  postmanItem.responses.each((response) => {
    let parsedExample = null;
    const body = response.body || '';

    if (body) {
      try {
        parsedExample = JSON.parse(body);
      } catch (error) {
        parsedExample = body;
      }
    }

    responses.push({
      statusCode: String(response.code || 200),
      description: response.status || '',
      contentType: response.headers?.get('content-type') || 'application/json',
      schema: null,
      example: parsedExample
    });
  });

  if (responses.length === 0) {
    responses.push({
      statusCode: '200',
      description: 'Success',
      contentType: 'application/json',
      schema: null,
      example: { message: 'Example success response' }
    });
  }

  return responses;
}

function parsePostmanAuth(requestAuth, collectionAuth, headers = []) {
  const auth = requestAuth || collectionAuth;
  if (!auth || !auth.type) {
    return inferAuthTypeFromHeaders(headers);
  }

  return {
    type: auth.type,
    required: true,
    details: `Postman auth type ${auth.type}`
  };
}

function normalizePostmanPath(url) {
  if (!url) {
    return '/';
  }

  if (typeof url === 'string') {
    return toSafePath(url.split('?')[0]);
  }

  if (url.raw) {
    return toSafePath(String(url.raw).split('?')[0]);
  }

  if (Array.isArray(url.path) && url.path.length > 0) {
    return toSafePath(`/${url.path.join('/')}`);
  }

  if (typeof url.getPath === 'function') {
    const path = url.getPath();
    return toSafePath(path ? `/${path}` : '/');
  }

  return '/';
}

function parsePostmanUrlParameters(url) {
  const pathVars =
    url?.variables && typeof url.variables.all === 'function' ? url.variables.all() : [];

  const queryParams =
    url?.query && typeof url.query.all === 'function' ? url.query.all() : [];

  return {
    path: (pathVars || []).map((entry) => ({
      name: entry.key,
      required: true,
      description: entry.description || '',
      schema: null,
      example: entry.value || 'value'
    })),
    query: (queryParams || [])
      .filter((entry) => !entry.disabled)
      .map((entry) => ({
        name: entry.key,
        required: false,
        description: entry.description || '',
        schema: null,
        example: entry.value || 'value'
      })),
    header: []
  };
}

function parsePostmanSpec(parsedSpec) {
  const collection = new Collection(parsedSpec);
  const endpoints = [];

  const baseUrl =
    (collection.variables && collection.variables.one && collection.variables.one('baseUrl')?.value) ||
    'https://api.example.com';

  const collectionAuth =
    collection.auth && typeof collection.auth.toJSON === 'function'
      ? collection.auth.toJSON()
      : collection.auth;

  function traverseItems(items, groupName = 'default') {
    if (!items || typeof items.each !== 'function') {
      return;
    }

    items.each((item) => {
      if (item.items && typeof item.items.count === 'function' && item.items.count() > 0) {
        traverseItems(item.items, item.name || groupName);
        return;
      }

      if (!item.request) {
        return;
      }

      const request = item.request;
      const url = request.url;

      const method = normalizeMethod(request.method);
      const path = normalizePostmanPath(url);
      const parameters = parsePostmanUrlParameters(url);

      const headers =
        request.headers && typeof request.headers.all === 'function' ? request.headers.all() : [];

      parameters.header = headers
        .filter((header) => !header.disabled)
        .map((header) => ({
          name: header.key,
          required: false,
          description: header.description || '',
          schema: null,
          example: header.value || 'value'
        }));

      const requestBody = parsePostmanBody(
        request.body && typeof request.body.toJSON === 'function' ? request.body.toJSON() : request.body
      );

      const responses = parsePostmanResponses(item);

      const requestAuth =
        request.auth && typeof request.auth.toJSON === 'function' ? request.auth.toJSON() : request.auth;

      const authentication = parsePostmanAuth(requestAuth, collectionAuth, parameters.header);

      endpoints.push({
        id: createId(),
        group: groupName || 'default',
        method,
        path,
        summary: item.name || '',
        description:
          (request.description && request.description.content) ||
          (request.description && String(request.description)) ||
          '',
        parameters,
        requestBody,
        responses,
        authentication,
        examples: {
          request: requestBody.example,
          response: responses[0]?.example || null
        }
      });
    });
  }

  traverseItems(collection.items, 'default');

  return {
    sourceType: 'postman',
    title: parsedSpec.info?.name || 'Postman Collection',
    description: parsedSpec.info?.description || '',
    version:
      typeof parsedSpec.info?.version === 'string'
        ? parsedSpec.info.version
        : parsedSpec.info?.version?.major
          ? `${parsedSpec.info.version.major}.${parsedSpec.info.version.minor || 0}.${parsedSpec.info.version.patch || 0}`
          : '1.0.0',
    baseUrl,
    endpoints
  };
}

async function parseSpecification(rawContent, filename = 'spec.json') {
  const parsed = parseRawSpec(rawContent, filename);
  const specType = detectSpecificationType(parsed);

  if (specType === 'openapi') {
    return parseOpenApiSpec(parsed);
  }

  return parsePostmanSpec(parsed);
}

module.exports = {
  parseSpecification,
  detectSpecificationType
};
