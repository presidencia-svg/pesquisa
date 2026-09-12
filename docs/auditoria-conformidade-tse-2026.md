# Auditoria de conformidade — Pesquisa Eleitoral Sergipe 2026 × Res.-TSE 23.600/2019 (red. Res. 23.747/2026)

> Revisão estrutural da plataforma feita em 12/09/2026, depois da Rp 0601015-42.2026.6.25.0000
> (TRE-SE), cuja causa foi a divergência entre a ponderação **registrada** no PesqEle
> (município × sexo × faixa etária × instrução) e a **aplicada** na divulgação de 04/09
> (só município, migration 045). Objetivo: cada exigência da Resolução e da Lei 9.504/97
> mapeada pra um controle concreto no código, no banco ou no rito — e nada prometido no
> registro que a plataforma não faça.
>
> Estado no momento da auditoria: site OFF (`lib/site-desabilitado.ts`), tutela em vigor,
> edição ativa `2c9211d1…` com `ponderacao_metodo = 'municipio'`, execução de raking
> `73aebc19…` gravada e **não aprovada**. Nada aqui foi deployado nem commitado.
>
> Legenda de dono: **P** = plataforma (código/banco, já feito ou a fazer pelo time técnico);
> **E** = estatístico responsável (CONRE 8223); **A** = advogado.
> Prioridade: **P0** bloqueia a próxima divulgação; **P1** antes da próxima edição;
> **P2** melhoria.

## 0. 2ª edição (13–20/09/2026) — situação em 13/09/2026

**Coleta:** 13/09/2026 00h00 a 20/09/2026 23h59 (horário de Aracaju), travada no servidor. Site religado em 13/09/2026 sem nenhum resultado publicado.

**Registro (Lei 9.504/97, art. 33):** **pendente**. Será efetuado quando a amostra atingir 20 mil eleitores e sempre antes de qualquer divulgação, nos dois registros (TRE-SE para os cargos estaduais; TSE para Presidente), com a declaração do estatístico responsável indicado no registro da edição. O gate de divulgação (`app/admin/(autenticado)/edicoes/actions.ts`) recusa divulgar sem `data_registro_pesqele` + 5 dias. Nenhuma peça pública cita o número de participantes.

**Amostra por adesão (Res.-TSE 23.600/2019, red. 23.747/2026, art. 2º, § 7º, III e IV):** recrutamento por convite via WhatsApp às bases da CDL Aracaju (com opt-out) e divulgação aberta; sem cota; após a coleta, complementação com respondentes por município e composição da amostra/ponderação (`scripts/gerar-complementacao-pesqele.mjs`). Margem indicativa (nominal e efetiva) calculada como se a amostra fosse probabilística e assim declarada.

**Ponderação:** raking município × sexo × faixa etária × grau de instrução, parâmetro TSE 2026 (`perfil_eleitor_secao_2026_SE`, geração 14/07/2026: 1.740.124 eleitores; 1.740.116 nos estratos), função SQL `ponderar_estratos_raking`, execução auditada e aprovada pelo estatístico antes da divulgação. Renda coletada em salários mínimos, só descritiva. Sexo cadastral (perguntado só quando ausente, `sexo_fonte`); faixa etária cadastral; escolaridade em 4 opções agregadas em 3 estratos; eleitor de outra UF só Presidente, peso zero nos recortes estaduais; 16–17 anos com título obrigatório.

**Controles descritos = controles em vigor:** consulta cadastral ao SPC Brasil ou `cdl_base`, OTP WhatsApp, Turnstile, bloqueio de navegação anônima, CPF único por edição, janela no servidor; IP/user-agent/fingerprint apenas registrados; localização desligada nesta edição; sem cota, sem bloqueio por IP, sem limite por dispositivo.

**Histórico neutro da 1ª edição:** coleta 01–03/09/2026; registros SE-09441/2026 (TRE-SE) e BR-04041/2026 (TSE) em 22/08/2026; divulgação em 04/09/2026; divulgação suspensa por tutela do TRE-SE em 07/09/2026 (Rp 0601015-42.2026.6.25.0000), cuja causa foi a divergência entre a ponderação registrada e a aplicada; site fora do ar de 08/09 até o religamento em 13/09/2026. Esses números de registro pertencem só à 1ª edição e não são reutilizados.

