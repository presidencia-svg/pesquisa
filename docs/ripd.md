# Relatório de Impacto à Proteção de Dados Pessoais (RIPD)

**Pesquisa Sergipe 2026**
**Controlador:** Câmara de Dirigentes Lojistas de Aracaju (CDL Aracaju) — CNPJ 13.045.935/0001-36
**Operação:** Pesquisa eleitoral de intenção de voto para Eleições 2026
**Data do relatório:** 13 de maio de 2026 · Versão 1.0
**Revisão:** 13 de setembro de 2026 · Versão 1.1 (2ª edição — coleta de 13 a 20/09/2026)
**Elaborado por:** Encarregado pelo Tratamento de Dados Pessoais (DPO)
**Aprovado por:** Diretoria da CDL Aracaju

---

## Estrutura

Este documento segue o modelo de RIPD recomendado pela Autoridade Nacional de Proteção de Dados (ANPD) no Guia Orientativo "Como elaborar Relatório de Impacto à Proteção de Dados Pessoais" (out/2023), em conformidade com art. 5º XVII, art. 10 §3º e art. 38 da Lei 13.709/2018 (LGPD).

---

## 1. Identificação

### 1.1 Identificação do Controlador

- **Razão social:** Câmara de Dirigentes Lojistas de Aracaju
- **CNPJ:** 13.045.935/0001-36
- **Natureza jurídica:** Associação civil sem fins lucrativos
- **Fundação:** 21 de dezembro de 1961 (Estatutos publicados no Diário Oficial do Estado de Sergipe em 10 de maio de 1962)
- **Utilidade pública:** Lei Municipal nº 63 de 6 de dezembro de 1967, Prefeitura de Aracaju, assinada pelo Prefeito José Teixeira Machado. Documento original reproduzido em *Os 50 Anos do Clube de Diretores Lojistas de Aracaju* (livro institucional), página 84.
- **Endereço:** Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190
- **Representante legal:** Elison Vieira Santos do Bomfim (Presidente, triênio 2026–2028)

### 1.2 Identificação do Encarregado (DPO)

- **Nome:** Claudimara Fontes Carvalho
- **CPF:** [redigido — versão íntegra em docs/confidencial]
- **Vínculo:** Diretora Secretária (1ª Secretária) da CDL Aracaju, triênio 2026–2028
- **Contato:** dpo@cdlaju.com.br · (79) 3212-7700 · WhatsApp 24/7 (79) 98115-5558
- **Suplente:** Verônica Castro Pedreira Peixoto — CPF: [redigido — versão íntegra em docs/confidencial] — Diretora Administrativa e Financeira
- **Designação formal:** Ata de Reunião Extraordinária da Diretoria nº 001/2026-EXT, de 26 de maio de 2026 (ver `docs/ata-dpo.docx`)

### 1.3 Operadores (terceiros que tratam dados em nosso nome)

| Operador | País | Função | DPA |
|---|---|---|---|
| Vercel Inc. | EUA | Hospedagem | Padrão Vercel + cláusulas SCC |
| Supabase Inc. | EUA | Banco de dados | Padrão Supabase + cláusulas SCC |
| Cloudflare Inc. | EUA | Anti-bot (Turnstile) + CDN | Padrão Cloudflare |
| SPC Brasil | BR | Validação de CPF | Contrato CDL vigente |
| Meta Platforms Ireland Ltd | Irlanda | Envio de OTP (WhatsApp Business) | Padrão Meta + GDPR/LGPD |

---

## 2. Descrição da operação de tratamento

### 2.1 Finalidade

Realização de pesquisa de intenção de voto para as Eleições 2026 em Sergipe, com registro no Pesquisas Eleitorais (PesqEle) do TRE-SE e do TSE, conforme:

- Lei nº 9.504/1997, art. 33 (Lei das Eleições)
- Resolução TSE nº 23.747/2026 (regulamenta pesquisas eleitorais)
- Lei nº 13.709/2018 (LGPD)

**Edições:**

