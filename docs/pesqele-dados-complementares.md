# PesqEle — Dados Complementares

> **Parte A (abaixo, "Campo 1" a "Campo 4"): textos da 1ª edição**, lançados
> nos registros SE-09441/2026 e BR-04041/2026 (22/08/2026; coleta 01–03/09/2026;
> divulgação suspensa por tutela do TRE-SE em 07/09/2026). Mantidos como
> histórico — **não reutilizar** para a 2ª edição sem as correções da Parte B.
>
> **Parte B (final do arquivo): texto-base para o registro da 2ª edição**
> (coleta 13–20/09/2026; registro ainda não efetuado).
>
> Aba "Dados Complementares" do Registro de Pesquisa Eleitoral (PesqEle
> Empresa). Cada campo aceita até 4.000 caracteres. Textos baseados na
> ficha técnica oficial do projeto (docs/ficha-tecnica.md).
>
> **Regra de ouro (Rp 0601015-42):** só descrever aqui o que o código faz
> de fato (docs/metodologia.md, seção 4). Ponderação, margens e controles
> abaixo refletem a plataforma vigente (migration 048). Depois da coleta,
> a complementação do art. 2º §7º III/IV sai de
> `scripts/gerar-complementacao-pesqele.mjs`.
>
> **ATENÇÃO — são DOIS registros** (o critério é o cargo, não a geografia):
> 1. Registro **SE (TRE-SE)** — cargos Governador, Senador, Dep. Federal e
>    Dep. Estadual.
> 2. Registro **BR (TSE)** — cargo Presidente da República (mesmo com campo
>    só em Sergipe).
> Os 4 textos abaixo servem pros dois registros — só ajuste a linha de
> CARGOS no campo 1 conforme indicado.

---

## Parte A — 1ª edição (histórico; registros SE-09441/2026 e BR-04041/2026)

## Campo 1 — Metodologia de pesquisa

Pesquisa quantitativa de intenção de voto realizada integralmente pela internet, por autopreenchimento no dispositivo do próprio respondente, sem entrevistadores, na plataforma pesquisa.cdlaju.com.br, desenvolvida e operada diretamente pela contratante (CDL Aracaju), sem terceirização.

Modo de resposta ESPONTÂNEO, no formato da urna eletrônica: o respondente digita o número do candidato e o sistema exibe nome, foto e partido apenas para confirmação antes do registro. Nenhuma lista de candidatos é exibida previamente, eliminando o viés de menu característico de pesquisas estimuladas.

[REGISTRO SE/TRE] Cargos pesquisados: Governador, Senador (duas indicações), Deputado Federal e Deputado Estadual.
[REGISTRO BR/TSE] Cargo pesquisado: Presidente da República, com campo de coleta delimitado ao estado de Sergipe.

Para Deputado Federal (4 dígitos) e Deputado Estadual (5 dígitos), a resposta segue o padrão da urna: computada por legenda (dois primeiros dígitos) para fins de distribuição proporcional e por candidato para ordenação interna. Em todas as cédulas o respondente pode registrar voto em branco ou "não sabe / não quis responder".

Identificação do respondente em duas etapas: (1) validação do CPF como pessoa física real, contra base própria de 44.545 CPFs previamente validados da contratante ou consulta em tempo real ao SPC Brasil; (2) confirmação de posse do CPF por código de 6 dígitos (OTP) enviado ao WhatsApp vinculado. Uma única participação por CPF por edição.

Anonimato por arquitetura ("duas salas"): a identificação (hash irreversível do CPF) e os votos são armazenados em estruturas sem qualquer chave de ligação; o voto é gravado sob token aleatório descartado ao fim da sessão, com data/hora truncada para hora cheia. Não é possível, nem ao operador do sistema, vincular um voto a um CPF.

Auditabilidade: código-fonte publicado em repositório aberto (github.com/presidencia-svg/pesquisa), banco de dados auditável e apuração por consultas agregadas reproduzíveis. Cruzamentos demográficos publicados somente com no mínimo 30 respondentes por célula (k-anonimato).

---

## Campo 2 — Plano amostral e ponderação, IC e margem de erro