> As seções seguintes registram a auditoria de 12/09/2026, feita sobre a 1ª edição e sobre a plataforma antes do religamento.

## 1. Sumário executivo

| # | Achado | Estado | Prioridade | Dono |
|---|---|---|---|---|
| 1 | Ponderação divulgada ≠ ponderação registrada (causa da Rp) | **Corrigido na plataforma**: raking nas 4 marginais executado no banco (migration 048), execução auditada, aprovação do estatístico e gate de divulgação. Falta aprovar a execução e definir o método na edição. | P0 | P ✅ / E ⏳ |
| 2 | Margem de erro publicada só nominal, sem efeito da ponderação | **Corrigido**: margem efetiva (Kish) calculada por execução e publicada em ficha, TV, PesqEle; verificador confere app × banco. | P0 | P ✅ |
| 3 | PesqEle/transparência descreviam controles que o código não aplica (limite por dispositivo, bloqueio de anônimo, cota por município) | **Corrigido nos textos** (transparência, privacidade, docs, README). Registro no PesqEle ainda traz o texto antigo → retificar na complementação. | P0 | P ✅ / A ⏳ |
| 4 | Coleta não travada pelo período registrado no servidor | **Corrigido**: OTP e gravação do voto recusam fora de `inicio`/`fim`. | P1 | P ✅ |
| 5 | Sem trilha da execução/aprovação da ponderação e da complementação do registro | **Corrigido**: ações TOTP + `admin_audit_log`; datas na edição; botão Divulgar exige tudo. | P0 | P ✅ |
| 6 | Sem monitoramento da amostra × eleitorado durante a coleta (deff 8 só foi visto depois) | **Corrigido**: `/admin/amostra` (razão por categoria, peso implícito, n_eff da execução). | P1 | P ✅ |
| 7 | Variante de ponderação e assinatura do estatístico nos docs 04/13/16/17 | **Variante C (raking às 4 marginais, sem aparo) mantida** — decisão da entidade em 12/09/2026, coincidente com a recomendação do doc. 16 (seção 10) e com o doc. 17 já redigido; é a variante que a plataforma executa. Falta a assinatura do estatístico. | P0 | E |
| 8 | Texto da complementação (art. 2º §7º III/IV) e ficha do art. 10 pra lançar no PesqEle nos dois registros (SE e BR) | Gerador pronto (`scripts/gerar-complementacao-pesqele.mjs`); rascunho exige execução aprovada | P0 | P ✅ / E / A |
| 9 | Revogação da tutela antes de religar o site e republicar | Pendente (judicial) | P0 | A |
| 10 | Prazo de 5 dias do registro (art. 33 §1º) e alterações do plano só com novo registro | Rito documentado; plataforma não deixa alterar `inicio`/`fim`/registro de edição divulgada | P1 | P ✅ / A |

## 2. Mapa exigência → estado → gap

### 2.1 Registro (Lei 9.504/97 art. 33; Res. art. 2º)

