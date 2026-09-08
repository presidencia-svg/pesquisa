# Anexo Técnico — Números solicitados (Rp 0601015-42.2026.6.25.0000)

**Pesquisa Eleitoral Sergipe 2026 · CDL Aracaju (CNPJ 13.045.935/0001-36)** · Registros TRE-SE SE-09441/2026 · TSE BR-04041/2026 · Registro no PesqEle em 22/08/2026 · Coleta 01/09/2026 a 03/09/2026 · Divulgação 04/09/2026, 09:14:54 (BRT).

Gerado automaticamente em 08/09/2026, 09:13:14 (BRT) a partir do banco de dados da pesquisa (edição "Pesquisa Sergipe 2026 — 1ª edição (1º turno)") pelo script `scripts/anexo-rp-0601015.mjs`, cujo código-fonte é público (github.com/presidencia-svg/pesquisa). Todos os números são agregados; nenhum dado pessoal é lido ou exibido. Os mesmos números constam de `anexo-tecnico-numeros.json` para conferência pericial.

## 1. Resumo da coleta

| Indicador | Valor |
| --- | ---: |
| Eleitorado de Sergipe (TSE, base do cadastro de municípios) | 1.731.960 |
| Municípios cobertos / total | 75 / 75 |
| Amostra planejada (cota proporcional ao eleitorado) | 20.004 |
| Cadastros iniciados (CPF verificado) | 11.326 |
| — via base CDL / via SPC | 2.202 / 9.124 |
| Participantes com WhatsApp validado (OTP) | 10.306 |
| — residentes em Sergipe / fora de Sergipe | 10.281 / 25 |
| Tokens de voto emitidos / usados | 10.313 / 9.767 |
| Respondentes distintos (sessões com ao menos um voto) | 10.166 |
| — em Sergipe (entram na ponderação) / fora de SE (peso 0) | 10.145 / 21 |
| Respostas válidas (número) / brancas / não sabe | 53.709 / 3.170 / 2.715 |
| Primeiro cadastro (BRT) | 01/09/2026, 00:06:43 |
| Encerramento programado da coleta (BRT) | 03/09/2026, 23:59:59 |
| Divulgação (marcada com TOTP pelo responsável, BRT) | 04/09/2026, 09:14:54 |

## 2. Art. 2º, §7º, III — número de pesquisados por unidade territorial (município)

Unidade territorial adotada: **município** (75 municípios de Sergipe), com a justificativa técnica prevista no art. 2º, §7º-F: a coleta foi integralmente digital e estadual (identidade verificada por CPF e WhatsApp), sem abordagem domiciliar, de modo que o setor censitário não é uma unidade operacional da coleta — o município é a menor unidade em que o participante é localizado e em que existe parâmetro oficial (eleitorado TSE) para controle e ponderação. "Planejado" é a cota proporcional ao eleitorado de cada município sobre uma meta de 20.000 participantes; "Validados" são os participantes com WhatsApp validado; "Respondentes" são as sessões distintas com ao menos um voto registrado (base da ponderação); "Peso" é o fator de pós-estratificação aplicado (seção 3).

