# Política e mapeamento LGPD · Pesquisa Eleitoral Sergipe 2026

Documento interno + anexo do registro PesqEle/TRE.
**Versão 1.1 — 13/09/2026** (2ª edição). Substitui a v1.0 de 13/05/2026.

> Regra deste documento: descrever **o que o código faz** (`app/`, `lib/`,
> `supabase/migrations/`, `app/api/cron/retencao/route.ts`) — nada além disso.
> Quando um controle não existe no código, ele não é prometido aqui nem no PesqEle.

## 0. Edição vigente e histórico

| Edição | Coleta | Registro PesqEle | Situação |
|---|---|---|---|
| **2ª edição (vigente)** | 13/09/2026 00h00 a 20/09/2026 23h59 (horário de Aracaju) | **Pendente** — será feito quando a amostra atingir 20 mil eleitores e sempre antes de qualquer divulgação (Lei 9.504/97, art. 33; Res.-TSE 23.600/2019, red. Res. 23.747/2026, art. 2º, § 7º, III e IV — amostra por adesão) | Em coleta; nenhum resultado divulgado |
| 1ª edição (histórico) | 01 a 03/09/2026 | SE-09441/2026 (TRE-SE) e BR-04041/2026 (TSE), registrados em 22/08/2026 | Divulgada em 04/09/2026; divulgação suspensa por tutela do TRE-SE em 07/09/2026 (Rp 0601015-42.2026.6.25.0000); site fora do ar de 08/09 até o religamento em 13/09/2026 |

Os números SE-09441/2026 e BR-04041/2026 pertencem exclusivamente à 1ª edição.

## 1. Identificação do controlador

- **Razão social:** Câmara de Dirigentes Lojistas de Aracaju (CDL Aracaju)
- **CNPJ:** 13.045.935/0001-36
- **Endereço:** Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190
- **Natureza jurídica:** associação civil sem fins lucrativos
- **Fundação:** 21 de dezembro de 1961 (Estatutos publicados no DOE/SE em 10/05/1962)
- **Utilidade pública:** Lei Municipal nº 63 de 6 de dezembro de 1967

## 2. Encarregado pelo Tratamento de Dados (DPO)

- **Encarregada:** Claudimara Fontes Carvalho (Diretora Secretária) — designada pela Ata nº 001/2026-EXT de 26/05/2026 (`docs/ata-dpo.md`; versão íntegra com CPF em `docs/confidencial/`).
- **Suplente:** Verônica Castro Pedreira Peixoto (Diretora Administrativa e Financeira).
- **Canal:** dpo@cdlaju.com.br · (79) 3212-7700 · Rua Santa Luzia, 570, São José, Aracaju/SE.

## 3. Inventário de dados pessoais (2ª edição)

Tabelas envolvidas: `cdl_base` (cadastro unificado, com flags `*_fonte` — migration 051), `eleitores_pesquisa` (Sala 1 — identidade e validações por edição), `votos_pesquisa` (Sala 2 — votos, sem identificador), `whatsapp_codigos` (OTP), `rate_limit_ip` (registro de tentativas).

