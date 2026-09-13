# Ficha Técnica — Pesquisa Eleitoral Sergipe 2026 · 2ª edição

> Esta ficha acompanha **toda divulgação pública** de resultados e é
> depositada no PesqEle conforme a Res.-TSE 23.600/2019 (red. Res.
> 23.747/2026). **Atualizada em 13/09/2026.** Os campos marcados
> *a preencher* saem de `edicao` no painel admin e da complementação
> pós-coleta. Nenhuma peça pública cita quantidade de participantes.

---

## Identificação

| Item | Valor |
|---|---|
| **Edição** | 2ª edição |
| **Contratante** | Câmara de Dirigentes Lojistas de Aracaju (CDL Aracaju) — CNPJ 13.045.935/0001-36 |
| **Executor** | CDL Aracaju (execução direta, sem terceirização) |
| **Estatístico responsável** | Danilio Silva Santos — CONRE 8223 (o mesmo da 1ª edição; declaração do art. 2º, IX assinada digitalmente no registro) |
| **Custo total** | *a declarar no registro* |
| **Origem dos recursos** | Recursos próprios da CDL Aracaju (associação civil sem fins lucrativos) |
| **Nº de registro** | **Pendente — a ser efetuado antes da divulgação**, quando a amostra atingir 20 mil eleitores (Lei 9.504/97, art. 33; Res.-TSE 23.600/2019, art. 2º, § 7º, III e IV). Serão dois registros: TRE-SE (Governador, Senador, Dep. Federal, Dep. Estadual) e TSE (Presidente). |
| **Histórico — 1ª edição** | Coleta 01–03/09/2026; registros SE-09441/2026 (TRE-SE) e BR-04041/2026 (TSE) em 22/08/2026; divulgação 04/09/2026, suspensa por tutela do TRE-SE em 07/09/2026 (Rp 0601015-42.2026.6.25.0000); site fora do ar de 08/09 a 13/09/2026. |

## Universo

| Item | Valor |
|---|---|
| **População-alvo** | Eleitorado de Sergipe segundo o TSE 2026 (perfil do eleitorado por seção, geração 14/07/2026) |
| **Total** | 1.740.124 eleitores; 1.740.116 mapeados nos estratos de ponderação (8 linhas excluídas por faixa etária inválida) |
| **Abrangência** | 75 municípios de Sergipe |
| **Eleitor de outra UF** | Informa UF e município do título; responde só à cédula de Presidente; peso zero nos recortes estaduais |

## Amostra

| Item | Valor |
|---|---|
| **Tipo** | **Amostra por adesão** (autosseleção) com identidade verificada — não probabilística |
| **Recrutamento** | Convite por WhatsApp às bases da CDL Aracaju (Melhores do Ano e participantes da 1ª edição, com opt-out) + divulgação aberta nos canais da CDL |
| **n** | Total de respondentes com CPF e WhatsApp validados ao fim da coleta — informado no registro e na complementação do art. 2º, § 7º; não citado em peças de divulgação |
| **Nível de confiança** | 95% |
| **Margem de erro** | **Indicativa**, calculada como se a amostra fosse probabilística: **nominal** `1,96·√(0,25/n)` e **efetiva** `1,96·√(0,25/n_eff)` (n efetivo de Kish, após a ponderação) — as duas publicadas |
| **Cota** | Não há cota (nem geográfica nem por perfil); o desequilíbrio é corrigido na ponderação |

## Coleta

| Item | Valor |
|---|---|
| **Forma** | Pesquisa **online com identidade verificada** (autopreenchimento no dispositivo do respondente; CPF validado por consulta cadastral ao SPC Brasil ou base da CDL; confirmação por OTP no WhatsApp) |
| **Período** | **13/09/2026 00h00 a 20/09/2026 23h59** (horário de Aracaju), travado no servidor |
| **Plataforma** | `pesquisa.cdlaju.com.br` (Next.js + Supabase, hospedado na Vercel — código aberto em `github.com/presidencia-svg/pesquisa`) |
| **Idioma** | Português brasileiro |
| **Divulgação** | `pesquisa.cdlaju.com.br/resultados` e canais da CDL Aracaju, após o registro e o prazo legal |

## Tipo de pesquisa

| Cargo | Tipo |
|---|---|
| Presidente | **Espontânea** (eleitor digita o número; sistema mostra nome + foto pra confirmar; nenhuma lista antes) |
| Governador | **Espontânea** |
| Senador (2 vagas) | **Espontânea** |
| Deputado Federal | **Espontânea por legenda + candidato** |
| Deputado Estadual | **Espontânea por legenda + candidato** |

