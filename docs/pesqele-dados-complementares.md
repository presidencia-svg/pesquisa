# PesqEle — Dados Complementares (textos prontos pra colar)

> Aba "Dados Complementares" do Registro de Pesquisa Eleitoral (PesqEle
> Empresa). Cada campo aceita até 4.000 caracteres. Textos baseados na
> ficha técnica oficial do projeto (docs/ficha-tecnica.md).
>
> **ATENÇÃO — são DOIS registros** (o critério é o cargo, não a geografia):
> 1. Registro **SE (TRE-SE)** — cargos Governador, Senador, Dep. Federal e
>    Dep. Estadual.
> 2. Registro **BR (TSE)** — cargo Presidente da República (mesmo com campo
>    só em Sergipe).
> Os 4 textos abaixo servem pros dois registros — só ajuste a linha de
> CARGOS no campo 1 conforme indicado.

---

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

Universo: eleitoras e eleitores aptos do estado de Sergipe, num total de 1.731.960, distribuídos pelos 75 municípios do estado, conforme estatísticas do eleitorado do TSE. A distribuição do eleitorado por município consta da tabela anexada ao registro e constitui o parâmetro de ponderação geográfica.

Amostragem: não-probabilística, por adesão (autosseleção), dentro de universo com identidade verificada — todo respondente tem CPF validado como pessoa física real e posse confirmada por código enviado ao WhatsApp vinculado, com participação única por CPF. O município de domicílio eleitoral é registrado no cadastro de cada respondente (código IBGE), permitindo aferir a distribuição geográfica da amostra; o desequilíbrio entre a distribuição obtida e a distribuição oficial do eleitorado é corrigido por ponderação pós-coleta, conforme descrito adiante.

Variáveis demográficas coletadas de cada respondente: sexo; faixa etária (16–17, 18–24, 25–34, 35–44, 45–59, 60+); grau de instrução (fundamental, médio e superior, completo/incompleto); nível econômico (renda autodeclarada em faixas).

Ponderação pós-coleta (pós-estratificação): atribuição de pesos por estrato município × sexo × faixa etária × grau de instrução, com fator peso = proporção do estrato no eleitorado TSE ÷ proporção do estrato na amostra, tendo por parâmetro a distribuição oficial do eleitorado sergipano. Quanto ao nível econômico: inexiste estatística oficial do eleitorado por faixa de renda que sirva de parâmetro de ponderação; a variável é coletada e utilizada em análise de consistência, adotando-se o grau de instrução como variável socioeconômica de ponderação (proxy consolidado na literatura, correlação escolaridade-renda conforme IBGE/PNAD). Os resultados divulgados correspondem à agregação ponderada; as tabelas de estratos acompanham a documentação anexada.

Intervalo de confiança: 95%. Margem de erro estimada pela expressão 1,96 × √(0,25/n) sobre o total de respondentes: n = 5.000 → ±1,4 ponto percentual; n = 10.000 → ±1,0 p.p.; n = 20.000 → ±0,7 p.p. A margem efetiva será recalculada sobre o n final da coleta e publicada junto aos resultados. Diferenças entre candidatos inferiores a duas margens de erro são tratadas como empate técnico. Recortes (municipais ou demográficos) possuem margem proporcionalmente maior e somente são publicados com no mínimo 30 respondentes por célula.

---

## Campo 3 — Sistema interno de controle, verificação, conferência e fiscalização

A coleta é 100% digital e sem entrevistadores: o "trabalho de campo" é executado pela própria plataforma, com controles automáticos, registrados e auditáveis:

1. Validação de identidade: CPF verificado (dígitos verificadores e existência como pessoa física) contra base própria de 44.545 CPFs previamente validados ou consulta em tempo real ao SPC Brasil; confirmação de posse por código OTP de 6 dígitos enviado ao WhatsApp vinculado ao CPF.

2. Unicidade: uma participação por CPF por edição, garantida por hash irreversível (HMAC-SHA256) do CPF — o CPF nunca é armazenado em claro — e por restrições de unicidade e gatilhos no banco de dados que rejeitam duplicidade mesmo sob tentativa de burla (reenvio simultâneo, repetição de cédula).

3. Antifraude e antiautomação: verificação anti-robô (Cloudflare Turnstile), limite de requisições por endereço IP, máximo de 2 CPFs por dispositivo, bloqueio de cadastro em navegação anônima e cotas de participação por município.

4. Integridade e trilha de auditoria: ações administrativas registradas em log de auditoria; registros de coleta imutáveis; painel interno de acompanhamento em tempo real (evolução do total de respostas, distribuição geográfica e demográfica), monitorado pela equipe técnica e pelo estatístico responsável para detecção de anomalias (picos atípicos, concentração por IP ou dispositivo).

5. Conferência da apuração: totalizações obtidas por consultas agregadas reproduzíveis diretamente do banco de dados; qualquer recontagem é determinística. O código-fonte da plataforma é publicado em repositório aberto (github.com/presidencia-svg/pesquisa), permitindo auditoria externa da lógica de coleta e de apuração.

6. Segurança: comunicação exclusivamente sob HTTPS; testes de intrusão internos periódicos e varredura automatizada de vulnerabilidades integrada ao processo de publicação de código.

O sistema interno descrito, incluindo banco de dados e registros de auditoria, fica à disposição da Justiça Eleitoral para verificação, nos termos da legislação aplicável.

---

## Campo 4 — Municípios e bairros abrangidos

A pesquisa abrange a totalidade do estado de Sergipe: todos os seus 75 municípios, sem delimitação por bairro. Por se tratar de coleta exclusivamente pela internet, com autopreenchimento no dispositivo do próprio respondente, não há pontos físicos de coleta; a área de realização da pesquisa é o território do estado de Sergipe. O município de cada respondente é identificado no cadastro (domicílio declarado, com código IBGE) e a participação é controlada por cota proporcional ao eleitorado TSE de cada município.

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
