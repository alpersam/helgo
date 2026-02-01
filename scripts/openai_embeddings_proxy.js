/**
 * Minimal OpenAI embeddings proxy (keeps API key off device).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/openai_embeddings_proxy.js
 *
 * Optional:
 *   PORT=8787
 *   OPENAI_BASE_URL=https://api.openai.com
 */

const http = require('http');

const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
const MODEL = 'text-embedding-3-small';

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in environment.');
  process.exit(1);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Request body too large.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function handleEmbedding(req, res) {
  try {
    const body = await parseJsonBody(req);
    const input = typeof body.input === 'string' ? body.input.trim() : '';
    if (!input) {
      return sendJson(res, 400, { error: 'Missing input' });
    }

    const response = await fetch(`${OPENAI_BASE_URL}/v1/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return sendJson(res, response.status, { error: errorText });
    }

    const json = await response.json();
    const embedding = json?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      return sendJson(res, 500, { error: 'Invalid embedding response' });
    }

    return sendJson(res, 200, { embedding });
  } catch (err) {
    return sendJson(res, 500, { error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  if (req.method === 'POST' && req.url === '/embeddings') {
    return handleEmbedding(req, res);
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Embeddings proxy listening on http://localhost:${PORT}`);
});
