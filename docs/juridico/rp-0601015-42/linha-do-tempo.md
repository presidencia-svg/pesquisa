# Linha do tempo — registros eletrônicos da Pesquisa Eleitoral Sergipe 2026

Fontes: banco de dados da pesquisa (tabela `edicao`, trilha `admin_audit_log`, agregados de `eleitores_pesquisa` e `votos_pesquisa`), repositório público do código-fonte (github.com/presidencia-svg/pesquisa — hashes dos commits) e o PesqEle. Horários em horário de Brasília (BRT). Nenhum dado pessoal.

## 1. Eventos

| Data/hora (BRT) | Evento | Prova |
| --- | --- | --- |
| 22/08/2026, 17:35 | Edição criada na plataforma com os dados do registro (registro TRE `SE-09441/2026 · BR-04041/2026`, data de registro PesqEle 22/08/2026, CONRE 8223) | `edicao.criado_em`; Anexo Técnico, seção 6 |
| 22/08/2026, 17:53 | Textos dos quatro campos do registro versionados no repositório público | commit `b0e9a7b` |
| 22/08/2026 | Registro no PesqEle: SE-09441/2026 (TRE-SE) e BR-04041/2026 (TSE); "data de divulgação" informada: 28/08/2026 (data mínima admitida pelo sistema; o controle interno da CDL anotou 27/08 como primeiro dia liberado) — confirmado no espelho público em 08/09/2026 | espelho ID 12163645; `docs/pesqele-registro/REGISTROS.txt` |
| 01/09/2026, 00:06:43 | Primeiro cadastro (início da coleta; período configurado 01/09 00:00 → 03/09 23:59:59) | `eleitores_pesquisa` (agregado); commit `10a4b27` (01/09 00:06) |
| 01/09 a 03/09/2026 | Coleta: 7.396 / 1.457 / 2.473 cadastros por dia; 6.552 / 1.348 / 2.271 respondentes; 38.250 / 7.912 / 13.403 respostas | Anexo Técnico, seção 6 |
| 01/09 a 02/09/2026 | Quatro "snapshots" internos para teste do painel de TV, todos anotados `ja_divulgada: false` — sem publicação | `admin_audit_log` (`gerar_snapshot_tv`) |
| 03/09/2026, 23:52 e 23:56 | Páginas públicas passam a exibir cronômetro e endpoint de status (sem números) | commits `0ce5cb9`, `c124c9a` |
| 04/09/2026, 00:00–00:59 | 29 respostas de 6 sessões iniciadas antes do encerramento e concluídas após a meia-noite (o sistema bloqueia novas sessões após o fim, mas deixa concluir a aberta) | Anexo Técnico, seção 6 |
| 04/09/2026, 00:10 | Aviso de registro (TRE/TSE) nas páginas públicas | commit `4d43010` |
| 04/09/2026, 06:51 | Documento de complementação (§7º) preparado no repositório | commit `5c7f27b` |
| 04/09/2026, 09:14:54 | **Divulgação** — única ação `marcar_divulgacao`, com código TOTP do responsável | `edicao.divulgada_em` = 2026-09-04T12:14:54.904Z; `admin_audit_log` |
| 04/09/2026, 09:15–11:15 | 8.050 notificações de resultado por WhatsApp, só a quem optou (8.900 opt-ins) | `eleitores_pesquisa.resultado_enviado_em` (agregado) |
| 04/09/2026, 09:18 | Documento de complementação revisado com os dados extraídos após a divulgação (10.310 participantes; 75/75 municípios; composição por sexo, idade, instrução, nível) | commit `a536ed7`; `docs/pesqele-registro/complementacao-2026-09-04.md` |
| 04/09/2026 | [Lançamento da complementação no PesqEle — confirmar se/como foi feito e em que campo] | [recibo] |
| 05/09/2026 | Prazo do art. 2º, §7º (dia seguinte ao da divulgação), segundo a decisão | decisão, ID 12163647 |
| 06/09/2026, 13:31 | Percentuais ponderados por município publicados ao lado dos brutos | commit `9e3f90f` |
| 06/09/2026, 14:04 e 14:10 | Correção de paginação nas views (limite de 1.000 linhas) e ponderação calculada no banco com verificador automático | commits `026b26c`, `cc9f084` |
| 06/09/2026, 19:58 | Consulta ao PesqEle Público pelo juízo/PRE: complementação não localizada | decisão, ID 12163646 |
| 07/09/2026, 13:12 | Decisão: tutela deferida em parte (suspensão em 24 h; multa R$ 20.000/ato; defesa em 2 dias; reapreciação após a complementação) | Rp 0601015-42.2026.6.25.0000 |
| 08/09/2026 | Espelho público de SE-09441/2026 consultado no PesqEle Público: cargos "Governador, Senador, Deputado Federal, Deputado Estadual, Deputado Distrital"; data de divulgação 28/08/2026; campo Metodologia com a frase "Presidente da República" (texto do registro nacional); anexos: DRE, questionário, bairros/municípios, declaração do responsável técnico, relatório de resultado | PesqEle Público, detalhar SE-09441/2026 |
| 08/09/2026 | Mecanismo de suspensão judicial implantado na plataforma (com a chave desligada), Anexo Técnico gerado e pop-up do site da CDL preparado | commits `a0526c2` (pesquisa) e `149b1f8` (cdlaju-site); `anexo-tecnico-numeros.json` |
| 08/09/2026, 10:47 | **Sítio pesquisa.cdlaju.com.br retirado do ar por inteiro**, por determinação do presidente da CDL, antes da intimação: todas as páginas públicas respondem "site temporariamente indisponível" (HTTP 503, sem números); a interface de situação informa `suspensa: true` e o pop-up de cdlaju.com.br passa a exibir "Divulgação temporariamente suspensa" | commit `b59a662` (10:46); deploy Vercel; conferência de rotas às 10:47:18 |
| [dd/mm/2026, hh:mm] | Intimação da CDL | [ID] |
| [dd/mm/2026, hh:mm] | Suspensão acionada (TOTP) — todas as superfícies públicas bloqueadas | `admin_audit_log` (`suspender_divulgacao`) |
| [dd/mm/2026, hh:mm] | Complementação lançada no PesqEle (SE e BR), tabelas de estratos e Anexo Técnico anexados | recibos |

