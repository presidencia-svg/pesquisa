# Ficha Técnica — Pesquisa Sergipe 2026

> Formato padrão de divulgação adotado por institutos de pesquisa
> eleitoral (Datafolha, Quaest, Paraná Pesquisas, AtlasIntel) adaptado
> ao nosso modelo. Esta ficha acompanha **toda divulgação pública** de
> resultados e é depositada no PesqEle do TRE/SE conforme Resolução
> TSE 23.747/2026.

---

## Identificação

| Item | Valor |
|---|---|
| **Contratante** | Câmara de Dirigentes Lojistas de Aracaju (CDL Aracaju) — CNPJ 13.045.935/0001-36 |
| **Executor** | CDL Aracaju (execução direta, sem terceirização) |
| **Estatístico responsável** | *a definir antes do registro — CONRE ativo, com declaração assinada digitalmente conforme Art. 2º, IX da Resolução 23.747/2026* |
| **Custo total** | *a declarar* |
| **Origem dos recursos** | Recursos próprios da CDL Aracaju (associação civil sem fins lucrativos) |
| **Nº de registro TRE/SE** | *a obter via PesqEle ≥ 5 dias antes da divulgação* |

## Universo

| Item | Valor |
|---|---|
| **População-alvo** | Eleitores oficiais do TSE residentes em Sergipe |
| **Total estimado** | ~1,45 milhão (referência: estatística TSE 2024, atualizar com 2026 antes do registro) |
| **Abrangência** | 75 municípios de Sergipe (estadual) |

## Amostra

| Item | Valor |
|---|---|
| **Base potencial** | 44.545 CPFs já validados (votantes do Melhores do Ano CDL Aracaju) + qualquer CPF brasileiro validado em tempo real no SPC Brasil |
| **n projetado conservador** | 5.000 respondentes (≈ 11% da base CDL) — margem de erro ±1,4pp / IC 95% |
| **n projetado realista** | 10.000–15.000 respondentes (efeito viral do Melhores do Ano) — margem ±0,98–±0,80pp / IC 95% |
| **Tipo de amostragem** | **Não-probabilística por cotas com identidade verificada** (ver detalhe abaixo) |
| **Nível de confiança** | 95% |
| **Cota geográfica** | Proporcional ao eleitorado TSE de cada um dos 75 municípios de SE |

> **Por que a amostra pode ser muito maior do que institutos tradicionais:**
> A coleta é digital, gratuita pra o respondente, sem entrevistadores
> (custo marginal ≈ R$ 0,01 por respondente em servidor + WhatsApp). O
> gargalo deixa de ser orçamento e passa a ser **adesão**. Com base
> pré-validada de 44.545 CPFs + a possibilidade de qualquer eleitor de
> SE entrar via SPC, o teto é o eleitorado verificável do estado, não
> a verba da pesquisa.
>
> **Margem de erro pra n grande (referência IC 95%, proporção 50%):**
> | n      | Margem de erro |
> |--------|----------------|
> | 1.000  | ±3,1 pp        |
> | 2.500  | ±1,96 pp       |
> | 5.000  | ±1,39 pp       |
> | 10.000 | ±0,98 pp       |
> | 20.000 | ±0,69 pp       |

## Coleta

| Item | Valor |
|---|---|
| **Forma** | Pesquisa **online com identidade verificada** (autopreenchimento via web/app, com validação prévia de CPF e confirmação por OTP de WhatsApp) |
| **Período de coleta principal** | *a definir — setembro/2026* |
| **Plataforma** | `pesquisa.cdlaju.com.br` (Next.js + Supabase, hospedado na Vercel — código aberto em `github.com/presidencia-svg/pesquisa`) |
| **Idioma** | Português brasileiro |

## Tipo de pesquisa

| Cargo | Tipo |
|---|---|
| Presidente | **Espontânea** (eleitor digita número da urna; sistema mostra nome + foto pra confirmar; nenhuma lista exibida antes) |
| Governador | **Espontânea** |
| Senador (2 vagas) | **Espontânea** |
| Deputado Federal | **Espontânea por legenda + candidato** (dupla contagem — legenda define cadeiras via Quociente Eleitoral; candidato individual define ordem dentro da legenda) |
| Deputado Estadual | **Espontânea por legenda + candidato** (idem) |
| Consulta extra: Zona de Expansão | **Estimulada de duas opções** (Aracaju × São Cristóvão) — aplicada apenas a eleitores residentes em Aracaju ou São Cristóvão |

> **Por que espontânea:** este modelo elimina o viés de menu apresentado pelo entrevistador. O respondente declara seu candidato pelo número que **lembra**, espelhando o que vai acontecer na urna. Pesquisas estimuladas tendem a inflar candidatos conhecidos.

## Estratificação e ponderação

Conforme exigido pelo Art. 2º, § 7º, IV da Resolução TSE 23.747/2026:

### Variáveis de cota (controladas durante coleta)

| Variável | Categorias | Aplicação |
|---|---|---|
| **Município** | 75 municípios de SE | Cota proporcional ao eleitorado TSE de cada município. Quando a cota se esgota, novos cadastros do município são bloqueados. |

### Variáveis de ponderação pós-coleta

| Variável | Categorias |
|---|---|
| **Sexo** | M, F |
| **Faixa etária** | 16–17, 18–24, 25–34, 35–44, 45–59, 60+ |
| **Grau de instrução** | Fundamental (incompleto/completo), Médio (incompleto/completo), Superior (incompleto/completo) |

Fator de expansão por estrato:

```
peso = proporção_TSE_estrato ÷ proporção_amostra_estrato
```

