import { config } from "../config";
import { decideResponseAnthropic } from "./anthropic";
import { decideResponseGemini } from "./gemini";
import type { AiDecision, ClinicConfig, Message } from "../types";

export async function decideResponse(
  clinicName: string,
  clinicConfig: ClinicConfig,
  history: Message[],
): Promise<AiDecision> {
  if (config.aiProvider === "gemini") {
    return decideResponseGemini(clinicName, clinicConfig, history);
  }
  return decideResponseAnthropic(clinicName, clinicConfig, history);
}
