# Pesquisa Sergipe 2026

Pesquisa eleitoral via internet pra Sergipe, com identificação anti-fraude e voto desvinculado do eleitor.

**Contratante e executor:** CDL Aracaju.
**Registro:** TRE/SE (a ser feito antes da divulgação, conforme Lei 9.504/97 art. 33 + Resolução TSE 23.732/2024).

---

## Por que esse projeto existe

Pesquisas de intenção de voto online costumam ter dois problemas:

1. **Auto-seleção sem controle** — vota qualquer um, várias vezes, de qualquer lugar. Resultado vira "eco câmara" do público de quem divulga.
2. **Falsa promessa de anonimato** — sistemas que armazenam CPF junto com voto técnicamente conseguem ligar uma coisa à outra, mesmo prometendo que "não olham".

Aqui resolvemos os dois:

- **Identidade verificada (1 voto/eleitor):** SPC Brasil + OTP WhatsApp + cota por município contra eleitorado oficial do TSE.
- **Voto realmente desvinculado:** após validação, eleitor entra em "sessão anônima". O servidor não armazena nenhuma ligação entre o CPF e o voto. Auditor que abrir o banco vê duas tabelas que não se conectam.

---

## Arquitetura: as duas salas

```
┌──────────────────────────┐         ┌──────────────────────────┐
│   SALA 1 — VALIDAÇÃO     │         │   SALA 2 — VOTAÇÃO       │
│                          │         │                          │
│ eleitores_pesquisa       │         │ tokens_emitidos          │
│  - cpf_hash              │         │  - token_hash            │
│  - nome_mascarado        │         │  - usado                 │
│  - municipio             │         │  - criado_em (arred. h)  │
│  - spc_validado          │         │                          │
│  - wa_validado           │         │ votos_pesquisa           │
│  - criado_em             │         │  - token_hash            │
│                          │         │  - cargo                 │
│ NÃO TEM COLUNA DE VOTO   │  ╳ ╳ ╳  │  - candidato_id / partido│
│                          │         │  - criado_em (arred. h)  │
└──────────────────────────┘         └──────────────────────────┘
            ▲                                    ▲
            │                                    │
            │  CPF + OTP                         │  cookie httpOnly
            │  ↓                                 │  com token
            │  servidor gera token aleatório     │
            │  → manda só pro navegador          │
            │  (NÃO persiste a ligação)          │
```

A única ponte entre as duas salas é um **cookie httpOnly + secure** no celular do eleitor. O servidor nunca persiste essa ponte.

### Fluxo do eleitor

1. Tela 1 — digita CPF (validado em SPC Brasil).
2. Tela 2 — digita código de 6 dígitos enviado no WhatsApp.
3. **Tela 3 (transição forte)** — fundo muda, ícone de cadeado, mensagem:
   > *"A partir daqui você está numa sessão anônima. Validamos seu CPF e ele foi descartado pra esta etapa. Nem o sistema nem a CDL conseguem ligar seus votos a você."*
4. Telas 4–8 — cédulas:
   - Presidente (1 candidato)
   - Governador (1 candidato)
   - Senador (até 2 candidatos — em 2026 SE elege 2 vagas)
   - Deputado Federal (1 legenda)
   - Deputado Estadual (1 legenda)
5. Tela final — "voto registrado". Sem nome, sem "olá fulano", sem menu logado.

### E se a aba fechar antes do voto?

- Sala 1 sabe que o CPF se cadastrou (sem nenhum token registrado).
- Eleitor reabre, digita CPF → sistema reconhece, **pula o OTP** e gera **token novo**.
- Token antigo fica órfão (não usado, irrelevante pra contagem).
- Como a ligação CPF↔token nunca foi persistida, gerar um novo não vaza nada.

---

## Cargos e cédulas

| Cargo | Tipo | Vagas SE 2026 | O que armazena |
|---|---|---|---|
| Presidente | candidato | 1 (nacional) | candidato_id |
| Governador | candidato | 1 | candidato_id |
| Senador | candidato (até 2) | 2 | candidato_id × 2 |
| Deputado Federal | legenda | 8 | partido_id |
| Deputado Estadual | legenda | 24 | partido_id |

**Projeção de cadeiras (Federal e Estadual):** depois de fechada a coleta, o sistema aplica fórmula real do TSE:
- Quociente Eleitoral (QE) = votos válidos / nº de cadeiras
- Quociente Partidário (QP) = votos do partido / QE
- Sobras por maiores médias (D'Hondt)
- Cláusula de barreira federal (3% nacional, art. 17 §3º CF) — informativa, já que pesquisa é estadual
- Cláusula de barreira local (80% do QE pra distribuição de sobras)

Manchete potencial: *"PT projetado pra eleger 2 cadeiras na Federal, PL pra 2, União pra 1"* — bem mais útil que só percentual.

---

## Anti-fraude

| Sinal | Onde | Bloqueia? |
|---|---|---|
| CPF inválido / sequencial | SPC Brasil na sala 1 | ✅ rejeita |
| Mais de 2 CPFs por dispositivo | `device_fingerprint` na sala 1 | ✅ rejeita |
| Cota do município atingida | conta `eleitores_pesquisa` por município vs eleitorado TSE | ✅ rejeita |
| Cadastro sem OTP confirmado | `wa_validado = false` | ✅ não emite token |
| Rajada de cadastros do mesmo IP | rate limit (5/5min) | ✅ throttle |
| Bot/scraping | Cloudflare Turnstile | ✅ bloqueia |
| Análise pós-coleta | view de risco por candidato (estilo do Melhores do Ano) | ⚠️ flag pra revisão |

---

## Cronograma

| Quando | O quê |
|---|---|
| **+6 semanas** (~jun/2026) | **Piloto:** 1 dia, 500 cadastros, sem divulgação. Estressa fluxo + UX + cápsula. |
| **set/2026** | Reunião com advogado eleitoral. Trava material divulgável. |
| **set–out/2026** | Versão final + cota por município contra eleitorado TSE. |
| **~2 sem antes da eleição** | Registro formal no TRE/SE (5 dias mínimo, mas dá margem). |
| **D-3 da eleição** | Abre coleta (3 dias). |
| **D-2 da eleição** | Divulgação. |

---

## Stack

- Next.js 16 + TypeScript + Tailwind (mesma do `Melhores do Ano`, time conhece)
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Hospedagem: Vercel
- Cloudflare Turnstile (anti-bot)
- WhatsApp Business API (OTP via Meta Cloud)
- SPC Brasil (validação CPF)

---

## Status

Projeto em estruturação. **Não rodar em produção ainda.**

**Próximos passos imediatos:**
1. `npm install` na raiz
2. Criar projeto Supabase e rodar `supabase/migrations/001-schema-base.sql`
3. Configurar `.env.local` (ver `.env.example`)
4. `npm run dev`
