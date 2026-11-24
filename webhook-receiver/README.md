# A.M.A. Community — WhatsApp webhook receiver

This service receives WhatsApp Cloud API webhook events for the `amacomm` Meta app. It verifies Meta's signature before forwarding the event to the local webhook-only gateway.

## Endpoints

- `GET /health` — Render health check.
- `GET /webhook/whatsapp` — Meta webhook verification handshake.
- `POST /webhook/whatsapp` — validates Meta's `X-Hub-Signature-256` using the raw request body, then forwards the JSON payload to the configured gateway.

## Deploy with Render

This repository includes a root-level `render.yaml` Blueprint. Open the repository in Render and create a Blueprint. Render will create a Node web service from the `webhook-receiver` subdirectory.

The Blueprint uses the Free plan in Singapore. Free services may spin down after inactivity; expect a cold start on the first request after a period of inactivity.

Required environment variables (enter them in Render, never in GitHub):

- `WHATSAPP_VERIFY_TOKEN` — a long random secret used for Meta's callback verification.
- `META_APP_SECRET` — the App Secret from Meta App Dashboard > App settings > Basic.
- `N8N_WEBHOOK_URL` — the public Cloudflare Tunnel URL for the local gateway's exact incoming path.
- `N8N_WEBHOOK_AUTH_TOKEN` — a separate long random secret shared only between this Render service and the local gateway.

The Blueprint sets `WEBHOOK_PATH=/webhook/whatsapp` and `NODE_ENV=production`.

After deployment, test `https://YOUR-SERVICE.onrender.com/health`. The Meta callback URL will be `https://YOUR-SERVICE.onrender.com/webhook/whatsapp`.

## Meta configuration

Only configure the callback in Meta after the service is live and the GET verification handshake can succeed. Enter the exact same `WHATSAPP_VERIFY_TOKEN` value in Meta. Subscribe to the `messages` field initially.

## Security and reliability notes

- Signature verification uses the Meta App Secret and timing-safe comparison.
- The receiver sends `X-AMA-Webhook-Secret` to the gateway. The gateway must validate it before forwarding to n8n.
- The tunnel must expose only the gateway's webhook route, never the n8n editor or port 5678.
- If the gateway is unavailable or returns a non-2xx response, the receiver returns HTTP 503 so Meta can retry.
- This starter forwards synchronously with an 8-second timeout and does not persist events. Before relying on it for a critical public service, add durable queuing, idempotency/deduplication, structured monitoring and alerting.
- Never commit `.env`, Meta App Secret, access tokens, verification tokens or the gateway shared secret.
