/**
 * Review engine — builds prompts, calls AI APIs, and formats results.
 */

const https = require('https');
const http = require('http');
const { buildRequest, parseResponse, getDefaultModel } = require('./providers');

// ─── Prompt Template ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = 'You are a senior code reviewer. Review the code and find issues in these 6 categories:\n' +
  '\n' +
  '1. 🔴 **Null/Undefined Access** — Accessing properties on potentially null/undefined values, missing null checks before chained access (e.g., obj.a.b when obj.a might be null).\n' +
  '2. 🔴 **Unhandled Async Errors** — Promise without .catch(), async function call without await or error handling, missing try-catch around await.\n' +
  '3. 🟡 **Loop Performance Trap** — Using await inside a loop (for/while/forEach) where calls could be parallelized with Promise.all().\n' +
  '4. 🟡 **Hardcoded Secrets** — API keys, passwords, tokens, connection strings hardcoded in the source code.\n' +
  '5. 🔵 **Poor Variable Naming** — Single-letter or overly generic variable names (x, tmp, data, obj, val, item, stuff, thing) that make the code hard to understand.\n' +
  '6. 🔵 **Missing Boundary Checks** — Array/string index access without length check, division without zero check, null/undefined passed to functions expecting values.\n' +
  '\n' +
  'Rules:\n' +
  '- ONLY report real problems. Do NOT make up issues that don\'t exist.\n' +
  '- If there are no real problems, say "✅ 未发现明显问题。"\n' +
  '- Keep each finding to 1-2 lines. Use this format:\n' +
  '  [Line ~N] 🔴/🟡/🔵 Brief description of the problem\n' +
  '- Group by severity: 🔴 first, then 🟡, then 🔵.\n' +
  '- Respond in Chinese.';

/**
 * Build the full review prompt.
 *
 * @param {string} code - selected source code
 * @param {string} language - file language id (e.g. 'javascript', 'python')
 * @returns {string}
 */
function buildPrompt(code, language) {
  return 'Review the following ' + language + ' code:\n\n```' + language + '\n' + code + '\n```';
}

// ─── HTTP Request ────────────────────────────────────────────────────────────

/**
 * Send an HTTPS request and return the response body as a string.
 *
 * @param {object} opts — { hostname, port, path, method, headers, body }
 * @returns {Promise<string>}
 */
function httpRequest(opts) {
  return new Promise((resolve, reject) => {
    const transport = opts.port === 443 ? https : http;

    const req = transport.request(
      {
        hostname: opts.hostname,
        port: opts.port,
        path: opts.path,
        method: opts.method,
        headers: opts.headers,
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            let errMsg = `API returned status ${res.statusCode}`;
            try {
              const errJson = JSON.parse(data);
              if (errJson.error?.message) {
                errMsg = errJson.error.message;
              }
            } catch {}
            reject(new Error(errMsg));
          }
        });
      }
    );

    req.on('error', (e) => {
      if (e.code === 'ENOTFOUND') {
        reject(new Error(`Cannot reach server: ${opts.hostname}`));
      } else if (e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET') {
        reject(new Error('Request timed out. The AI service may be slow or unreachable.'));
      } else {
        reject(new Error(`Network error: ${e.message}`));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 30 seconds.'));
    });

    if (opts.body) {
      req.write(opts.body);
    }
    req.end();
  });
}

// ─── Review Function ─────────────────────────────────────────────────────────

/**
 * Run a code review.
 *
 * @param {string} code - the selected source code
 * @param {string} language - file language id
 * @param {string} providerId - AI provider key
 * @param {string} apiKey - user's API key for the provider
 * @param {string} model - model name (or empty for default)
 * @returns {Promise<string>} formatted review result (markdown-ish text)
 */
async function reviewCode(code, language, providerId, apiKey, model, customBaseUrl) {
  if (!apiKey) {
    throw new Error(
      'API Key for "' + providerId + '" is not configured.\n\n' +
        'Open the command palette (Ctrl+Shift+P) and run "AI Review: Set API Key" to set it.'
    );
  }

  if (!model) {
    model = getDefaultModel(providerId);
  }

  const prompt = buildPrompt(code, language);
  const requestOpts = buildRequest(providerId, apiKey, model, prompt, customBaseUrl);

  const rawResponse = await httpRequest(requestOpts);
  const result = parseResponse(providerId, rawResponse);

  return result || '(No response content from AI)';
}

module.exports = { reviewCode, buildPrompt, SYSTEM_PROMPT };
