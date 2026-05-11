<p align="center">
  <img src="public/cdl-logo.png" alt="CDL Aracaju" width="160" />
</p>

# Pesquisa Sergipe 2026

Pesquisa eleitoral via internet pra Sergipe, com identidade verificada, voto desvinculado do eleitor e metodologia espontânea estilo urna.

**Contratante e executor:** CDL Aracaju.
**Registro:** TRE/SE via PesqEle, conforme Lei 9.504/97 art. 33 + Resolução TSE 23.747/2026 (publicada em 26/02/2026).

> **Documento técnico completo (legislação, plano amostral, ponderação, k-anonymity, cronograma):** [`docs/metodologia.md`](docs/metodologia.md).

---

## Por que esse projeto existe

Pesquisas de intenção de voto online costumam ter dois problemas:

1. **Auto-seleção sem controle** — vota qualquer um, várias vezes, de qualquer lugar. Resultado vira eco-câmara de quem divulga.
2. **Falsa promessa de anonimato** — sistemas que armazenam CPF junto com voto técnicamente conseguem ligar uma coisa à outra, mesmo prometendo que "não olham".

Aqui resolvemos os dois:

- **Identidade verificada (1 voto/eleitor):** allowlist da `cdl_base` (votantes do Melhores do Ano da CDL Aracaju, ~50k CPFs) + SPC Brasil pra novos cadastros + OTP via WhatsApp + cota por município contra eleitorado oficial do TSE + ponderação por sexo, faixa etária e escolaridade conforme Resolução TSE 23.747/2026.
- **Voto realmente desvinculado:** após validação, eleitor entra em "sessão anônima" (cápsula). O servidor não armazena nenhuma ligação entre o CPF e o voto. Auditor que abrir o banco vê duas tabelas que não se conectam.

---

## Arquitetura: as duas salas

```
┌──────────────────────────┐         ┌──────────────────────────┐
│   SALA 1 — VALIDAÇÃO     │         │   SALA 2 — VOTAÇÃO       │
│                          │         │                          │
│ eleitores_pesquisa       │         │ tokens_emitidos          │
│  - cpf_hash              │         │  - token_hash            │
│  - municipio             │         │  - usado                 │
│  - sexo, faixa, escol.   │         │  - criado_hora (h cheia) │
│  - spc_validado          │         │                          │
│  - wa_validado           │         │ votos_pesquisa           │
│  - fonte (cdl_base/spc)  │         │  - token_hash            │
│  - criado_em             │         │  - cargo                 │
│                          │         │  - candidato_id / partido│
│ NÃO TEM COLUNA DE VOTO   │  ╳ ╳ ╳  │  - metodo (numero/branco)│
│                          │         │  - criado_hora (h cheia) │
└──────────────────────────┘         └──────────────────────────┘
            ▲                                    ▲
            │                                    │
            │  CPF + OTP                         │  cookie httpOnly+secure
            │  ↓                                 │  com token aleatório
            │  servidor gera token               │
            │  → manda só pro navegador          │
            │  (NÃO persiste a ligação)          │
```

A única ponte entre as duas salas é um **cookie httpOnly + secure** no navegador do eleitor (`Path=/votar`, `SameSite=Strict`, sessão sem `maxAge`). O servidor nunca persiste essa ponte. `criado_hora` em ambas as tabelas é truncado para a hora cheia, de modo que correlações minuto-a-minuto não permitem reidentificação.

### Fluxo do eleitor

1. **`/votar`** — digita CPF. Hash → busca em `cdl_base` (hit pula SPC). Miss chama SPC Brasil.
2. **`/votar/confirma`** — confirma ou preenche município, WhatsApp, sexo, faixa etária, escolaridade. Cota do município é checada aqui.
3. **`/votar/otp`** — digita o código de 6 dígitos enviado no WhatsApp.
4. **`/votar/anonimo`** — *transição forte:* fundo muda, ícone de cadeado:
   > *"A partir daqui você está numa sessão anônima. Validamos seu CPF e ele foi descartado pra esta etapa. Nem o sistema nem a CDL conseguem ligar seus votos a você."*
5. **`/votar/cedula/[cargo]`** — cinco cédulas estilo urna eletrônica:
   - Presidente (1 candidato, número)
   - Governador (1 candidato, número)
   - Senador (até 2 candidatos, número)
   - Deputado Federal (1 legenda, 2 dígitos)
   - Deputado Estadual (1 legenda, 2 dígitos)

   Cédula é **espontânea pura** (não exibe lista de candidatos). Eleitor digita o número, sistema mostra foto + nome + partido pra ele confirmar — espelho da urna real. Botões de "voto em branco" e "não sei / não votar nesse cargo" disponíveis.

6. **`/votar/obrigado`** — voto registrado. Sem "olá fulano", sem menu, sem sessão persistente.

### E se a aba fechar antes do voto?

