# Metodologia — Pesquisa Eleitoral Sergipe 2026 · 2ª edição

> Documento técnico que acompanha o registro no PesqEle (TRE-SE e TSE) e serve de base pra divulgação. **Atualizado em 13/09/2026** para a 2ª edição (coleta de 13 a 20/09/2026). Regra: **o que está aqui é o que o código faz** (`app/`, `lib/`, `supabase/migrations/`).

---

## 0. Edições

| Edição | Coleta | Registro | Situação |
|---|---|---|---|
| **2ª (vigente)** | 13/09/2026 00h00 a 20/09/2026 23h59 (horário de Aracaju) | **Pendente** — a ser efetuado quando a amostra atingir 20 mil eleitores e sempre antes de qualquer divulgação (Lei 9.504/97, art. 33; Res.-TSE 23.600/2019, red. Res. 23.747/2026, art. 2º, § 7º, III e IV) | em coleta; sem divulgação |
| 1ª (histórico) | 01 a 03/09/2026 | SE-09441/2026 (TRE-SE) e BR-04041/2026 (TSE), registrados em 22/08/2026 | divulgada em 04/09/2026; divulgação suspensa por tutela do TRE-SE em 07/09/2026 (Rp 0601015-42.2026.6.25.0000); site fora do ar de 08/09 até o religamento em 13/09/2026 |

Os registros SE-09441/2026 e BR-04041/2026 referem-se apenas à 1ª edição. A 2ª edição terá registros próprios (um no TRE-SE, para os cargos estaduais, e um no TSE, para Presidente).

---

## 1. Base legal

### 1.1 Lei nº 9.504/97 — Lei das Eleições, art. 33

A partir de 1º de janeiro do ano da eleição, quem realizar pesquisa de opinião relacionada às eleições deve registrá-la na Justiça Eleitoral, ainda que não divulgue o resultado, até **5 dias antes da divulgação**, informando: contratante e contratado; valor e origem dos recursos; metodologia e período; **plano amostral e ponderação quanto a sexo, idade, grau de instrução, nível econômico e área física de execução**; intervalo de confiança e margem de erro; sistema interno de controle e verificação; questionário completo; nome de quem pagou e nota fiscal. Divulgação sem registro prévio sujeita a multa (art. 33, § 3º) e a divulgação antes do prazo é equiparada a pesquisa não registrada.

### 1.2 Res.-TSE nº 23.600/2019, com a redação da Res.-TSE nº 23.747/2026

- **PesqEle** — registro exclusivamente eletrônico (art. 2º, § 6º), com documentos em PDF (§ 4º).
- **Amostra por adesão** — art. 2º, § 7º, III e IV: pesquisa cuja amostra se forma por adesão dos respondentes deve informar, após a coleta, o número de respondentes por município e a composição da amostra e da ponderação. É o caso desta pesquisa.
- **Declaração do estatístico** (art. 2º, IX) — assinada com certificado digital pelo profissional registrado no CONRE.
- **Acesso a dados** (art. 13, §§ 8º e 9º) — dados e sistema interno de controle à disposição de qualquer interessado em até 2 dias.
- **Vedação a enquetes** (art. 23) — após 15 de agosto; não atinge pesquisas registradas.

### 1.3 LGPD (Lei 13.709/2018)

Base legal: execução de pesquisa de opinião (art. 7º, IV) para cadastro e demografia; legítimo interesse (art. 7º, IX) para consulta cadastral, trilha antifraude e convite por WhatsApp com opt-out; consentimento (art. 7º, I) só para o opt-in de resultados. Detalhe em `docs/lgpd.md` e `docs/ripd.md`. CPF nunca é armazenado em claro (HMAC-SHA256); voto e identidade ficam em tabelas sem chave de ligação.

---

## 2. Plano amostral

### 2.1 Universo

Eleitorado de Sergipe segundo o TSE 2026 — arquivo `perfil_eleitor_secao_2026_SE` (perfil do eleitorado por seção eleitoral, geração de 14/07/2026), importado por `scripts/importar-eleitorado-tse.mjs` na tabela `eleitorado_tse_estratos` (uma linha por importação em `eleitorado_tse_importacao`).