Universo: eleitoras e eleitores aptos do estado de Sergipe, num total declarado no registro da 1ª edição [número histórico da 1ª edição — a 2ª edição usa o universo TSE 2026 de 1.740.124 eleitores; ver Parte B], distribuídos pelos 75 municípios do estado, conforme estatísticas do eleitorado do TSE. A distribuição do eleitorado por município consta da tabela anexada ao registro e constitui o parâmetro de ponderação geográfica.

Amostragem: não-probabilística, por adesão (autosseleção), dentro de universo com identidade verificada — todo respondente tem CPF validado como pessoa física real e posse confirmada por código enviado ao WhatsApp vinculado, com participação única por CPF. O município de domicílio eleitoral é registrado no cadastro de cada respondente (código IBGE), permitindo aferir a distribuição geográfica da amostra; o desequilíbrio entre a distribuição obtida e a distribuição oficial do eleitorado é corrigido por ponderação pós-coleta, conforme descrito adiante.

Variáveis demográficas coletadas de cada respondente: sexo; faixa etária (16–17, 18–24, 25–34, 35–44, 45–59, 60+); grau de instrução (fundamental, médio e superior, completo/incompleto); nível econômico (renda autodeclarada em faixas).

Ponderação pós-coleta por raking (ajuste proporcional iterativo) nas marginais município, sexo, faixa etária e grau de instrução, tendo por parâmetro o perfil oficial do eleitorado sergipano publicado pelo TSE (perfil do eleitorado por seção eleitoral): os pesos são ajustados iterativamente até que a amostra ponderada reproduza, simultaneamente, a distribuição do eleitorado nas quatro variáveis. Respondentes sem sexo informado são ajustados nas demais marginais. O cálculo é executado integralmente no banco de dados, sobre a base completa, e cada execução fica registrada com seus diagnósticos (amostra efetiva de Kish, efeito de desenho, distribuição dos pesos), conferidos e aprovados pelo estatístico responsável antes da divulgação. Quanto ao nível econômico: inexiste estatística oficial do eleitorado por faixa de renda que sirva de parâmetro de ponderação; a variável é coletada e utilizada em análise de consistência, adotando-se o grau de instrução como variável socioeconômica de ponderação (proxy consolidado na literatura, correlação escolaridade-renda conforme IBGE/PNAD). Os resultados divulgados correspondem à agregação ponderada; as tabelas de estratos acompanham a documentação anexada.

Intervalo de confiança: 95%. Margem de erro estimada pela expressão 1,96 × √(0,25/n) sobre o total de respondentes: n = 5.000 → ±1,4 ponto percentual; n = 10.000 → ±1,0 p.p.; n = 20.000 → ±0,7 p.p. Sobre o n final da coleta serão publicadas, junto aos resultados, a margem nominal (fórmula acima) e a margem efetiva, calculada pela mesma expressão sobre a amostra efetiva de Kish, n_eff = (soma dos pesos)² ÷ soma dos pesos ao quadrado, que reflete a perda de precisão decorrente da ponderação. Diferenças entre candidatos inferiores a duas margens de erro são tratadas como empate técnico. Recortes (municipais ou demográficos) possuem margem proporcionalmente maior e somente são publicados com no mínimo 30 respondentes por célula.

---

## Campo 3 — Sistema interno de controle, verificação, conferência e fiscalização

A coleta é 100% digital e sem entrevistadores: o "trabalho de campo" é executado pela própria plataforma, com controles automáticos, registrados e auditáveis:

1. Validação de identidade: CPF verificado (dígitos verificadores e existência como pessoa física) contra base própria de 44.545 CPFs previamente validados ou consulta em tempo real ao SPC Brasil; confirmação de posse por código OTP de 6 dígitos enviado ao WhatsApp vinculado ao CPF.

2. Unicidade: uma participação por CPF por edição, garantida por hash irreversível (HMAC-SHA256) do CPF — o CPF nunca é armazenado em claro — e por restrições de unicidade e gatilhos no banco de dados que rejeitam duplicidade mesmo sob tentativa de burla (reenvio simultâneo, repetição de cédula).

