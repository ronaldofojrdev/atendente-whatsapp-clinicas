import crypto from "node:crypto";

export function verifySignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export interface InboundWhatsappMessage {
  phoneNumberId: string;
  from: string;
  contactName: string | null;
  text: string;
}

interface WebhookPayload {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}

export function parseInboundMessages(payload: unknown): InboundWhatsappMessage[] {
  const body = payload as WebhookPayload;
  const results: InboundWhatsappMessage[] = [];
  if (body?.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
    return results;
  }

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !Array.isArray(value?.messages)) continue;

      const contactsByWaId = new Map((value.contacts || []).map((c) => [c.wa_id, c.profile?.name || null]));

      for (const message of value.messages) {
        if (message.type !== "text" || !message.from || !message.text?.body) continue;
        results.push({
          phoneNumberId,
          from: message.from,
          contactName: contactsByWaId.get(message.from) || null,
          text: message.text.body,
        });
      }
    }
  }

  return results;
}
