import { MarcaCdl } from './marca-cdl'

/**
 * Rodape institucional pras telas FORA DA CAPSULA.
 *
 * Reforca a credibilidade da CDL com fatos verificaveis (fundacao,
 * Lei de Utilidade Publica, sem fins lucrativos) — todos documentados
 * em docs/credibilidade-cdl.md. Sem propaganda.
 *
 * NUNCA usar dentro da capsula (anonimo + cedulas + obrigado em fundo
 * verde) — la o foco e o ato de votar, sem ruido de marca.
 */
export function RodapeInstitucional() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-2xl mx-auto px-6 py-7 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <MarcaCdl tamanho="sm" />
          <div className="flex flex-col gap-0.5 sm:items-end leading-tight text-muted-foreground">
            <p className="text-[10px] uppercase tracking-[0.2em]">
              Pesquisa Eleitoral Sergipe 2026
            </p>
            <p className="text-[10px]">Registro TRE/SE pendente</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 pt-4 border-t border-border text-[10px] leading-relaxed text-muted-foreground">
          <p>
            Fundada em <strong className="text-foreground">21 de dezembro de 1961</strong>.
            Entidade de utilidade pública pela{' '}
            <strong className="text-foreground">Lei Municipal nº 63 de 1967</strong>.
            Associação civil sem fins lucrativos.
          </p>
        </div>
      </div>
    </footer>
  )
}
