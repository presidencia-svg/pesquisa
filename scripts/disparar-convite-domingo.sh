#!/bin/zsh
# *** RESERVA, NÃO AGENDADO. O disparo oficial roda no cron da Vercel
# *** (/api/cron/convite-pesquisa, lib/convite-pesquisa.ts). Só rode este script
# *** se o cron da Vercel estiver DESLIGADO — os dois juntos podem mandar em dobro.
#
# Disparo do convite da 2ª edição — domingo 13/09/2026, 08h00–15h00 (America/Recife).
# Autorizado pela presidência da CDL em 12/09/2026 ("a partir de 8h mandar zap até as 15h
# para todos do nosso banco de dados"). Roda pelo launchd (scripts/launchd/
# br.com.cdlaju.pesquisa.convite-domingo.plist) ou à mão: ./scripts/disparar-convite-domingo.sh
#
# Ordem: base mda (Melhores do Ano) e depois base pesquisa (cdl_base) — quem está nas
# duas recebe UMA vez (dedup no próprio disparar-convite-pesquisa.mjs).
# Lotes de 500, SLEEP_MS=700 (~1 msg/s → ~21 mil números em ~6 h).
# Para de puxar lote novo às 15h00 (LIMITE) ou quando a fila esvazia. Se um lote falhar
# mais do que acertar (tier da Meta, token vencido…), aborta e deixa o motivo no log.
#
# META_TOKEN (token do número do Melhores do Ano, PHONE_ID 1031179760086462) vem de
# docs/confidencial/meta-token.env (fora do git): uma linha `META_TOKEN=EAAB...`.
set -u
cd /Volumes/PortableSSD/Aplicativos/pesquisa-sergipe-2026 || exit 1
export TZ=America/Recife
mkdir -p docs/confidencial
LOG=docs/confidencial/convite-2a-edicao-$(date +%Y-%m-%d).log
exec >> "$LOG" 2>&1
echo "=== início $(date '+%F %T') ==="

if [[ -f docs/confidencial/meta-token.env ]]; then
  set -a; source docs/confidencial/meta-token.env; set +a
fi
if [[ -z "${META_TOKEN:-}" ]]; then
  echo "ABORTADO: META_TOKEN ausente (crie docs/confidencial/meta-token.env)"; exit 1
fi
export SLEEP_MS=${SLEEP_MS:-700}
LIMITE=${LIMITE:-1500}   # HHMM — não puxa lote novo depois disso
LOTE=${LOTE:-500}

roda_base() {
  local base=$1
  while true; do
    local agora=$(date +%H%M)
    if (( agora >= LIMITE )); then echo "janela encerrada ($agora) — base $base"; return 0; fi
    echo "--- base $base · lote $LOTE · $(date '+%T')"
    local saida
    saida=$(node scripts/disparar-convite-pesquisa.mjs --base "$base" --lote "$LOTE" --gravar 2>&1)
    echo "$saida"
    local ok falha optout
    ok=$(echo "$saida" | sed -n 's/^Fim: \([0-9]*\) enviados, \([0-9]*\) falhas, \([0-9]*\) opt-out.*/\1/p' | tail -1)
    falha=$(echo "$saida" | sed -n 's/^Fim: \([0-9]*\) enviados, \([0-9]*\) falhas, \([0-9]*\) opt-out.*/\2/p' | tail -1)
    optout=$(echo "$saida" | sed -n 's/^Fim: \([0-9]*\) enviados, \([0-9]*\) falhas, \([0-9]*\) opt-out.*/\3/p' | tail -1)
    if [[ -z "$ok" ]]; then echo "ABORTADO: script não imprimiu resumo (erro fatal) — base $base"; return 1; fi
    if (( ok == 0 && falha == 0 && optout == 0 )); then echo "fila vazia — base $base"; return 0; fi
    if (( falha > ok )); then echo "ABORTADO: $falha falhas x $ok enviados no lote — base $base (ver erros acima)"; return 1; fi
    sleep 5
  done
}

roda_base mda && roda_base pesquisa
echo "=== fim $(date '+%F %T') ==="
