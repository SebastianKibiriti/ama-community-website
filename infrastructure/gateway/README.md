# A.M.A. Community local webhook gateway

This small Node service is the only local service that should be exposed through Cloudflare Quick Tunnel. It listens on loopback only, accepts one POST route, validates the shared secret, and forwards the raw JSON body to the matching n8n production webhook.

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set `N8N_WEBHOOK_AUTH_TOKEN` to a random secret of at least 32 characters.
3. Use the exact same secret in Render as `N8N_WEBHOOK_AUTH_TOKEN`.
4. Run `npm install`, then `npm start`.

The gateway binds to `127.0.0.1:8080` by default. Do not change this to `0.0.0.0`.

## n8n workflow

Create an n8n Webhook node using:
- HTTP method: POST
- Path: `ama-whatsapp-incoming`
- Response mode: respond immediately (or use a deliberate Respond to Webhook node)
- Activate the workflow and use its Production URL.

The gateway forwards to `http://127.0.0.1:5678/webhook/ama-whatsapp-incoming`.

## Security

- Only `POST /webhook/ama-whatsapp-incoming` is accepted.
- The `X-AMA-Webhook-Secret` value is compared in constant time.
- The gateway listens only on loopback.
- It never exposes the n8n editor.
- Do not commit `.env` or the shared secret.
