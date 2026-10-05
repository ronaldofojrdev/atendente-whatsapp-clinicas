export interface FaqEntry {
  pergunta: string;
  resposta: string;
}

export interface ClinicConfig {
  cidade: string;
  endereco: string;
  bairro: string;
  horarioFuncionamento: string;
  convenios: string[];
  formasPagamento: string[];
  procedimentos: string[];
  faq: FaqEntry[];
}

export interface Clinic {
  id: number;
  nome: string;
  phone_number_id: string;
  access_token: string;
  timezone: string;
  config_json: string;
  escalation_target: string;
  active: number;
  created_at: string;
}

export type ClinicWithConfig = Omit<Clinic, "config_json"> & { config: ClinicConfig };

export type ConversationStatus = "active" | "escalated" | "closed";

export interface Conversation {
  id: number;
  clinic_id: number;
  contact_phone: string;
  contact_name: string | null;
  status: ConversationStatus;
  consecutive_no_understand: number;
  last_message_at: string;
  reactivated_at: string | null;
  created_at: string;
}

export type MessageDirection = "inbound" | "outbound";

export interface Message {
  id: number;
  conversation_id: number;
  direction: MessageDirection;
  body: string;
  created_at: string;
}

export type LeadStatus = "novo" | "contatado" | "agendado";

export interface Lead {
  id: number;
  clinic_id: number;
  conversation_id: number;
  nome: string | null;
  procedimento: string | null;
  ja_paciente: number | null;
  preferencia_horario: string | null;
  status: LeadStatus;
  appointment_at: string | null;
  reminder_sent: number;
  created_at: string;
}

export interface Escalation {
  id: number;
  clinic_id: number;
  conversation_id: number;
  motivo: string;
  created_at: string;
}

export interface AiDecision {
  resposta: string;
  entendeu: boolean;
  escalar: boolean;
  motivo_escalar: string;
  procedimento: string | null;
  ja_paciente: boolean | null;
  preferencia_horario: string | null;
  dados_completos: boolean;
}

export interface HandleMessageResult {
  reply: string | null;
  escalated: boolean;
  escalationReason: string | null;
  leadCaptured: boolean;
  conversationId: number;
}