| Município | Região | Eleitorado | % eleit. | Planejado | Validados | Respondentes | % amostra | Peso |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Aracaju | Grande Aracaju | 416.605 | 24,05% | 4.811 | 4.130 | 4.061 | 39,95% | 0,6021 |
| Nossa Senhora do Socorro | Grande Aracaju | 121.723 | 7,03% | 1.406 | 812 | 796 | 7,83% | 0,8976 |
| Lagarto | Centro-Sul | 80.724 | 4,66% | 932 | 327 | 327 | 3,22% | 1,4490 |
| Itabaiana | Agreste | 75.563 | 4,36% | 873 | 443 | 440 | 4,33% | 1,0080 |
| São Cristóvão | Grande Aracaju | 61.587 | 3,56% | 711 | 329 | 329 | 3,24% | 1,0988 |
| Estância | Centro-Sul | 51.062 | 2,95% | 590 | 209 | 205 | 2,02% | 1,4620 |
| Tobias Barreto | Centro-Sul | 41.941 | 2,42% | 484 | 104 | 103 | 1,01% | 2,3901 |
| Simão Dias | Centro-Sul | 37.027 | 2,14% | 428 | 166 | 166 | 1,63% | 1,3093 |
| Itabaianinha | Centro-Sul | 32.348 | 1,87% | 374 | 134 | 133 | 1,31% | 1,4276 |
| Barra dos Coqueiros | Grande Aracaju | 30.257 | 1,75% | 349 | 208 | 203 | 2,00% | 0,8749 |
| Itaporanga d'Ajuda | Grande Aracaju | 29.885 | 1,73% | 345 | 290 | 288 | 2,83% | 0,6091 |
| Nossa Senhora da Glória | Sertão | 29.446 | 1,70% | 340 | 138 | 137 | 1,35% | 1,2616 |
| Capela | Leste Sergipano | 27.337 | 1,58% | 316 | 123 | 121 | 1,19% | 1,3261 |
| Canindé de São Francisco | Sertão | 24.884 | 1,44% | 287 | 40 | 40 | 0,39% | 3,6515 |
| Porto da Folha | Sertão | 24.637 | 1,42% | 284 | 142 | 137 | 1,35% | 1,0556 |
| Poço Redondo | Sertão | 22.637 | 1,31% | 261 | 66 | 65 | 0,64% | 2,0442 |
| Laranjeiras | Grande Aracaju | 22.426 | 1,29% | 259 | 42 | 41 | 0,40% | 3,2106 |
| Boquim | Centro-Sul | 22.168 | 1,28% | 256 | 51 | 51 | 0,50% | 2,5513 |
| Nossa Senhora das Dores | Agreste | 21.305 | 1,23% | 246 | 50 | 50 | 0,49% | 2,5011 |
| Propriá | Leste Sergipano | 20.350 | 1,17% | 235 | 185 | 183 | 1,80% | 0,6527 |
| Poço Verde | Centro-Sul | 19.792 | 1,14% | 229 | 57 | 56 | 0,55% | 2,0745 |
| Umbaúba | Centro-Sul | 18.255 | 1,05% | 211 | 41 | 41 | 0,40% | 2,6134 |
| Salgado | Centro-Sul | 18.123 | 1,05% | 209 | 41 | 40 | 0,39% | 2,6594 |
| Riachão do Dantas | Centro-Sul | 17.874 | 1,03% | 206 | 27 | 27 | 0,27% | 3,8857 |
| Aquidabã | Leste Sergipano | 17.451 | 1,01% | 202 | 128 | 128 | 1,26% | 0,8002 |
| Carira | Agreste | 17.195 | 0,99% | 199 | 141 | 140 | 1,38% | 0,7209 |
| Campo do Brito | Agreste | 15.766 | 0,91% | 182 | 29 | 29 | 0,29% | 3,1911 |
| Areia Branca | Agreste | 15.245 | 0,88% | 176 | 15 | 15 | 0,15% | 5,9655 |
| Japaratuba | Leste Sergipano | 14.988 | 0,87% | 173 | 69 | 68 | 0,67% | 1,2937 |
| Cristinápolis | Centro-Sul | 14.983 | 0,87% | 173 | 23 | 22 | 0,22% | 3,9975 |
| Ribeirópolis | Agreste | 14.679 | 0,85% | 170 | 89 | 86 | 0,85% | 1,0019 |
| Neópolis | Leste Sergipano | 14.569 | 0,84% | 168 | 68 | 68 | 0,67% | 1,2576 |
| Indiaroba | Centro-Sul | 14.202 | 0,82% | 164 | 18 | 18 | 0,18% | 4,6312 |
| Frei Paulo | Agreste | 13.645 | 0,79% | 158 | 62 | 60 | 0,59% | 1,3349 |
| Maruim | Leste Sergipano | 13.300 | 0,77% | 154 | 41 | 41 | 0,40% | 1,9041 |
| Carmópolis | Leste Sergipano | 13.098 | 0,76% | 151 | 83 | 82 | 0,81% | 0,9376 |
| Monte Alegre de Sergipe | Sertão | 12.921 | 0,75% | 149 | 56 | 56 | 0,55% | 1,3543 |
| Santa Luzia do Itanhy | Centro-Sul | 12.803 | 0,74% | 148 | 12 | 12 | 0,12% | 6,2624 |
| Pacatuba | Leste Sergipano | 12.031 | 0,69% | 139 | 20 | 20 | 0,20% | 3,5309 |
| Japoatã | Leste Sergipano | 11.699 | 0,68% | 135 | 29 | 29 | 0,29% | 2,3679 |
| Santo Amaro das Brotas | Leste Sergipano | 10.793 | 0,62% | 125 | 36 | 35 | 0,34% | 1,8100 |
| Tomar do Geru | Centro-Sul | 10.717 | 0,62% | 124 | 35 | 35 | 0,34% | 1,7973 |
| Malhador | Agreste | 10.340 | 0,60% | 119 | 52 | 51 | 0,50% | 1,1900 |
| Moita Bonita | Agreste | 9.881 | 0,57% | 114 | 17 | 16 | 0,16% | 3,6249 |
| Arauá | Centro-Sul | 9.856 | 0,57% | 114 | 8 | 8 | 0,08% | 7,2314 |
| Gararu | Sertão | 9.592 | 0,55% | 111 | 57 | 56 | 0,55% | 1,0054 |
| Rosário do Catete | Leste Sergipano | 9.181 | 0,53% | 106 | 43 | 41 | 0,40% | 1,3144 |
| Pirambu | Leste Sergipano | 9.001 | 0,52% | 104 | 51 | 49 | 0,48% | 1,0782 |
| São Domingos | Agreste | 8.725 | 0,50% | 101 | 207 | 206 | 2,03% | 0,2486 |
| Riachuelo | Leste Sergipano | 8.619 | 0,50% | 100 | 30 | 30 | 0,30% | 1,6864 |
| Brejo Grande | Leste Sergipano | 8.315 | 0,48% | 96 | 11 | 11 | 0,11% | 4,4369 |
| Pedrinhas | Centro-Sul | 8.043 | 0,46% | 93 | 10 | 10 | 0,10% | 4,7210 |
| Ilha das Flores | Leste Sergipano | 7.801 | 0,45% | 90 | 20 | 20 | 0,20% | 2,2895 |
| Nossa Senhora Aparecida | Agreste | 7.687 | 0,44% | 89 | 40 | 41 | 0,40% | 1,1005 |
| Muribeca | Leste Sergipano | 7.678 | 0,44% | 89 | 36 | 36 | 0,35% | 1,2519 |
| Siriri | Leste Sergipano | 7.022 | 0,41% | 81 | 51 | 51 | 0,50% | 0,8082 |
| Macambira | Agreste | 6.891 | 0,40% | 80 | 12 | 12 | 0,12% | 3,3706 |
| Santana do São Francisco | Leste Sergipano | 6.484 | 0,37% | 75 | 6 | 5 | 0,05% | 7,6118 |
| Graccho Cardoso | Agreste | 6.462 | 0,37% | 75 | 32 | 32 | 0,31% | 1,1853 |
| Feira Nova | Sertão | 6.345 | 0,37% | 73 | 12 | 12 | 0,12% | 3,1036 |
| Nossa Senhora de Lourdes | Leste Sergipano | 6.245 | 0,36% | 72 | 49 | 49 | 0,48% | 0,7481 |
| Pinhão | Centro-Sul | 5.607 | 0,32% | 65 | 13 | 13 | 0,13% | 2,5316 |
| Cedro de São João | Leste Sergipano | 5.441 | 0,31% | 63 | 44 | 43 | 0,42% | 0,7427 |
| Itabi | Sertão | 4.851 | 0,28% | 56 | 39 | 38 | 0,37% | 0,7493 |
| Santa Rosa de Lima | Sertão | 4.736 | 0,27% | 55 | 30 | 30 | 0,30% | 0,9266 |
| Canhoba | Sertão | 4.721 | 0,27% | 55 | 93 | 92 | 0,90% | 0,3012 |
| Cumbe | Sertão | 4.514 | 0,26% | 52 | 12 | 12 | 0,12% | 2,2080 |
| Divina Pastora | Leste Sergipano | 4.402 | 0,25% | 51 | 78 | 78 | 0,77% | 0,3313 |
| Malhada dos Bois | Leste Sergipano | 4.246 | 0,25% | 49 | 13 | 13 | 0,13% | 1,9171 |
| São Miguel do Aleixo | Agreste | 4.108 | 0,24% | 47 | 24 | 24 | 0,24% | 1,0047 |
| São Francisco | Leste Sergipano | 3.848 | 0,22% | 44 | 19 | 19 | 0,19% | 1,1888 |
| Telha | Leste Sergipano | 3.729 | 0,22% | 43 | 24 | 24 | 0,24% | 0,9120 |
| Pedra Mole | Agreste | 3.476 | 0,20% | 40 | 5 | 5 | 0,05% | 4,0806 |
| General Maynard | Leste Sergipano | 3.406 | 0,20% | 39 | 20 | 20 | 0,20% | 0,9996 |
| Amparo do São Francisco | Leste Sergipano | 2.666 | 0,15% | 31 | 14 | 14 | 0,14% | 1,1177 |
| **Total Sergipe** |  | **1.731.960** | **100,00%** | **20.004** | **10.281** | **10.145** | **99,79%** |  |
| Fora de Sergipe (título eleitoral de outra UF) | — | — | — | — | 25 | 21 | 0,21% | 0,0000 |

