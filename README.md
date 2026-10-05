# atendente-whatsapp-clinicas

![Node](https://img.shields.io/badge/node-18%2B-339933) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

Atendente de WhatsApp com IA para clínicas de odontologia e estética. Uma instalação atende várias clínicas ao mesmo tempo: cada clínica é uma linha no banco, identificada pelo `phone_number_id` do número dela na Cloud API oficial da Meta.

Cadastrar uma clínica nova não exige mexer em código, é só rodar um comando.

## Stack

- Node.js 18+ e TypeScript
- Fastify (servidor do webhook)
- WhatsApp Cloud API da Meta
- Anthropic (Claude Haiku) ou Google Gemini, à escolha
- SQLite com `better-sqlite3`

## Instalação

```bash
npm install
cp .env.example .env
```

No `.env`:

| Variável | Para quê |
|---|---|
| `AI_PROVIDER` | `gemini` ou `anthropic` |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | chave do provedor escolhido |
| `WHATSAPP_VERIFY_TOKEN` | texto qualquer que você inventa; a Meta usa para confirmar o webhook |
| `WHATSAPP_APP_SECRET` | App Secret do app da Meta, usado para validar a assinatura de cada mensagem |
| `PORT`, `DATABASE_PATH` | os padrões servem na maioria dos casos |

O `phone_number_id` e o `access_token` de cada clínica não ficam no `.env`. Eles são gravados por clínica no banco, e é isso que permite atender várias com uma instalação só.

## Configurar a Meta

1. Em [developers.facebook.com](https://developers.facebook.com), crie um app do tipo Business e adicione o produto WhatsApp.
2. Em WhatsApp > API Setup há um número de teste com `Phone number ID` e um token temporário de 24 horas. Para produção, crie um usuário do sistema em Business Settings e gere um token permanente com a permissão `whatsapp_business_messaging`.
3. Em App Settings > Basic, copie o App Secret para o `.env`.
4. Suba o servidor em uma URL com HTTPS. Em desenvolvimento, `ngrok http 3000` resolve.
5. Em WhatsApp > Configuration > Webhook, use `https://SEU_DOMINIO/webhook` e o mesmo verify token do `.env`. Inscreva o campo `messages`.

Para atender clientes de verdade, a conta precisa passar pela verificação de negócio da Meta. Antes disso, o número de teste só fala com destinatários cadastrados na tela da API.

## Usar

Cadastrar uma clínica:

```bash
npm run add-clinic
```

Testar sem Meta e sem WhatsApp, numa conversa pelo terminal que usa o mesmo prompt, as mesmas regras e o mesmo banco:

```bash
npm run demo
```

Subir em produção:

```bash
npm run build
npm start
```

Rotas: `GET /webhook` (verificação da Meta), `POST /webhook` (mensagens) e `GET /health`.

### Rotinas agendadas

São scripts que rodam uma vez e saem, feitos para o cron ou o Task Scheduler:

| Comando | Quando rodar | O que faz |
|---|---|---|
| `npm run set-appointment` | manual | grava a data confirmada de uma consulta num lead |
| `npm run send-reminders` | de hora em hora | avisa o paciente 24 horas antes da consulta |
| `npm run reactivate` | uma vez por dia | chama quem parou de responder há mais de 60 dias |
| `npm run report -- <clínica> [--month=AAAA-MM]` | uma vez por mês | resumo de conversas, leads, transferências e procedimentos mais pedidos |

## Como uma mensagem é tratada

1. A Meta chama `POST /webhook`. O servidor valida a assinatura e acha a clínica pelo `phone_number_id`. Se a clínica não existir, ignora a mensagem.
2. Carrega a conversa e o histórico recente.
3. Uma checagem por palavras-chave roda antes da IA (dor, urgência, reclamação, remarcação, pedido de atendente, insistência em preço). Se bater, a conversa é transferida direto, sem gastar uma chamada ao modelo.
4. Senão, o modelo recebe o histórico e a configuração da clínica e devolve a resposta, se entendeu, se deve transferir e os dados do lead já coletados.
5. Ao transferir, a conversa vira `escalated`, o número de aviso da clínica recebe uma notificação e o bot para de responder ali.
6. Quando procedimento, "já é paciente" e preferência de horário estão completos, o lead é gravado e a conversa é encerrada.

O bot responde em até 3 linhas, termina com uma pergunta, não informa preço fechado e não dá diagnóstico.

## Exemplo no modo demo

Saída de uma execução real do `npm run demo`, com a clínica fictícia do `seed.ts`. Não precisa de conta na Meta:

```
Você: Oi, queria saber se vocês fazem clareamento dental
Bot: Oi, tudo bem? Fazemos clareamento sim, é um tratamento ótimo. Você já é paciente aqui na clínica?
Você: Nunca fui paciente de vocês, é a primeira vez
Bot: Legal, seja muito bem-vinda. Qual o melhor dia e turno para você vir fazer o clareamento?
Você: Prefiro de manhã, de preferência na terça
Bot: Perfeito. Anotei aqui: clareamento dental, preferência terça de manhã. Vou confirmar a agenda e já te retorno com o horário certinho. Pode ser?
  [LEAD REGISTRADO] procedimento: clareamento dental, ja e paciente: nao, preferencia: terça de manhã
Você: estou com muita dor no dente desde ontem
Bot: Vou chamar alguém da equipe pra te responder certinho, só um instante.
  [ESCALADO] motivo: dor ou urgência. Avisando 5511988887777.
```

Na última mensagem a palavra "dor" aciona a regra de palavra-chave, então a conversa é transferida sem chamar o modelo.

## Decisões de projeto

**Casos sensíveis não passam pelo modelo.** Dor, urgência, reclamação de procedimento, pedido de diagnóstico, remarcação e pedido de atendente humano são tratados por expressões regulares em `src/ai/escalation.ts`, antes de qualquer chamada à IA. Numa clínica, esses casos não podem depender de o modelo ter entendido bem, e ainda economizam uma chamada.

**Saída do modelo em formato fixo.** No Claude, a resposta é forçada por uma ferramenta (`responder_cliente`) e, no Gemini, por JSON com schema. O código recebe sempre os mesmos campos (resposta, se entendeu, se deve transferir, dados do lead) e não precisa interpretar texto livre.

**Quando o bot não entende duas vezes seguidas, transfere.** Em vez de insistir, `handleMessage.ts` conta as mensagens não entendidas da conversa e passa para a equipe na segunda.

**Mensagens só da Meta.** Cada chamada ao webhook tem a assinatura `X-Hub-Signature-256` conferida com o App Secret antes de qualquer processamento.

**Uma instalação, várias clínicas.** Credenciais e regras de cada clínica ficam no banco, e a clínica é achada pelo `phone_number_id`. Cadastrar uma nova não mexe em código.

## Banco de dados

`clinics`, `conversations`, `messages`, `leads` e `escalations`. O esquema está em `src/db/schema.ts`. A clínica de exemplo do `seed.ts` é fictícia.