## 2. Observações

- A trilha de auditoria registra **uma única** ação de divulgação para a edição real (04/09/2026, 09:14:54). As duas ações `retirar_divulgacao` existentes na base referem-se à **edição de demonstração** (dados fictícios usados em testes), não à pesquisa registrada.
- Todas as consultas administrativas anteriores a 04/09 (`view_resultados_pre_divulgacao`) são visualizações internas do responsável, sem qualquer publicação; as páginas públicas só exibiram números após `divulgada_em`.
- A data de divulgação **não foi alterada** em nenhum momento; a suspensão judicial usa campos próprios (`suspensa_em`, `suspensao_motivo`) justamente para preservar a prova da data original.

## 3. Commits do repositório público desde 20/08/2026 (horário de Brasília)

| Commit | Data/hora | Mensagem |
| --- | --- | --- |
| `cc9f084` | 06/09/2026 14:10 | fix(resultados): ponderacao calculada no banco + trava de duplicidade + verificador automatico  |
| `026b26c` | 06/09/2026 14:04 | fix(projecao): paginacao das views com ORDER BY estavel — admin somava votos errados  |
| `9e3f90f` | 06/09/2026 13:31 | feat(resultados): percentuais ponderados por municipio (registro PesqEle) com o bruto ao lado  |
| `873ac73` | 04/09/2026 10:00 | perf(resultados): paginas por cargo viram ISR de verdade (generateStaticParams)  |
| `f91e288` | 04/09/2026 09:48 | perf(resultados): cache agressivo nas paginas publicas — banco saturou no pico pos-divulgacao  |
| `3fb6ef7` | 04/09/2026 09:33 | chore(admin): rotas do admin sempre dinamicas (build nao pre-renderiza /admin) + redeploy da correcao do lote de WhatsApp  |
| `aef1fe0` | 04/09/2026 09:28 | fix(notificar): lote respeita o maxDuration e roda 6 envios em paralelo  |
| `a536ed7` | 04/09/2026 09:18 | docs(pesqele): amostra final reextraida apos a divulgacao (n = 10.310, igual ao site)  |
| `9e6d4ee` | 04/09/2026 09:15 | fix(admin): validacao do registro extrai os numeros e ignora o separador (qualquer ponto/espaco)  |
| `c687673` | 04/09/2026 09:12 | fix(admin): botao Divulgar aceita os dois numeros de registro (TSE + TRE)  |
| `d0471e0` | 04/09/2026 06:52 | feat(resultados): pagina por cargo mostra a amostra da pesquisa (mesmo n do hub e da TV)  |
| `5c7f27b` | 04/09/2026 06:51 | docs(pesqele): dados da amostra final pra complementacao do registro (art. 2º §7º Res. 23.600) — só agregados  |
| `4d43010` | 04/09/2026 00:10 | feat(transparencia): aviso oficial de registro na Justica Eleitoral (art. 33) e como conferir  |
| `c124c9a` | 03/09/2026 23:56 | feat(resultados): logo CDL Pesquisas e hora na tela "em breve"; endpoint publico de status da divulgacao  |
| `0ce5cb9` | 03/09/2026 23:52 | feat(resultados): cronometro regressivo ate a divulgacao prevista  |
| `3f2ffc9` | 03/09/2026 23:13 | fix(resultados): brancos/indecisos e lideres regionais nao sao mais contados sobre 1.000 linhas  |
| `46b1cfb` | 03/09/2026 22:58 | feat(projecao): apuracao agrupa pela coligacao/federacao oficial do TSE, nao por partido  |
| `a562c68` | 03/09/2026 22:50 | feat(projecao): cadeiras de deputado apuradas como o TSE — federacoes e travas legais  |
| `0c1335c` | 03/09/2026 00:22 | fix(convite): envio confirmado pela Meta nunca mais vira "pendente" no banco  |
| `e1563c6` | 03/09/2026 00:22 | fix(votar): rate limit por IP nao barra mais casa/loja com Wi-Fi compartilhado  |
| `27bf8da` | 02/09/2026 16:25 | fix(convite): excecao no envio nao derruba mais o lote inteiro  |
| `448d697` | 02/09/2026 16:25 | feat(artes): posts de Instagram (feed 1080 e story 1080x1920) da pesquisa  |
| `b2caa19` | 02/09/2026 15:48 | feat(cedula): busca do candidato vira botao grande; 'nao sei' vira 'Nao quero responder'  |
| `327097b` | 02/09/2026 09:53 | feat(admin): cobertura por municipio (eleitorado x participantes x votos x %)  |
| `c832afd` | 02/09/2026 09:15 | feat(tv): coluna de patrocinio vira ficha tecnica da pesquisa  |
| `cb3d20d` | 01/09/2026 19:28 | feat(votar): tela 'Consultando seu CPF' bloqueante durante a validacao  |
| `b65f914` | 01/09/2026 19:14 | fix(spc): retry 3->4 tentativas com backoff quadratico + jitter (~7s)  |
| `d6c382b` | 01/09/2026 09:48 | feat(votar): local de voto = estado + municipio (Brasil inteiro); fora de SE vota so presidente  |
| `63641fe` | 01/09/2026 09:13 | feat(localizacao): fator de localizacao vira toggle por edicao no admin (default: desligado)  |
| `984e5de` | 01/09/2026 08:37 | fix(localizacao): aceita qualquer IP do Brasil — pesquisa e do eleitorado de SE inteiro (1,73mi)  |
| `11f7cee` | 01/09/2026 08:28 | feat(localizacao): 3 vias sem friccao + guia de GPS por aparelho  |
| `baa87ff` | 01/09/2026 08:16 | fix(votar): remove bloqueio por aparelho — digital colide e barrava eleitor real  |
| `20f1bf3` | 01/09/2026 07:51 | feat(cedula): busca do candidato pelo nome (mantendo a pesquisa espontanea)  |
| `9eeac5a` | 01/09/2026 07:26 | fix(votar): trava por aparelho passa de 1 p/ 4 CPFs (barrava eleitor legitimo)  |
| `7471479` | 01/09/2026 07:19 | fix(spc): URGENTE reverte codigoProduto 1182 -> 11 (bloqueava eleitores)  |
| `77c71f3` | 01/09/2026 06:00 | feat(convite): script de disparo do convite p/ base do Melhores do Ano  |
| `ba8edcb` | 01/09/2026 00:48 | feat(convite): banner do WhatsApp p/ convite da base (1080x566, logo CDL Pesquisas)  |
| `10a4b27` | 01/09/2026 00:06 | fix(edicao): desliga override de teste por padrão (coleta real começou)  |
| `c410f74` | 31/08/2026 21:03 | fix(admin): Visão Geral conta candidatos/fotos só da edição ativa  |
| `76464a3` | 31/08/2026 20:49 | feat(admin): mostra a foto do candidato na lista (número vira selo no canto)  |
| `f6d2fd0` | 31/08/2026 20:04 | config(spc): codigoProduto 11 -> 1182 (produto contratado CDL Aracaju)  |
| `9915a06` | 31/08/2026 19:35 | feat(cedula): chapa majoritária — vice (presidente/governador) e suplentes (senador)  |
| `2c65427` | 31/08/2026 17:42 | fix(geo): Permissions-Policy geolocation=(self) — GPS plano B estava bloqueado no Chrome  |
| `b8bffc0` | 31/08/2026 14:14 | fix(sessao): descarta rascunho/cápsula de OUTRA edição — voto nunca cai na edição errada  |
| `41a5af1` | 31/08/2026 13:57 | docs: lista dos 388 candidatos (TSE), convênio TV Atalaia atualizado, brief jurídico e testador de GPS  |
| `536258f` | 31/08/2026 13:38 | test(votar): ?forcar_gps=1 força a tela do GPS pra validar o plano B  |
| `e9194a1` | 31/08/2026 13:33 | feat(diagnostico): /api/onde — mostra o que a Vercel resolve do IP do visitante  |
| `4e94217` | 31/08/2026 13:29 | feat(localizacao): IP-first (headers Vercel) com GPS de plano B — zero fricção  |
| `6c2c616` | 31/08/2026 12:27 | feat(teste): link de teste com base fictícia + testador de GPS  |
| `87691ab` | 31/08/2026 11:22 | chore(marca): nomeia 'TV Atalaia' onde havia 'TV'/'telejornal parceiro' solto  |
| `fde5a6f` | 31/08/2026 11:11 | feat(divulgar): exige código do Google Authenticator (TOTP) para liberar resultado  |
| `e82eb0a` | 31/08/2026 11:06 | fix(votar): inicializa a fase no render pra o cronômetro aparecer sem flash  |
| `e817861` | 31/08/2026 11:03 | feat(votar): janela de coleta + cronômetro + gate de localização grande  |
| `3efa4c9` | 30/08/2026 22:02 | fix(rodape): mostra os registros reais (SE-09441/2026 · BR-04041/2026)  |
| `93ae3c3` | 30/08/2026 21:56 | fix(votar): remove patrocinadores da jornada e desativa bloqueio de GPS  |
| `00cdbfc` | 30/08/2026 21:36 | feat(votar): fator de localização — eleitor deve estar em Sergipe (bloqueio rígido por GPS)  |
| `3d0bd88` | 26/08/2026 10:03 | feat(resultados): remove patrocinadores da exibição pública da pesquisa  |
| `169f1e7` | 26/08/2026 09:30 | feat(votar): exige e valida título de eleitor para 16-17 anos  |
| `c32e789` | 25/08/2026 10:46 | fix(seguranca): fecha buracos críticos da revalidação 25/08  |
| `b0e9a7b` | 22/08/2026 17:53 | feat(edicoes): importador DivulgaCand, demo fictícia e registro PesqEle  |
| `f893d91` | 22/08/2026 17:51 | chore(seguranca): ignora docs/confidencial (removida do histórico público)  |