## 3. Ponderação aplicada (pós-estratificação por município) e amostra efetiva

Fórmula do peso de cada município *i* (view `v_peso_municipio`):

> peso_i = (eleitorado_i ÷ Σ eleitorado) ÷ (respondentes_i ÷ Σ respondentes)

Σ eleitorado é somado sobre os municípios com ao menos um respondente (75 de 75; 1.731.960 eleitores) e Σ respondentes sobre todas as sessões com município informado (10.166, incluindo as 21 de fora de Sergipe, que recebem peso 0 por não pertencerem ao eleitorado sergipano). Cada voto é multiplicado pelo peso do município do respondente; os percentuais ponderados são a razão entre somas de pesos. Recalculando os pesos a partir das contagens desta tabela, o maior desvio em relação aos pesos armazenados na view é 8.88e-16 (diferença de arredondamento).

| Medida | Valor |
| --- | ---: |
| Respondentes ponderados (n, Sergipe) | 10.145 |
| Σ n_i·w_i | 10.166,00 |
| Σ n_i·w_i² | 15.554,09 |
| Amostra efetiva de Kish — n_eff = (Σ n·w)² ÷ Σ n·w² | 6.644,4 |
| Efeito do desenho — deff = n ÷ n_eff | 1,527 |
| Margem de erro nominal (95%, p = 0,5) sobre n | ± 0,97 p.p. |
| Margem de erro ajustada (95%) sobre n_eff | ± 1,20 p.p. |
| Menor peso | 0,2486 (São Domingos) |
| Maior peso | 7,6118 (Santana do São Francisco) |

Nível econômico não é ponderado por inexistência de parâmetro oficial no eleitorado (conforme o plano amostral registrado). Sexo, faixa etária e grau de instrução foram coletados (seção 4) e as tabelas de estratos do plano acompanham o documento "Tabela de Estratos e Ponderação"; os resultados foram divulgados em 04/09/2026 pela contagem direta; a pós-estratificação por município acima descrita foi calculada e publicada ao lado dos valores brutos em 06/09/2026, e os cruzamentos por sexo × faixa etária × instrução ficam à disposição para a ponderação completa a critério do estatístico responsável e da perícia.

## 4. Art. 2º, §7º, IV — composição da amostra final

Base: 10.306 participantes com identidade verificada (CPF + WhatsApp), conforme cadastro respondido pelo próprio participante. "Não informado" corresponde ao campo deixado em branco.

### 4.1. Sexo

| Sexo | Participantes | % |
| --- | ---: | ---: |
| Feminino | 3.468 | 33,65% |
| Masculino | 4.568 | 44,32% |
| Não informado | 2.270 | 22,03% |
| **Total** | **10.306** | **100,00%** |

### 4.2. Faixa etária

