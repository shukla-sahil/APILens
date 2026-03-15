const env = require('../config/env');
const { answerQuestion } = require('./ai-assist.service');

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_OPENROUTER_FREE_MODELS = [
  'openrouter/free',
  'openai/gpt-oss-20b:free',
  'google/gemma-3-12b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free'
];
const OPENROUTER_MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

let openRouterFreeModelCache = {
  models: [],
  fetchedAt: 0
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'this',
  'to',
  'what',
  'which',
  'with',
  'your'
]);

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function safeSerialize(value, maxLength = 300) {
  if (value === null || value === undefined) {
    return null;
  }

  let raw = '';
  try {
    raw = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (_error) {
    raw = String(value);
  }

  if (raw.length <= maxLength) {
    return raw;
  }

  return `${raw.slice(0, maxLength)}...`;
}

function buildTokenWeights(question = '', answer = '') {
  const map = new Map();

  for (const token of tokenize(question)) {
    map.set(token, (map.get(token) || 0) + 3);
  }

  for (const token of tokenize(answer).slice(0, 80)) {
    map.set(token, (map.get(token) || 0) + 1);
  }

  return map;
}

function endpointSearchText(endpoint) {
  const pathParams = (endpoint.parameters?.path || []).map((parameter) => parameter.name).join(' ');
  const queryParams = (endpoint.parameters?.query || []).map((parameter) => parameter.name).join(' ');
  const headerParams = (endpoint.parameters?.header || []).map((parameter) => parameter.name).join(' ');
  const responseCodes = (endpoint.responses || []).map((response) => response.statusCode).join(' ');

  return [
    endpoint.group,
    endpoint.method,
    endpoint.path,
    endpoint.summary,
    endpoint.description,
    endpoint.authentication?.type,
    pathParams,
    queryParams,
    headerParams,
    responseCodes
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scoreEndpoint(endpoint, tokenWeights) {
  if (!tokenWeights || tokenWeights.size === 0) {
    return 0;
  }

  const haystack = endpointSearchText(endpoint);
  let score = 0;

  for (const [token, weight] of tokenWeights.entries()) {
    if (haystack.includes(token)) {
      score += weight;
    }
  }

  return score;
}

function rankRelevantEndpoints(question, endpoints = [], answer = '') {
  const tokenWeights = buildTokenWeights(question, answer);
  const ranked = endpoints
    .map((endpoint) => ({
      endpoint,
      score: scoreEndpoint(endpoint, tokenWeights)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => ({
      method: entry.endpoint.method,
      path: entry.endpoint.path,
      score: entry.score
    }));

  if (ranked.length > 0) {
    return ranked;
  }

  return endpoints.slice(0, 3).map((endpoint, index) => ({
    method: endpoint.method,
    path: endpoint.path,
    score: Math.max(1, 3 - index)
  }));
}

function selectContextEndpoints(question, endpoints = [], maxItems = 10) {
  if (endpoints.length <= maxItems) {
    return endpoints;
  }

  const tokenWeights = buildTokenWeights(question);
  const ranked = endpoints
    .map((endpoint) => ({
      endpoint,
      score: scoreEndpoint(endpoint, tokenWeights)
    }))
    .sort((a, b) => b.score - a.score);

  const focused = ranked.filter((entry) => entry.score > 0).slice(0, maxItems).map((entry) => entry.endpoint);
  if (focused.length > 0) {
    return focused;
  }

  return endpoints.slice(0, maxItems);
}

function summarizeAuth(endpoints = []) {
  const authTypes = Array.from(
    new Set(
      endpoints
        .map((endpoint) => endpoint.authentication?.type)
        .filter((type) => type && type !== 'none')
    )
  );

  return authTypes.length > 0 ? authTypes.join(', ') : 'none detected';
}

function formatEndpointForPrompt(endpoint) {
  const responses = Array.isArray(endpoint.responses)
    ? endpoint.responses.map((response) => String(response.statusCode)).join(', ')
    : 'none';

  const requiredPathParams = (endpoint.parameters?.path || [])
    .filter((parameter) => parameter.required)
    .map((parameter) => parameter.name)
    .join(', ');

  const requiredQueryParams = (endpoint.parameters?.query || [])
    .filter((parameter) => parameter.required)
    .map((parameter) => parameter.name)
    .join(', ');

  const requestExample = safeSerialize(endpoint.requestBody?.example);

  return [
    `${String(endpoint.method || 'get').toUpperCase()} ${endpoint.path || '/'}`,
    endpoint.summary ? `summary: ${endpoint.summary}` : null,
    endpoint.description ? `description: ${endpoint.description}` : null,
    endpoint.authentication?.required
      ? `auth: ${endpoint.authentication.type || 'required'} required`
      : 'auth: none',
    requiredPathParams ? `required path params: ${requiredPathParams}` : null,
    requiredQueryParams ? `required query params: ${requiredQueryParams}` : null,
    `response codes: ${responses}`,
    requestExample ? `request example: ${requestExample}` : null
  ]
    .filter(Boolean)
    .join('\n');
}

function buildUserPrompt(question, projectData) {
  const endpoints = projectData?.endpoints || [];
  const selectedEndpoints = selectContextEndpoints(question, endpoints, 10);
  const project = projectData?.project || {};
  const documentation = projectData?.documentation || {};

  const endpointContext = selectedEndpoints
    .map((endpoint, index) => `Endpoint ${index + 1}\n${formatEndpointForPrompt(endpoint)}`)
    .join('\n\n');

  return [
    `Developer question: ${question}`,
    '',
    'Project context:',
    `- project name: ${project.name || 'Unknown project'}`,
    `- project summary: ${project.summary || documentation?.summary?.text || 'N/A'}`,
    `- base url: ${project.base_url || documentation.baseUrl || 'N/A'}`,
    `- endpoint count: ${project.endpoint_count || endpoints.length}`,
    `- auth types detected: ${summarizeAuth(endpoints)}`,
    '',
    'Known endpoints (grounding context):',
    endpointContext || 'No endpoint context available.',
    '',
    'Response requirements:',
    '- Use only the provided context. Do not invent endpoints.',
    '- If information is missing, clearly say so.',
    '- Include concrete method and path suggestions whenever possible.',
    '- Keep the answer concise and practical for developers.',
    '- Return plain text only. Do not use Markdown symbols such as **, #, or triple backticks.',
    '- If helpful, include short step-by-step guidance.'
  ].join('\n');
}

function hasOpenRouterKey(apiKey = '') {
  return String(apiKey).startsWith('sk-or-v1');
}

function resolveApiKeys() {
  const openAiApiKey = String(env.openAiApiKey || '').trim();
  const openRouterApiKey = String(env.openRouterApiKey || '').trim();

  if (openRouterApiKey) {
    return { openAiApiKey, openRouterApiKey };
  }

  if (hasOpenRouterKey(openAiApiKey)) {
    return {
      openAiApiKey: '',
      openRouterApiKey: openAiApiKey
    };
  }

  return {
    openAiApiKey,
    openRouterApiKey: ''
  };
}

function resolveLlmConfig() {
  const { openAiApiKey, openRouterApiKey } = resolveApiKeys();
  const configuredBaseUrl = String(env.openAiBaseUrl || '').trim();
  if (configuredBaseUrl) {
    const provider = configuredBaseUrl.includes('openrouter.ai') ? 'openrouter' : 'openai';
    return {
      provider,
      url: configuredBaseUrl,
      apiKey: provider === 'openrouter' ? (openRouterApiKey || openAiApiKey) : (openAiApiKey || openRouterApiKey)
    };
  }

  if (openRouterApiKey && (env.openRouterPreferFree !== false || !openAiApiKey)) {
    return {
      provider: 'openrouter',
      url: OPENROUTER_CHAT_COMPLETIONS_URL,
      apiKey: openRouterApiKey
    };
  }

  if (openAiApiKey) {
    return {
      provider: 'openai',
      url: OPENAI_CHAT_COMPLETIONS_URL,
      apiKey: openAiApiKey
    };
  }

  if (openRouterApiKey) {
    return {
      provider: 'openrouter',
      url: OPENROUTER_CHAT_COMPLETIONS_URL,
      apiKey: openRouterApiKey
    };
  }

  return {
    provider: 'openai',
    url: OPENAI_CHAT_COMPLETIONS_URL,
    apiKey: ''
  };
}

function resolveModelForProvider(provider) {
  const configuredModel = String(env.openAiModel || '').trim();

  if (provider === 'openrouter') {
    if (configuredModel) {
      return configuredModel;
    }

    if (env.openRouterPreferFree !== false) {
      return DEFAULT_OPENROUTER_MODEL;
    }

    return 'openai/gpt-4o-mini';
  }

  return configuredModel || DEFAULT_OPENAI_MODEL;
}

function parseModelList(rawValue = '') {
  return String(rawValue)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isFreeByPricing(model) {
  const promptPrice = Number(model?.pricing?.prompt);
  const completionPrice = Number(model?.pricing?.completion);

  return Number.isFinite(promptPrice) && Number.isFinite(completionPrice) && promptPrice === 0 && completionPrice === 0;
}

async function fetchOpenRouterFreeModels(signal) {
  const now = Date.now();
  if (openRouterFreeModelCache.models.length > 0 && now - openRouterFreeModelCache.fetchedAt < OPENROUTER_MODEL_CACHE_TTL_MS) {
    return openRouterFreeModelCache.models;
  }

  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (env.openRouterApiKey) {
      headers.Authorization = `Bearer ${env.openRouterApiKey}`;
    }

    const response = await fetch(OPENROUTER_MODELS_URL, {
      method: 'GET',
      headers,
      signal
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const models = Array.isArray(payload?.data) ? payload.data : [];

    const freeModelIds = models
      .filter((model) => typeof model?.id === 'string' && (model.id.includes(':free') || isFreeByPricing(model)))
      .map((model) => model.id.trim())
      .filter(Boolean);

    const uniqueFreeModels = Array.from(new Set(freeModelIds));
    openRouterFreeModelCache = {
      models: uniqueFreeModels,
      fetchedAt: Date.now()
    };

    return uniqueFreeModels;
  } catch (_error) {
    return [];
  }
}

async function getOpenRouterModelCandidates(primaryModel, signal) {
  const configuredFallbacks = parseModelList(env.openRouterFreeModels || '');
  const discoveredFreeModels = await fetchOpenRouterFreeModels(signal);
  const combined = [
    primaryModel,
    ...configuredFallbacks,
    ...discoveredFreeModels,
    ...DEFAULT_OPENROUTER_FREE_MODELS
  ].filter(Boolean);

  return Array.from(new Set(combined));
}

function isRetryableOpenRouterStatus(statusCode) {
  return statusCode === 402 || statusCode === 404 || statusCode === 429;
}

async function requestChatCompletion({ llm, model, question, projectData, signal }) {
  const headers = {
    Authorization: `Bearer ${llm.apiKey}`,
    'Content-Type': 'application/json'
  };

  if (llm.provider === 'openrouter') {
    headers['HTTP-Referer'] = env.publicDocBaseUrl || env.corsOrigin || 'http://localhost:4200';
    headers['X-Title'] = 'API Lens';
  }

  const response = await fetch(llm.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content:
            'You are an API documentation assistant inside API Lens. Answer only from provided project context, do not fabricate endpoints or auth rules, and format output as plain text (no markdown symbols).'
        },
        {
          role: 'user',
          content: buildUserPrompt(question, projectData)
        }
      ]
    }),
    signal
  });

  if (!response.ok) {
    const providerLabel = llm.provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
    const error = new Error(`${providerLabel} request failed with status ${response.status}.`);
    error.statusCode = response.status;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    return null;
  }

  return content.trim();
}

async function callOpenAiChat(question, projectData) {
  const llm = resolveLlmConfig();
  if (!llm.apiKey) {
    return null;
  }

  const model = resolveModelForProvider(llm.provider);
  const timeoutMs = Number.isFinite(env.openAiTimeoutMs) && env.openAiTimeoutMs > 0
    ? env.openAiTimeoutMs
    : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const modelCandidates = llm.provider === 'openrouter'
      ? await getOpenRouterModelCandidates(model, controller.signal)
      : [model];

    let lastError = null;

    for (let index = 0; index < modelCandidates.length; index += 1) {
      const selectedModel = modelCandidates[index];

      try {
        const answer = await requestChatCompletion({
          llm,
          model: selectedModel,
          question,
          projectData,
          signal: controller.signal
        });

        if (answer) {
          return answer;
        }
      } catch (error) {
        lastError = error;

        const isLastCandidate = index === modelCandidates.length - 1;
        const statusCode = Number(error?.statusCode || 0);

        if (
          llm.provider === 'openrouter' &&
          !isLastCandidate &&
          isRetryableOpenRouterStatus(statusCode)
        ) {
          console.warn(`OpenRouter model ${selectedModel} unavailable (${statusCode}); trying fallback model.`);
          continue;
        }

        if (statusCode === 401) {
          const providerLabel = llm.provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
          throw new Error(`${providerLabel} authentication failed (401). Check your API key and provider endpoint.`);
        }

        if (statusCode === 429) {
          const providerLabel = llm.provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
          throw new Error(`${providerLabel} rate limit reached (429). Try again or switch model.`);
        }

        throw error;
      }
    }

    if (lastError) {
      const statusCode = Number(lastError?.statusCode || 0);
      if (llm.provider === 'openrouter' && statusCode === 404) {
        throw new Error(
          `OpenRouter model not found (404). Update OPENROUTER_FREE_MODELS with valid IDs from https://openrouter.ai/models. Tried: ${modelCandidates.join(', ')}`
        );
      }

      throw lastError;
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function chatWithApi({ question, projectData }) {
  const normalizedQuestion = String(question || '').trim();
  if (!normalizedQuestion) {
    return {
      answer: 'Please provide a question about the API.',
      citations: []
    };
  }

  let answer = '';

  try {
    answer = (await callOpenAiChat(normalizedQuestion, projectData)) || '';
  } catch (error) {
    console.warn('AI chat failed; falling back to local assistant:', error.message);
  }

  if (!answer) {
    answer = answerQuestion(normalizedQuestion, projectData);
  }

  const citations = rankRelevantEndpoints(normalizedQuestion, projectData.endpoints || [], answer);

  return {
    answer,
    citations
  };
}

module.exports = {
  chatWithApi
};
