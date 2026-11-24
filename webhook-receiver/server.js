import express from "express";
import crypto from "node:crypto";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_WEBHOOK_AUTH_TOKEN = process.env.N8N_WEBHOOK_AUTH_TOKEN;
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/webhook/whatsapp";

if (!VERIFY_TOKEN || !APP_SECRET || !N8N_WEBHOOK_URL || !N8N_WEBHOOK_AUTH_TOKEN) {
  console.error("Missing one or more required environment variables: WHATSAPP_VERIFY_TOKEN, META_APP_SECRET, N8N_WEBHOOK_URL, N8N_WEBHOOK_AUTH_TOKEN.");
  process.exit(1);
}

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "ama-community-whatsapp-receiver" });
});

app.get(WEBHOOK_PATH, (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN && typeof challenge === "string") {
    return res.status(200).type("text/plain").send(challenge);
  }
  return res.sendStatus(403);
});

app.post(WEBHOOK_PATH, express.raw({ type: "application/json", limit: "2mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body)) return res.sendStatus(400);

  const signature = req.get("x-hub-signature-256") || "";
  const expected = "sha256=" + crypto
    .createHmac("sha256", APP_SECRET)
    .update(req.body)
    .digest("hex");

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return res.sendStatus(401);
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.sendStatus(400);
  }

  try {
    const downstream = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ama-webhook-secret": N8N_WEBHOOK_AUTH_TOKEN
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    if (!downstream.ok) {
      console.error(`n8n gateway returned HTTP ${downstream.status}; allowing Meta to retry.`);
      return res.sendStatus(503);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Could not forward event to the local webhook gateway:", error.message);
    return res.sendStatus(503);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AMA Community WhatsApp receiver listening on port ${PORT}`);
  console.log(`Webhook path: ${WEBHOOK_PATH}`);
});