| Faixa etária | Participantes | % |
| --- | ---: | ---: |
| 18-24 | 1.147 | 11,13% |
| 25-34 | 2.902 | 28,16% |
| 35-44 | 3.149 | 30,56% |
| 45-59 | 2.534 | 24,59% |
| 60+ | 574 | 5,57% |
| **Total** | **10.306** | **100,00%** |

### 4.3. Grau de instrução

| Grau de instrução | Participantes | % |
| --- | ---: | ---: |
| Fundamental | 553 | 5,37% |
| Médio | 4.471 | 43,38% |
| Superior | 5.282 | 51,25% |
| **Total** | **10.306** | **100,00%** |

### 4.4. Nível econômico (autodeclarado)

| Nível econômico (autodeclarado) | Participantes | % |
| --- | ---: | ---: |
| Classe A | 398 | 3,86% |
| Classe B | 1.731 | 16,80% |
| Classe C | 2.642 | 25,64% |
| Classes D/E | 1.754 | 17,02% |
| Não informado | 3.781 | 36,69% |
| **Total** | **10.306** | **100,00%** |

### 4.5. Região de Sergipe

| Região de Sergipe | Participantes | % |
| --- | ---: | ---: |
| Grande Aracaju | 5.811 | 56,38% |
| Centro-Sul | 1.276 | 12,38% |
| Leste Sergipano | 1.291 | 12,53% |
| Agreste | 1.218 | 11,82% |
| Sertão | 685 | 6,65% |
| Fora de Sergipe (peso 0) | 25 | 0,24% |
| **Total** | **10.306** | **100,00%** |

### 4.6. Cruzamento sexo × faixa etária × grau de instrução

| Sexo | Faixa etária | Fundamental | Médio | Superior | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| Feminino | 18-24 | 0 | 63 | 43 | 106 |
| Feminino | 25-34 | 41 | 392 | 533 | 966 |
| Feminino | 35-44 | 55 | 458 | 642 | 1.155 |
| Feminino | 45-59 | 75 | 361 | 565 | 1.001 |
| Feminino | 60+ | 33 | 67 | 140 | 240 |
| Masculino | 18-24 | 2 | 72 | 60 | 134 |
| Masculino | 25-34 | 43 | 513 | 558 | 1.114 |
| Masculino | 35-44 | 75 | 706 | 904 | 1.685 |
| Masculino | 45-59 | 103 | 530 | 700 | 1.333 |
| Masculino | 60+ | 18 | 101 | 183 | 302 |
| Não informado | 18-24 | 37 | 598 | 272 | 907 |
| Não informado | 25-34 | 38 | 395 | 389 | 822 |
| Não informado | 35-44 | 14 | 130 | 165 | 309 |
| Não informado | 45-59 | 14 | 73 | 113 | 200 |
| Não informado | 60+ | 5 | 12 | 15 | 32 |

### 4.7. Nível econômico × sexo

| Nível econômico | Feminino | Masculino | Não informado | Total |
| --- | ---: | ---: | ---: | ---: |
| Classe A | 66 | 285 | 47 | 398 |
| Classe B | 448 | 1.068 | 215 | 1.731 |
| Classe C | 808 | 1.301 | 533 | 2.642 |
| Classes D/E | 562 | 689 | 503 | 1.754 |
| Não informado | 1.584 | 1.225 | 972 | 3.781 |

## 5. Resultados por cargo — bruto × ponderado

"Bruto" é a contagem simples de respostas; "Ponderado" aplica os pesos por município da seção 3 (a divulgação de 04/09/2026 apresentou a contagem direta; os percentuais ponderados foram publicados em 06/09/2026 ao lado dos brutos). Percentuais de candidatos calculados sobre os votos nominais válidos do cargo; percentuais de partido (nominais + legenda) sobre o total de votos com partido; brancos e "não sabe" sobre o total de respostas do cargo. Para Deputado Federal e Estadual, listados os 30 primeiros por resultado ponderado e os demais agregados.

### 5.1. Presidente da República

Respondentes: 10.166 · respostas: 10.166 (válidas 9.781, brancas 200, não sabe 185).

| Candidato | Partido | Votos (bruto) | % bruto | Votos pond. | % pond. |
| --- | --- | ---: | ---: | ---: | ---: |
| LULA (13) | PT | 4.679 | 47,84% | 4.675,7 | 47,63% |
| FLAVIO BOLSONARO (22) | PL | 2.968 | 30,34% | 3.015,6 | 30,72% |
| ESCRITOR AUGUSTO CURY (70) | AVANTE | 1.608 | 16,44% | 1.615,1 | 16,45% |
| RONALDO CAIADO (55) | PSD | 263 | 2,69% | 241,2 | 2,46% |
| RENAN SANTOS (14) | MISSÃO | 198 | 2,02% | 212,3 | 2,16% |
| ZEMA (30) | NOVO | 35 | 0,36% | 32,3 | 0,33% |
| PABLO MARÇAL (28) | PRTB | 22 | 0,22% | 19,5 | 0,20% |
| SAMARA (80) | UP | 4 | 0,04% | 2,9 | 0,03% |
| HERTZ DIAS (16) | PSTU | 2 | 0,02% | 1,2 | 0,01% |
| RUI COSTA PIMENTA (29) | PCO | 1 | 0,01% | 1,1 | 0,01% |
| EDMILSON COSTA (21) | PCB | 1 | 0,01% | 0,6 | 0,01% |
| **Total nominal** |  | **9.781** | **100,00%** | **9.817,4** | **100,00%** |

| Resposta | Bruto | % do total de respostas | Ponderado | % pond. |
| --- | ---: | ---: | ---: | ---: |
| Branco / nulo | 200 | 1,97% | 188,9 | 1,86% |
| Não sabe / não respondeu | 185 | 1,82% | 159,7 | 1,57% |