- **Total:** 1.740.124 eleitores.
- **Mapeados nos estratos de ponderação:** 1.740.116 (8 linhas excluídas por faixa etária inválida no arquivo do TSE).
- 75 municípios.
- **Cargos em disputa em SE 2026:** Presidente da República, Governador, 2 Senadores, 8 Deputados Federais, 24 Deputados Estaduais.

**Eleitor com título em outra UF:** informa a UF e o município do título e responde **somente à cédula de Presidente**; recebe peso zero em todos os recortes estaduais.

### 2.2 Recrutamento e tipo de amostra

**Amostra por adesão** (autosseleção) dentro de universo com identidade verificada. Recrutamento por dois caminhos:

1. **Convite por WhatsApp** às bases da CDL Aracaju (Melhores do Ano e participantes da 1ª edição), com opt-out ("responda SAIR"); excluídos nunca recebem.
2. **Divulgação aberta** nos canais da CDL Aracaju — qualquer eleitor com CPF validável participa.

Não há sorteio probabilístico nem cota bloqueante: `n` é o total de respondentes com CPF e WhatsApp validados ao fim da coleta. A ficha técnica não traz "n projetado"; o número que vale é o final, e ele não é citado em peças de divulgação antes do registro.

### 2.3 Margem de erro (indicativa)

Como a amostra é por adesão, a margem é **indicativa**, calculada **como se** a amostra fosse probabilística, e as duas versões são publicadas:

| Margem | Fórmula | O que mede |
|---|---|---|
| **Nominal** | `1,96 · √(0,25 / n)` | precisão como se a amostra fosse aleatória simples e sem pesos |
| **Efetiva (Kish)** | `1,96 · √(0,25 / n_eff)`, com `n_eff = (Σw)² / Σw²` | precisão após a ponderação; `deff = n / n_eff` é o efeito de desenho |

A margem efetiva é a usada pra falar em empate técnico. `deff` alto indica desequilíbrio de **coleta** (perfis sub-representados); `/admin/amostra` aponta isso durante o campo.

### 2.4 Ponderação — raking nas quatro marginais

**Único método aplicado na 2ª edição:** raking (ajuste iterativo proporcional) nas marginais **município × sexo × faixa etária × grau de instrução**, com parâmetro no eleitorado TSE 2026 (§ 2.1), executado **no banco** pela função SQL `ponderar_estratos_raking` (migration 048), sobre a base completa. Não há cota, não há ponderação separada "por município" e a renda **não** pondera.

A cada iteração os pesos das células são multiplicados por `alvo_marginal / soma_atual_marginal`, dimensão por dimensão, até o desvio máximo ficar abaixo da tolerância (1e-10) ou bater o teto de iterações. Respondente sem sexo (fonte cadastral não devolve e eleitor não informa) entra como "NI" e é ajustado nas outras três marginais. Respondente sem município de Sergipe recebe peso zero.

**O que cada execução grava** (`ponderacao_execucao` + `pesos_celula`): importação usada, quem executou, iterações, convergência, `Σw`, `Σw²`, `n_eff`, `deff`, distribuição dos pesos (mín, mediana, p95, p99, máx), margem nominal, margem efetiva, alvos por marginal, marginais da amostra e parâmetros. A edição aponta pra execução vigente (`edicao.ponderacao_execucao_id`); as views públicas `v_resultados_*_pond_estratos` leem o peso da célula dessa execução.

**Fluxo obrigatório** (o botão Divulgar recusa qualquer passo fora de ordem):

1. Coleta encerrada (`edicao.fim` no passado).
2. Registro no PesqEle efetuado (nos dois registros) e `data_registro_pesqele` + 5 dias ≤ hoje.
3. `scripts/ponderar-estratos.mjs --por "Nome — CONRE"` → grava a execução, aponta a edição e zera a aprovação anterior.
4. Estatístico responsável indicado no registro da edição confere os diagnósticos em `/admin/edicoes` (ou `/admin/amostra`) e **registra a aprovação** (nome + CONRE, TOTP), posterior à execução.
5. `scripts/gerar-complementacao-pesqele.mjs` → textos do art. 2º, § 7º, III/IV e ficha do art. 10; lançar no PesqEle e **registrar a data** em `/admin/edicoes` (TOTP).
6. Método da edição = `estratos_raking` (TOTP).
7. `npm run verificar:resultados` (confere app × banco, método, margem efetiva, n_eff).
8. Divulgar (TOTP). Cada passo fica no `admin_audit_log`.

