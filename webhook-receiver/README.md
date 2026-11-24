# A.M.A. Community — WhatsApp webhook receiver

This service receives WhatsApp Cloud API webhook events for the `amacomm` Meta app and forwards verified event payloads to an n8n production webhook.

## Endpoints

- `GET /health` — Render health check.
- `GET /webhook/whatsapp` — Meta webhook verification handshake.
- `POST /webhook/whatsapp` — validates Meta's `X-Hub-Signature-256` using the raw request body, then forwards the JSON payload to n8n.

## Deploy with Render

This repository includes a root-level `render.yaml` Blueprint. Open the repository in Render and create a Blueprint. Render will create a Node web service from the `webhook-receiver` subdirectory.

The Blueprint requests the Starter plan in Singapore. Review the plan and current price in Render before confirming deployment.

Required environment variables (enter them in Render, never in GitHub):

- `WHATSAPP_VERIFY_TOKEN` — a long random secret you generate. This is the token Meta asks for when verifying the callback.
- `META_APP_SECRET` — the App Secret from Meta App Dashboard > App settings > Basic.
- `N8N_WEBHOOK_URL` — the production webhook URL from your n8n workflow.

The Blueprint sets `WEBHOOK_PATH=/webhook/whatsapp` and `NODE_ENV=production`.

After deployment, test `https://YOUR-SERVICE.onrender.com/health`. The Meta callback URL will be `https://YOUR-SERVICE.onrender.com/webhook/whatsapp`.

## Meta configuration

Only configure the callback in Meta after the service is live and the GET verification handshake can succeed. Enter the exact same `WHATSAPP_VERIFY_TOKEN` value in Meta. Subscribe to the `messages` field initially.

## Reliability notes

- Signature verification uses the Meta App Secret and timing-safe comparison.
- If n8n is unavailable or returns a non-2xx response, the receiver returns HTTP 503 so Meta can retry.
- This starter forwards synchronously with an 8-second timeout and does not persist events. Before relying on it for a critical public service, add durable queuing, idempotency/deduplication, structured monitoring and an alerting path.
- Never commit `.env`, Meta App Secret, access tokens or verification tokens.
