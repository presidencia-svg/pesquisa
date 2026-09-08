# Checklist — cumprimento da tutela (24 h a partir da intimação)

**Multa: R$ 20.000,00 por ato de descumprimento.** Faça na ordem; anote data e hora de cada item; guarde capturas de tela com relógio visível. Nada disto usa dado pessoal.

## 0. FEITO em 08/09/2026, 10h47 — site inteiro fora do ar

Por decisão do presidente, o sítio pesquisa.cdlaju.com.br foi retirado do ar por completo (commit `b59a662`): toda página pública responde "Site temporariamente indisponível" (HTTP 503), sem números; `/api/divulgacao` informa `"suspensa":true` e o pop-up de cdlaju.com.br mostra "Divulgação temporariamente suspensa". Só `/admin` continua acessível (para o passo 1 e para os anexos). **Capturar agora**, com relógio visível: https://pesquisa.cdlaju.com.br , /resultados , /tv e o pop-up de https://cdlaju.com.br .

**Para religar o site** (só depois de decisão judicial revogando a medida): em `lib/site-desabilitado.ts`, trocar `SITE_DESABILITADO_NO_CODIGO = true` por `false`, commit e push (o deploy é automático, ~1 min). Conferir que a variável `SITE_DESABILITADO` não existe na Vercel. O commit datado é a prova do momento da retomada.

## 1. Acionar a suspensão na plataforma (5 minutos) — ainda vale a pena, pela trilha de auditoria

1. Entrar em https://pesquisa.cdlaju.com.br/admin/edicoes (login de administrador).
2. Na edição ativa ("Pesquisa Sergipe 2026 — 1ª edição (1º turno)"), no bloco **Suspensão judicial**, conferir o motivo pré-preenchido ("Decisão TRE-SE — Rp 0601015-42.2026.6.25.0000 (tutela de urgência, 07/09/2026)"), digitar o código do **Google Authenticator** e clicar em **⛔ Suspender (ordem judicial)**.
3. A mensagem de confirmação aparece na própria página; a ação fica gravada na auditoria (`suspender_divulgacao`, com data/hora) e a data de divulgação original (04/09/2026 09h14) **não é apagada** — ela é prova a favor da CDL.
4. Conferir em janela anônima, em até 5 minutos (cache): https://pesquisa.cdlaju.com.br/resultados (aviso "Divulgação temporariamente suspensa"), /resultados/governador (redireciona), /resultados/mapa (redireciona), /tv (aviso), https://pesquisa.cdlaju.com.br/api/divulgacao (deve mostrar `"suspensa":true` e `"divulgada":false`). Capturar tela de cada uma.
5. Site institucional: abrir https://cdlaju.com.br e https://cdlaju.com.br/sergipe.html — o pop-up deve mostrar "Divulgação temporariamente suspensa" com botão "Entendi" (sem link para o resultado). Capturar.

**Para retomar** (só depois de decisão judicial revogando a medida): mesmo bloco → **Retomar divulgação** + código do Authenticator. Também fica na auditoria (`retomar_divulgacao`).

## 2. Canais manuais (o mecanismo não alcança)

| Canal | O que fazer | Feito em |
| --- | --- | --- |
| Instagram da CDL | Arquivar posts/stories/reels com resultados (não apagar: arquivar preserva prova). Anotar quais. | [x] FEITO 08/09 ~10h50 — guardar capturas |
| Facebook da CDL | Idem (ocultar da linha do tempo). | [x] FEITO 08/09 ~10h50 — guardar capturas |
| WhatsApp (grupos/listas da CDL) | Não reenviar nada; se houver mensagem fixada, desafixar. As 8.050 notificações de 04/09 já foram entregues e não podem ser revogadas — registrar isso. | [ ] |
| TV Atalaia | Enviar e-mail/ofício comunicando a suspensão e pedindo que não reexiba os quadros; guardar o protocolo. | [x] FEITO 08/09 ~10h50 (aviso enviado) — guardar o comprovante/protocolo |
| Anúncios Meta/Google | Confirmar que não há campanha ativa sobre a pesquisa (não deve haver — sem autorização SIEP nunca houve). Capturar a tela do gerenciador. | [ ] |
| Menu "Pesquisas" do site da CDL | O link aponta para /resultados, que já exibe o aviso; nada a fazer além de conferir. | [ ] |
| Imprensa que reproduziu | Fora do controle da CDL (a ordem fala em canais "sob seu controle"), mas vale comunicar por e-mail e guardar cópia. | [ ] |

## 3. Provas para os autos

- Exportar a trilha de auditoria da edição (o Anexo Técnico, seção 6, já traz a tabela; após a suspensão, regerar com `node --env-file=.env.local scripts/anexo-rp-0601015.mjs` para incluir a linha `suspender_divulgacao`).
- Capturas do item 1.4 e 1.5, com data/hora.
- Lista do item 2 preenchida, com data/hora.

## 4. Complementação no PesqEle — FEITO em 08/09/2026 (~14h15–14h17, BRT)

Texto de complementação (`pesqele-texto-campo-bairro-municipio.txt`) e PDF de detalhamento (`pesqele-anexo-detalhamento-e-complementacao-art2-par7.pdf`) lançados nos dois registros pela tela "Editar bairro/município e/ou resultado da pesquisa"; sistema: "Dados alterados com sucesso" / "As informações foram incluídas fora do prazo Legal".

Falta:

1. Salvar as telas de confirmação dos dois registros (doc. 06) e os espelhos atualizados (doc. 07) — Gerenciar Pesquisas Eleitorais → visualizar/imprimir.
2. Decidir com o(a) advogado(a) e anexar `pesqele-relatorio-completo-resultados.pdf` no slot "Arquivo do relatório completo com os resultados da pesquisa" (estava vazio) — nos dois registros.
3. Entregar telas, espelhos e o aviso do TRE-SE de 22/08/2026 (`aviso-tre-se-registro-SE-09441-2026-08-22.pdf`, doc. 15) ao(à) advogado(a) para juntar com a defesa.
