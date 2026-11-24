import express from "express";
import crypto from "node:crypto";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const N8N_ORIGIN = (process.env.N8N_ORIGIN || "http://127.0.0.1:5678").replace(/\/$/, "");
const SHARED_SECRET = process.env.N8N_WEBHOOK_AUTH_TOKEN;
const PUBLIC_PATH = "/webhook/ama-whatsapp-incoming";
const N8N_PATH = "/webhook/ama-whatsapp-incoming";

if (!SHARED_SECRET || SHARED_SECRET.length < 32) {
  console.error("N8N_WEBHOOK_AUTH_TOKEN must be set to a random secret of at least 32 characters.");
  process.exit(1);
}

app.disable("x-powered-by");
app.get("/health", (_req, res) => res.status(200).json({ ok: true, service: "ama-local-webhook-gateway" }));

app.post(PUBLIC_PATH, express.raw({ type: "application/json", limit: "2mb" }), async (req, res) => {
  const supplied = req.get("x-ama-webhook-secret") || "";
  const suppliedBuf = Buffer.from(supplied);
  const expectedBuf = Buffer.from(SHARED_SECRET);

  if (suppliedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(suppliedBuf, expectedBuf)) {
    return res.sendStatus(401);
  }
  if (!Buffer.isBuffer(req.body)) return res.sendStatus(400);

  try {
    const upstream = await fetch(N8N_ORIGIN + N8N_PATH, {
      method: "POST",
      headers: { "content-type": req.get("content-type") || "application/json" },
      body: req.body,
      signal: AbortSignal.timeout(15000)
    });
    const responseText = await upstream.text();
    if (!upstream.ok) {
      console.error(`n8n returned HTTP ${upstream.status}; response body omitted from logs.`);
      return res.sendStatus(502);
    }
    return res.status(200).type("text/plain").send("accepted");
  } catch (error) {
    console.error("Local n8n forwarding failed:", error.message);
    return res.sendStatus(502);
  }
});

app.all("*", (_req, res) => res.sendStatus(404));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`AMA local webhook gateway listening on 127.0.0.1:${PORT}`);
  console.log(`Forwarding only POST ${PUBLIC_PATH} to local n8n.`);
});