3. Antifraude e antiautomação: verificação anti-robô (Cloudflare Turnstile), limite de códigos de confirmação por CPF, unicidade do número de WhatsApp confirmado por edição e trava, no servidor, do período de coleta registrado (nenhum código é enviado nem voto gravado fora dele). Não há cota bloqueante por município nem por perfil: o desequilíbrio de adesão é corrigido na ponderação.

4. Integridade e trilha de auditoria: ações administrativas registradas em log de auditoria (inclusive a execução e a aprovação da ponderação, a complementação deste registro e a divulgação, todas protegidas por segundo fator); registros de coleta imutáveis; painel interno de acompanhamento em tempo real da composição da amostra frente ao eleitorado TSE (município, sexo, faixa etária e instrução), monitorado pela equipe técnica e pelo estatístico responsável para detecção de desequilíbrios e anomalias.

5. Conferência da apuração: totalizações obtidas por consultas agregadas reproduzíveis diretamente do banco de dados; qualquer recontagem é determinística. O código-fonte da plataforma é publicado em repositório aberto (github.com/presidencia-svg/pesquisa), permitindo auditoria externa da lógica de coleta e de apuração.

6. Segurança: comunicação exclusivamente sob HTTPS; testes de intrusão internos periódicos e varredura automatizada de vulnerabilidades integrada ao processo de publicação de código.

O sistema interno descrito, incluindo banco de dados e registros de auditoria, fica à disposição da Justiça Eleitoral para verificação, nos termos da legislação aplicável.

---

## Campo 4 — Municípios e bairros abrangidos

A pesquisa abrange a totalidade do estado de Sergipe: todos os seus 75 municípios, sem delimitação por bairro. Por se tratar de coleta exclusivamente pela internet, com autopreenchimento no dispositivo do próprio respondente, não há pontos físicos de coleta; a área de realização da pesquisa é o território do estado de Sergipe. O município de cada respondente é identificado no cadastro (domicílio declarado, com código IBGE); a participação não é limitada por cota, e a distribuição obtida é corrigida, após a coleta, por ponderação tendo por parâmetro o eleitorado TSE de cada município.

Municípios abrangidos (75): Amparo do São Francisco, Aquidabã, Aracaju, Arauá, Areia Branca, Barra dos Coqueiros, Boquim, Brejo Grande, Campo do Brito, Canhoba, Canindé de São Francisco, Capela, Carira, Carmópolis, Cedro de São João, Cristinápolis, Cumbe, Divina Pastora, Estância, Feira Nova, Frei Paulo, Gararu, General Maynard, Graccho Cardoso, Ilha das Flores, Indiaroba, Itabaiana, Itabaianinha, Itabi, Itaporanga d'Ajuda, Japaratuba, Japoatã, Lagarto, Laranjeiras, Macambira, Malhada dos Bois, Malhador, Maruim, Moita Bonita, Monte Alegre de Sergipe, Muribeca, Neópolis, Nossa Senhora Aparecida, Nossa Senhora da Glória, Nossa Senhora das Dores, Nossa Senhora de Lourdes, Nossa Senhora do Socorro, Pacatuba, Pedra Mole, Pedrinhas, Pinhão, Pirambu, Poço Redondo, Poço Verde, Porto da Folha, Propriá, Riachão do Dantas, Riachuelo, Ribeirópolis, Rosário do Catete, Salgado, Santa Luzia do Itanhy, Santa Rosa de Lima, Santana do São Francisco, Santo Amaro das Brotas, São Cristóvão, São Domingos, São Francisco, São Miguel do Aleixo, Simão Dias, Siriri, Telha, Tobias Barreto, Tomar do Geru, Umbaúba.

---

## Lembretes antes de enviar o registro

- [ ] **Estatístico responsável com CONRE ativo** — obrigatório (Res.
      23.747/2026, art. 2º, IX, com declaração assinada). Ainda está "a
      definir" na ficha técnica — sem isso o registro não deve ser enviado.
- [ ] **Dois registros**: este formulário vale pra UM registro. Repetir o
      processo pro outro (SE no TRE-SE + BR no TSE, por causa do
      presidente).
- [ ] **Aba Arquivos**: anexar questionário (captura das cédulas em PDF),
      plano amostral/tabelas de estratos e declaração do estatístico.
