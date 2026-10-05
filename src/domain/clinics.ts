import { db } from "../db";
import type { Clinic, ClinicConfig, ClinicWithConfig } from "../types";

function withConfig(row: Clinic): ClinicWithConfig {
  const { config_json, ...rest } = row;
  return { ...rest, config: JSON.parse(config_json) as ClinicConfig };
}

export function getClinicByPhoneNumberId(phoneNumberId: string): ClinicWithConfig | null {
  const row = db
    .prepare<[string], Clinic>("SELECT * FROM clinics WHERE phone_number_id = ? AND active = 1")
    .get(phoneNumberId);
  return row ? withConfig(row) : null;
}

export function getClinicById(id: number): ClinicWithConfig | null {
  const row = db.prepare<[number], Clinic>("SELECT * FROM clinics WHERE id = ?").get(id);
  return row ? withConfig(row) : null;
}

export function listActiveClinics(): ClinicWithConfig[] {
  const rows = db
    .prepare<[], Clinic>("SELECT * FROM clinics WHERE active = 1 ORDER BY id")
    .all();
  return rows.map(withConfig);
}

export function findClinicByIdOrName(idOrName: string): ClinicWithConfig | null {
  if (/^\d+$/.test(idOrName.trim())) {
    return getClinicById(Number(idOrName.trim()));
  }
  const row = db
    .prepare<[string], Clinic>("SELECT * FROM clinics WHERE nome LIKE ? ORDER BY id LIMIT 1")
    .get(`%${idOrName.trim()}%`);
  return row ? withConfig(row) : null;
}

export interface NewClinicInput {
  nome: string;
  phoneNumberId: string;
  accessToken: string;
  timezone?: string;
  escalationTarget: string;
  config: ClinicConfig;
}

export function createClinic(input: NewClinicInput): ClinicWithConfig {
  const result = db
    .prepare(
      `INSERT INTO clinics (nome, phone_number_id, access_token, timezone, config_json, escalation_target, active)
       VALUES (@nome, @phone_number_id, @access_token, @timezone, @config_json, @escalation_target, 1)`,
    )
    .run({
      nome: input.nome,
      phone_number_id: input.phoneNumberId,
      access_token: input.accessToken,
      timezone: input.timezone || "America/Sao_Paulo",
      config_json: JSON.stringify(input.config),
      escalation_target: input.escalationTarget,
    });

  const created = getClinicById(Number(result.lastInsertRowid));
  if (!created) throw new Error("Falha ao criar clinica");
  return created;
}
