/**
 * AI Provider adapters — maps each provider to its API format.
 *
 * Two formats are supported:
 * 1. "anthropic" — Anthropic's native Messages API (x-api-key header, custom body)
 * 2. "openai-compat" — OpenAI Chat Completions format used by GPT, DeepSeek, Qwen, Moonshot, etc.
 *
 * Every provider entry exposes:
 *   format    — "anthropic" | "openai-compat"
 *   baseUrl   — API endpoint
 *   defaultModel — used when the user doesn't specify a model
 *   headers   — a function (apiKey) => { header object }
 *   buildBody — a function (model, messages) => request body JSON
 *   parseResponse — a function (parsed JSON response) => plain text content
 */

const PROVIDERS = {
  claude: {
    format: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-opus-4-8',
    headers(apiKey) {
      return {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages) {
      return {
        model,
        max_tokens: 1024,
        system:
          'You are a senior code reviewer. Respond in Chinese. Be concise and specific. Only report real problems — do NOT praise the code or give general advice.',
        messages,
      };
    },
    parseResponse(json) {
      return json?.content?.[0]?.text || '';
    },
  },

  openai: {
    format: 'openai-compat',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o',
    headers(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages) {
      return {
        model,
        max_tokens: 1024,
        messages,
      };
    },
    parseResponse(json) {
      return json?.choices?.[0]?.message?.content || '';
    },
  },

  deepseek: {
    format: 'openai-compat',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    headers(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages) {
      return { model, max_tokens: 1024, messages };
    },
    parseResponse(json) {
      return json?.choices?.[0]?.message?.content || '';
    },
  },

  qwen: {
    format: 'openai-compat',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    defaultModel: 'qwen-turbo',
    headers(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages) {
      return { model, max_tokens: 1024, messages };
    },
    parseResponse(json) {
      return json?.choices?.[0]?.message?.content || '';
    },
  },

  moonshot: {
    format: 'openai-compat',
    baseUrl: 'https://api.moonshot.cn',
    defaultModel: 'moonshot-v1-8k',
    headers(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages) {
      return { model, max_tokens: 1024, messages };
    },
    parseResponse(json) {
      return json?.choices?.[0]?.message?.content || '';
    },
  },

  custom: {
    format: 'openai-compat',
    baseUrl: '',
    defaultModel: 'gpt-3.5-turbo',
    headers(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    },
    buildBody(model, messages) {
      return { model, max_tokens: 1024, messages };
    },
    parseResponse(json) {
      return json?.choices?.[0]?.message?.content || '';
    },
  },
};

/**
 * Get the full base URL for a provider, accounting for custom base URL.
 */
function getBaseUrl(providerId, customBaseUrlOverride) {
  // customBaseUrlOverride is passed in from extension.js to avoid depending on vscode module at require-time

  if (providerId === 'custom') {
    const customUrl = (customBaseUrlOverride || '').trim();
    return customUrl.replace(/\/+$/, '') || 'http://localhost:11434';
  }

  return PROVIDERS[providerId]?.baseUrl || '';
}

/**
 * Build the full request options object for Node.js https.request().
 *
 * @param {string} providerId — one of the PROVIDERS keys
 * @param {string} apiKey
 * @param {string} model
 * @param {string} userPrompt — the review prompt
 * @returns {{ hostname, port, path, method, headers, body }}
 */
function buildRequest(providerId, apiKey, model, userPrompt, customBaseUrl) {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const baseUrl = getBaseUrl(providerId, customBaseUrl);
  const url = new URL(baseUrl);

  const headers = provider.headers(apiKey);

  let path, body;

  if (provider.format === 'anthropic') {
    path = '/v1/messages';
    body = provider.buildBody(model, [
      { role: 'user', content: userPrompt },
    ]);
  } else {
    // OpenAI-compatible format
    path = '/v1/chat/completions';
    body = provider.buildBody(model, [
      {
        role: 'system',
        content:
          'You are a senior code reviewer. Respond in Chinese. Be concise and specific. Only report real problems — do NOT praise the code or give general advice.',
      },
      { role: 'user', content: userPrompt },
    ]);
  }

  const bodyStr = JSON.stringify(body);

  return {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: (url.pathname || '') + (url.search || '') + path,
    method: 'POST',
    headers: {
      ...headers,
      'Content-Length': Buffer.byteLength(bodyStr),
    },
    body: bodyStr,
  };
}

/**
 * Parse the raw response body string into plain text.
 *
 * @param {string} providerId
 * @param {string} rawBody — response body string
 * @returns {string} extracted text content
 */
function parseResponse(providerId, rawBody) {
  try {
    const json = JSON.parse(rawBody);
    const provider = PROVIDERS[providerId];
    if (!provider) return rawBody;
    return provider.parseResponse(json) || rawBody;
  } catch {
    return rawBody;
  }
}

/**
 * Get the default model for a provider.
 */
function getDefaultModel(providerId) {
  return PROVIDERS[providerId]?.defaultModel || 'gpt-3.5-turbo';
}

module.exports = { PROVIDERS, buildRequest, parseResponse, getDefaultModel };