Resultado divulgado = média ponderada dos votos por estrato. A tabela cruzada vai anexa no PesqEle.

### O que **não** é controlado (e por quê)

- **Renda / nível econômico**: a Resolução pede como variável de ponderação, mas o TSE não publica recorte oficial por faixa de renda compatível com o cadastro eleitoral. Aplicamos proxy de escolaridade conforme aceito pela literatura (correlação ~0.7 com renda no Brasil — IBGE PNAD).
- **Cor/raça**: não coletada. A Resolução não exige.
- **Religião / orientação política prévia**: não coletada (LGPD — minimização).

## Modelo de identificação do respondente

Diferença central em relação a pesquisas presenciais ou telefônicas:

| Camada | Mecanismo | Função |
|---|---|---|
| 1. Allowlist | CPF deve estar na **base CDL Aracaju** (44.545 votantes do Melhores do Ano) ou ser validado em tempo real no **SPC Brasil** | Garante que respondente é pessoa física real, não bot ou cadastro fabricado |
| 2. Verificação posse do CPF | Código OTP de 6 dígitos enviado no **WhatsApp** vinculado ao CPF | Impede uso de CPF de terceiros |
| 3. Antifraude técnico | Cloudflare Turnstile (anti-bot), rate-limit por IP, máximo 2 CPFs por device fingerprint, cota de município | Bloqueia automação |
| 4. Unicidade | Hash HMAC-SHA256 do CPF — 1 voto por eleitor por edição | Evita voto duplicado |

A "amostra" é **auto-selecionada dentro de allowlist verificada**. Não há sorteio aleatório de eleitores como em pesquisas probabilísticas. A ponderação demográfica pós-coleta corrige desequilíbrios em relação à distribuição TSE.

## Cédulas (instrumento de coleta)

Captura completa em PDF disponível no PesqEle. Cada eleitor responde:

1. Presidente (1 número)
2. Governador (1 número)
3. Senador (até 2 números)
4. Deputado Federal (1 número de 4 dígitos)
5. Deputado Estadual (1 número de 5 dígitos)
6. Consulta Zona de Expansão (somente eleitores de Aracaju ou São Cristóvão)

Cada cédula oferece: digitar número, **voto em branco**, ou **não sabe / não quis responder**. Sem voto nulo (eleitor não pode "votar nulo de propósito" online — é tratado como branco pra fins de análise).

## Privacidade e arquitetura

A pesquisa adota **arquitetura de duas salas**:

- **Sala 1** (`eleitores_pesquisa`): guarda hash do CPF + dados demográficos + verificações.
- **Sala 2** (`votos_pesquisa`): guarda voto por token aleatório. Sem chave estrangeira pra Sala 1.

Não existe coluna que ligue um CPF a um voto. O servidor não persiste essa ligação em nenhum momento. Cada timestamp é truncado pra hora cheia, impedindo correlação minuto-a-minuto entre cadastro e voto.

Re-identificação por estrato raro é mitigada por **k-anonymity ≥ 30** em toda publicação cruzada: células com menos de 30 respondentes são suprimidas ou agregadas.

## Margem de erro — interpretação

A margem de erro de ±N p.p. com IC 95% significa: se a pesquisa fosse repetida 100 vezes nas mesmas condições, em 95 delas o resultado verdadeiro estaria dentro do intervalo `(resultado − N, resultado + N)`.

**Importante para o leitor:**

- Diferença entre dois candidatos **menor que 2× a margem** é estatisticamente **empate técnico**.
- Margem se aplica ao resultado geral. Sub-amostras (município específico, faixa etária específica) têm margem proporcionalmente **maior** e devem ser interpretadas com cautela. Não publicamos cortes com `n` insuficiente.

## Diferenças em relação a institutos tradicionais — declaradas explicitamente

| Item | Instituto tradicional | Pesquisa Sergipe 2026 |
|---|---|---|
| Sorteio probabilístico | Sim (PPS ou cluster sampling) | Não — allowlist com identidade verificada |
| Forma | Presencial/telefone | Online (web/PWA) |
| Local de coleta | Pontos físicos sorteados | Casa do eleitor, dispositivo próprio |
| Entrevistador | Sim (pode introduzir viés) | Não — autopreenchimento sem mediação humana |
| Tipo (estimulada/espontânea) | Geralmente estimulada | **Espontânea pura** |
| Anonimato | Promessa operacional | **Garantia arquitetural** (duas salas + k-anonymity) |
| Auditoria | Material físico arquivado | **Código aberto no GitHub** + banco auditável conforme Art. 13 da Resolução 23.747/2026 |
| Custo | R$ 80k–R$ 300k por onda | Próximo de zero (infraestrutura própria da CDL, sem entrevistadores) |

Cada diferença foi consciente e tem trade-offs documentados. Os ganhos: **transparência total** (código aberto, dados auditáveis), **anonimato arquitetural** (não-operacional), **fidelidade ao comportamento da urna** (espontânea pura). As perdas: **não-aleatoriedade da amostra** (corrigida via ponderação demográfica), **viés digital** (respondentes precisam de smartphone + WhatsApp). Esses limites estão na divulgação.

## Auditoria e replicação

- **Código-fonte**: público em `github.com/presidencia-svg/pesquisa`
- **Banco de dados**: estrutura completa nas migrations do repositório
- **Dados brutos**: disponibilizados conforme Art. 13, §§ 8º e 9º da Resolução 23.747/2026, mediante requerimento no prazo de 2 dias úteis
- **Replicabilidade**: qualquer interessado pode rodar o sistema localmente, importar amostras simuladas e reproduzir a metodologia

## Contato

CDL Aracaju — `contato@cdlaju.com.br` | (79) 3212-7700