- **2ª edição (vigente):** coleta de 13/09/2026 00h00 a 20/09/2026 23h59 (horário de Aracaju). Registro no PesqEle **pendente** — será feito quando a amostra atingir 20 mil eleitores e sempre antes de qualquer divulgação (art. 33 da Lei 9.504/97; Res.-TSE 23.600/2019, red. Res. 23.747/2026, art. 2º, § 7º, III e IV — amostra por adesão).
- **1ª edição (histórico):** coleta de 01 a 03/09/2026; registros SE-09441/2026 (TRE-SE) e BR-04041/2026 (TSE) em 22/08/2026; divulgação em 04/09/2026, suspensa por tutela do TRE-SE em 07/09/2026 (Rp 0601015-42.2026.6.25.0000); site fora do ar de 08/09 até o religamento em 13/09/2026.

### 2.2 Necessidade

A pesquisa atende função institucional da CDL Aracaju de promover transparência eleitoral e fornecer dado público confiável para o comércio local, imprensa e sociedade. A CDL é entidade de utilidade pública (Lei Municipal nº 63/1967) sem fins lucrativos e sem vinculação a candidato ou partido.

### 2.3 Categorias de titulares

Eleitores de Sergipe segundo o TSE 2026 (perfil do eleitorado por seção, geração de 14/07/2026): 1.740.124 eleitores; 1.740.116 mapeados nos estratos de ponderação (8 linhas excluídas por faixa etária inválida). Eleitores com título em outra UF podem participar apenas na cédula de Presidente e recebem peso zero nos recortes estaduais.

### 2.4 Categorias de dados pessoais tratados

| Dado | Categoria LGPD | Forma de armazenamento |
|---|---|---|
| CPF | dado identificador | HMAC-SHA256 (nunca em claro) |
| Nome | dado identificador | `cdl_base` (cadastro unificado) e mascarado em logs administrativos |
| WhatsApp E.164 | dado de contato | texto em DB (TLS at rest) |
| Município e UF do título | dado demográfico | inteiro (código IBGE) + UF |
| Sexo | dado demográfico | enum (M/F); cadastral, perguntado só quando a fonte não traz (`sexo_fonte`) |
| Faixa etária | dado demográfico | enum (6 faixas), derivada da data de nascimento cadastral — nunca perguntada |
| Escolaridade | dado demográfico | 4 opções no formulário (`escolaridade_detalhe`), agregadas em 3 estratos como o TSE |
| Faixa de renda | dado demográfico | enum em salários mínimos (SM 2026 = R$ 1.621), com "não sei" e "prefiro não informar"; recorte descritivo, não pondera |
| Título de eleitor (16–17 anos) | dado identificador | exigido só para voto facultativo |
| Retorno do SPC Brasil (nome, situação cadastral do CPF, data de nascimento, nome da mãe, estado civil, endereço, payload bruto) | dado cadastral | bloco SPC de `cdl_base` com `cadastro_spc_fonte` (migrations 050/051) |
| IP | dado técnico | texto — apenas registrado |
| User-Agent | dado técnico | texto — apenas registrado |
| Fingerprint do dispositivo | dado técnico | hash — apenas armazenado, não bloqueia |
| Opt-in de resultados | preferência | booleano (consentimento) |
| Voto | dado anonimizado | tabela sem identificador; cópia controlada de sexo, faixa, escolaridade, renda e município para recortes agregados |

### 2.5 Dados sensíveis (Art. 5 II LGPD)

- **Convicção política:** NÃO coletada diretamente. Os votos são registrados anonimamente em tabela separada da identidade (arquitetura de duas salas — ver seção 3). Não há possibilidade técnica de ligar voto a indivíduo, mesmo com acesso direto ao banco de dados.
- **Sexo:** enum binário (M/F) por exigência da Res.-TSE 23.600/2019 (red. 23.747/2026), art. 2º (ponderação amostral). Fonte cadastral (`cdl_base`/SPC); perguntado ao eleitor só quando ausente, com proveniência gravada em `sexo_fonte`. Minimização aplicada: enum em vez de texto livre.

### 2.6 Frequência e duração

