import { cache } from 'react'

import { extrairRegistros } from '@/lib/registro-pesqele'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { MarcaCdl } from './marca-cdl'

/**
 * Rodape institucional pras telas FORA DA CAPSULA.
 *
 * Reforca a credibilidade da CDL com fatos verificaveis (fundacao,
 * Lei de Utilidade Publica, sem fins lucrativos) — todos documentados
 * em docs/credibilidade-cdl.md. Sem propaganda.
 *
 * O registro PesqEle mostrado e o da EDICAO EM VIGOR (lido do banco),
 * nunca um numero fixo: uma edicao em campo ainda nao tem registro (a
 * Lei 9.504/97, art. 33, exige o registro ate 5 dias antes da
 * DIVULGACAO), e exibir o numero da edicao anterior daria a entender
 * que a coleta atual ja esta registrada. Sem registro, o rodape diz
 * isso explicitamente.
 *
 * As telas do fluxo de voto passam `registro` da edicao-alvo (que pode
 * ser a edicao de teste, via cookie). As demais deixam o componente ler
 * a edicao ativa — sem cookies, pra nao tirar as paginas cacheadas
 * (`revalidate`) do cache.
 *
 * NUNCA usar dentro da capsula (anonimo + cedulas + obrigado em fundo
 * verde) — la o foco e o ato de votar, sem ruido de marca.
 */

const registroDaEdicaoAtiva = cache(async (): Promise<string | null> => {
  const { data } = await supabaseAdmin()
    .from('edicao')
    .select('registro_tre')
    .eq('ativa', true)
    .maybeSingle<{ registro_tre: string | null }>()
  return data?.registro_tre ?? null
})

export async function RodapeInstitucional({
  registro,
}: {
  /**
   * Campo `registro_tre` da edicao em vigor. `undefined` = ler a edicao
   * ativa do banco; `null`/vazio = edicao sem registro.
   */
  registro?: string | null
} = {}) {
  const texto = registro === undefined ? await registroDaEdicaoAtiva() : registro
  const registros = extrairRegistros(texto)

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-2xl mx-auto px-6 py-7 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <MarcaCdl tamanho="sm" />
          <div className="flex flex-col gap-0.5 sm:items-end leading-tight text-muted-foreground">
            <p className="text-[10px] uppercase tracking-[0.2em]">
              Pesquisa Eleitoral Sergipe 2026
            </p>
            {registros.length > 0 ? (
              <p className="text-[10px]">
                Registro{' '}
                {registros.map((r, i) => (
                  <span key={r.numero}>
                    {i > 0 && ' · '}
                    {r.orgao} <strong className="text-foreground">{r.numero}</strong>
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-[10px]">
                Registro no PesqEle (TSE e TRE-SE) antes de qualquer divulgação
                <span className="hidden sm:inline"> · Lei 9.504/97, art. 33</span>
              </p>
            )}
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