- Sala 1 só guarda o registro depois que o OTP confirma — antes disso, nada persiste no banco.
- Eleitor reabre, digita CPF → sistema reconhece o cadastro pendente, gera **token novo**.
- Como a ligação CPF↔token nunca foi persistida, gerar um novo não vaza nada.

---

## Cargos e cédulas

| Cargo | Tipo | Vagas SE 2026 | O que armazena |
|---|---|---|---|
| Presidente | candidato (número) | 1 (nacional) | `candidato_id` |
| Governador | candidato (número) | 1 | `candidato_id` |
| Senador | candidato (até 2 números) | 2 | `candidato_id × 2` |
| Deputado Federal | legenda (2 dígitos) | 8 | `partido_id` |
| Deputado Estadual | legenda (2 dígitos) | 24 | `partido_id` |

**Projeção de cadeiras (Federal e Estadual):** depois de fechada a coleta, o sistema aplica fórmula real do TSE — Quociente Eleitoral, Quociente Partidário, sobras por maiores médias, cláusula de barreira de 80% do QE. Manchete potencial: *"PT projetado pra eleger 2 cadeiras na Federal, PL pra 2, União pra 1"*.

---

## Anti-fraude

| Sinal | Onde | Bloqueia? |
|---|---|---|
| CPF inválido (formato/checksum) | Sala 1, antes de hash | ✅ rejeita |
| CPF não está em `cdl_base` nem passa SPC | Sala 1 | ✅ rejeita |
| CPF já cadastrado nesta edição | Sala 1, lookup `eleitores_pesquisa` | ✅ rejeita |
| Cota do município atingida | Sala 1, comparação com `municipios_se.cota_pesquisa` | ✅ rejeita |
| Cadastro sem OTP confirmado | `wa_validado = false` | ✅ não emite token |
| Mais de 2 CPFs por dispositivo | `device_fingerprint` na Sala 1 | ✅ rejeita |
| Rajada de cadastros do mesmo IP | rate limit (5/5min) na `rate_limit_ip` | ✅ throttle |
| Bot/scraping | Cloudflare Turnstile no `/votar` | ✅ bloqueia |
| Análise pós-coleta (cluster suspeito) | view de risco | ⚠️ flag manual |

---

## Cronograma

| Quando | O quê |
|---|---|
| **maio–jul/2026** | Desenvolvimento. Integrações reais (SPC, Meta WA, Turnstile). Import da `cdl_base`. Contratação de estatístico CONRE. |
| **ago/2026** | **Piloto fechado.** Link com código de convite, ~50 testers conhecidos. Estressa o sistema sob condições reais sem divulgar publicamente. |
| **ago/2026 (após piloto)** | Reunião com advogado eleitoral. Trava material divulgável e questionário. |
| **set/2026** | Registro no PesqEle (≥ 5 dias antes da divulgação). |
| **set/2026** | Coleta principal + divulgação. |
| **04/out/2026** | 1º turno das eleições. |

---

## Stack

- Next.js 16 + React 19 + TypeScript + Tailwind v4
- Supabase (Postgres + Auth + Storage)
- Vercel (hospedagem)
- Cloudflare Turnstile (anti-bot)
- WhatsApp Business Cloud API — Meta (OTP)
- SPC Brasil (validação CPF pra novos cadastros fora da `cdl_base`)

---

## Status

Projeto em estruturação. **Não rodar em produção ainda.** Etapa atual: tela `/votar` (entrada de CPF) implementada. Próximas etapas: `/votar/confirma`, `/votar/otp`, cápsula, cédulas estilo urna.

**Próximos passos pra rodar localmente:**

1. `npm install` na raiz.
2. Criar projeto Supabase novo (não compartilhar com outros produtos).
3. Rodar as migrations no SQL Editor, em ordem:
   - `supabase/migrations/001-schema-base.sql`
   - `supabase/migrations/002-cdl-base-e-metodo.sql`
   - `supabase/migrations/003-demograficos.sql`
4. Copiar `.env.example` para `.env.local` e preencher (especialmente `SUPABASE_SERVICE_ROLE_KEY`, `CPF_HASH_SECRET`, `TOKEN_VOTO_SECRET`, `JWT_SECRET`).
5. `DEV_MODE=true` no `.env.local` durante desenvolvimento — faz stub de SPC e devolve OTP no log do servidor.
6. Inserir uma `edicao` ativa de teste e ao menos um município:
   ```sql
   insert into edicao (nome, inicio, fim, ativa)
   values ('Teste de fluxo', now(), now() + interval '30 days', true);

   insert into municipios_se (ibge_codigo, nome, zona_expansao, eleitorado)
   values (2800308, 'Aracaju', true, 470000)
   on conflict (ibge_codigo) do nothing;
   ```
7. `npm run dev` → http://localhost:3000.

---

## Documentação

- [`docs/metodologia.md`](docs/metodologia.md) — base legal, plano amostral, ponderação, k-anonymity, anti-fraude, cronograma. Insumo direto pro registro no PesqEle.
- [`AGENTS.md`](AGENTS.md) — convenções pra agentes de IA contribuírem com o código.