| Dado | Origem | Finalidade | Base legal (art. 7º) | Retenção |
|---|---|---|---|---|
| **CPF** | digitado pelo eleitor | identificação única (1 participação por CPF por edição) | IV — execução de pesquisa de opinião | armazenado **só como HMAC-SHA256** (`cpf_hash`); Sala 1 eliminada 6 meses após `edicao.fim` |
| **Nome** | consulta cadastral (SPC Brasil) ou `cdl_base` | conferência de identidade; exibição mascarada em logs administrativos | IV | 6 meses após o fim da edição (Sala 1); permanece em `cdl_base` até exclusão a pedido |
| **WhatsApp (E.164)** | digitado | envio do código OTP (posse do número); convite às edições seguintes | IV (OTP); IX — legítimo interesse (convite, com opt-out) | 6 meses após o fim da edição (Sala 1); `cdl_base` até exclusão a pedido |
| **Município e UF do título** | digitado / `cdl_base` | estrato de ponderação (município); eleitor de outra UF vota só para Presidente | IV | 6 meses após o fim da edição |
| **Sexo** | cadastral (`cdl_base`/Melhores do Ano ou SPC); **perguntado ao eleitor só quando a fonte não traz** — proveniência em `sexo_fonte` (mda / spc_mda / spc = cadastral; eleitor = informado) | estrato de ponderação | IV | 6 meses após o fim da edição |
| **Faixa etária** | cadastral, derivada da data de nascimento (SPC/`cdl_base`); **nunca perguntada** | estrato de ponderação; 16–17 anos exige título de eleitor | IV | 6 meses após o fim da edição |
| **Escolaridade** | digitada (4 opções, agregadas em 3 estratos como o TSE — `escolaridade_detalhe` + `escolaridade`) | estrato de ponderação | IV | 6 meses após o fim da edição |
| **Faixa de renda** | digitada (salários mínimos, SM 2026 = R$ 1.621; "não sei" e "prefiro não informar") | recorte descritivo — **não pondera** | IV | 6 meses após o fim da edição |
| **Título de eleitor** (só 16–17 anos) | digitado | comprovar condição de eleitor com voto facultativo | IV | 6 meses após o fim da edição |
| **Dados devolvidos pelo SPC Brasil** (nome, situação cadastral do CPF, data de nascimento, nome da mãe, estado civil, endereço, payload bruto) | consulta cadastral por CPF | validar que o CPF pertence a pessoa física real e obter sexo/data de nascimento sem perguntar ao eleitor | IV (execução de pesquisa) + IX (prevenção à fraude) | guardados em `cdl_base` (bloco SPC com `cadastro_spc_fonte`) até exclusão a pedido; cópia da edição na Sala 1 por 6 meses |
| **IP e User-Agent** | request HTTP | trilha de auditoria antifraude; **não bloqueiam** (só registro) | IX — legítimo interesse | **6 meses** após o fim da edição (`app/api/cron/retencao/route.ts`) |
| **Fingerprint do dispositivo** | gerado no navegador | **apenas armazenado** para análise pós-coleta; não bloqueia | IX | 6 meses após o fim da edição |
| **Código OTP** (`whatsapp_codigos`) | gerado pelo servidor | prova de envio/validação | IV | **30 dias** (cron diário) |
| **Tentativas por IP** (`rate_limit_ip`) | request | registro de rajadas; sem bloqueio no fluxo do eleitor | IX | 24 horas (cron diário) |
| **Opt-in de resultados** | checkbox do eleitor | receber aviso da divulgação por WhatsApp | I — **consentimento** (único tratamento baseado em consentimento) | até revogação ou exclusão |
| **Voto** | digitado | objeto da pesquisa | — (dado anonimizado; sem identificador) | indefinido, já anônimo |

### 3.1 Dados sensíveis (art. 5º, II)

- **Convicção política:** não é vinculável a pessoa. A tabela de votos não guarda CPF, hash, telefone, IP nem chave para a Sala 1; o token de sessão vive só no cookie httpOnly e o servidor não persiste a ligação. A Sala 2 recebe apenas cópia controlada de sexo, faixa etária, escolaridade, renda e município para os recortes agregados; cruzamentos demográficos públicos são suprimidos com menos de 30 respondentes por célula (views do banco, migration 030).
- **Sexo:** enum binário (M/F), cadastral por padrão. Quando a fonte não devolve (limitação do SPC para jovens sem histórico cadastral), o formulário pergunta; o valor informado só entra em `cdl_base` após validação do OTP e nunca sobrescreve valor cadastral. Finalidade: ponderação exigida pela Res.-TSE 23.600/2019 (art. 2º).

## 4. Bases legais (art. 7º)

| Tratamento | Base legal | Justificativa |
|---|---|---|
| CPF, WhatsApp, demográficos, título (16–17) | IV — execução de pesquisa de opinião (com hash do CPF, sem identificação do voto) | finalidade única: pesquisa eleitoral registrada/registrável no PesqEle |
| Consulta ao SPC Brasil e guarda do retorno; IP, user-agent, fingerprint | IX — legítimo interesse (prevenção à fraude e auditabilidade exigida pela Res.-TSE) | proporcional: dados só armazenados, sem decisão automatizada contra o eleitor |
| Ponderação (município × sexo × faixa etária × instrução) | IV + II (obrigação legal: art. 33 da Lei 9.504/97 e art. 2º da Res.-TSE) | raking calculado no banco, parâmetro TSE 2026 |
| Convite por WhatsApp às bases da CDL (Melhores do Ano e participantes da 1ª edição) | IX — legítimo interesse, com opt-out ("responda SAIR") | quem pediu saída ou exclusão nunca recebe (`scripts/disparar-convite-pesquisa.mjs`) |
| Opt-in de resultados | I — consentimento | revogável a qualquer momento |
| Voto | não é dado pessoal (anonimizado por arquitetura) | — |