### 5.2. Governador

Respondentes: 10.069 · respostas: 10.069 (válidas 9.609, brancas 208, não sabe 252).

| Candidato | Partido | Votos (bruto) | % bruto | Votos pond. | % pond. |
| --- | --- | ---: | ---: | ---: | ---: |
| FÁBIO (55) | PSD | 6.855 | 71,34% | 6.772,1 | 70,34% |
| VALMIR DE FRANCISQUINHO (10) | REPUBLICANOS | 2.043 | 21,26% | 2.197,3 | 22,82% |
| RICARDO MARQUES (22) | PL | 534 | 5,56% | 487,9 | 5,07% |
| DR. HELTON (50) | PSOL | 155 | 1,61% | 153,1 | 1,59% |
| EMANUEL CACHO (45) | PSDB | 14 | 0,15% | 10,5 | 0,11% |
| TATY  CRISTINA DE JESUS (27) | DC | 8 | 0,08% | 7,2 | 0,07% |
| **Total nominal** |  | **9.609** | **100,00%** | **9.628,0** | **100,00%** |

| Resposta | Bruto | % do total de respostas | Ponderado | % pond. |
| --- | ---: | ---: | ---: | ---: |
| Branco / nulo | 208 | 2,07% | 208,5 | 2,07% |
| Não sabe / não respondeu | 252 | 2,50% | 241,8 | 2,40% |

### 5.3. Senador (cada respondente indicou até duas opções)

Respondentes: 9.956 · respostas: 19.819 (válidas 16.515, brancas 1.833, não sabe 1.471).

| Candidato | Partido | Votos (bruto) | % bruto | Votos pond. | % pond. |
| --- | --- | ---: | ---: | ---: | ---: |
| ANDRÉ MOURA (444) | UNIÃO | 4.158 | 25,18% | 4.147,7 | 25,05% |
| DELEGADO ALESSANDRO (155) | MDB | 2.996 | 18,14% | 3.212,3 | 19,40% |
| ROGERIO CARVALHO (131) | PT | 2.839 | 17,19% | 2.769,1 | 16,72% |
| DELEGADO ANDRÉ DAVID (101) | REPUBLICANOS | 2.122 | 12,85% | 2.130,1 | 12,86% |
| EDUARDO AMORIM (100) | REPUBLICANOS | 1.254 | 7,59% | 1.337,0 | 8,07% |
| RODRIGO VALADARES (222) | PL | 1.068 | 6,47% | 1.116,8 | 6,74% |
| EDVALDO (123) | PDT | 1.249 | 7,56% | 1.071,9 | 6,47% |
| IRAN BARBOSA (500) | PSOL | 489 | 2,96% | 445,9 | 2,69% |
| CORONEL ROCHA (221) | PL | 297 | 1,80% | 288,6 | 1,74% |
| RENATINHA (277) | DC | 37 | 0,22% | 32,4 | 0,20% |
| PAULINHO DA UNIÃO TUR (270) | DC | 6 | 0,04% | 6,1 | 0,04% |
| **Total nominal** |  | **16.515** | **100,00%** | **16.557,9** | **100,00%** |

| Resposta | Bruto | % do total de respostas | Ponderado | % pond. |
| --- | ---: | ---: | ---: | ---: |
| Branco / nulo | 1.833 | 9,25% | 1.912,2 | 9,63% |
| Não sabe / não respondeu | 1.471 | 7,42% | 1.391,6 | 7,01% |

### 5.4. Deputado Federal

Respondentes: 9.795 · respostas: 9.795 (válidas 8.802, brancas 531, não sabe 462, das válidas 141 só de legenda).