### 2.5 Variáveis de ponderação e de composição

| Variável | Categorias | Origem | Pondera? |
|---|---|---|---|
| **Município** | 75 municípios de SE (IBGE) | município do título, do cadastro (`cdl_base`) ou informado | sim |
| **Sexo** | M, F (NI ajustado nas demais) | **cadastral** (`cdl_base`/Melhores do Ano ou SPC); **perguntado ao eleitor só quando ausente**, com proveniência em `sexo_fonte` (mda / spc_mda / spc = cadastral; eleitor = informado; migrations 047/051) | sim |
| **Faixa etária** | 16–17, 18–24, 25–34, 35–44, 45–59, 60+ | **cadastral**, derivada da data de nascimento (SPC/`cdl_base`); **nunca perguntada** | sim |
| **Grau de instrução** | fundamental / médio / superior (3 estratos do agregado TSE) | formulário com **4 opções** ("não estudei, ou só sei ler e escrever"; fundamental; médio; superior) guardadas em `escolaridade_detalhe`; as duas primeiras caem no estrato *fundamental* (migration 053, `lib/demograficos.ts`) | sim |
| **Faixa de renda** | até 1, 1–2, 2–5, 5–10, mais de 10 salários mínimos (SM 2026 = R$ 1.621); "não sei"; "prefiro não informar" | formulário | **não** — só recorte descritivo e composição da amostra (art. 2º, § 7º, IV); não há parâmetro oficial do eleitorado por renda |

- Pesquisa online autoaplicada não alcança diretamente quem não lê; esses eleitores são representados pelo peso do estrato *fundamental*, calibrado ao total do TSE.
- **16–17 anos:** título de eleitor obrigatório (`lib/titulo-eleitor.ts`).
- "Área física de execução" é o estado de Sergipe (domicílio eleitoral declarado); não há ponto físico de coleta.

### 2.6 Monitoramento da amostra durante a coleta

`/admin/amostra` compara, a qualquer momento, as marginais da amostra validada com as do eleitorado TSE 2026 (razão amostra/eleitorado por categoria e peso implícito). Razão abaixo de 0,5 ou acima de 2 numa categoria indica pesos extremos no raking — é aí que se direcionam convites. O acesso fica no log de auditoria.

---

## 3. Variáveis coletadas

### 3.1 Cadastro e Sala 1 — `cdl_base` + `eleitores_pesquisa`

| Variável | Tipo | Origem | Razão |
|---|---|---|---|
| `cpf_hash` | HMAC-SHA256 | calculado a partir do CPF informado | identificação única — 1 participação por CPF por edição |
| nome | string | SPC ou `cdl_base`; mascarado em logs | conferência de identidade |
| WhatsApp | E.164 | digitado | OTP (posse do número) |
| `municipio_ibge` / UF do título | int / string | título, `cdl_base` ou informado | estrato de ponderação; outra UF → só Presidente |
| `sexo` + `sexo_fonte` | enum | cadastral; perguntado só quando ausente | ponderação |
| `faixa_etaria` | enum (6) | data de nascimento cadastral | ponderação; 16–17 exige título |
| `escolaridade_detalhe` → `escolaridade` | enum (4 → 3) | digitado | ponderação |
| `nivel_economico` | enum (salários mínimos) | digitado, opcional | recorte descritivo |
| bloco SPC (situação do CPF, nascimento, nome da mãe, estado civil, endereço, payload) | — | consulta cadastral ao SPC Brasil | validação de identidade; guardado em `cdl_base` (migrations 050/051) |
| `spc_validado`, `wa_validado`, `fonte` | bool / enum | sistema | trilha de auditoria |
| `ip`, `user_agent`, `device_fingerprint` | string | request / navegador | **apenas registrados** para análise pós-coleta — não bloqueiam |
| opt-in de resultados | bool | checkbox | consentimento |
| `criado_em` | timestamptz | sistema | trilha de auditoria |

### 3.2 Sala 2 — `votos_pesquisa`

| Variável | Tipo | Razão |
|---|---|---|
| `token_hash` | HMAC-SHA256 | autoriza inserir voto sem ligar ao CPF |
| `cargo`, `candidato_id`, `partido_id`, `metodo` | enum / uuid | a resposta |
| cópia controlada de sexo, faixa etária, escolaridade, renda, município | enum | recortes agregados |
| `criado_hora` | timestamptz truncado pra hora | impede correlação minuto-a-minuto |

