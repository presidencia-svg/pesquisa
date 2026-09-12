'use client'

import { useActionState, useState } from 'react'

import {
  alternarConsultaZona,
  alternarExigirLocalizacao,
  aprovarPonderacao,
  atualizarTurno,
  definirMetodoPonderacao,
  divulgarEdicao,
  registrarComplementacaoPesqele,
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
  /** Meta mínima de respondentes validados (migration 049) — só monitor. */
  metaAmostra: number | null
  turno: number
  consultaZonaAtiva: boolean
  exigirLocalizacao: boolean
  /** Ordem judicial: divulgação suspensa desde (null = não suspensa). */
  suspensaEm: string | null
  suspensaoMotivo: string | null
  /** Ponderação (migration 048). */
  ponderacaoMetodo: 'municipio' | 'estratos_raking'
  ponderacaoExecucao: PonderacaoExecucaoResumo | null
  ponderacaoAprovadaEm: string | null
  ponderacaoAprovadaPor: string | null
  complementacaoPesqeleEm: string | null
  /** Fim da coleta — pra avisar se a execução é anterior ao encerramento. */
  fim: string
}

export type PonderacaoExecucaoResumo = {
  id: string
  executado_em: string
  executado_por: string | null
  iteracoes: number | null
  convergiu: boolean | null
  n_peso_positivo: number | null
  n_eff: number | null
  deff: number | null
  peso_max: number | null
  margem_nominal: number | null
  margem_efetiva: number | null
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
  metaAmostra,
  divulgacaoPrevista,
  turno,
  consultaZonaAtiva,
  exigirLocalizacao,
  suspensaEm,
  suspensaoMotivo,
  ponderacaoMetodo,
  ponderacaoExecucao,
  ponderacaoAprovadaEm,
  ponderacaoAprovadaPor,
  complementacaoPesqeleEm,
  fim,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [estadoMetodo, definirMetodo, definindoMetodo] = useActionState(
    (_prev: EdicaoState, fd: FormData) => definirMetodoPonderacao(fd),
    initial,
  )
  const [estadoAprovar, aprovar, aprovando] = useActionState(
    (_prev: EdicaoState, fd: FormData) => aprovarPonderacao(fd),
    initial,
  )
  const [estadoComplementacao, registrarComplementacao, registrandoComplementacao] =
    useActionState(
      (_prev: EdicaoState, fd: FormData) => registrarComplementacaoPesqele(fd),
      initial,
    )
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

  // ---- Ponderação: método, execução vigente, aprovação CONRE, complementação ----
  const execAntesDoFim =
    ponderacaoExecucao != null &&
    new Date(ponderacaoExecucao.executado_em).getTime() < new Date(fim).getTime()
  const aprovacaoDesatualizada =
    ponderacaoAprovadaEm != null &&
    ponderacaoExecucao != null &&
    new Date(ponderacaoAprovadaEm).getTime() <
      new Date(ponderacaoExecucao.executado_em).getTime()
  const pct = (x: number | null) => (x == null ? '—' : `±${(x * 100).toFixed(2)}pp`)
  const num = (x: number | null, d = 2) =>
    x == null ? '—' : x.toLocaleString('pt-BR', { maximumFractionDigits: d })

  const blocoPonderacao = (
    <div className="flex flex-col gap-3 pt-3 mt-2 border-t border-dashed border-border">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Ponderação (plano amostral registrado)
        </span>
        <span className="text-[11px]">
          método vigente:{' '}
          <span className="font-mono font-medium text-foreground">{ponderacaoMetodo}</span>
          {' · '}
          {ponderacaoAprovadaEm && !aprovacaoDesatualizada ? (
            <span className="text-accent font-medium">
              aprovada por {ponderacaoAprovadaPor} em {formatarPrevista(ponderacaoAprovadaEm)}
            </span>
          ) : (
            <span className="text-error font-medium">
              {aprovacaoDesatualizada
                ? 'aprovação anterior à execução vigente — aprovar de novo'
                : 'sem aprovação do estatístico'}
            </span>
          )}
        </span>
      </div>

      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
        {ponderacaoExecucao ? (
          <>
            Execução vigente{' '}
            <span className="font-mono text-foreground">{ponderacaoExecucao.id.slice(0, 8)}</span>{' '}
            em {formatarPrevista(ponderacaoExecucao.executado_em)}
            {ponderacaoExecucao.executado_por ? ` por ${ponderacaoExecucao.executado_por}` : ''}
            {' · '}
            {ponderacaoExecucao.convergiu ? (
              <span className="text-accent">convergiu</span>
            ) : (
              <span className="text-error">NÃO convergiu</span>
            )}{' '}
            em {ponderacaoExecucao.iteracoes ?? '—'} iterações · n com peso{' '}
            {num(ponderacaoExecucao.n_peso_positivo, 0)} · n efetivo (Kish){' '}
            {num(ponderacaoExecucao.n_eff, 0)} · deff {num(ponderacaoExecucao.deff, 2)} · peso
            máx {num(ponderacaoExecucao.peso_max, 2)} · margem nominal{' '}
            {pct(ponderacaoExecucao.margem_nominal)} · margem efetiva{' '}
            <strong className="text-foreground">{pct(ponderacaoExecucao.margem_efetiva)}</strong>
            {execAntesDoFim && (
              <>
                {' '}
                <span className="text-error font-medium">
                  · executada ANTES do fim da coleta — reexecutar com a base final
                </span>
              </>
            )}
          </>
        ) : (
          <>
            Nenhuma execução de raking gravada pra esta edição. O método por estratos exige
            uma: <span className="font-mono">node --env-file=.env.local scripts/ponderar-estratos.mjs</span>
            {' '}(depois do fim da coleta).
          </>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {/* Método */}
        <form action={definirMetodo} className="flex flex-col gap-1.5 rounded-md border border-border p-3">
          <input type="hidden" name="id" value={edicaoId} />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Método
          </span>
          <select
            name="metodo"
            defaultValue={ponderacaoMetodo}
            className="h-8 px-2 rounded-md border border-border bg-background text-xs"
          >
            <option value="estratos_raking">
              Estratos — município × sexo × faixa × instrução (registrado)
            </option>
            <option value="municipio">Só município (pós-estratificação)</option>
          </select>
          <input
            name="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="TOTP"
            className="h-8 px-2 rounded-md border border-border bg-background text-xs font-mono tracking-widest"
          />
          <button
            type="submit"
            disabled={definindoMetodo}
            className="h-8 px-3 rounded-md border border-border text-[11px] hover:bg-muted transition disabled:opacity-50"
          >
            {definindoMetodo ? 'Salvando…' : 'Definir método'}
          </button>
          {estadoMetodo.message && (
            <p className={`text-[11px] ${estadoMetodo.ok ? 'text-emerald-700' : 'text-error'}`}>
              {estadoMetodo.message}
            </p>
          )}
        </form>

        {/* Aprovação do estatístico */}
        <form action={aprovar} className="flex flex-col gap-1.5 rounded-md border border-border p-3">
          <input type="hidden" name="id" value={edicaoId} />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Aprovação do estatístico (CONRE)
          </span>
          <input
            name="aprovador"
            maxLength={120}
            required
            defaultValue={ponderacaoAprovadaPor ?? ''}
            placeholder="Nome — CONRE nº"
            className="h-8 px-2 rounded-md border border-border bg-background text-xs"
          />
          <input
            name="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="TOTP"
            className="h-8 px-2 rounded-md border border-border bg-background text-xs font-mono tracking-widest"
          />
          <button
            type="submit"
            disabled={aprovando}
            className="h-8 px-3 rounded-md border border-accent/40 text-accent text-[11px] hover:bg-accent/5 transition disabled:opacity-50"
          >
            {aprovando ? 'Registrando…' : 'Registrar aprovação'}
          </button>
          {estadoAprovar.message && (
            <p className={`text-[11px] ${estadoAprovar.ok ? 'text-emerald-700' : 'text-error'}`}>
              {estadoAprovar.message}
            </p>
          )}
        </form>

        {/* Complementação PesqEle */}
        <form
          action={registrarComplementacao}
          className="flex flex-col gap-1.5 rounded-md border border-border p-3"
        >
          <input type="hidden" name="id" value={edicaoId} />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Complementação PesqEle (art. 2º §7º III/IV)
          </span>
          <span className="text-[11px] text-muted-foreground">
            {complementacaoPesqeleEm ? (
              <>
                lançada em{' '}
                <span className="font-medium text-foreground">
                  {formatarPrevista(complementacaoPesqeleEm)}
                </span>
              </>
            ) : (
              <span className="text-error font-medium">não registrada</span>
            )}
          </span>
          <input
            name="quando"
            type="datetime-local"
            defaultValue={complementacaoPesqeleEm ? toDatetimeLocal(complementacaoPesqeleEm) : ''}
            className="h-8 px-2 rounded-md border border-border bg-background text-xs"
          />
          <input
            name="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="TOTP"
            className="h-8 px-2 rounded-md border border-border bg-background text-xs font-mono tracking-widest"
          />
          <button
            type="submit"
            disabled={registrandoComplementacao}
            className="h-8 px-3 rounded-md border border-border text-[11px] hover:bg-muted transition disabled:opacity-50"
          >
            {registrandoComplementacao ? 'Registrando…' : 'Registrar complementação'}
          </button>
          {estadoComplementacao.message && (
            <p
              className={`text-[11px] ${estadoComplementacao.ok ? 'text-emerald-700' : 'text-error'}`}
            >
              {estadoComplementacao.message}
            </p>
          )}
        </form>
      </div>
    </div>
  )

  const blocosConfig = (
    <>
      {blocoTurno}
      {blocoZona}
      {blocoLocalizacao}
      {blocoPonderacao}
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
            Meta mínima de respondentes validados (só orienta /admin/amostra)
          </span>
          <input
            name="meta_amostra"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            defaultValue={metaAmostra ?? ''}
            placeholder="ex.: 50000"
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
            qualquer pessoa. O sistema só libera com: registro PesqEle válido,
            CONRE, ≥5 dias do registro, método de ponderação com execução
            posterior ao fim da coleta, aprovação do estatístico e
            complementação do art. 2º §7º lançada.
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