Não se aplica o art. 11 (dados sensíveis) ao voto, porque não há titular identificável.

## 5. Princípios (art. 6º)

- **Finalidade / adequação:** só pesquisa eleitoral 2026 e seu registro; sem venda, marketing de terceiros ou perfil de consumo.
- **Necessidade:** CPF em hash; idade em faixa (a data de nascimento cadastral não é exibida); sexo em enum; escolaridade em 3 estratos; renda em faixa e opcional.
- **Livre acesso e transparência:** `/privacidade`, `/transparencia`, código aberto, este documento.
- **Qualidade:** consulta cadastral ao SPC Brasil + dígito verificador + OTP.
- **Segurança e prevenção:** ver `docs/security.md` (o que existe) e §9.
- **Não discriminação:** nenhuma decisão automatizada afeta o eleitor além da recusa de cadastro duplicado.
- **Responsabilização:** RIPD (`docs/ripd.md`), ata do DPO, plano de incidente, log de auditoria administrativo.

## 6. Direitos do titular (art. 18)

| Direito | Como exercer |
|---|---|
| Confirmação, acesso, correção, portabilidade, informação sobre compartilhamento | dpo@cdlaju.com.br (prazo de resposta: 15 dias) |
| **Eliminação** | **`/privacidade/excluir`** (self-service: CPF + OTP no WhatsApp) ou dpo@cdlaju.com.br. A exclusão remove o eleitor de `cdl_base` e da Sala 1 e fica registrada no log de auditoria sem dado pessoal. |
| Revogação do opt-in de resultados | mesmo canal de exclusão ou e-mail ao DPO |
| Oposição ao convite por WhatsApp | responder **SAIR** à mensagem ou pedir exclusão; o número passa à lista de opt-out e não recebe mais convites |
| Oposição ao tratamento por legítimo interesse (SPC, IP, fingerprint) | dpo@cdlaju.com.br — a consequência é a impossibilidade de participar da edição |

## 7. Retenção e descarte

| Categoria | Prazo | Mecanismo |
|---|---|---|
| Códigos OTP (`whatsapp_codigos`) | 30 dias | cron diário `/api/cron/retencao` |
| Tentativas por IP (`rate_limit_ip`) | 24 horas | cron diário |
| Sala 1 (`eleitores_pesquisa`: hash do CPF, nome, WhatsApp, demográficos, IP, user-agent, fingerprint) | 6 meses após `edicao.fim` | cron diário |
| `cron_log` e `admin_audit_log` | 1 ano | cron diário |
| `cdl_base` (cadastro unificado, inclusive bloco SPC) | até exclusão a pedido ou fim do ciclo eleitoral 2026, quando será revista a finalidade | exclusão via `/privacidade/excluir` |
| Votos (Sala 2, anônimos) | indefinido | — |
| Cookies httpOnly de sessão | 24 h | TTL |
| Backups Supabase | prazo do provedor | provedor |

O cron roda às 03h UTC (00h em Aracaju), autenticado por `CRON_SECRET`; cada execução fica em `cron_log` e é visível no painel admin.

## 8. Operadores e compartilhamento

| Operador | Função | Dados | Acordo |
|---|---|---|---|
| Supabase Inc. (EUA) | banco de dados | todos os dados das tabelas acima | DPA padrão + cláusulas contratuais |
| Vercel Inc. (EUA) | hospedagem e cron | dados em trânsito e logs de aplicação | DPA padrão |
| Cloudflare Inc. (EUA) | Turnstile (anti-bot) | sinais técnicos do navegador; nenhum dado de cadastro | DPA padrão |
| Meta Platforms (Irlanda) | WhatsApp Business — OTP e convite | número + código OTP; número + primeiro nome no convite | termos WhatsApp Business |
| SPC Brasil | consulta cadastral por CPF | CPF enviado; retorno guardado em `cdl_base` | contrato CDL vigente |

