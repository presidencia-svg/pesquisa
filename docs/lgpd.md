# Conformidade LGPD · Pesquisa Sergipe 2026

Documento interno + anexo do registro PesqEle/TRE.  
**Vigência:** 13/05/2026 (versão 1.0)

## 1. Identificação do controlador

- **Razão social:** Câmara de Dirigentes Lojistas de Aracaju
- **CNPJ:** 13.045.935/0001-36
- **Endereço:** Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190
- **Natureza jurídica:** associação civil sem fins lucrativos
- **Fundação:** 21 de dezembro de 1961 (Estatutos publicados no DOE/SE em 10/05/1962)
- **Utilidade pública:** Lei Municipal nº 63 de 6 de dezembro de 1967 (Pref. Aracaju, assinada por José Teixeira Machado — documento original reproduzido em *Os 50 Anos do CDL Aracaju*, p. 84)

## 2. Encarregado pelo Tratamento de Dados (DPO)

⚠️ **TODO antes do lançamento:** designar formalmente em ata de
diretoria. Sugestão: criar email dedicado `dpo@cdlaju.com.br`,
incluir nome do encarregado no rodapé do site (já está na política
de privacidade pública).

## 3. Dados pessoais coletados

| Dado | Tipo | Origem | Tratamento | Retenção |
|---|---|---|---|---|
| **CPF** | dado identificador | digitado | HMAC-SHA256, **nunca em claro** | 6 meses pós-coleta |
| **Nome mascarado** | dado identificador | SPC ou cdl_base | armazenado com asterisco | 6 meses pós-coleta |
| **WhatsApp E.164** | dado de contato | digitado | texto em DB (TLS at rest) | 6 meses pós-coleta + permanece em cdl_base com consentimento |
| **Município IBGE** | demográfico | digitado | inteiro | 6 meses pós-coleta |
| **Sexo** | sensível? (Art. 5 II) | digitado (M/F apenas) | enum | 6 meses pós-coleta |
| **Faixa etária** | demográfico | digitado | enum | 6 meses pós-coleta |
| **Escolaridade** | demográfico | digitado | enum | 6 meses pós-coleta |
| **IP** | técnico | server-side | texto | 90 dias |
| **User-Agent** | técnico | header HTTP | texto | 90 dias |
| **Voto** | **anonimizado** | digitado | sem ligação com identidade | indefinido (já anônimo) |

### Dados sensíveis (Art. 5 II)

- **Convicção política** — não coletada diretamente. Os **votos** são
  registrados anonimamente, sem ligação técnica com a identidade do
  eleitor. Não há possibilidade de inferência mesmo com acesso ao banco.
- **Sexo** — coletado em enum binário (M/F). Justificativa: cumprimento
  de obrigação legal (Resolução TSE 23.747/2026 exige sexo na pondera).
  Limitação intencional do enum visa minimização (Art. 6 III).

## 4. Bases legais (Art. 7 LGPD)

| Tratamento | Base legal | Justificativa |
|---|---|---|
| Coleta de CPF, WhatsApp, demográficos | I — **Consentimento** | Checkbox explícito em /votar antes do cadastro |
| Validação anti-fraude (SPC, IP, UA) | II — **Cumprimento de obrigação legal** | Resolução TSE 23.747/2026 exige metodologia auditável |
| Ponderação amostral (sexo×idade×escolaridade) | II — **Cumprimento de obrigação legal** | Resolução TSE 23.747/2026 art. 2 §3 |
| Reuso de CPF da cdl_base do Melhores do Ano | I — **Consentimento original** | Termo de uso do Melhores autoriza tratamento p/ iniciativas CDL |
| Voto anônimo (Sala 2) | — | Não há tratamento de dado pessoal (voto não está ligado a indivíduo) |

## 5. Princípios atendidos (Art. 6 LGPD)

- ✅ **Finalidade específica** (Art. 6 I): pesquisa eleitoral só.
- ✅ **Adequação** (II): dados coletados são proporcionais à finalidade.
- ✅ **Necessidade** (III): mínimo possível — sexo é enum, idade é faixa.
- ⚠️ **Livre acesso** (IV): hoje só via solicitação ao DPO. **TODO:** botão "ver meus dados" igual ao "excluir".
- ✅ **Qualidade dos dados** (V): validação SPC garante CPF correto.
- ✅ **Transparência** (VI): código aberto + /transparencia + /privacidade.
- ✅ **Segurança** (VII): TLS, HMAC, two-room arch, headers OWASP.
- ✅ **Prevenção** (VIII): pentest interno + rate limit + auditoria.
- ✅ **Não-discriminação** (IX): pesquisa, não decisão automatizada.
- ⚠️ **Responsabilização e prestação de contas** (X): docs estão aí; RIPD formal pendente.

## 6. Direitos do titular (Art. 18 LGPD)

| Direito | Como exercer hoje |
|---|---|
| I — Confirmar tratamento | Email dpo@cdlaju.com.br |
| II — Acessar dados | Email dpo@cdlaju.com.br (TODO: endpoint público) |
| III — Corrigir | Email dpo@cdlaju.com.br |
| IV — Anonimizar/bloquear desnecessários | Não aplicável (já anonimizamos no design) |
| V — Portabilidade | Email dpo@cdlaju.com.br |
| **VI — Eliminar** | **✅ `/privacidade/excluir` (público, self-service)** |
| VII — Compartilhamentos | Listados em /privacidade item 6 |
| VIII — Não consentimento | Não cadastrar = não tratado. Revogar = exclusão. |
| IX — Revogar consentimento | Equivale ao Art. 18 VI (excluir) |

