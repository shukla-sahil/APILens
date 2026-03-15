const { generateExampleFromSchema } = require('../utils/schema.util');

function describeEndpoint(endpoint) {
  const verbMap = {
    get: 'retrieves',
    post: 'creates',
    put: 'replaces',
    patch: 'updates',
    delete: 'deletes',
    options: 'checks options for',
    head: 'fetches headers for'
  };

  const action = verbMap[endpoint.method] || 'handles';
  const path = endpoint.path;
  const authText = endpoint.authentication.required
    ? `Authentication is required (${endpoint.authentication.type}).`
    : 'No authentication is required.';

  return `This endpoint ${action} ${path}. ${authText}`;
}

function suggestMissingFields(endpoint) {
  const missing = [];

  if (!endpoint.summary) {
    missing.push('summary');
  }

  if (!endpoint.description) {
    missing.push('description');
  }

  if (endpoint.requestBody.schema && !endpoint.requestBody.example) {
    missing.push('requestBody.example');
  }

  const hasResponseExample = (endpoint.responses || []).some((response) => response.example !== null);
  if (!hasResponseExample) {
    missing.push('responses.example');
  }

  return missing;
}

function generateMissingRequestExample(endpoint) {
  if (!endpoint.requestBody || !endpoint.requestBody.schema) {
    return null;
  }

  if (endpoint.requestBody.example) {
    return endpoint.requestBody.example;
  }

  return generateExampleFromSchema(endpoint.requestBody.schema);
}

function summarizeApi(projectName, endpoints = []) {
  const methodCounts = endpoints.reduce((acc, endpoint) => {
    acc[endpoint.method] = (acc[endpoint.method] || 0) + 1;
    return acc;
  }, {});

  const authTypes = Array.from(
    new Set(
      endpoints
        .map((endpoint) => endpoint.authentication?.type)
        .filter((type) => type && type !== 'none')
    )
  );

  const endpointCount = endpoints.length;
  const summaryBits = [
    `${projectName || 'This API'} exposes ${endpointCount} endpoints`,
    authTypes.length > 0
      ? `uses ${authTypes.join(', ')} authentication`
      : 'has no explicit authentication requirements',
    `and supports methods: ${Object.keys(methodCounts)
      .map((method) => method.toUpperCase())
      .join(', ') || 'N/A'}`
  ];

  return {
    text: summaryBits.join(' '),
    endpointCount,
    methodCounts,
    authTypes
  };
}

function enrichEndpoint(endpoint) {
  const generatedRequestExample = generateMissingRequestExample(endpoint);
  const missingFields = suggestMissingFields(endpoint);

  return {
    ...endpoint,
    ai: {
      explanation: describeEndpoint(endpoint),
      missingFields,
      generatedRequestExample,
      confidence: 0.78
    },
    requestBody: {
      ...endpoint.requestBody,
      example: endpoint.requestBody.example || generatedRequestExample
    }
  };
}

function answerQuestion(question = '', projectData) {
  const normalizedQuestion = question.toLowerCase();
  const endpoints = projectData.endpoints || [];

  if (normalizedQuestion.includes('authentication') || normalizedQuestion.includes('auth')) {
    const authTypes = Array.from(
      new Set(
        endpoints
          .map((endpoint) => endpoint.authentication?.type)
          .filter((type) => type && type !== 'none')
      )
    );

    if (authTypes.length === 0) {
      return 'No authentication requirement was detected in the parsed API specification.';
    }

    return `The API primarily uses: ${authTypes.join(', ')}.`;
  }

  if (normalizedQuestion.includes('create') || normalizedQuestion.includes('add')) {
    const candidate = endpoints.find((endpoint) => endpoint.method === 'post');
    if (candidate) {
      return `Try ${candidate.method.toUpperCase()} ${candidate.path}. ${candidate.ai?.explanation || ''}`.trim();
    }
  }

  if (normalizedQuestion.includes('orders')) {
    const orderEndpoints = endpoints.filter((endpoint) => endpoint.path.toLowerCase().includes('order'));
    if (orderEndpoints.length > 0) {
      return `Found order-related endpoints: ${orderEndpoints
        .map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`)
        .join(', ')}`;
    }
  }

  const words = normalizedQuestion.split(/\s+/).filter(Boolean);
  const scored = endpoints
    .map((endpoint) => {
      const haystack = `${endpoint.summary} ${endpoint.description} ${endpoint.path}`.toLowerCase();
      const score = words.reduce((acc, word) => (haystack.includes(word) ? acc + 1 : acc), 0);
      return { endpoint, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (top && top.score > 0) {
    return `Best match: ${top.endpoint.method.toUpperCase()} ${top.endpoint.path}. ${top.endpoint.ai?.explanation || ''}`.trim();
  }

  return 'I could not find a direct match. Try asking with an endpoint path or resource name.';
}

module.exports = {
  summarizeApi,
  enrichEndpoint,
  answerQuestion
};
