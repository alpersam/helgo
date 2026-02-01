/**
 * OpenAI query embeddings (prefer proxy to keep API keys off-device).
 */

type EmbeddingResponse = {
  data: Array<{ embedding: number[] }>;
};

type ProxyResponse = {
  embedding: number[];
};

function getProxyUrl(): string | null {
  return process.env.EXPO_PUBLIC_OPENAI_EMBEDDINGS_PROXY_URL ?? null;
}

function getPublicApiKey(): string | null {
  return process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? null;
}

function getBaseUrl(): string {
  return process.env.EXPO_PUBLIC_OPENAI_BASE_URL ?? 'https://api.openai.com';
}

/**
 * Strip conversational filler from queries before embedding.
 * Keeps the semantic content while removing chat-style phrases.
 */
function preprocessQueryForEmbedding(input: string): string {
  let cleaned = input.toLowerCase();

  // Remove common conversational starters
  const fillerPatterns = [
    /^(hey|hi|hello|helgo)[,!.]?\s*/i,
    /^(can you|could you|would you|please)\s+(show|find|recommend|suggest|help me find)\s+(me\s+)?/i,
    /^(i'm|i am)\s+(looking for|searching for|trying to find|in the mood for)\s+/i,
    /^(show me|find me|get me|give me)\s+/i,
    /^(what about|how about|any)\s+/i,
    /^(i want|i need|i'd like|i would like)\s+(to find|to see|to go to)?\s*/i,
    /^(do you know|do you have)\s+(any|a|some)?\s*/i,
    /\s*(please|thanks|thank you)[.!]?$/i,
  ];

  for (const pattern of fillerPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If we stripped too much, return original
  if (cleaned.length < 3) {
    return input.trim();
  }

  return cleaned;
}

export async function getQueryEmbedding(input: string, timeoutMs: number = 6000): Promise<number[] | null> {
  const preprocessed = preprocessQueryForEmbedding(input);
  if (!preprocessed) return null;

  console.info(`[embeddings] preprocessed query: "${input}" -> "${preprocessed}"`);
  const trimmed = preprocessed;

  const apiKey = getPublicApiKey();
  if (apiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${getBaseUrl()}/v1/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: trimmed,
        encoding_format: 'float',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const payload = (await response.json()) as EmbeddingResponse;
    return payload.data?.[0]?.embedding ?? null;
  }

  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: trimmed }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const payload = (await response.json()) as ProxyResponse;
    return Array.isArray(payload.embedding) ? payload.embedding : null;
  }

  return null;
}
