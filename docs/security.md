# Modelo de ameaças · Pesquisa Sergipe 2026

Documento técnico — anexo do registro PesqEle / auditoria. **Atualizado em 13/09/2026** (2ª edição, coleta 13–20/09/2026). Descreve só os controles que existem no código.

## Resumo

Pesquisa eleitoral via internet, identidade verificada (CPF + WhatsApp),
voto desvinculado do eleitor por arquitetura de duas salas. Operada pela
CDL Aracaju, hospedada na Vercel, banco no Supabase, integrações SPC
Brasil + Meta WhatsApp Business + Cloudflare Turnstile.

## Atacantes considerados

| Perfil | Capacidade | Motivação |
|---|---|---|
| **Bot scraper** | Automação simples, sem identidade real | Distorcer resultado / criar viés |
| **Operador de campanha** | Acesso a planilha de CPFs reais (vazada ou comprada) | Inflar 1 candidato |
| **Atacante técnico** | Conhecimento de webapp / pentest | Vazar dados, derrubar app, vincular voto→CPF |
| **Insider CDL** | Acesso ao painel admin | Adulterar resultado em tempo real |
| **Insider Vercel/Supabase** | Acesso ao infra | Acesso direto aos dados |

## Mitigações implementadas

### Identidade verificada (1 voto/eleitor)

- **CPF + dígito verificador validados** localmente (checksum).
- **CPF hash** com HMAC-SHA256 (`CPF_HASH_SECRET` no env, nunca em código).
- **Cadastro `cdl_base`** ou **consulta cadastral ao SPC Brasil** (`lib/spc.ts`): devolve nome, situação cadastral do CPF, data de nascimento, nome da mãe, estado civil e endereço; o retorno fica em `cdl_base` (migrations 050/051). A consulta é feita ao SPC Brasil, não a órgão público.
- **OTP de 6 dígitos via WhatsApp** (Meta Business Cloud API) — garante posse do número.
- **TENTATIVAS_MAX = 3** por código emitido; expira em 10min.
- **Teto por CPF:** 3 códigos OTP a cada 15 min.
- **IP no fluxo do eleitor: só registro** (`registrarTentativaIp` em `lib/rate-limit.ts`) — **não há bloqueio por IP** (CGNAT reúne milhares de eleitores num IP; decisão de 12/09/2026). O rate limit bloqueante permanece apenas no login admin (`admin_login`) e na exclusão LGPD (`lgpd_excluir`).
- **`unique (edicao_id, cpf_hash)`** em `eleitores_pesquisa` — **CPF único por edição**; Postgres bloqueia duplicado.
- **Janela de coleta travada no servidor** (`lib/edicao-janela.ts`): OTP e voto recusados fora de `inicio`/`fim`.
- **Localização por IP/GPS** (`lib/geo-sergipe.ts`) só quando `edicao.exigirLocalizacao` — **desligada na 2ª edição**.

### Anti-bot

- **Cloudflare Turnstile** no `/votar` (substituto privacy-preserving do reCAPTCHA).
- **Bloqueio de navegação anônima/privativa** no cadastro (`app/votar/actions.ts`, código `navegador_anonimo`).
- **Device fingerprint** colhido client-side — **só armazenado**; não há limite de CPFs por dispositivo.
- **User-agent + IP** registrados em `eleitores_pesquisa` (auditoria; retenção de 6 meses após o fim da edição).

### Duas salas (anonimato arquitetural)

- **Sala 1** (`eleitores_pesquisa`): CPF hash, demográficos, IP, user-agent. **SEM voto**.
- **Sala 2** (`votos_pesquisa`): token hash + voto. **SEM CPF, SEM IP**.
- Única ponte é o **token aleatório de 24 bytes** que vive só no cookie do navegador (httpOnly, secure, SameSite=Strict, Path=/votar, 24h TTL). O servidor **não persiste** essa ligação.
- **`criado_hora` truncado pra hora cheia** em `votos_pesquisa` — impede correlação minuto-a-minuto.
- Quem ganhou acesso ao banco vê duas tabelas que não se conectam.

### Defesa contra SQL injection / XSS

- Queries SQL parametrizadas via `@supabase/supabase-js` (não há concatenação de strings).
- React faz HTML escape por default — nomes/textos vão como `{children}`, nunca via `dangerouslySetInnerHTML`.
- **Server Actions com proteção CSRF nativa** do Next 16 (origin check automático).
- **Cookie de sessão admin** signed JWT (HMAC-SHA256 com `JWT_SECRET`).

