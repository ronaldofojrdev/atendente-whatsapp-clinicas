import Fastify from "fastify";
import { config } from "./config";
import { getClinicByPhoneNumberId } from "./domain/clinics";
import { handleIncomingMessage } from "./core/handleMessage";
import { sendWhatsappMessage } from "./whatsapp/client";
import { parseInboundMessages, verifySignature } from "./whatsapp/webhook";

const app = Fastify({ logger: true });

// Guarda o corpo bruto para validar a assinatura X-Hub-Signature-256 antes de confiar no payload.
app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
  (req as any).rawBody = body;
  try {
    done(null, body.length ? JSON.parse(body.toString("utf8")) : {});
  } catch (err) {
    done(err as Error, undefined);
  }
});

app.get("/health", async () => ({ ok: true }));

app.get("/webhook", async (req, reply) => {
  const query = req.query as Record<string, string>;
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === config.whatsappVerifyToken) {
    reply.code(200).send(challenge);
    return;
  }
  reply.code(403).send("Forbidden");
});

app.post("/webhook", async (req, reply) => {
  const rawBody = (req as any).rawBody as Buffer;
  const signature = req.headers["x-hub-signature-256"] as string | undefined;

  if (!verifySignature(rawBody, signature, config.whatsappAppSecret)) {
    req.log.warn("Assinatura invalida no webhook do WhatsApp");
    reply.code(401).send({ error: "invalid signature" });
    return;
  }

  // Meta espera 200 rapido; processa as mensagens e so entao responde.
  reply.code(200).send({ received: true });

  const inboundMessages = parseInboundMessages(req.body);
  for (const inbound of inboundMessages) {
    const clinic = getClinicByPhoneNumberId(inbound.phoneNumberId);
    if (!clinic) {
      req.log.warn(`phone_number_id desconhecido, ignorando: ${inbound.phoneNumberId}`);
      continue;
    }

    try {
      const result = await handleIncomingMessage(clinic, inbound.from, inbound.contactName, inbound.text);

      if (result.reply) {
        await sendWhatsappMessage(clinic.phone_number_id, clinic.access_token, inbound.from, result.reply);
      }

      if (result.escalated && result.escalationReason) {
        const notice = `Conversa transferida (${clinic.nome}), numero ${inbound.from}. Motivo: ${result.escalationReason}.`;
        await sendWhatsappMessage(clinic.phone_number_id, clinic.access_token, clinic.escalation_target, notice);
      }
    } catch (err) {
      req.log.error(err, "Falha ao processar mensagem recebida");
    }
  }
});

app
  .listen({ port: config.port, host: "0.0.0.0" })
  .then((address) => app.log.info(`Atendente rodando em ${address}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