- [ ] **Custo e origem dos recursos** (aba Dados da Pesquisa): recursos
      próprios da CDL Aracaju; valor a declarar.
- [ ] **Patrocinadores**: a relação de patrocinadores firmados (Energisa,
      Celi, Eneva, Iguá, Maratá, Valor) deve ser informada no registro —
      o registro é público.
- [ ] **Consulta Zona de Expansão**: está DESLIGADA por decisão. Os textos
      acima NÃO a mencionam. Se for religada antes do campo, incluir no
      campo 1 a descrição da consulta (estimulada de duas opções, somente
      eleitores de Aracaju e São Cristóvão).
- [ ] **Prazo**: divulgação só 5 dias após CADA registro.
- [ ] **Bloqueadores da auditoria de compliance** (base legal LGPD art. 11,
      reuso da base MdA, contratante) — validar com o advogado ANTES de
      enviar, porque o registro torna a pesquisa pública.


---

## Parte B — 2ª edição (13 a 20/09/2026) — texto-base para o registro

> **Registro ainda não efetuado.** Será feito quando a amostra atingir 20 mil
> eleitores e sempre antes de qualquer divulgação (Lei 9.504/97, art. 33;
> Res.-TSE 23.600/2019, red. Res. 23.747/2026, art. 2º, § 7º, III e IV).
> Dois registros (TRE-SE: Governador, Senador, Dep. Federal, Dep. Estadual;
> TSE: Presidente). Estatístico: o indicado no campo da edição. Nenhum número
> de participantes em peça pública. Os blocos III/IV pós-coleta saem de
> `scripts/gerar-complementacao-pesqele.mjs`.

### B1 — Metodologia

Pesquisa quantitativa de intenção de voto realizada integralmente pela internet, por autopreenchimento no dispositivo do próprio respondente, sem entrevistadores, na plataforma pesquisa.cdlaju.com.br, desenvolvida e operada diretamente pela contratante (CDL Aracaju). Período de coleta: 13/09/2026 a 20/09/2026 (horário de Aracaju), travado no servidor — nenhum código de confirmação é enviado nem voto gravado fora dele.

Modo de resposta espontâneo, no formato da urna eletrônica: o respondente digita o número do candidato e o sistema exibe nome, foto e partido apenas para confirmação. Em todas as cédulas há voto em branco e "não sabe / não quis responder".

[REGISTRO SE/TRE] Cargos: Governador, Senador (duas indicações), Deputado Federal e Deputado Estadual.
[REGISTRO BR/TSE] Cargo: Presidente da República, com campo de coleta delimitado ao estado de Sergipe; eleitores com título em outra unidade da federação respondem somente a esta cédula.

Identificação do respondente: (1) CPF validado como pessoa física real na base cadastral da contratante ou por consulta cadastral ao SPC Brasil; (2) confirmação de posse por código de 6 dígitos (OTP) enviado ao WhatsApp informado. Uma única participação por CPF por edição. Eleitores de 16 e 17 anos informam o título de eleitor.

Sexo e faixa etária provêm do cadastro (base da contratante ou SPC — data de nascimento); o sexo é perguntado ao respondente apenas quando o cadastro não o traz, com a proveniência registrada. Grau de instrução é informado em quatro opções (não estudei / só sei ler e escrever; fundamental; médio; superior), agregadas nos três estratos do TSE. Renda familiar é informada em faixas de salários mínimos (SM 2026 = R$ 1.621), com "não sei" e "prefiro não informar".

Anonimato por arquitetura: identificação (hash irreversível do CPF) e votos ficam em tabelas sem chave de ligação; o voto é gravado sob token aleatório de sessão, com data/hora truncada para hora cheia. Cruzamentos demográficos são publicados somente com no mínimo 30 respondentes por célula. Código-fonte em repositório aberto (github.com/presidencia-svg/pesquisa).

### B2 — Plano amostral, ponderação, IC e margem

Universo: eleitorado de Sergipe segundo o TSE 2026 (perfil do eleitorado por seção eleitoral, geração de 14/07/2026): 1.740.124 eleitores, dos quais 1.740.116 mapeados nos estratos de ponderação (8 registros excluídos por faixa etária inválida), nos 75 municípios do estado.

