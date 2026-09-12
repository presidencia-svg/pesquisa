# Convite por WhatsApp — 2ª edição da Pesquisa Eleitoral Sergipe 2026

Modelo de mensagem para as três bases da CDL Aracaju: **Melhores do Ano**,
**Liquida** e **Pesquisa** (quem participou da 1ª edição). Rascunho de
12/09/2026; coleta da 2ª edição de **13 a 20/09/2026**.

## Regras que a mensagem respeita

- **Nenhum resultado, nenhum número** de participação (nem da 1ª edição, nem
  parcial da 2ª). A tutela do TRE-SE (Rp 0601015-42) suspende a divulgação da
  1ª edição; convidar a participar é permitido, divulgar não.
- **Não afirma registro no TSE** da 2ª edição — o registro no PesqEle só será
  feito quando houver pelo menos 20 mil eleitores e antes de qualquer
  divulgação (art. 33 da Lei 9.504/97).
- **Linha de saída** (opt-out) no rodapé, obrigatória na política de
  marketing da Meta e coerente com a LGPD.
- **Uma mensagem, um propósito**: convidar. Sem pedir dados, sem link
  encurtado, sem emoji em excesso (a Meta reprova template com cara de spam).

## Template Meta (categoria MARKETING, idioma pt_BR)

Template **aprovado pela Meta em 12/09/2026** com o nome `convite_pesquisa`
(categoria Marketing, pt_BR, status "Ativo — Qualidade pendente"). O
`convite_pesquisa_sergipe` da 1ª edição continua existindo com o texto antigo.

| Parte | Conteúdo |
|---|---|
| Cabeçalho | Imagem — reaproveitar `https://pesquisa.cdlaju.com.br/convite-whatsapp.png` ou nova arte com "2ª edição" |
| Corpo | texto abaixo, 7 parâmetros (`{{1}}` = primeiro nome, mesma função `primeiroNome()` de `scripts/disparar-convite-pesquisa.mjs`) |
| Rodapé | `CDL Aracaju · Responda SAIR para não receber mais mensagens.` |
| Botão | Abrir site → `https://pesquisa.cdlaju.com.br/votar` |

### Corpo — versão principal (Melhores do Ano e Liquida), parametrizada

Texto fechado pelo usuário em 12/09/2026. Tudo que muda entre estados,
entidades ou edições é parâmetro, pra que o mesmo template sirva a outras
CDLs e à 3ª edição sem nova aprovação.

```
Olá, {{1}}! 👋

{{2}} escolhe presidente, governador, senador e deputados em outubro. Antes das urnas, a {{3}} quer saber o que você pensa.

Está no ar a {{4}}. Leva menos de 2 minutos, é sigilosa e super segura: só o CPF e um código que chega aqui no WhatsApp.

🗳️ Participe até {{5}} em:
{{6}}

Sua opinião ajuda a mostrar o que o {{7}} pensa de verdade. Vale compartilhar com quem você confia.
```

| Parâmetro | Significado | Valor na 2ª edição (exemplo para a Meta) |
|---|---|---|
| `{{1}}` | primeiro nome, capitalizado (`primeiroNome()`) | `Maria` |
| `{{2}}` | estado | `Sergipe` |
| `{{3}}` | entidade que assina | `CDL Aracaju` |
| `{{4}}` | nome da edição, com asteriscos pra negrito | `*2ª edição da Pesquisa Eleitoral Sergipe 2026*` |
| `{{5}}` | prazo por extenso | `20 de setembro` |
| `{{6}}` | endereço | `pesquisa.cdlaju.com.br/votar` |
| `{{7}}` | gentílico | `sergipano` |

Regras da Meta que o texto respeita: chaves duplas `{{n}}`, numeração
sequencial de 1 a 7, não começa nem termina com variável, nenhuma variável
carrega quebra de linha. Na hora de cadastrar, a Meta pede um **exemplo**
para cada variável — usar a coluna da direita. Como a proporção de variável
no texto é alta, se a revisão automática reprovar por "conteúdo variável
demais", fixar `{{2}}`, `{{3}}` e `{{7}}` no corpo e manter só nome, edição,
prazo e link como parâmetros.

Alternativa mais robusta para o link: em vez de `{{6}}` no corpo, botão do
tipo "Abrir site" com URL dinâmica (`https://pesquisa.cdlaju.com.br/{{1}}`,
sufixo `votar`). Botão vira link clicável em qualquer aparelho e não conta
como texto variável.

### Corpo — versão para quem já participou (base Pesquisa)

```
Olá, {{1}}! 👋

Você participou da 1ª edição da *Pesquisa Eleitoral Sergipe 2026* e a *CDL Aracaju* agradece. Agora queremos ouvir você de novo.

A *2ª edição* está no ar. Como seu cadastro já existe, é ainda mais rápido: CPF, código no WhatsApp e voto. Menos de 1 minuto.

🗳️ Participe até *20 de setembro*:
pesquisa.cdlaju.com.br/votar

Mudou de opinião? Manteve? As duas coisas importam. Vale compartilhar com quem você confia.
```

