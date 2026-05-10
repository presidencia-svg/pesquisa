# Metodologia — Pesquisa Sergipe 2026

> Documento técnico que acompanha o registro no TRE/SE e serve de base pra divulgação. **Atualizado em maio/2026.** Será revisto pelo advogado eleitoral antes do registro formal.

---

## 1. Base legal

### 1.1 Lei nº 9.504/97 — Lei das Eleições, Art. 33

Estabelece que, a partir de 1º de janeiro do ano da eleição, qualquer pessoa física ou jurídica que realizar pesquisa de opinião pública relacionada às eleições ou aos possíveis candidatos é obrigada a registrar a pesquisa na Justiça Eleitoral, **ainda que não divulgue o resultado**. O registro deve ser feito até **5 dias antes da divulgação** (excluídos os dias do registro e da divulgação) e deve conter:

- Nome de quem contratou e do contratante (CPF/CNPJ);
- Valor e origem dos recursos despendidos;
- Metodologia e período de realização;
- **Plano amostral e ponderação quanto a sexo, idade, grau de instrução, nível econômico e área física de execução**;
- Intervalo de confiança e margem de erro;
- Sistema interno de controle e verificação;
- Questionário completo aplicado;
- Nome de quem pagou pela realização e cópia da nota fiscal.

Divulgação sem registro prévio sujeita o responsável a multa entre **R$ 53.205 e R$ 106.410** (valores atualizados na Resolução 23.747/2026), além das demais sanções aplicáveis. A divulgação fora do período de 5 dias é equiparada a "não registrada".

### 1.2 Resolução TSE nº 23.747/2026

Publicada em 26/02/2026, altera a Resolução 23.600/2019 e disciplina o registro e a divulgação de pesquisas eleitorais nas eleições de 2026. Pontos centrais:

- **Sistema PesqEle** — todo registro é exclusivamente eletrônico, podendo ser feito a qualquer hora (Art. 2º, § 6º).
- **Arquivos em PDF** — todos os documentos do registro são anexados em PDF (Art. 2º, § 4º).
- **Composição amostral** (Art. 2º, § 7º, IV) — informar número de eleitores por setor censitário e composição quanto a gênero, idade, grau de instrução e nível econômico.
- **Declaração do estatístico** (Art. 2º, IX) — exigência nova de declaração assinada com certificado digital pelo profissional de Estatística responsável, registrada no Conselho Regional de Estatística (CONRE), com ciência das sanções por fraude. Para o nosso projeto, isso significa contratar um estatístico com CONRE ativo antes do registro.
- **Documentação auditável** — o estatístico assume compromisso de manter a documentação auditável durante todo o período exigido pela Resolução.
- **Acesso a dados** (Art. 13, §§ 8º e 9º) — qualquer interessado pode requerer os dados e o sistema interno de controle em até 2 dias, com inspeção posterior arcada pelo requerente.
- **Vedação a enquetes** (Art. 23) — após **15 de agosto do ano da eleição**, é vedado realizar enquetes sobre o processo eleitoral (a vedação não atinge pesquisas devidamente registradas).

### 1.3 LGPD (Lei 13.709/2018)

A pesquisa coleta CPF e dados demográficos sob a base legal "execução de pesquisa de opinião" (Art. 7º, IV, LGPD). Princípios aplicados:

- **Finalidade** — dados são usados exclusivamente para a pesquisa eleitoral 2026 e seu registro. Não há reuso em outras campanhas, vendas, marketing.
- **Minimização** — só são coletadas as variáveis necessárias para o plano amostral e os controles antifraude.
- **Adequação técnica** — CPF nunca é armazenado em texto: persiste apenas o HMAC-SHA256 com segredo do servidor (`CPF_HASH_SECRET`). Voto e identificação ficam em tabelas sem chave estrangeira entre si (arquitetura "duas salas").
- **Direitos do titular** — relatório técnico e contato pra eventuais solicitações estão na página `/transparencia` (em construção).

---

## 2. Plano amostral

### 2.1 Universo

Eleitorado oficial de Sergipe segundo o TSE (último corte disponível antes da pesquisa). O cadastro de referência será o `cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado/perfil_eleitorado_2024.zip`, com possibilidade de atualização caso o TSE publique recorte 2026 a tempo.

> **Números do eleitorado de Sergipe (referência preliminar, eleições 2024 — atualizar com recorte 2026 antes do registro):**
> - Total: ~1,45 milhão de eleitores
> - Sexo: aproximadamente 47% masculino, 53% feminino
> - Faixa etária maior: 25-34 anos (~373 mil eleitores)
> - Aracaju concentra ~400 mil (≈ 28% do estado)
> - 75 municípios em 8 regiões
>
> **Cargos em disputa em SE 2026:** Presidente da República, Governador, 2 Senadores, 8 Deputados Federais, 24 Deputados Estaduais.