- **Coleta (2ª edição):** 13 a 20/09/2026, janela travada no servidor.
- **Retenção da identidade (Sala 1, inclusive IP, user-agent e fingerprint):** 6 meses após o término da coleta (`app/api/cron/retencao/route.ts`).
- **Retenção dos códigos OTP:** 30 dias.
- **Retenção dos votos anônimos:** indefinida (já anonimizados na arquitetura).
- **`cdl_base`:** até exclusão a pedido ou fim do ciclo eleitoral 2026.

---

## 3. Necessidade e proporcionalidade

### 3.1 Justificativa da necessidade de cada dado

| Dado | Por que é necessário | Alternativa considerada | Por que não adotada |
|---|---|---|---|
| CPF | identidade única do eleitor (impede 1 pessoa votar 2×) | Email/telefone | Não-único; possibilita fraude por descartável |
| WhatsApp | autenticação por OTP (posse do número) | SMS | SMS é mais caro e inseguro (SS7); WhatsApp já é universal no Brasil |
| Município | estrato de ponderação (raking município × sexo × faixa × instrução) | Auto-declarado livre | Resolução TSE exige IBGE oficial |
| Sexo, idade, escolaridade | ponderação amostral exigida pela Res. TSE 23.747/2026 | Não coletar | Pesquisa seria não-conforme com TSE |
| IP, User-Agent, fingerprint | trilha de auditoria antifraude pós-coleta (apenas registrados; sem bloqueio por IP ou por dispositivo) | Não coletar | Perderia a capacidade de identificar clusters suspeitos na análise |
| Retorno do SPC Brasil | validar CPF como pessoa física real e obter sexo/data de nascimento sem perguntar | Perguntar ao eleitor | Autodeclaração é fraudável; a Resolução exige controle de identidade |
| Faixa de renda | composição da amostra (art. 2º, § 7º, IV); recorte descritivo | Não coletar | A Resolução pede nível econômico na composição da amostra |
| Voto | objeto da pesquisa | — | — |

### 3.2 Proporcionalidade — princípios LGPD aplicados (Art. 6)

- **Finalidade específica (I):** dados usados exclusivamente para pesquisa eleitoral. Sem venda, marketing, perfil de consumo.
- **Adequação (II):** dados são proporcionais ao objetivo declarado.
- **Necessidade (III):** mínimo possível. Idade exposta em faixa; sexo em enum binário; escolaridade em 3 estratos; renda em faixa e opcional.
- **Livre acesso (IV):** endpoint público `/privacidade/excluir` permite eliminação self-service. Acesso aos próprios dados via DPO.
- **Qualidade (V):** validação SPC + checksum CPF + OTP WhatsApp.
- **Transparência (VI):** código aberto + `/transparencia` + `/privacidade`.
- **Segurança (VII):** ver seção 4.
- **Prevenção (VIII):** pentest interno + Turnstile + OTP + arquitetura de duas salas.
- **Não-discriminação (IX):** pesquisa, não decisão automatizada que afete eleitor.
- **Responsabilização (X):** este RIPD + documentação técnica completa.

---

## 4. Medidas de segurança e governança

### 4.1 Medidas técnicas (já implementadas)

#### Criptografia
- **TLS 1.3** com HSTS preload (2 anos) — transporte
- **HMAC-SHA256** do CPF com `CPF_HASH_SECRET` server-only — CPF nunca em claro no DB
- **HMAC-SHA256** do token de voto com `TOKEN_VOTO_SECRET` — token nunca em claro no DB
- **Criptografia em disco** (Supabase, gerenciada pelo AWS RDS)

#### Arquitetura de duas salas (privacidade by design)
- **Sala 1** (`eleitores_pesquisa`): CPF hash, demográficos, IP, UA. Sem voto.
- **Sala 2** (`votos_pesquisa`): token hash + voto. Sem CPF, sem IP.
- **Ponte:** token aleatório 24 bytes que vive APENAS no cookie do navegador (httpOnly, secure, SameSite=Strict, TTL 24h). O servidor não persiste essa ligação.
- **Truncamento temporal:** `criado_hora` na Sala 2 truncado para hora cheia → impede correlação minuto-a-minuto com `criado_em` da Sala 1.

