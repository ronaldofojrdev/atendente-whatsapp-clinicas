import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente ${name} nao definida. Confira o .env (veja .env.example).`);
  }
  return value;
}

const aiProvider = (process.env.AI_PROVIDER || "gemini") as "gemini" | "anthropic";

export const config = {
  aiProvider,
  anthropicApiKey: aiProvider === "anthropic" ? required("ANTHROPIC_API_KEY") : process.env.ANTHROPIC_API_KEY || "",
  geminiApiKey: aiProvider === "gemini" ? required("GEMINI_API_KEY") : process.env.GEMINI_API_KEY || "",
  aiModel:
    process.env.AI_MODEL || (aiProvider === "gemini" ? "gemini-3.6-flash" : "claude-haiku-4-5-20251001"),
  whatsappVerifyToken: required("WHATSAPP_VERIFY_TOKEN"),
  whatsappAppSecret: required("WHATSAPP_APP_SECRET"),
  port: Number(process.env.PORT || 3000),
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH || "./data/atendente.db"),
};