### 2.2 Tamanho amostral e margem de erro

Definido **antes** do registro pelo estatístico CONRE. Diretrizes pra ele decidir:

- População ~1,45M (efetivamente infinita pra cálculo de amostra simples).
- Pra **margem de erro de ±3 p.p. e nível de confiança de 95%**, n ≈ 1.067.
- Pra **margem de erro de ±2 p.p. e nível de confiança de 95%**, n ≈ 2.401.
- A escolha entre 1.067 ou 2.401 (ou número diferente) é decisão do estatístico baseada em orçamento, prazo e quanto desagregar resultados sub-amostrais.

### 2.3 Estratificação por município

Cada um dos 75 municípios entra com cota proporcional ao seu eleitorado TSE. Tabela `municipios_se.cota_pesquisa` carrega o limite máximo de respostas por município pra evitar que Aracaju ou outro grande município sature a amostra.

Fórmula:

```
cota_municipio = round( eleitorado_municipio / eleitorado_total * n_amostral )
```

Quando uma cota se esgotar, novos cadastros daquele município são bloqueados ainda na Sala 1 (`/votar/confirma`).

### 2.4 Estratificação cruzada (sexo × faixa etária)

Dentro de cada município, aplicar pesos pós-coleta para corrigir desequilíbrio amostral em relação à distribuição TSE. As variáveis de ponderação seguem o que a Resolução 23.747/2026 exige:

- **Sexo:** M, F.
- **Faixa etária:** 16-17, 18-24, 25-34, 35-44, 45-59, 60+.
- **Grau de instrução:** Fundamental (incompleto/completo), Médio (incompleto/completo), Superior (incompleto/completo). Valores agregados aos 3 níveis no TSE.

> **Importante:** "área física de execução" pra pesquisa online significa "estado/UF/município de residência declarado". Como toda a coleta é remota, não há "ponto de coleta físico" no sentido tradicional — isso entra no relatório metodológico como informação explícita.

### 2.5 Pondera após coleta

Após o fim da coleta, aplicar fatores de expansão por estrato:

```
peso_estrato = (proporção_TSE_estrato) / (proporção_amostra_estrato)
```

O resultado divulgado é a média ponderada dos votos. Os pesos e a tabela cruzada vão como anexo no PesqEle.

---

## 3. Variáveis coletadas

### 3.1 Sala 1 — `eleitores_pesquisa` (validação e amostragem)

| Variável | Tipo | Origem | Obrigatório | Razão |
|---|---|---|---|---|
| `cpf_hash` | HMAC-SHA256 | calculado a partir do CPF informado | sim | identificação única + 1 voto/eleitor |
| `cpf_mascarado` | string | LGPD | sim | exibição em logs administrativos |
| `municipio_ibge` | int | digitado/cdl_base | sim | cota geográfica |
| `sexo` | enum (M/F) | digitado/cdl_base | sim | ponderação Resolução 23.747 |
| `faixa_etaria` | enum (6 valores) | digitado/cdl_base | sim | ponderação Resolução 23.747 |
| `escolaridade` | enum (3 valores) | digitado | sim | ponderação Resolução 23.747 |
| `spc_validado` | bool | SPC ou cdl_base | sim | antifraude |
| `wa_validado` | bool | OTP WhatsApp | sim | antifraude |
| `fonte` | enum | sistema | sim | trilha auditoria |
| `ip` | string | request | sim | antifraude (sem GeoIP persistido) |
| `user_agent` | string | request | sim | antifraude |
| `device_fingerprint` | string | client | sim | antifraude (≤2 CPFs/dispositivo) |
| `criado_em` | timestamptz | sistema | sim | trilha auditoria |

### 3.2 Sala 2 — `votos_pesquisa` (votos)

| Variável | Tipo | Razão |
|---|---|---|
| `token_hash` | HMAC-SHA256 | autoriza inserir voto sem ligar ao CPF |
| `cargo` | enum | qual cédula |
| `candidato_id` | uuid | quando cargo é Pres/Gov/Sen |
| `partido_id` | uuid | quando cargo é Fed/Est |
| `metodo` | enum (numero/branco/nao_sabe) | qualidade do voto |
| `criado_hora` | timestamptz | TRUNCADO pra hora — permite análise temporal sem permitir cruzamento minuto-a-minuto que poderia identificar |