## 7. Política de retenção e descarte

| Categoria | Retenção | Mecanismo de descarte |
|---|---|---|
| Votos (Sala 2, já anônimos) | Indefinido | — |
| Identidade (Sala 1) | 6 meses após `edicao.fim` | **TODO:** cron job mensal |
| Logs IP / User-Agent | 90 dias | **TODO:** cron diário |
| Cookies httpOnly | 24h | Browser/servidor (TTL automático) |
| OTP whatsapp_codigos | 30 dias | **TODO:** cron diário |
| cdl_base | Indefinido (com consentimento original) | Exclusão via Art. 18 VI |
| Backups Supabase | 7 dias (Free) → 14 dias (Pro pós-upgrade) | Provedor descarta auto |

⚠️ **Implementar antes do lançamento (set/2026):** cron jobs do Supabase
(scheduled functions) pra rodar diariamente os DELETEs de retenção.
Hoje os dados permaneceriam indefinidamente — não-conforme.

## 8. Compartilhamento com terceiros

| Operador | Função | Dados enviados | Acordo |
|---|---|---|---|
| Vercel Inc. (US) | Hospedagem | Todos (transitam pelo serv) | DPA padrão Vercel |
| Supabase Inc. (US) | Banco de dados | Todos | DPA padrão Supabase |
| Cloudflare Inc. (US) | Anti-bot (Turnstile) | Nenhum dado pessoal direto | DPA padrão Cloudflare |
| SPC Brasil (BR) | Validação CPF | CPF + dados básicos | Contrato CDL vigente |
| Meta Platforms (Ireland) | Envio OTP WhatsApp | Número + código 6 dígitos | DPA WhatsApp Business |

**Transferência internacional** (Art. 33 LGPD): Vercel + Supabase
processam dados em servidores fora do Brasil. Base legal: contratos
com cláusulas padrão (Art. 33 II) + interesse legítimo (operação técnica).

## 9. Medidas técnicas e administrativas (Art. 46)

### Técnicas (já implementadas)

- HTTPS forçado, TLS 1.3, HSTS preload
- CPF hash HMAC-SHA256 com chave secreta server-only
- Dois ambientes separados (Sala 1 / Sala 2) sem chave de junção
- Cookies httpOnly + secure + SameSite=Strict
- Rate limit por IP em ações críticas (login, OTP, exclusão LGPD)
- Headers OWASP: X-Frame-Options DENY, nosniff, Permissions-Policy
- Service role keys apenas em env Vercel (não no código nem no bundle)
- Pentest interno realizado (docs/pentest-2026-05.md)

### Administrativas (pendentes pré-lançamento)

- ⚠️ **Designar DPO formal** em ata de diretoria
- ⚠️ **Treinamento LGPD** dos administradores do painel
- ⚠️ **RIPD (Relatório de Impacto)** formal — recomendado pela ANPD
- ⚠️ **Plano de resposta a incidente** (procedimento se houver vazamento)
- ⚠️ **Cron jobs de descarte** (retenção automática)
- ⚠️ **Auditoria de acesso admin** (log de quem entrou no painel e quando)
- ⚠️ **Backup off-site** (atualmente só Supabase free 7 dias)
- ⚠️ **Upgrade Supabase Pro** ($25/mês) pra backup 14 dias + analytics

## 10. Plano de resposta a incidente

⚠️ **TODO antes do lançamento.** Esboço:

1. **Detecção** — logs admin, alertas de rate limit, monitoramento Supabase.
2. **Contenção** — rotacionar secrets, retirar divulgação de resultados, isolar acesso.
3. **Avaliação** — escopo (quantos titulares afetados), tipo de dado, risco.
4. **Comunicação** — ANPD (Art. 48 LGPD, "em prazo razoável"), titulares afetados, TRE/SE.
5. **Mitigação** — fix técnico, novo pentest, ajuste de processo.
6. **Documentação** — registro do incidente, lições aprendidas.

## 11. Versionamento

- **v1.0** (13/05/2026) — primeira versão. Cobre coleta, retenção, direitos
  do titular, compartilhamento. RIPD formal e DPO ainda pendentes.

Próximas atualizações em commits específicos no repositório público.

## 12. Checklist final pra registro PesqEle

- [x] Política de privacidade pública (`/privacidade`)
- [x] Consentimento explícito em `/votar` (checkbox obrigatório)
- [x] Endpoint de exclusão self-service (`/privacidade/excluir`)
- [x] Documento LGPD interno (este)
- [x] Pentest interno realizado (`docs/pentest-2026-05.md`)
- [x] Arquitetura two-room implementada
- [ ] DPO formalmente designado
- [ ] RIPD formal (Relatório de Impacto)
- [ ] Cron jobs de retenção implementados
- [ ] Plano de resposta a incidente formalizado
- [ ] Upgrade Supabase Pro
- [ ] Backup off-site configurado
- [ ] Treinamento LGPD dos admins
