function serializeQueryParams(queryParams = []) {
  return queryParams
    .map((param) => `${encodeURIComponent(param.name)}=${encodeURIComponent(param.example || param.default || 'value')}`)
    .join('&');
}

function exampleBodyToString(exampleBody) {
  if (!exampleBody) {
    return '';
  }

  try {
    return JSON.stringify(exampleBody, null, 2);
  } catch (error) {
    return String(exampleBody);
  }
}

function generateCurlSnippet(endpoint, baseUrl) {
  const queryString = serializeQueryParams(endpoint.parameters.query);
  const url = `${baseUrl}${endpoint.path}${queryString ? `?${queryString}` : ''}`;
  const body = exampleBodyToString(endpoint.requestBody.example);

  const lines = [`curl --request ${endpoint.method.toUpperCase()} '${url}'`];

  (endpoint.parameters.header || []).forEach((header) => {
    lines.push(`  --header '${header.name}: ${header.example || header.default || 'value'}'`);
  });

  if (endpoint.authentication.required && endpoint.authentication.type !== 'none') {
    lines.push("  --header 'Authorization: Bearer <token>'");
  }

  if (body) {
    lines.push(`  --header 'Content-Type: application/json'`);
    lines.push(`  --data '${JSON.stringify(endpoint.requestBody.example)}'`);
  }

  return lines.join(' \\\n');
}

function generateJavaScriptSnippet(endpoint, baseUrl) {
  const queryString = serializeQueryParams(endpoint.parameters.query);
  const url = `${baseUrl}${endpoint.path}${queryString ? `?${queryString}` : ''}`;
  const headers = {
    ...(endpoint.authentication.required && endpoint.authentication.type !== 'none'
      ? { Authorization: 'Bearer <token>' }
      : {}),
    ...Object.fromEntries(
      (endpoint.parameters.header || []).map((header) => [
        header.name,
        header.example || header.default || 'value'
      ])
    )
  };

  const bodyExample = endpoint.requestBody.example;
  const needsJsonHeader = Boolean(bodyExample);
  if (needsJsonHeader) {
    headers['Content-Type'] = 'application/json';
  }

  const requestConfig = {
    method: endpoint.method.toUpperCase(),
    headers,
    ...(bodyExample ? { body: JSON.stringify(bodyExample) } : {})
  };

  return `const response = await fetch('${url}', ${JSON.stringify(requestConfig, null, 2)});\nconst data = await response.json();\nconsole.log(data);`;
}

function generatePythonSnippet(endpoint, baseUrl) {
  const queryString = serializeQueryParams(endpoint.parameters.query);
  const url = `${baseUrl}${endpoint.path}${queryString ? `?${queryString}` : ''}`;

  const headers = {
    ...(endpoint.authentication.required && endpoint.authentication.type !== 'none'
      ? { Authorization: 'Bearer <token>' }
      : {}),
    ...Object.fromEntries(
      (endpoint.parameters.header || []).map((header) => [
        header.name,
        header.example || header.default || 'value'
      ])
    )
  };

  if (endpoint.requestBody.example) {
    headers['Content-Type'] = 'application/json';
  }

  const payload = endpoint.requestBody.example || null;

  return `import requests\n\nurl = '${url}'\nheaders = ${JSON.stringify(headers, null, 2)}\npayload = ${JSON.stringify(payload, null, 2)}\n\nresponse = requests.request('${endpoint.method.toUpperCase()}', url, headers=headers, json=payload)\nprint(response.status_code)\nprint(response.json())`;
}

function generateSnippetsForEndpoint(endpoint, baseUrl = 'https://api.example.com') {
  return {
    javascript: generateJavaScriptSnippet(endpoint, baseUrl),
    python: generatePythonSnippet(endpoint, baseUrl),
    curl: generateCurlSnippet(endpoint, baseUrl)
  };
}

module.exports = {
  generateSnippetsForEndpoint
};