| Candidato | Partido | Votos (bruto) | % bruto | Votos pond. | % pond. |
| --- | --- | ---: | ---: | ---: | ---: |
| YANDRA MOURA (4444) | UNIÃO | 1.580 | 18,24% | 1.510,1 | 17,31% |
| CLAUDIO MITIDIERI (4040) | PSB | 1.078 | 12,45% | 1.143,4 | 13,11% |
| DELEGADA KATARINA (5505) | PSD | 727 | 8,39% | 653,3 | 7,49% |
| FÁBIO REIS (5555) | PSD | 510 | 5,89% | 589,8 | 6,76% |
| THIAGO DE JOALDO (1011) | REPUBLICANOS | 365 | 4,21% | 484,2 | 5,55% |
| ICARO DE VALMIR (1000) | REPUBLICANOS | 376 | 4,34% | 432,2 | 4,96% |
| ANDERSON DE ZÉ DAS CANAS (5515) | PSD | 309 | 3,57% | 387,1 | 4,44% |
| GUSTINHO RIBEIRO (1177) | PP | 257 | 2,97% | 344,3 | 3,95% |
| LEVI OLIVEIRA (1111) | PP | 314 | 3,63% | 290,6 | 3,33% |
| MARCIO MACEDO (1313) | PT | 302 | 3,49% | 276,9 | 3,17% |
| CAPITÃO SAMUEL (4422) | UNIÃO | 309 | 3,57% | 272,4 | 3,12% |
| JOAO DANIEL (1311) | PT | 243 | 2,81% | 235,9 | 2,70% |
| MOANA VALADARES (2222) | PL | 189 | 2,18% | 173,7 | 1,99% |
| MARCOS SANTANA (4000) | PSB | 138 | 1,59% | 142,5 | 1,63% |
| NETO BATALHA (5588) | PSD | 126 | 1,45% | 126,1 | 1,45% |
| NEO SOBRAL (2244) | PL | 150 | 1,73% | 120,9 | 1,39% |
| NITINHO (5577) | PSD | 153 | 1,77% | 112,3 | 1,29% |
| ELBER BATALHA (4010) | PSB | 125 | 1,44% | 91,6 | 1,05% |
| JORNALISTA SUSANE VIDAL (1033) | REPUBLICANOS | 113 | 1,30% | 89,6 | 1,03% |
| BRENO GARIBALDE (4004) | PSB | 115 | 1,33% | 82,0 | 0,94% |
| LUIZÃO DONA TRAMPI (2200) | PL | 82 | 0,95% | 78,5 | 0,90% |
| DINÁ ALMEIDA (2277) | PL | 36 | 0,42% | 78,2 | 0,90% |
| PASTOR HELENO (1010) | REPUBLICANOS | 75 | 0,87% | 74,5 | 0,85% |
| VAGNER GASTÃO (1212) | PDT | 65 | 0,75% | 66,7 | 0,76% |
| CORONEL MANO (7022) | AVANTE | 66 | 0,76% | 60,2 | 0,69% |
| MISSIONÁRIA GISELE (1023) | REPUBLICANOS | 59 | 0,68% | 48,0 | 0,55% |
| DAVI VALENÇA (1414) | MISSÃO | 41 | 0,47% | 47,5 | 0,54% |
| SHEYLA GALBA (4420) | UNIÃO | 60 | 0,69% | 47,4 | 0,54% |
| MAFY DE YGOR GOMES (1333) | PT | 35 | 0,40% | 45,2 | 0,52% |
| DRA. CLÉCIA (1077) | REPUBLICANOS | 47 | 0,54% | 41,0 | 0,47% |
| Demais (75 candidatos) | — | 616 | 7,11% | 576,0 | 6,60% |
| **Total nominal** |  | **8.661** | **100,00%** | **8.722,1** | **100,00%** |

Votos por partido (nominais + legenda) — Deputado Federal:

| Partido | Votos (bruto) | % bruto | Votos pond. | % pond. |
| --- | ---: | ---: | ---: | ---: |
| PSD | 1.880 | 21,36% | 1.926,3 | 21,74% |
| UNIÃO | 1.972 | 22,40% | 1.851,5 | 20,90% |
| PSB | 1.567 | 17,80% | 1.562,4 | 17,64% |
| REPUBLICANOS | 1.097 | 12,46% | 1.221,0 | 13,78% |
| PP | 589 | 6,69% | 655,4 | 7,40% |
| PT | 656 | 7,45% | 642,0 | 7,25% |
| PL | 542 | 6,16% | 539,7 | 6,09% |
| AVANTE | 150 | 1,70% | 132,2 | 1,49% |
| PDT | 87 | 0,99% | 82,8 | 0,94% |
| MISSÃO | 64 | 0,73% | 75,5 | 0,85% |
| PSOL | 63 | 0,72% | 50,6 | 0,57% |
| MDB | 64 | 0,73% | 46,4 | 0,52% |
| SOLIDARIEDADE | 12 | 0,14% | 15,8 | 0,18% |
| PSDB | 12 | 0,14% | 15,4 | 0,17% |
| PV | 12 | 0,14% | 11,5 | 0,13% |
| Demais (11 partidos) | 35 | 0,40% | 29,9 | 0,34% |
| **Total** | **8.802** | **100,00%** | **8.858,5** | **100,00%** |

| Resposta | Bruto | % do total de respostas | Ponderado | % pond. |
| --- | ---: | ---: | ---: | ---: |
| Branco / nulo | 531 | 5,42% | 540,5 | 5,50% |
| Não sabe / não respondeu | 462 | 4,72% | 422,6 | 4,30% |

### 5.5. Deputado Estadual

Respondentes: 9.745 · respostas: 9.745 (válidas 9.002, brancas 398, não sabe 345, das válidas 122 só de legenda).