Não existe coluna, chave ou log que ligue um voto a um CPF, telefone ou IP.

### 3.3 Supressão de recortes pequenos

As views públicas de recorte demográfico (`v_resultados_demografico`, migration 030) só devolvem células com **no mínimo 30 respondentes**; abaixo disso o recorte é suprimido.

---

## 4. Controles — o que o código faz

| Sinal | Local | Efeito |
|---|---|---|
| CPF inválido (formato/checksum) | antes do hash | rejeita |
| CPF não encontrado em `cdl_base` nem validado na consulta cadastral ao **SPC Brasil** | `lib/spc.ts` | rejeita |
| CPF já cadastrado nesta edição | `unique (edicao_id, cpf_hash)` | rejeita |
| Navegação anônima/privativa | `app/votar/actions.ts` | **bloqueia** o cadastro |
| Bot/automação | Cloudflare Turnstile no `/votar` | bloqueia |
| OTP WhatsApp não confirmado | `wa_validado=false` | não emite token de voto |
| WhatsApp já usado nesta edição | unicidade do número confirmado | rejeita |
| Fora da janela de coleta (`inicio`/`fim`) | OTP (envio/validação) e gravação do voto | rejeita no servidor |
| Localização por IP/GPS | só quando a edição exige — **desligada na 2ª edição** | — |
| Rajada do mesmo IP | `rate_limit_ip` | **só registra** (CGNAT); o teto é por CPF: 3 códigos/15 min + 3 tentativas por código |
| `device_fingerprint` | Sala 1 | **só armazenado**; não há limite de CPFs por dispositivo |
| Cota por município ou perfil | — | **não existe**; o desequilíbrio é corrigido no raking |
| Anomalia pós-coleta | `/admin/amostra` + views de risco | revisão manual |

`docs/pesqele-dados-complementares.md` é escrito a partir desta tabela e revisado a cada edição.

---

## 5. Cronograma da 2ª edição

| Quando | O quê |
|---|---|
| 13/09/2026 00h00 | abertura da coleta (site religado) |
| durante a coleta | convites por WhatsApp; monitoramento em `/admin/amostra` |
| ao atingir 20 mil eleitores | registro no PesqEle (TRE-SE e TSE), com declaração do estatístico |
| 20/09/2026 23h59 | encerramento da coleta |
| após o encerramento | raking, aprovação do estatístico, complementação do art. 2º, § 7º, III/IV, verificação app × banco |
| ≥ 5 dias após o registro | divulgação em pesquisa.cdlaju.com.br/resultados e canais da CDL Aracaju |
| 04/10/2026 | 1º turno |

---

## 6. Pendências antes do registro da 2ª edição

- [ ] Registro no PesqEle (TRE-SE e TSE) com declaração assinada do estatístico responsável indicado no registro da edição.
- [ ] Preencher na edição: nome/CONRE do estatístico, custo e origem dos recursos, números de registro e `data_registro_pesqele`.
- [x] Eleitorado TSE 2026 importado (`eleitorado_tse_estratos`).
- [x] Raking nas quatro marginais no banco, com execução auditada, aprovação e gate de divulgação (migration 048).
- [x] Escolaridade em 4 opções → 3 estratos; renda em salários mínimos (migration 053).
- [x] Cadastro unificado com bloco SPC e flags de fonte (migrations 050/051).
- [x] Janela de coleta travada no servidor.
- [ ] Revisão jurídica dos textos do registro (`docs/pesqele-dados-complementares.md`).
- [ ] **Federações partidárias** (Lei 14.208/21): confirmar a composição registrada no TSE antes da apuração proporcional.

---

## 7. Referências

- [Lei nº 9.504/97 — Lei das Eleições](https://www.planalto.gov.br/ccivil_03/leis/l9504.htm)
- [Resolução TSE nº 23.747/2026](https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-747-de-26-de-fevereiro-de-2026)
- [Resolução TSE nº 23.600/2019](https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-600-de-12-de-dezembro-de-2019)
- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Portal de Dados Abertos do TSE — Perfil do eleitorado por seção (2026)](https://dadosabertos.tse.jus.br/)
- [TRE-SE — Estatísticas](https://www.tre-se.jus.br/eleicoes/estatisticas)