### Versão curta (lembrete no penúltimo dia, 19/09)

```
{{1}}, amanhã é o último dia! ⏳

A *2ª edição da Pesquisa Eleitoral Sergipe 2026*, da CDL Aracaju, encerra dia 20/09. Menos de 2 minutos, sigilosa, só CPF e código no WhatsApp.

🗳️ pesquisa.cdlaju.com.br/votar
```

## Por que cada frase está ali

- **"Sergipe escolhe … em outubro"** — dá contexto e urgência sem falar em
  candidato nem resultado.
- **"CDL Aracaju quer saber o que você pensa"** — quem fala é a entidade que
  o destinatário já conhece (Melhores do Ano, Liquida), não um número
  desconhecido.
- **"menos de 2 minutos, sigilosa, sem cadastro"** — derruba as três
  objeções que mais fazem a pessoa não clicar.
- **"só o CPF e um código que chega aqui no WhatsApp"** — antecipa o OTP,
  pra que a pessoa não estranhe a segunda mensagem (que vem de outro número).
- **Prazo explícito** — "até 20 de setembro" converte mais que "participe".
- **"compartilhar com quem você confia"** — pede o encaminhamento sem
  parecer corrente.

## Operação

- **Número remetente**: o do Melhores do Ano (+55 79 3212-7701, PHONE_ID
  `1031179760086462`), separado do número que envia o OTP — um problema de
  qualidade no marketing nunca pode derrubar o login do eleitor.
- **Base Melhores do Ano**: `scripts/disparar-convite-pesquisa.mjs` resolve
  nome, telefone e idempotência. Desde 12/09 ele tem `--edicao 2` (padrão):
  template `convite_pesquisa`, 7 parâmetros fixos no script, marcação em
  `votantes.convite_pesquisa2_enviado_em`. Essa coluna **precisa ser criada
  no banco do Melhores do Ano** antes do primeiro `--gravar` (na 1ª edição
  10.514 já foram convidados; sem a coluna nova o script pularia todos):
  `alter table votantes add column if not exists convite_pesquisa2_enviado_em timestamptz;`
- **Extras (fora das bases)**: `docs/confidencial/convite-extras.json`
  (pasta ignorada pelo git) — lista `[{nome, whatsapp}]`; enviar com
  `--extras --gravar`. O script registra os enviados em
  `docs/confidencial/convite-extras-enviados.jsonl` para não repetir.
- **Cabeçalho de imagem**: o script manda `convite-whatsapp.png` como
  cabeçalho; se o template aprovado não tiver cabeçalho, usar `--sem-imagem`
  (a Meta devolve erro 132000/132012 e o script avisa).
- **Base Pesquisa**: sai de `cdl_base` (whatsapp_e164 + nome_mascarado não
  serve; o primeiro nome vem de `nome_completo` da migration 051, ou omite-se
  `{{1}}` e usa uma versão sem nome). Filtrar quem participou da 1ª edição
  (`eleitores_pesquisa`) e quem pediu exclusão (`app/privacidade/excluir`).
- **Base Liquida**: **não existe no código nem no `.env.local`**. Precisa de
  uma exportação (planilha ou acesso ao banco da Liquida) com nome e celular,
  e de confirmar que o cadastro da Liquida autorizou contato da CDL por
  WhatsApp — sem isso, não disparar para essa base.
- **Ritmo**: SLEEP_MS 120 (~8 msg/s) já usado; começar com `--teste` no seu
  número, depois `--lote 200`, olhar a taxa de bloqueio na Meta e só então
  o lote cheio. Qualidade "vermelha" no número pausa o template.
- **Horário**: enviar entre 9h e 20h; evitar domingo de manhã.
- **Deduplicar** entre as três bases pelo telefone E.164 antes de enviar —
  há sobreposição grande (a maior parte da base Pesquisa veio do Melhores do
  Ano).

## Base legal (LGPD) — decidir antes de disparar

- **Melhores do Ano**: o cadastro foi feito para votar no Melhores do Ano;
  o convite para outra ação da CDL cabe em legítimo interesse (art. 7º, IX)
  se o termo do MdA previu comunicações da CDL. Conferir o termo; o script
  de disparo da 1ª edição foi feito com esse entendimento.
- **Liquida**: mesma conferência, com o termo da Liquida.
- **Pesquisa**: quem participou da 1ª edição aceitou o aviso de privacidade
  da pesquisa (`docs/lgpd.md`), que fala em contato sobre a própria pesquisa.
  Convite para a 2ª edição é a mesma finalidade.
- Em todos os casos, **quem respondeu SAIR** na 1ª edição não recebe a 2ª.
  O script lê `docs/confidencial/optout-whatsapp.txt` (um número por linha,
  fora do git) e pula esses números em qualquer modo; é preciso alimentar o
  arquivo com as respostas "SAIR" recebidas no número do Melhores do Ano
  antes do disparo.