#### Anti-fraude
- Cloudflare Turnstile (anti-bot)
- Bloqueio de cadastro em navegação anônima/privativa
- OTP de 6 dígitos via WhatsApp, expiração 10min, 3 tentativas máx por código, teto de 3 códigos por CPF a cada 15 min
- CPF único por edição (`unique (edicao_id, cpf_hash)`)
- IP e fingerprint **apenas registrados** no fluxo do eleitor (sem bloqueio por IP — CGNAT — nem limite de CPFs por dispositivo); rate limit por IP permanece só no login admin e na exclusão LGPD
- Localização por IP/GPS só quando a edição exige — desligada na 2ª edição

#### Painel admin
- Senha forte + TOTP (Google Authenticator)
- Cookie httpOnly signed JWT (HMAC-SHA256 com `JWT_SECRET`)
- TTL 8h, rotação manual disponível
- Rate limit anti-bruteforce no login

#### Headers de segurança (`next.config.ts`)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: nega camera, geo, mic, USB, etc por default
- `X-Robots-Tag: noindex, nofollow` (não indexável até divulgação)

#### Auditabilidade
- Código aberto: github.com/presidencia-svg/pesquisa
- Pentest interno realizado: `docs/pentest-2026-05.md`
- Logs de erro server-side (sem dado pessoal)
- Histórico completo no Git (toda mudança rastreável)

### 4.2 Medidas administrativas

#### Implementadas
- [x] Política de Privacidade pública (`/privacidade`)
- [x] Termo de consentimento explícito (checkbox em `/votar`)
- [x] Endpoint self-service de exclusão (Art. 18 VI)
- [x] Encarregado (DPO) designado (ver `docs/ata-dpo.md`)
- [x] Pentest interno + correção de 3 vulnerabilidades
- [x] Documentação técnica completa (`docs/`)

#### Pendentes pré-lançamento (setembro/2026)
- [ ] Treinamento LGPD dos administradores do painel
- [x] Cron jobs de descarte automático (retenção) — `/api/cron/retencao`, diário
- [ ] Auditoria de acesso admin (log de cada login)
- [ ] Backup off-site (atualmente só Supabase 7 dias)
- [ ] Upgrade Supabase Free → Pro ($25/mês — pool dedicado + backup 14d)
- [ ] Plano de resposta a incidente formalizado (ver `docs/plano-incidente.md`)

---

## 5. Avaliação de riscos

### Metodologia
Cada risco é avaliado em duas dimensões:
- **Probabilidade**: Baixa / Média / Alta
- **Impacto** (no titular): Baixo / Médio / Alto / Crítico

Risco total = combinação das duas (matriz NIST simplificada).

### 5.1 Riscos identificados

| # | Cenário | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Vazamento de banco completo | Baixa | Crítico | TLS + criptografia disco + service role keys só em env; CPF em HMAC; voto sem ligação a CPF |
| R2 | Bruteforce de CPFs via cdl_base | Baixa | Médio | `CPF_HASH_SECRET` server-only — sem secret, atacante não consegue gerar dicionário |
| R3 | Acesso indevido ao painel admin | Baixa | Alto | Senha + TOTP + rate limit + cookie signed |
| R4 | Bot inflando pesquisa | Média | Alto | Turnstile + OTP WhatsApp + identidade CPF única + bloqueio de navegação anônima; IP/fingerprint registrados para análise pós-coleta |
| R5 | Quebra do anonimato voto↔CPF | Muito baixa | Crítico | Arquitetura duas salas + truncamento temporal + token sem ligação persistida |
| R6 | Ataque de phishing aos admins | Média | Alto | Treinamento LGPD (pendente) + TOTP obrigatório (mitiga senha roubada) |
| R7 | Ransomware / perda de dados | Baixa | Médio | Backup Supabase 7d (14d após upgrade Pro). **Adicionar backup off-site (pendente).** |
| R8 | Exposição de WhatsApp em texto | Baixa | Médio | TLS at rest. Considerar hash adicional em release futura. |
| R9 | DoS na divulgação dos resultados | Alta | Baixo | Cache 15s no /resultados — escala pra 1000+ req/s. Cloudflare anti-DDoS. |
| R10 | Vulnerabilidade em dependência (CVE) | Média | Variável | `npm audit` periódico + monitoring Dependabot. Última atualização: Next 16.2.4→16.2.6. |
| R11 | Race condition em validação OTP | Baixa | Médio | Corrigido: UPDATE atomico WHERE validado=false (ver pentest). |
| R12 | Convite por WhatsApp percebido como indesejado | Média | Baixo | Legítimo interesse (art. 7º IX) com relação prévia; uma mensagem por edição; opt-out "SAIR" e lista de exclusão respeitada em todo envio |
| R13 | Exposição do bloco SPC guardado em `cdl_base` | Baixa | Alto | Mesmas proteções de R1; acesso só por service role; exclusão a pedido remove o bloco inteiro |