Cada cédula oferece: digitar número, **voto em branco**, ou **não sabe / não quis responder**.

## Estratificação e ponderação

Conforme o art. 2º da Res.-TSE 23.600/2019 (red. Res. 23.747/2026):

| Variável | Categorias | Origem no cadastro | Parâmetro |
|---|---|---|---|
| **Município** | 75 municípios de SE (IBGE) | município do título | TSE 2026 |
| **Sexo** | M, F (NI ajustado nas demais) | cadastral (base CDL ou SPC); perguntado ao eleitor só quando ausente, com proveniência gravada | TSE 2026 |
| **Faixa etária** | 16–17, 18–24, 25–34, 35–44, 45–59, 60+ | cadastral (data de nascimento); nunca perguntada; 16–17 exige título | TSE 2026 |
| **Grau de instrução** | Fundamental, Médio, Superior (3 estratos do TSE) | 4 opções no formulário (não estudei/só sei ler e escrever; fundamental; médio; superior), agregadas em 3 | TSE 2026 |

**Método:** raking (ajuste iterativo proporcional) nas quatro marginais, calculado no banco (função SQL `ponderar_estratos_raking`), com execução gravada (n efetivo, deff, pesos, alvos), aprovada pelo estatístico responsável indicado no registro da edição antes da divulgação. Resultado divulgado = agregação ponderada, ao lado do bruto.

**Renda:** faixas em salários mínimos (SM 2026 = R$ 1.621), com "não sei" e "prefiro não informar" — **só recorte descritivo; não pondera** (não há parâmetro oficial do eleitorado por renda). Cor/raça e religião não são coletadas.

## Identificação do respondente

| Camada | Mecanismo |
|---|---|
| 1. Validação do CPF | Base da CDL Aracaju ou **consulta cadastral ao SPC Brasil** (devolve nome, situação do CPF, data de nascimento, entre outros) |
| 2. Posse do WhatsApp | Código OTP de 6 dígitos |
| 3. Antiautomação | Cloudflare Turnstile; bloqueio de navegação anônima/privativa; teto de códigos por CPF; janela de coleta no servidor |
| 4. Unicidade | Hash HMAC-SHA256 do CPF + WhatsApp único — 1 participação por eleitor por edição |

IP, user-agent e fingerprint do dispositivo são **apenas registrados** (não bloqueiam). Localização por IP/GPS está desligada nesta edição.

## Privacidade

Arquitetura de duas salas: identidade (hash do CPF + demográficos) e voto (token aleatório) em tabelas sem chave de ligação; timestamp do voto truncado pra hora cheia. Recortes demográficos publicados só com **no mínimo 30 respondentes por célula** (views do banco). Política: `/privacidade`; exclusão: `/privacidade/excluir`.

## Margem de erro — interpretação

Por ser amostra por adesão, a margem é indicativa. Diferença entre dois candidatos **menor que 2× a margem efetiva** é tratada como empate técnico. Sub-amostras têm margem maior e recortes pequenos não são publicados.

## Diferenças em relação a institutos tradicionais

| Item | Instituto tradicional | Pesquisa Sergipe 2026 |
|---|---|---|
| Sorteio probabilístico | Sim | Não — adesão com identidade verificada, ponderada por raking |
| Forma | Presencial/telefone | Online |
| Entrevistador | Sim | Não — autopreenchimento |
| Tipo | Geralmente estimulada | **Espontânea** |
| Anonimato | Operacional | **Arquitetural** (duas salas) |
| Auditoria | Material físico | **Código aberto** + banco auditável (art. 13, §§ 8º e 9º) |

Limites declarados: não aleatoriedade da amostra (custo declarado na margem efetiva) e viés digital (exige smartphone + WhatsApp).

## Auditoria e replicação

- **Código-fonte:** `github.com/presidencia-svg/pesquisa`
- **Dados:** à disposição da Justiça Eleitoral e de interessados nos termos do art. 13, §§ 8º e 9º, por exportação sem CPF, telefone ou IP
- **Verificação:** `npm run verificar:resultados` confere app × banco antes de cada divulgação

## Contato

CDL Aracaju — `contato@cdlaju.com.br` | (79) 3212-7700 · DPO: `dpo@cdlaju.com.br`