| Candidato | Partido | Votos (bruto) | % bruto | Votos pond. | % pond. |
| --- | --- | ---: | ---: | ---: | ---: |
| ZEZINHO SOBRAL (40000) | PSB | 495 | 5,57% | 566,5 | 6,27% |
| MAISA MITIDIERI (55555) | PSD | 557 | 6,27% | 510,5 | 5,65% |
| JORGINHO ARAUJO (55777) | PSD | 402 | 4,53% | 439,3 | 4,87% |
| CRISTIANO CAVALCANTE (44444) | UNIÃO | 409 | 4,61% | 426,4 | 4,72% |
| MARCELO SOBRAL (44111) | UNIÃO | 420 | 4,73% | 371,2 | 4,11% |
| LUCIANO BISPO (55015) | PSD | 295 | 3,32% | 342,4 | 3,79% |
| CORONEL RIBEIRO (55190) | PSD | 343 | 3,86% | 333,3 | 3,69% |
| KAKÁ SANTOS (44555) | UNIÃO | 285 | 3,21% | 280,1 | 3,10% |
| ADAILTON MARTINS (55123) | PSD | 227 | 2,56% | 226,4 | 2,51% |
| ANA LUIZA (10111) | REPUBLICANOS | 164 | 1,85% | 225,6 | 2,50% |
| IBRAIN DE VALMIR (43000) | PV | 154 | 1,73% | 210,4 | 2,33% |
| GEORGEO PASSOS (10777) | REPUBLICANOS | 201 | 2,26% | 199,4 | 2,21% |
| MARCOS OLIVEIRA (10000) | REPUBLICANOS | 184 | 2,07% | 196,1 | 2,17% |
| FÁBIO HENRIQUE (15500) | MDB | 225 | 2,53% | 193,2 | 2,14% |
| LUCIANO PIMENTEL (22123) | PL | 163 | 1,84% | 189,2 | 2,09% |
| DRA LIDIANE LUCENA (44000) | UNIÃO | 213 | 2,40% | 168,1 | 1,86% |
| PATO MARAVILHA (44222) | UNIÃO | 120 | 1,35% | 163,0 | 1,81% |
| CARLINHOS FERREIRA (55255) | PSD | 118 | 1,33% | 160,4 | 1,78% |
| PAULO JR (43777) | PV | 164 | 1,85% | 158,0 | 1,75% |
| ANTÔNIO BALA (15555) | MDB | 118 | 1,33% | 151,9 | 1,68% |
| CHICO DO CORREIO (13333) | PT | 123 | 1,39% | 151,4 | 1,68% |
| GILSON DOS ANJOS (44333) | UNIÃO | 142 | 1,60% | 148,4 | 1,64% |
| DELEGADA DANIELLE (15190) | MDB | 167 | 1,88% | 140,3 | 1,55% |
| HILDA RIBEIRO (11777) | PP | 115 | 1,30% | 138,2 | 1,53% |
| KITTY LIMA (40400) | PSB | 160 | 1,80% | 137,7 | 1,52% |
| JÚNIOR DE DIOGENES (70777) | AVANTE | 80 | 0,90% | 127,8 | 1,42% |
| NORBERTO PINTO (70456) | AVANTE | 122 | 1,37% | 126,7 | 1,40% |
| PASTOR DIEGO (44744) | UNIÃO | 184 | 2,07% | 126,0 | 1,40% |
| CANDISSE CARVALHO (13131) | PT | 166 | 1,87% | 125,1 | 1,39% |
| FERNANDINHO FRANCO (22200) | PL | 128 | 1,44% | 124,5 | 1,38% |
| Demais (112 candidatos) | — | 2.236 | 25,18% | 2.173,1 | 24,06% |
| **Total nominal** |  | **8.880** | **100,00%** | **9.030,7** | **100,00%** |

Votos por partido (nominais + legenda) — Deputado Estadual:

| Partido | Votos (bruto) | % bruto | Votos pond. | % pond. |
| --- | ---: | ---: | ---: | ---: |
| PSD | 2.166 | 24,06% | 2.197,9 | 24,06% |
| UNIÃO | 1.986 | 22,06% | 1.882,0 | 20,61% |
| PSB | 898 | 9,98% | 985,4 | 10,79% |
| REPUBLICANOS | 855 | 9,50% | 934,8 | 10,23% |
| MDB | 802 | 8,91% | 780,5 | 8,55% |
| PT | 567 | 6,30% | 543,0 | 5,94% |
| PL | 506 | 5,62% | 512,7 | 5,61% |
| AVANTE | 340 | 3,78% | 377,1 | 4,13% |
| PV | 318 | 3,53% | 368,4 | 4,03% |
| PSOL | 233 | 2,59% | 201,5 | 2,21% |
| PP | 158 | 1,76% | 178,2 | 1,95% |
| PODE | 124 | 1,38% | 123,5 | 1,35% |
| MISSÃO | 14 | 0,16% | 13,8 | 0,15% |
| PDT | 10 | 0,11% | 7,9 | 0,09% |
| SOLIDARIEDADE | 1 | 0,01% | 7,2 | 0,08% |
| Demais (12 partidos) | 24 | 0,27% | 19,8 | 0,22% |
| **Total** | **9.002** | **100,00%** | **9.133,5** | **100,00%** |

| Resposta | Bruto | % do total de respostas | Ponderado | % pond. |
| --- | ---: | ---: | ---: | ---: |
| Branco / nulo | 398 | 4,08% | 356,9 | 3,65% |
| Não sabe / não respondeu | 345 | 3,54% | 292,4 | 2,99% |

## 6. Linha do tempo registrada no banco de dados

| Dia (BRT) | Cadastros iniciados | WhatsApp validado | Respondentes | Votos registrados |
| --- | ---: | ---: | ---: | ---: |
| 01/09/2026 | 7.396 | 6.677 | 6.552 | 38.250 |
| 02/09/2026 | 1.457 | 1.336 | 1.348 | 7.912 |
| 03/09/2026 | 2.473 | 2.293 | 2.271 | 13.403 |
| 04/09/2026 | 0 | 0 | 6 | 29 |

- Edição criada em 22/08/2026, 17:35:30 (BRT); período de coleta configurado de 01/09/2026, 00:00:00 a 03/09/2026, 23:59:59.
- Primeiro cadastro: 01/09/2026, 00:06:43; último cadastro: 03/09/2026, 23:59:38.
- Votos com hora de registro igual ou posterior ao encerramento programado: 29, em 6 sessões — sessões iniciadas antes do encerramento e concluídas minutos depois (o sistema bloqueia a emissão de novos tokens após o fim, mas deixa concluir a sessão já aberta; a hora é gravada truncada na hora cheia). Última hora com voto: 04/09/2026, 06:00:00.
- Divulgação prevista: 04/09/2026, 08:30:00; divulgação efetiva (ação "marcar_divulgacao", exigindo o código TOTP do responsável): 04/09/2026, 09:14:54.
- Notificações de resultado por WhatsApp (só a quem optou, 8.900 participantes): 8.050 enviadas, entre 04/09/2026, 09:15:10 e 04/09/2026, 11:15:48.