**Nada de demográfico vai pra Sala 2.** A análise cruzada (sexo × intenção, idade × intenção) é feita após coleta encerrada, agregando totais por estrato a partir dos counts de Sala 1 + counts de Sala 2 separadamente. Nunca pelo cruzamento direto eleitor-voto, que não existe no banco.

### 3.3 K-anonymity nas divulgações cruzadas

Antes de publicar qualquer corte (ex.: "intenção de voto entre mulheres de 25-34 em Aracaju"), aplicar:

- **k ≥ 30 por célula publicada.** Células com menos de 30 respondentes são suprimidas ou agregadas.
- Cruzamentos com 3+ dimensões (município × sexo × idade × cargo) só publicar nos municípios maiores (Aracaju, Itabaiana, Lagarto, etc.) onde k ≥ 30 é alcançável.
- Re-identificação por raridade do estrato é o principal vetor de quebra de anonimato em pesquisas com dados cadastrais — k ≥ 30 é convenção da literatura de privacidade estatística.

---

## 4. Anti-fraude

| Sinal | Local | Bloqueia? |
|---|---|---|
| CPF inválido (formato/checksum) | Sala 1, antes de hash | ✅ rejeita imediatamente |
| CPF não está em `cdl_base` nem passa SPC | Sala 1 | ✅ rejeita |
| CPF já cadastrado nesta edição | Sala 1, lookup `eleitores_pesquisa` | ✅ rejeita (segundo cadastro) |
| OTP WhatsApp não confirmado | Sala 1, `wa_validado=false` | ✅ não emite token |
| Mais de 2 CPFs do mesmo `device_fingerprint` | Sala 1 | ✅ rejeita |
| Cota de município atingida | Sala 1 | ✅ rejeita |
| Rajada de cadastros do mesmo IP | rate_limit_ip (5/5min) | ✅ throttle |
| Bot/scraping | Cloudflare Turnstile no /votar | ✅ bloqueia |
| Anomalia pós-coleta (cluster suspeito) | view de risco | ⚠️ flag pra revisão manual |

---

## 5. Cronograma

| Quando | O quê |
|---|---|
| **maio–jul/2026** | Desenvolvimento, integrações reais (SPC, Meta WA, Turnstile), import da `cdl_base`, contratação do estatístico CONRE. |
| **ago/2026** | **Piloto fechado** — link com código de convite, ~50 testers conhecidos. Estressar o sistema sob condições reais sem divulgação pública. |
| **ago/2026 (após piloto)** | Reunião com advogado eleitoral. Trava material divulgável e questionário oficial. |
| **set/2026** | Registro formal no PesqEle (≥ 5 dias antes da divulgação). |
| **set/2026** | Coleta da pesquisa principal. |
| **set/2026** | Divulgação. |
| **04/out/2026** | 1º turno das eleições. |

---

## 6. O que falta antes do registro no TRE

- [ ] Contratar estatístico com CONRE ativo (exigência da Resolução 23.747/2026).
- [ ] Definir formalmente n amostral, margem de erro, IC com o estatístico.
- [ ] Importar a `cdl_base` (oriunda do Melhores do Ano da CDL Aracaju).
- [ ] Popular `municipios_se` com eleitorado TSE 2026 (ou 2024 com nota explicativa).
- [ ] Calcular `cota_pesquisa` por município em função do n decidido.
- [ ] Habilitar integração SPC Brasil (contrato + chaves).
- [ ] Habilitar integração Meta WhatsApp Cloud API + aprovação do template OTP.
- [ ] Habilitar Cloudflare Turnstile.
- [ ] Revisão jurídica do questionário e da página `/transparencia`.
- [ ] Auditoria do código pelo time da CDL antes do piloto.
- [ ] Backup do banco automatizado antes da abertura da coleta.

---

## 7. Referências

- [Lei nº 9.504/97 — Lei das Eleições](https://www.planalto.gov.br/ccivil_03/leis/l9504.htm)
- [Resolução TSE nº 23.747/2026](https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-747-de-26-de-fevereiro-de-2026) (publicada em 26/02/2026, regulamenta pesquisas eleitorais 2026)
- [Resolução TSE nº 23.600/2019](https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-600-de-12-de-dezembro-de-2019) (texto base, alterado pela 23.747/2026)
- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Portal de Dados Abertos do TSE — Eleitorado 2024](https://dadosabertos.tse.jus.br/dataset/eleitorado-2024)
- [TRE-SE — Estatísticas](https://www.tre-se.jus.br/eleicoes/estatisticas)
- [TSE — Pesquisa eleitoral (Temas Selecionados)](https://temasselecionados.tse.jus.br/temas-selecionados/pesquisa-eleitoral)