Não há compartilhamento com candidatos, partidos, patrocinadores ou veículos de imprensa: a divulgação (pesquisa.cdlaju.com.br/resultados e canais da CDL Aracaju) contém apenas agregados ponderados. Dados completos ficam à disposição da Justiça Eleitoral (art. 33, § 1º, Lei 9.504/97) por exportação sem CPF, telefone ou IP (`scripts/exportar-dados-pericia.mjs`).

**Transferência internacional** (art. 33): Vercel e Supabase processam fora do Brasil, com cláusulas contratuais padrão (art. 33, II).

## 9. Medidas técnicas e administrativas (art. 46)

Técnicas em vigor (detalhe em `docs/security.md`):

- HTTPS forçado (HSTS preload), headers OWASP, cookies httpOnly/secure/SameSite=Strict.
- CPF só em HMAC-SHA256 com segredo server-only; token de voto em HMAC.
- Duas salas: identidade e voto sem chave de ligação; `criado_hora` do voto truncado para hora cheia.
- Cloudflare Turnstile; OTP de 6 dígitos por WhatsApp (expira em 10 min, 3 tentativas por código, teto de 3 códigos por CPF a cada 15 min).
- Bloqueio de cadastro em navegação anônima/privativa (`app/votar/actions.ts`).
- CPF único por edição (`unique (edicao_id, cpf_hash)`).
- Janela de coleta travada no servidor; localização por IP/GPS só quando a edição exige (**desligada na 2ª edição**).
- IP, user-agent e fingerprint **apenas registrados** — não há bloqueio por IP nem limite de CPFs por dispositivo.
- Painel admin com senha + TOTP; ações críticas (divulgação, ponderação, exclusão LGPD) no `admin_audit_log`.
- Cron de retenção diário (§7).

Administrativas: DPO designada (ata 001/2026-EXT), RIPD (`docs/ripd.md`), plano de resposta a incidente (`docs/plano-incidente.md`), pentests internos (`docs/confidencial/`). Pendentes: treinamento LGPD dos administradores, backup off-site.

## 10. Convite por WhatsApp (2ª edição)

- Destinatários: bases da CDL Aracaju (Melhores do Ano e participantes da 1ª edição) que não pediram exclusão nem saída.
- Base legal: legítimo interesse (art. 7º, IX) — relação prévia com a entidade, expectativa razoável, uma mensagem por edição, sem dados sensíveis, sem resultado ou número de participação.
- Opt-out: rodapé "Responda SAIR para não receber mais mensagens"; os números ficam em lista fora do git e são pulados em qualquer envio.
- Template aprovado pela Meta (`convite_pesquisa`, categoria marketing). Texto em `docs/convite-whatsapp-2a-edicao.md`.

## 11. Plano de resposta a incidente

Formalizado em `docs/plano-incidente.md` (comitê, severidade, prazos ANPD/TRE-SE/titulares).

## 12. Versionamento

- **v1.1 (13/09/2026)** — 2ª edição: inventário com cadastro unificado e bloco SPC (migrations 050/051), `sexo_fonte` (047), escolaridade em 4 opções e renda em salários mínimos (053), retenção real do cron (30 dias / 6 meses / 1 ano), operadores, convite por WhatsApp com legítimo interesse e opt-out, remoção de controles que o código não executa (bloqueio por endereço IP, limite por dispositivo), CPFs de dirigentes retirados dos documentos públicos.
- **v1.0 (13/05/2026)** — primeira versão.

## 13. Checklist LGPD para o registro da 2ª edição

- [x] Política de privacidade pública (`/privacidade`) alinhada a este documento
- [x] Canal de exclusão self-service (`/privacidade/excluir`)
- [x] DPO designada (ata 001/2026-EXT)
- [x] RIPD (`docs/ripd.md`) atualizado para a 2ª edição
- [x] Cron de retenção em produção
- [x] Plano de resposta a incidente
- [x] Opt-out do convite por WhatsApp operacional
- [ ] Treinamento LGPD dos administradores do painel
- [ ] Backup off-site