Trilha de auditoria administrativa da edição (tabela `admin_audit_log`, sem dados pessoais):

| Data/hora (BRT) | Ação | Detalhe |
| --- | --- | --- |
| 31/08/2026, 21:09:04 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 00:12:16 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 00:19:26 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 00:19:32 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 05:49:08 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 07:45:39 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 08:39:30 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 09:05:26 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 09:07:12 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 09:08:07 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 10:06:13 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 10:06:35 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 10:32:17 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 10:32:49 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 10:35:20 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 11:00:23 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 12:07:29 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 13:54:10 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 13:56:49 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 14:10:06 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 14:11:26 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 15:11:03 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 18:09:52 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 18:17:02 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 18:19:29 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 18:55:21 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 18:58:23 | gerar_snapshot_tv | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); ja_divulgada: false; registro_tre: SE-09441/2026 · BR-04041/2026 |
| 01/09/2026, 19:36:56 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 19:37:27 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 19:37:50 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 19:37:58 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 20:36:16 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 01/09/2026, 20:39:01 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 06:49:01 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 06:49:46 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 06:51:13 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 06:54:31 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 07:18:23 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 07:18:27 | gerar_snapshot_tv | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); ja_divulgada: false; registro_tre: SE-09441/2026 · BR-04041/2026 |
| 02/09/2026, 09:45:17 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 10:12:04 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 10:12:20 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 10:22:09 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 16:15:42 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 19:25:17 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 22:05:54 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 22:06:05 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 22:07:19 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 22:09:30 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 22:10:18 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 22:10:34 | gerar_snapshot_tv | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); ja_divulgada: false; registro_tre: SE-09441/2026 · BR-04041/2026 |
| 02/09/2026, 23:08:01 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 23:08:28 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 23:10:52 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 23:25:08 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 02/09/2026, 23:25:17 | gerar_snapshot_tv | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); ja_divulgada: false; registro_tre: SE-09441/2026 · BR-04041/2026 |
| 03/09/2026, 01:22:04 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 01:22:45 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 10:11:59 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 16:32:28 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 16:32:48 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 16:33:36 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 16:38:48 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 19:19:35 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 19:19:53 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 22:33:45 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 03/09/2026, 23:28:16 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 04/09/2026, 07:50:14 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 04/09/2026, 07:50:59 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 04/09/2026, 08:04:03 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 04/09/2026, 08:41:22 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 04/09/2026, 09:05:17 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 04/09/2026, 09:13:56 | view_resultados_pre_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: null |
| 04/09/2026, 09:14:54 | marcar_divulgacao | divulgada_em: 2026-09-04T12:14:54.904Z; registro_tre: SE-09441/2026 · BR-04041/2026 |
| 04/09/2026, 09:15:53 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 04/09/2026, 09:43:30 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 04/09/2026, 09:56:49 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 05/09/2026, 11:41:00 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 05/09/2026, 18:16:37 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 06/09/2026, 12:04:47 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 06/09/2026, 13:01:43 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 06/09/2026, 14:16:14 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 06/09/2026, 14:43:10 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 06/09/2026, 14:43:15 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 06/09/2026, 15:10:15 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 06/09/2026, 15:11:10 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |
| 07/09/2026, 12:18:23 | view_resultados_pos_divulgacao | edicao_nome: Pesquisa Sergipe 2026 — 1ª edição (1º turno); divulgada_em: 2026-09-04T12:14:54.904+00:00 |

## 7. Notas de conciliação

- A composição demográfica registrada na complementação de 04/09/2026 somava 10.310 participantes; a base atual soma 10.306. A diferença de 4 participantes será conciliada pelo estatístico responsável [confirmar a causa antes de protocolar]; além disso, em 06/09/2026 foi corrigido um erro de paginação na leitura das views (limite de 1.000 linhas por consulta) que afetava a tabela de composição publicada. Os totais deste anexo, recalculados diretamente sobre os registros, substituem os anteriores.
- 25 participantes validados (21 respondentes) informaram município de outra UF; recebem peso 0 e não integram os percentuais ponderados. Ficam listados por transparência.
- Sexo é o único campo com "não informado" em volume relevante (2.270); faixa etária e instrução eram obrigatórios. Nível econômico "não informado": 3.781.
- Conferência: a view `v_amostra_composicao` (usada em /transparencia) reporta sexo F = 3.468 e M = 4.568; este anexo, calculado sobre os mesmos registros, reporta F = 3.468 e M = 4.568.
- O TSE não publica o eleitorado por sexo × faixa etária × instrução por município em formato aberto acessível a esta plataforma na data de geração; a pós-estratificação por município usa o eleitorado municipal total (Estatísticas do Eleitorado, TSE) carregado no cadastro `municipios_se`.

## 8. Reprodutibilidade

Este anexo é gerado por `scripts/anexo-rp-0601015.mjs` a partir das tabelas `eleitores_pesquisa`, `votos_pesquisa`, `municipios_se`, `candidatos_pesquisa`, `partidos` e das views `v_peso_municipio`, `v_cobertura_municipio`, `v_amostra_composicao`, `v_resultados_candidato_pond`, `v_resultados_legenda_pond`, `v_votos_branco_nao_sabe_pond` e `v_resumo_edicao`, cujas definições SQL constam do documento "Memória de cálculo (SQL)". O banco de dados anonimizado (sem CPF, telefone ou IP) fica à disposição da Justiça Eleitoral e da perícia (Res.-TSE 23.600/2019, art. 13).
