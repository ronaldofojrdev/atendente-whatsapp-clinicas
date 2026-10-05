import { GoogleGenAI, Type } from "@google/genai";
import { config } from "../config";
import { buildSystemPrompt } from "./prompt";
import type { AiDecision, ClinicConfig, Message } from "../types";

const genai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const DECISION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    resposta: { type: Type.STRING, description: "Mensagem a enviar ao paciente, portugues brasileiro, no maximo 3 linhas." },
    entendeu: { type: Type.BOOLEAN, description: "Se a IA entendeu a ultima mensagem do paciente." },
    escalar: { type: Type.BOOLEAN, description: "true se a conversa deve ser transferida para um humano agora." },
    motivo_escalar: { type: Type.STRING, description: "Motivo da escalada. String vazia se escalar for false." },
    procedimento: { type: Type.STRING, nullable: true, description: "Procedimento de interesse do paciente, se ja identificado." },
    ja_paciente: { type: Type.BOOLEAN, nullable: true, description: "Se o paciente ja e cliente da clinica, se ja identificado." },
    preferencia_horario: { type: Type.STRING, nullable: true, description: "Dia e turno de preferencia, se ja identificado." },
    dados_completos: { type: Type.BOOLEAN, description: "true somente quando procedimento, ja_paciente e preferencia_horario ja foram coletados." },
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
} as const;

export async function decideResponseGemini(
  clinicName: string,
  clinicConfig: ClinicConfig,
  history: Message[],
): Promise<AiDecision> {
  const contents = history.map((m) => ({
    role: m.direction === "inbound" ? "user" : "model",
    parts: [{ text: m.body }],
  }));

  const response = await genai.models.generateContent({
    model: config.aiModel,
    contents,
    config: {
      systemInstruction: buildSystemPrompt(clinicName, clinicConfig),
      responseMimeType: "application/json",
      responseSchema: DECISION_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini nao retornou texto na resposta.");
  }

  return JSON.parse(text) as AiDecision;
}