### 5.2 Riscos residuais aceitos

| Risco | Razão da aceitação |
|---|---|
| Vercel/Supabase processarem dados nos EUA | Cláusulas SCC + interesse legítimo operacional (Art. 33 II LGPD); custo de hospedagem 100% BR é proibitivo |
| Possibilidade teórica de SIM swap atacando OTP | Mitigação requer hardware tokens, fora do orçamento. WhatsApp é mais seguro que SMS. |
| Logs Vercel mantidos pelo provedor por período próprio (~7 dias) | Fora do controle direto. Logs nossos não contêm CPF ou voto. |

---

## 6. Conclusão

A operação de tratamento de dados pessoais conduzida pela Pesquisa Sergipe 2026:

1. ✅ **Cumpre as bases legais** previstas no art. 7 da LGPD (execução de pesquisa de opinião, legítimo interesse para antifraude e convite, consentimento só para o opt-in de resultados).
2. ✅ **Atende aos princípios** do art. 6 (finalidade, necessidade, transparência, segurança, livre acesso, etc).
3. ✅ **Implementa medidas técnicas robustas** — criptografia, arquitetura de duas salas, anti-fraude, headers OWASP.
4. ✅ **Garante os direitos do titular** (Art. 18) via endpoint self-service de exclusão, política pública e canal DPO.
5. ⚠️ **Possui pendências administrativas** documentadas com prazo (set/2026): treinamento, cron de retenção, backup off-site, upgrade Supabase Pro.
6. ✅ **Tem riscos residuais identificados e justificados**.

**Parecer:** o tratamento de dados pessoais conduzido pela Pesquisa Sergipe 2026 está em conformidade material com a LGPD, com as pendências administrativas listadas devendo ser concluídas até o início da coleta oficial em setembro/2026.

---

## 7. Aprovação e revisão

**Elaborado por:** Claudimara Fontes Carvalho (DPO)
**Data:** 26/05/2026

**Aprovado por:** Diretoria da CDL Aracaju
**Em reunião de:** 26/05/2026 — Ata nº 001/2026-EXT

### Cronograma de revisão

| Versão | Data prevista | Motivo |
|---|---|---|
| 1.0 | 13/05/2026 | Versão inicial |
| 1.1 | 13/09/2026 | 2ª edição: SPC declarado, cadastro unificado, retenção 30 dias/6 meses, fingerprint só armazenado, sem bloqueio por IP, convite WhatsApp, CPFs de dirigentes movidos para `docs/confidencial/` |
| 1.2 | jan/2027 | Pós-coleta — avaliar incidentes e lições aprendidas |
| 2.0 | a definir | Próxima onda de pesquisa |

---

## Anexos

- `docs/ata-dpo.md` — Designação do DPO
- `docs/ata-dpo.docx` — Versão Word da ata (assinatura)
- `docs/lgpd.md` — Conformidade LGPD operacional
- `docs/pentest-2026-05.md` — Pentest interno e correções
- `docs/security.md` — Modelo de ameaças
- `docs/plano-incidente.md` — Plano de resposta a incidente
- `app/privacidade/page.tsx` — Política de privacidade pública
- `app/privacidade/excluir/page.tsx` — Endpoint de exclusão

---

*Este RIPD foi elaborado em conformidade com:*
- *Lei nº 13.709/2018 (LGPD) — arts. 5º XVII, 10 §3º, 38*
- *Guia Orientativo da ANPD "Como elaborar Relatório de Impacto à Proteção de Dados Pessoais" (out/2023)*
- *Resolução CD/ANPD nº 02/2022*