### Headers de segurança (next.config.ts)

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — HTTPS forçado por 2 anos.
- `X-Frame-Options: DENY` — bloqueia clickjacking via iframe.
- `X-Content-Type-Options: nosniff` — bloqueia MIME sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` — não vaza path em refer pra terceiros.
- `Permissions-Policy: camera=() geolocation=() ...` — nega APIs sensíveis por default.
- `X-Robots-Tag: noindex, nofollow` — search engines não indexam (Resolução 23.747/2026).

### Painel admin

- **Senha forte + TOTP** (Google Authenticator, opcional via env `ADMIN_TOTP_SECRET`).
- **Cookie httpOnly signed** com TTL 8h.
- Toda mutação passa por **Server Action** (não tem REST API exposta).
- TOTP usa janela ±1 step (30s) pra absorver clock skew — `timingSafeEqual` na comparação.

### Retenção (`app/api/cron/retencao/route.ts`, diário)

- Códigos OTP (`whatsapp_codigos`): 30 dias.
- `rate_limit_ip`: 24 horas.
- Sala 1 (`eleitores_pesquisa`, inclusive IP, user-agent e fingerprint): 6 meses após `edicao.fim`.
- `cron_log` e `admin_audit_log`: 1 ano.

### Logs e dados sensíveis

- **Nenhum log de CPF cru** (sempre hash).
- **Nenhum log de OTP em produção** (só DEV_MODE=true imprime no console).
- **Nenhum log de token de voto** (cookie é volátil).
- `console.error` em fluxos com erro logam mensagem da exceção, não payload.

## Riscos conhecidos / aceitos

### 1. Atacante com acesso à `cdl_base` original (Melhores do Ano)

A `cdl_base` foi importada de `votantes` do Melhores do Ano (~44k CPFs validados). Se um atacante conseguir essa planilha e os respectivos WhatsApps, pode em tese tentar votar por essas pessoas.

**Mitigações:** consulta cadastral ao SPC (CPF tem que estar regular), OTP via WhatsApp do dono real (não do atacante), TENTATIVAS_MAX no OTP, teto de 3 códigos por CPF a cada 15 min, bloqueio de navegação anônima, IP e device fingerprint apenas armazenados pra auditoria (não bloqueiam — CGNAT reúne milhares de eleitores num IP; decisão de 12/09/2026).

**Aceito** — risco residual baixo dado custo de obter CPF+WhatsApp pareados em escala.

### 2. Atacante com acesso ao SERVICE_ROLE_KEY do Supabase

Esse key dá acesso total ao banco. Vive apenas em variáveis de ambiente do Vercel (acessível só ao processo do servidor).

**Mitigações:** rotação periódica do key, logs de acesso à Supabase, RLS rules futuras.

**Aceito** — atacar a Vercel/Supabase é fora do escopo de pentest webapp. Em caso de comprometimento, rotacionar key e auditar logs.

### 3. PostCSS transitiva (vuln moderate — XSS via CSS Stringify)

`npm audit` reporta moderate em postcss usada por Next durante build. Como é build-time (não runtime), risco prático é mínimo. Downgrade do Next pra 9.x não vale.

**Aceito** — monitorar próximas atualizações do Next.

### 4. Correlação estatística via timestamps

Mesmo com `criado_hora` truncado em `votos_pesquisa`, um atacante que tenha acesso simultâneo a Sala 1 + Sala 2 + Vercel logs pode tentar correlacionar:
- Eleitora X cadastrou às 14:53:21 (Sala 1, hora completa).
- Voto Y foi inserido às 14:00:00 (Sala 2, hora truncada).
- Se forem poucos eleitores naquela hora, há matching plausível.

**Mitigações:** `criado_hora` truncada pra hora cheia (não minuto/segundo) já dificulta. Logs do Vercel rotacionam.

**Aceito** — atacante precisa ter SERVICE_ROLE_KEY + Vercel logs simultaneamente.

### 5. Ausência de bloqueio por IP e por dispositivo

Um atacante com muitos pares CPF+WhatsApp válidos não é freado por IP nem por fingerprint — só pelo OTP no telefone do dono e pelo CPF único por edição.

**Mitigações:** IP, user-agent e fingerprint ficam registrados e alimentam a análise pós-coleta (`/admin/amostra`, views de risco); clusters suspeitos vão a revisão manual antes da ponderação.

**Aceito** — bloqueio por IP puniria eleitores legítimos atrás de CGNAT; não há cota.

## Pendências

- [ ] **CSP (Content-Security-Policy)** — montar allowlist fechada (Vercel + Supabase + Turnstile + Wikipedia upload domain). Não fiz ainda porque exige pentest pra validar sem quebrar.
- [ ] **Pentest profissional** — Tempest/Conviso/Hackrocks pra revisar antes do registro PesqEle.
- [ ] **Bug bounty** — abrir programa público após hardening.
- [ ] **Rotação de secrets** — protocolo de rotação trimestral pra `CPF_HASH_SECRET`, `JWT_SECRET`, `TOKEN_VOTO_SECRET`.
- [ ] **Backup off-site** — replicar Supabase pra outro provider.

## Auditoria de dependências

```
npm audit
```

Atualizar trimestralmente. Vulnerabilidades severity ≥ moderate devem ser corrigidas em até 7 dias após disclosure pública.

## Contato

Em caso de descoberta de vulnerabilidade, contatar **CDL Aracaju** via:
- Email: presidencia@cdlaju.com.br
- Telefone institucional: (79) 3212-7700

Disclosure responsável: três meses entre report e divulgação pública. CDL compromete-se a corrigir vulnerabilidades críticas em até 48h.