| Exigência | Onde está na plataforma | Gap / providência | Prio | Dono |
|---|---|---|---|---|
| I — contratante e CNPJ | `edicao.contratante` → ficha pública, TV, PesqEle | — | — | — |
| II — valor e origem dos recursos | `edicao.valor`, `edicao.origem_recursos` → ficha | — | — | — |
| III — metodologia e período | `edicao.inicio`/`fim` (registrados) + `docs/metodologia.md` + campo 2 do PesqEle | Período agora é **travado no servidor** (`lib/edicao-janela.ts`; OTP e voto recusam fora dele). Alteração de período em edição divulgada é bloqueada nas Server Functions. | P1 | P ✅ |
| IV — plano amostral e ponderação (sexo, idade, instrução, nível econômico, área física) | Raking município×sexo×faixa×instrução no banco (`ponderar_estratos_raking`); nível econômico coletado, não pondera (sem parâmetro TSE) — declarado no campo 2 | Nível econômico: manter declaração explícita de que não pondera e por quê. Área física = domicílio eleitoral declarado (pesquisa online). | P0 | P ✅ / E confirma |
| V — sistema interno de controle e verificação | `docs/metodologia.md` §4 (tabela "o que o código faz"), `admin_audit_log`, `npm run verificar:resultados`, `/admin/amostra` | Texto do PesqEle (campo 3) reescrito pra listar só o que existe. | P0 | P ✅ / A lança |
| VI — questionário completo | `docs/Questionario-Pesquisa-Sergipe-2026.pdf`, cédulas em `cargos`/`candidatos` | Conferir que a ordem/rotulagem no app é a do questionário registrado (nada mudou desde a 1ª edição). | P1 | P |
| VII — nome do estatístico e CONRE | `edicao.estatistico_nome`, `edicao.conre` → ficha pública + `ponderacao_aprovada_por` | Aprovação da execução com nome + CONRE + TOTP fica no log. | P0 | E ⏳ |
| VIII — municípios e distribuição geográfica | `municipios_se` (75), `v_amostra_marginais` (município), complementação bloco III | Gerador emite lista completa "município — eleitorado / respondentes". | P0 | P ✅ |
| IX/X — pesquisa nacional/estadual: registro nos dois (BR + SE) | `edicao.registro = "SE-09441/2026 · BR-04041/2026"` | Complementação e qualquer retificação têm de ir **nos dois** registros. | P0 | A |
| §7º III/IV — complementação após a coleta (respondentes por município; composição da amostra e ponderação) | `scripts/gerar-complementacao-pesqele.mjs` + `registrarComplementacaoPesqele` (TOTP, data na edição) | Só gera com execução aprovada; Divulgar exige a data registrada. | P0 | P ✅ / E / A |
| §7º-C — divulgação de pesquisa por adesão/online: identificar como tal | Ficha pública "amostra por adesão com identidade verificada", margem nominal **e** efetiva | — | — | P ✅ |
| Art. 10 — informações obrigatórias na divulgação | `lib/resultados-data.ts` (meta), `components/resultados-dashboard.tsx`, TV, transparência; gerador emite "ficha do art. 10" em texto | Conferir nas peças de imprensa/redes (fora da plataforma) que a ficha completa acompanha — sem números de participação. | P0 | A / comunicação |
| Art. 13 §§8/9 — não divulgar antes do registro estar público; 5 dias | Gate de divulgação exige `data_registro_pesqele` + 5 dias ≤ hoje | — | — | P ✅ |
| Art. 16/17 — dados completos à disposição da Justiça Eleitoral; sigilo dos respondentes | `scripts/exportar-dados-pericia.mjs` (sem PII), k-anonymity nas views públicas, `docs/lgpd.md` | Manter exportação reprodutível por execução (`ponderacao_execucao_id`). | P1 | P |

### 2.2 Ponderação e margem (núcleo da Rp)

