interface KeywordRule {
  motivo: string;
  pattern: RegExp;
}

// Rede de seguranca por palavra-chave: roda antes da IA e nao depende do modelo entender o contexto.
// Cobre os casos obrigatorios de escalação descritos no roteiro do produto.
const RULES: KeywordRule[] = [
  {
    motivo: "dor ou urgência",
    pattern: /\b(dor|doendo|doeu|sangr\w*|inflamad\w*|inchad\w*|urgen\w*|emergenc\w*)\b/i,
  },
  {
    motivo: "reclamação de procedimento já feito",
    pattern: /\b(reclama\w*|insatisfe\w*|problema (no|com) (meu|o) (dente|procedimento|implante|canal)|deu errado|piorou)\b/i,
  },
  {
    motivo: "pedido de diagnóstico",
    pattern: /\b(e cancer|é câncer|isso e normal|isso é normal|sera que e|será que é|diagnostic\w*|isso e grave|isso é grave)\b/i,
  },
  {
    motivo: "remarcação ou cancelamento",
    pattern: /\b(remarcar|remarca\w*|cancelar (a |o |minha |meu )?(consulta|horario|hor[aá]rio)|desmarcar)\b/i,
  },
  {
    motivo: "pedido explícito de atendente humano",
    pattern: /\b(falar com (um |uma )?(atendente|humano|pessoa|recepcao|recepção)|quero (uma )?pessoa|atendimento humano)\b/i,
  },
  {
    motivo: "insistência em preço fechado",
    pattern: /\b(mas quanto (custa|fica|e|é) exato|preciso do valor exato|quero o valor fechado|me fala o preco certo|me fala o preço certo)\b/i,
  },
];

export interface KeywordCheck {
  hit: boolean;
  motivo: string | null;
}

export function checkEscalationKeywords(text: string): KeywordCheck {
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return { hit: true, motivo: rule.motivo };
    }
  }
  return { hit: false, motivo: null };
}
