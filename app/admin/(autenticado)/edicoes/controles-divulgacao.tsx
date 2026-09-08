'use client'

import { useActionState, useState } from 'react'

import {
  alternarConsultaZona,
  alternarExigirLocalizacao,
  atualizarTurno,
  divulgarEdicao,
  retirarDivulgacao,
  retomarDivulgacao,
  salvarMetadadosDivulgacao,
  suspenderDivulgacao,
  type EdicaoState,
} from './actions'

const initial: EdicaoState = { ok: true }

type Props = {
  edicaoId: string
  divulgadaEm: string | null
  registroTre: string | null
  conreResponsavel: string | null
  dataRegistroPesqele: string | null
  divulgacaoPrevista: string | null
  turno: number
  consultaZonaAtiva: boolean
  exigirLocalizacao: boolean
  /** Ordem judicial: divulgação suspensa desde (null = não suspensa). */
  suspensaEm: string | null
  suspensaoMotivo: string | null
}

/**
 * Bloco de controle de divulgacao publica da edicao. Tres acoes:
 *   1. Editar/salvar metadados (registro TRE + data prevista).
 *   2. Divulgar (botao primario — so' habilita se tiver registro_tre).
 *   3. Retirar divulgacao (volta pra estado nao divulgado).
 */
export function ControlesDivulgacao({
  edicaoId,
  divulgadaEm,
  registroTre,
  conreResponsavel,
  dataRegistroPesqele,
  divulgacaoPrevista,
  turno,
  consultaZonaAtiva,
  exigirLocalizacao,
  suspensaEm,
  suspensaoMotivo,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [estadoMeta, salvarMeta, salvandoMeta] = useActionState(
    salvarMetadadosDivulgacao,
    initial,
  )
  const [estadoDivulgar, divulgar, divulgando] = useActionState(
    (_prev: EdicaoState, fd: FormData) => divulgarEdicao(fd),
    initial,
  )

  const [estadoSuspender, suspender, suspendendo] = useActionState(
    (_prev: EdicaoState, fd: FormData) => suspenderDivulgacao(fd),
    initial,
  )
  const [estadoRetomar, retomar, retomando] = useActionState(
    (_prev: EdicaoState, fd: FormData) => retomarDivulgacao(fd),
    initial,
  )

  const divulgada = Boolean(divulgadaEm)
  const suspensa = Boolean(suspensaEm)

  // Bloco do turno, sempre visivel acima dos demais controles.
  const blocoTurno = (
    <form
      action={atualizarTurno}
      className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-dashed border-border"
    >
      <input type="hidden" name="id" value={edicaoId} />
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Turno
        </span>
        <select
          name="turno"
          defaultValue={String(turno)}
          className="h-8 px-2 rounded-md border border-border bg-background text-xs"
        >
          <option value="1">1º Turno</option>
          <option value="2">2º Turno</option>
        </select>
      </div>
      <button
        type="submit"
        className="h-8 px-3 rounded-md border border-border text-[11px] hover:bg-muted transition"
      >
        Salvar turno
      </button>
    </form>
  )

  // Liga/desliga a consulta Zona de Expansão (Aracaju × São Cristóvão).
  const blocoZona = (
    <form
      action={alternarConsultaZona}
      className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-dashed border-border"
    >
      <input type="hidden" name="id" value={edicaoId} />
      <input type="hidden" name="ativa" value={consultaZonaAtiva ? 'false' : 'true'} />
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Consulta Zona de Expansão
        </span>
        <span className="text-[11px] text-muted-foreground">
          Aracaju × São Cristóvão ·{' '}
          {consultaZonaAtiva ? (
            <span className="text-accent font-medium">coletando</span>
          ) : (
            <span className="text-error font-medium">coleta desligada</span>
          )}{' '}
          — pergunta só pra eleitores de Aracaju/São Cristóvão. Desligar
          para de coletar e oculta o bloco na TV Atalaia/resultados; os votos ficam
          guardados e voltam se você religar.
        </span>
      </div>
      <button
        type="submit"
        className={`h-8 px-3 rounded-md border text-[11px] transition whitespace-nowrap ${
          consultaZonaAtiva
            ? 'border-error/40 text-error hover:bg-error/5'
            : 'border-accent/40 text-accent hover:bg-accent/5'
        }`}
      >
        {consultaZonaAtiva ? 'Desligar' : 'Ativar'}
      </button>
    </form>
  )

  // Liga/desliga o fator de localização do /votar.
  const blocoLocalizacao = (
    <form
      action={alternarExigirLocalizacao}
      className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-dashed border-border"
    >
      <input type="hidden" name="id" value={edicaoId} />
      <input type="hidden" name="exigir" value={exigirLocalizacao ? 'false' : 'true'} />
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Fator de localização (GPS/IP)
        </span>
        <span className="text-[11px] text-muted-foreground">
          {exigirLocalizacao ? (
            <span className="text-accent font-medium">ligado</span>
          ) : (
            <span className="text-error font-medium">desligado</span>
          )}{' '}
          — ligado: IP do Brasil entra direto e IP do exterior precisa de GPS
          em Sergipe. Desligado: nenhuma checagem de localização (voto único
          segue por CPF + WhatsApp).
        </span>
      </div>
      <button
        type="submit"
        className={`h-8 px-3 rounded-md border text-[11px] transition whitespace-nowrap ${
          exigirLocalizacao
            ? 'border-error/40 text-error hover:bg-error/5'
            : 'border-accent/40 text-accent hover:bg-accent/5'
        }`}
      >
        {exigirLocalizacao ? 'Desligar' : 'Ligar'}
      </button>
    </form>
  )

  const blocosConfig = (
    <>
      {blocoTurno}
      {blocoZona}
      {blocoLocalizacao}
    </>
  )

  if (!editando && !divulgada) {
    return (
      <>
        {blocosConfig}
        <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-dashed border-border">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Divulgação pública: <strong className="text-foreground">não divulgada</strong>
              {divulgacaoPrevista && (
                <>
                  {' '}
                  · Prevista pra{' '}
                  <span className="font-medium text-foreground">
                    {formatarPrevista(divulgacaoPrevista)}
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="h-8 px-3 rounded-md border border-border text-[11px] hover:bg-muted transition whitespace-nowrap"
            >
              Editar registro / divulgar
            </button>
          </div>
          {estadoDivulgar.message && (
            <p className="text-[11px] text-error">{estadoDivulgar.message}</p>
          )}
        </div>
      </>
    )
  }

  if (divulgada && !editando) {
    return (
      <>
        {blocosConfig}
        <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-dashed border-border">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs">
              <span className="text-[10px] uppercase tracking-widest text-accent bg-accent/10 border border-accent/30 rounded-full px-2 py-0.5">
                divulgada
              </span>
              <span className="ml-2 text-muted-foreground">
                em{' '}
                <span className="font-medium text-foreground">
                  {formatarPrevista(divulgadaEm!)}
                </span>
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="h-8 px-3 rounded-md border border-border text-[11px] hover:bg-muted transition"
              >
                Editar
              </button>
              <form action={retirarDivulgacao}>
                <input type="hidden" name="id" value={edicaoId} />
                <button
                  type="submit"
                  className="h-8 px-3 rounded-md border border-error/40 text-error text-[11px] hover:bg-error/5 transition"
                >
                  Retirar divulgação
                </button>
              </form>
            </div>
          </div>

          {/* Chave de emergência — ordem judicial (Rp 0601015-42.2026.6.25.0000).
              Não apaga divulgada_em; só esconde os números do público. */}
          <div
            className={`rounded-md border px-3 py-3 flex flex-col gap-2 ${
              suspensa ? 'border-error/50 bg-error/5' : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {suspensa ? (
                <span className="text-[10px] uppercase tracking-widest text-error bg-error/10 border border-error/40 rounded-full px-2 py-0.5 font-semibold">
                  suspensa · ordem judicial
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Suspensão judicial
                </span>
              )}
              {suspensa ? (
                <span className="text-muted-foreground">
                  desde{' '}
                  <span className="font-medium text-foreground">
                    {formatarPrevista(suspensaEm!)}
                  </span>
                  {suspensaoMotivo ? ` · ${suspensaoMotivo}` : ''}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Esconde todos os números do público (/resultados, /tv, mapa e
                  pop-up do site da CDL) sem apagar a data da divulgação.
                </span>
              )}
            </div>
            <form
              action={suspensa ? retomar : suspender}
              className="flex flex-col sm:flex-row sm:items-end gap-2"
            >
              <input type="hidden" name="id" value={edicaoId} />
              {!suspensa && (
                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Motivo (decisão)
                  </span>
                  <input
                    name="motivo"
                    maxLength={300}
                    defaultValue="Decisão TRE-SE — Rp 0601015-42.2026.6.25.0000 (tutela de urgência, 07/09/2026)"
                    className="h-8 px-2 rounded-md border border-border bg-background text-xs"
                  />
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Código TOTP
                </span>
                <input
                  name="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  placeholder="000000"
                  className="h-8 w-28 px-2 rounded-md border border-border bg-background text-xs font-mono tracking-widest"
                />
              </label>
              <button
                type="submit"
                disabled={suspendendo || retomando}
                className={
                  suspensa
                    ? 'h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition disabled:opacity-50'
                    : 'h-8 px-3 rounded-md bg-error text-white text-[11px] font-medium hover:opacity-90 transition disabled:opacity-50'
                }
              >
                {suspensa
                  ? retomando
                    ? 'Retomando…'
                    : 'Retomar divulgação'
                  : suspendendo
                    ? 'Suspendendo…'
                    : '⛔ Suspender (ordem judicial)'}
              </button>
            </form>
            {[estadoSuspender, estadoRetomar].map((st, i) =>
              st.message ? (
                <p
                  key={i}
                  className={`text-xs ${st.ok ? 'text-emerald-700' : 'text-error'}`}
                >
                  {st.message}
                </p>
              ) : null,
            )}
          </div>
        </div>
      </>
    )
  }

  // Modo editando — formulario de metadados + acao divulgar
  return (
    <>
      {blocosConfig}
      <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-dashed border-border">
      <form action={salvarMeta} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={edicaoId} />
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Nº de registro TRE/SE (PesqEle)
          </span>
          <input
            name="registro_tre"
            defaultValue={registroTre ?? ''}
            placeholder="SE-XXXXX/2026"
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Nº CONRE do estatístico responsável (obrigatório p/ divulgar)
          </span>
          <input
            name="numero_conre_responsavel"
            defaultValue={conreResponsavel ?? ''}
            placeholder="ex.: 9-01234"
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Data do registro no PesqEle (divulgação só ≥5 dias depois)
          </span>
          <input
            name="data_registro_pesqele"
            type="date"
            defaultValue={dataRegistroPesqele ?? ''}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Data prevista pra divulgação (opcional — aparece pública)
          </span>
          <input
            name="divulgacao_prevista"
            type="datetime-local"
            defaultValue={
              divulgacaoPrevista ? toDatetimeLocal(divulgacaoPrevista) : ''
            }
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>
        {estadoMeta.message && (
          <p className="text-[11px] text-error">{estadoMeta.message}</p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvandoMeta}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 hover:opacity-90"
          >
            {salvandoMeta ? 'Salvando…' : 'Salvar metadados'}
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="h-9 px-4 rounded-md border border-border text-xs hover:bg-muted transition"
          >
            Cancelar
          </button>
        </div>
      </form>

      {!divulgada && (
        <form action={divulgar} className="pt-3 border-t border-dashed border-border flex flex-col gap-2">
          <input type="hidden" name="id" value={edicaoId} />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Divulgar agora torna a página{' '}
            <span className="font-mono">/resultados</span> pública pra
            qualquer pessoa. Confira o registro TRE/SE antes.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-foreground">
              Código do Google Authenticator (obrigatório)
            </span>
            <input
              name="totp"
              inputMode="numeric"
              autoComplete="off"
              required
              maxLength={6}
              placeholder="000000"
              className="h-9 w-28 px-3 rounded-md border border-border bg-background font-mono tracking-[0.3em] text-sm"
            />
            <span className="text-[10px] text-muted-foreground">
              O resultado só é liberado com o seu código de 6 dígitos.
            </span>
          </label>
          {estadoDivulgar.message && (
            <p className="text-[11px] text-error">{estadoDivulgar.message}</p>
          )}
          <button
            type="submit"
            disabled={divulgando}
            className="h-9 px-4 rounded-md bg-accent text-white text-xs font-semibold disabled:opacity-50 hover:opacity-90 transition self-start"
            onClick={(e) => {
              if (
                !confirm(
                  'Confirma divulgação pública? A página /resultados ficará visível pra qualquer um.',
                )
              ) {
                e.preventDefault()
              }
            }}
          >
            {divulgando ? 'Divulgando…' : '📢 Divulgar publicamente'}
          </button>
        </form>
      )}
      </div>
    </>
  )
}

function formatarPrevista(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDatetimeLocal(iso: string): string {
  const dt = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}
