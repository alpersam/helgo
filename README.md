
## Embeddings Proxy Setup (Optional)

If you want to use OpenAI for query embeddings without shipping your API key in the app,
run the local proxy and point the app to it.

1) Copy `.env.example` to `.env` and fill in your key and LAN IP.
   ```
   cp .env.example .env
   ```
2) Start the proxy:
   ```
   node scripts/openai_embeddings_proxy.js
   ```
3) Restart Expo so it picks up the env variables.