Amostragem: não probabilística, **por adesão** (autosseleção), dentro de universo com identidade verificada. Recrutamento por convite via WhatsApp às bases de contato da contratante (com opção de saída) e por divulgação aberta. Não há cota por município nem por perfil. O número de respondentes por município e a composição da amostra serão informados na complementação prevista no art. 2º, § 7º, III e IV, após a coleta.

Ponderação pós-coleta por raking (ajuste iterativo proporcional) nas marginais município, sexo, faixa etária (16–17, 18–24, 25–34, 35–44, 45–59, 60+) e grau de instrução (fundamental, médio, superior), tendo por parâmetro o perfil do eleitorado TSE 2026 acima. O cálculo é executado integralmente no banco de dados, sobre a base completa; cada execução fica registrada com seus diagnósticos (amostra efetiva de Kish, efeito de desenho, distribuição dos pesos) e é aprovada pelo estatístico responsável antes da divulgação. Respondentes sem sexo no cadastro e que não o informaram são ajustados nas demais marginais; respondentes com título em outra UF recebem peso zero nos recortes estaduais. Nível econômico (renda em salários mínimos) é coletado para descrição da composição da amostra e não pondera, por inexistir parâmetro oficial do eleitorado por renda; o grau de instrução é a variável socioeconômica de ponderação.

Intervalo de confiança: 95%. Por se tratar de amostra por adesão, a margem de erro é **indicativa**, calculada como se a amostra fosse probabilística: margem nominal 1,96 × √(0,25/n) e margem efetiva pela mesma expressão sobre a amostra efetiva de Kish, n_eff = (Σw)² ÷ Σw². As duas serão publicadas junto aos resultados, sobre o n final. Diferenças inferiores a duas margens efetivas são tratadas como empate técnico.

### B3 — Sistema interno de controle e verificação

1. Identidade: CPF (dígitos verificadores + existência como pessoa física, pela base cadastral da contratante ou consulta ao SPC Brasil); OTP de 6 dígitos no WhatsApp; título de eleitor para 16–17 anos.
2. Unicidade: uma participação por CPF por edição (hash HMAC-SHA256, restrição de unicidade no banco); número de WhatsApp único por edição.
3. Antiautomação: verificação anti-robô (Cloudflare Turnstile); bloqueio de cadastro em navegação anônima/privativa; teto de códigos por CPF; janela de coleta travada no servidor.
4. Registro para auditoria: endereço IP, user-agent e identificador do dispositivo são armazenados para análise pós-coleta — não bloqueiam participação; não há cota nem limite por endereço IP ou por dispositivo.
5. Trilha de auditoria: ações administrativas (execução e aprovação da ponderação, complementação do registro, divulgação) protegidas por segundo fator e registradas em log; painel interno de acompanhamento da composição da amostra frente ao eleitorado TSE 2026 durante a coleta.
6. Conferência: totalizações por consultas agregadas reproduzíveis; verificação automática app × banco antes de cada divulgação; código-fonte aberto. Banco de dados e registros ficam à disposição da Justiça Eleitoral.

### B4 — Municípios abrangidos

Todo o estado de Sergipe (75 municípios), sem delimitação por bairro; coleta exclusivamente pela internet, sem pontos físicos. O município de cada respondente é o do domicílio eleitoral registrado no cadastro (código IBGE); a distribuição obtida é corrigida, após a coleta, pela ponderação descrita em B2. Lista dos 75 municípios: a mesma do Campo 4 da Parte A.

### Lembretes para a 2ª edição

- [ ] Registrar nos dois sistemas (TRE-SE e TSE) ao atingir 20 mil eleitores e antes de qualquer divulgação; informar `data_registro_pesqele` e os números na edição.
- [ ] Nome e CONRE do estatístico responsável no campo da edição + declaração assinada (art. 2º, IX).
- [ ] Custo, origem dos recursos e patrocinadores conforme a aba Dados da Pesquisa.
- [ ] Após a coleta: gerar e lançar a complementação (III/IV) com `scripts/gerar-complementacao-pesqele.mjs` e registrar a data em `/admin/edicoes`.
