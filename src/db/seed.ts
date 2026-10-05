import type { ClinicConfig } from "../types";

const config: ClinicConfig = {
  cidade: "São Paulo",
  endereco: "Rua Alcântara, 245",
  bairro: "Centro",
  horarioFuncionamento: "Segunda a sábado, das 9h às 19h",
  convenios: ["Bradesco Dental", "Amil Dental", "Particular"],
  formasPagamento: ["Cartão em até 6x", "Pix com desconto à vista", "Dinheiro"],
  procedimentos: [
    "Limpeza",
    "Clareamento dental",
    "Extração",
    "Canal",
    "Implante",
    "Avaliação ortodôntica",
    "Botox",
    "Preenchimento facial",
  ],
  faq: [
    {
      pergunta: "Tem estacionamento?",
      resposta: "Temos convênio com o estacionamento ao lado, com desconto para pacientes.",
    },
  ],
};

export const SORRISO_ALCANTARA_SEED = {
  nome: "Clínica Sorriso Alcântara",
  phone_number_id: "demo-sorriso-alcantara",
  access_token: "demo-access-token",
  timezone: "America/Sao_Paulo",
  config_json: JSON.stringify(config),
  escalation_target: "5511988887777",
};