| Ponto | Antes (HEAD `ed8cbb5`, divulgação 04/09) | Agora | Dono |
|---|---|---|---|
| Método aplicado | pós-estratificação por município (045) | raking 4 marginais no banco (048), alvo = `eleitorado_tse_estratos` (TSE 2026, importação auditada) | P ✅ |
| Onde calcula | views SQL (município) | função SQL `ponderar_estratos_raking` — base completa, nunca páginas de 1.000 | P ✅ |
| Rastro | nenhum | `ponderacao_execucao` (iterações, convergência, Σw, Σw², n_eff, deff, pesos mín/med/p95/p99/máx, alvos, amostra, parâmetros) + `pesos_celula` + `admin_audit_log` | P ✅ |
| Aprovação | não existia | `aprovarPonderacao` (nome+CONRE, TOTP, posterior à execução; zerada a cada nova execução) | P ✅ / E ⏳ |
| Método da edição | fixo | `edicao.ponderacao_metodo` ('municipio' legado / 'estratos_raking'), TOTP | E decide / P executa |
| Margem publicada | só nominal | nominal + efetiva (Kish) — `lib/resultados-data.ts`, TV, ficha, PesqEle | P ✅ |
| Conferência | `verificar:resultados` (só município) | método-aware: confere view certa, convergência, margem efetiva, n_eff | P ✅ |
| Reprodutibilidade | doc. 16 gerado por script ad hoc | `scripts/ponderar-estratos.mjs --comparar docs/juridico/rp-0601015-42/ponderacao-completa.json` — exit 1 se divergir de kish.C | P ✅ |
| Variante | — | **C (raking puro), decidida em 12/09/2026** — é a que `ponderar_estratos_raking` executa; B/B5/D (aparo de pesos) ficam só como análise de sensibilidade no doc. 16 e não precisam de código novo. | Decidido; E assina |
| Qualidade da amostra | deff ≈ 8 descoberto na perícia | `/admin/amostra` durante a coleta; regra prática: razão < 0,5 ou > 2 em qualquer categoria → redirecionar convites | E / campo |

### 2.3 Controles descritos × controles em vigor

| Controle | Descrito no PesqEle (08/2026) | Código (HEAD `ed8cbb5`) | Agora |
|---|---|---|---|
| CPF válido + SPC/`cdl_base` | sim | sim | sim |
| OTP WhatsApp, número único | sim | sim | sim |
| 1 voto por CPF (HMAC) | sim | sim | sim |
| Turnstile | sim | sim | sim |
| Rate-limit por IP | sim | sim | **retirado do fluxo do eleitor em 12/09** (CGNAT); IP só registrado; teto por CPF (3 códigos/15 min) |
| "máximo 2 CPFs por dispositivo" | **sim** | **não** (fingerprint só armazenado — `app/votar/confirma/actions.ts`) | texto corrigido em tudo; não prometer |
| "bloqueio em navegação anônima" | **sim** | **não existe** | texto corrigido |
| "cotas por município" | **sim** | só se `cota_pesquisa > 0` (estava vazio) | texto corrigido: sem cota bloqueante, corrige na ponderação |
| Janela de coleta no servidor | não descrito | **não** | **sim** (`lib/edicao-janela.ts`) |
| Log de auditoria admin | sim | sim (parcial) | + execução/aprovação/método/complementação/divulgação/LGPD/amostra |

Providência jurídica: a complementação do art. 2º §7º deve **retificar** o campo 3 do registro
(texto novo em `docs/pesqele-dados-complementares.md`), nos dois registros.

### 2.4 Rito de divulgação (o que o botão Divulgar exige — `app/admin/(autenticado)/edicoes/actions.ts`)

1. `fim` no passado (coleta encerrada).
2. `data_registro_pesqele` + 5 dias ≤ hoje.
3. Se método `estratos_raking`: `ponderacao_execucao_id` aponta execução **convergida**, executada **após** `fim`, com a **importação mais recente**.
4. `ponderacao_aprovada_em` posterior à execução, com `ponderacao_aprovada_por` preenchido.
5. `complementacao_pesqele_em` preenchida (data em que III/IV foram lançados no PesqEle).
6. TOTP do administrador; tudo em `admin_audit_log`.
7. Antes do deploy: `npm run verificar:resultados` verde.
8. Site ligado só via botão auditado de retomada, após revogação da tutela (A).

### 2.5 LGPD e sigilo (art. 17; Lei 13.709)

| Ponto | Estado |
|---|---|
| Views públicas com k-anonymity (k ≥ 30 por célula) | mantido |
| Exclusão a pedido do titular (`/privacidade/excluir`) | agora auditada (`admin_audit_log`, sem PII no detalhe) |
| Exportação pra perícia sem CPF/telefone/IP | `scripts/exportar-dados-pericia.mjs` |
| Declarações com CPF em `docs/confidencial/` | **não commitar** |
| Texto de privacidade | corrigido (fingerprint só pra auditoria) |

## 3. O que mudou na plataforma nesta auditoria (sem deploy, sem commit)

