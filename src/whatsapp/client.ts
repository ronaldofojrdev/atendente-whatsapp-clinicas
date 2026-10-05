const GRAPH_API_VERSION = "v21.0";

export async function sendWhatsappMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao enviar mensagem via WhatsApp Cloud API (${response.status}): ${errorBody}`);
  }
}
