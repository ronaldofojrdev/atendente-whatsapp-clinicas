import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { buildSystemPrompt } from "./prompt";
import type { AiDecision, ClinicConfig, Message } from "../types";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const RESPONDER_TOOL: Anthropic.Tool = {
  name: "responder_cliente",
  description: "Registra a resposta ao paciente e os dados estruturados extraidos da conversa.",
  input_schema: {
    type: "object",
    properties: {
      resposta: {
        type: "string",
        description: "Mensagem a enviar ao paciente, portugues brasileiro, no maximo 3 linhas.",
      },
      entendeu: {
        type: "boolean",
        description: "Se a IA entendeu a ultima mensagem do paciente.",
      },
      escalar: {
        type: "boolean",
        description: "true se a conversa deve ser transferida para um humano agora.",
      },
      motivo_escalar: {
        type: "string",
        description: "Motivo da escalada. String vazia se escalar for false.",
      },
      procedimento: {
        type: ["string", "null"],
        description: "Procedimento de interesse do paciente, se ja identificado nesta conversa.",
      },
      ja_paciente: {
        type: ["boolean", "null"],
        description: "Se o paciente ja e cliente da clinica, se ja identificado nesta conversa.",
      },
      preferencia_horario: {
        type: ["string", "null"],
        description: "Dia e turno de preferencia do paciente, se ja identificado nesta conversa.",
      },
      dados_completos: {
        type: "boolean",
        description: "true somente quando procedimento, ja_paciente e preferencia_horario ja foram coletados.",
      },
    },
    required: [
      "resposta",
      "entendeu",
      "escalar",
      "motivo_escalar",
      "procedimento",
      "ja_paciente",
      "preferencia_horario",
      "dados_completos",
    ],
    additionalProperties: false,
  },
};

export async function decideResponseAnthropic(
  clinicName: string,
  clinicConfig: ClinicConfig,
  history: Message[],
): Promise<AiDecision> {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.body,
  }));

  const response = await anthropic.messages.create({
    model: config.aiModel,
    max_tokens: 1024,
    system: buildSystemPrompt(clinicName, clinicConfig),
    messages,
    tools: [RESPONDER_TOOL],
    tool_choice: { type: "tool", name: "responder_cliente" },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error(`IA nao retornou chamada de ferramenta. stop_reason=${response.stop_reason}`);
  }

  return toolUse.input as AiDecision;
}