- **Banco (aplicado no projeto Supabase):** migration 048 — `eleitorado_tse_importacao`, `eleitorado_tse_estratos`, `ponderacao_execucao`, `pesos_celula`, colunas em `edicao`, função `ponderar_estratos_raking`, views `v_*_pond_estratos`, `v_amostra_marginais`, `v_eleitorado_marginais`.
- **Scripts:** `importar-eleitorado-tse.mjs`, `ponderar-estratos.mjs` (com `--comparar` contra o doc. 16), `gerar-complementacao-pesqele.mjs`, `verificar-resultados.ts` (método-aware).
- **Admin:** `/admin/edicoes` (método, aprovação, complementação, gate), `/admin/amostra`, auditoria com novos rótulos, menu.
- **Público:** resultados/TV/ficha por método com margem efetiva; `/transparencia` e `/privacidade` descrevendo só o que existe.
- **Coleta:** janela travada no servidor (OTP e voto).
- **Docs:** `metodologia.md` (§2.2–2.5, §4, §6), `ficha-tecnica.md`, `pesqele-dados-complementares.md`, `README.md`, `security.md`, este documento.

## 4. Pendências por dono

### Estatístico (E) — P0
1. ~~Escolher a variante de ponderação~~ Decidido em 12/09/2026: variante C (raking às quatro marginais, sem aparo), a mesma do doc. 17 e a que a plataforma executa. O estatístico valida e assina.
2. Rodar/conferir: `node --env-file=.env.local scripts/ponderar-estratos.mjs --por "Nome — CONRE 8223" --comparar docs/juridico/rp-0601015-42/ponderacao-completa.json`.
3. Registrar a aprovação em `/admin/edicoes` (TOTP) e definir o método `estratos_raking`.
4. Assinar docs 04/13/16 da Rp e a declaração do art. 2º VII.
5. Fixar a regra de monitoramento (`/admin/amostra`) pra próxima edição: limites de razão por categoria e ação de campo.

### Advogado (A) — P0
1. Lançar a complementação (blocos III/IV do gerador) e a retificação do campo 3 **nos dois registros** (SE-09441 e BR-04041); informar a data pra registro em `/admin/edicoes`.
2. Conferir a ficha do art. 10 emitida pelo gerador antes de qualquer peça pública.
3. Pedido de revogação da tutela; só depois religar o site (botão auditado) e republicar.
4. Marcadores do doc. 08 e OAB nas minutas (pendência já listada em `docs/juridico/rp-0601015-42/README.md`).

### Plataforma (P) — P1/P2
1. Rodar `npx tsc --noEmit`, `npm run lint` e `npm run verificar:resultados` (feito nesta auditoria — ver §5) antes de qualquer deploy; commit só quando autorizado.
2. ~~Se E escolher truncamento: parâmetro `p_peso_max`~~ Não se aplica: variante C mantida (12/09/2026); nenhuma alteração na função de raking.
3. Próxima edição: importar o perfil do eleitorado mais recente **antes** da coleta; abrir `/admin/amostra` no plantão de campo.
4. P2: exportação por execução (`--execucao <id>`) em `exportar-dados-pericia.mjs`; teste automatizado da função de raking contra fixture pequena.

## 5. Checagens executadas (12/09/2026)

| Checagem | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npm run lint` nos arquivos alterados | 0 erros, 0 avisos (os únicos erros restantes do lint global são arquivos `._*` do exFAT e três `set-state-in-effect` pré-existentes em `entrada-votacao.tsx`, `compartilhar-pesquisa.tsx`, `dados-form.tsx`, mais `prefer-const` em `lib/titulo-eleitor.ts` — fora do escopo) |
| `npm run verificar:resultados` | método `municipio` (vigente na edição), 411 números conferidos, zero divergências app × banco |
| Migration 048 | aplicada no projeto; execução `73aebc19…` gravada, não aprovada, edição ainda em `municipio` |

Não houve deploy nem commit. A troca do método pra `estratos_raking` e a divulgação dependem das pendências de E e A (§4).
