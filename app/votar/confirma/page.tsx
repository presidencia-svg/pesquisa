import Link from 'next/link'
import { redirect } from 'next/navigation'

import { RodapeInstitucional } from '@/components/rodape-institucional'
import { resolverEdicaoAlvo } from '@/lib/edicao-alvo'
import { getPreVoto, getVotoToken } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { DadosForm } from './dados-form'

export const metadata = {
  title: 'Seus dados · Pesquisa Eleitoral Sergipe 2026',
}

export default async function ConfirmaPage() {
  // Se ja entrou na capsula, vai pra capsula.
  const token = await getVotoToken()
  if (token) redirect('/votar/anonimo')

  const draft = await getPreVoto()
  if (!draft) redirect('/votar')
  const edicao = await resolverEdicaoAlvo()

  // Carrega lista de municipios pra popular o select.
  const db = supabaseAdmin()
  const { data: municipios } = await db
    .from('municipios_se')
    .select('ibge_codigo, nome')
    .order('nome')

  return (
    <>
    <main className="flex flex-col flex-1 bg-background">
      <header className="border-b border-border">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Início
          </Link>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Etapa 2 de 4
          </p>
        </div>
      </header>

      <section className="flex-1 flex flex-col px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-foreground">
              Seus dados
            </h1>
            <p className="text-base text-muted-foreground">
              CPF identificado:{' '}
              <span className="font-mono">{draft.cpfMascarado}</span>.{' '}
              {draft.sexo && draft.sexoOrigem !== 'eleitor'
                ? 'Confirmamos sexo e idade na consulta cadastral do CPF — agora só precisamos do seu município, escolaridade, faixa de renda (a Resolução TSE pede a composição da amostra por nível econômico; a renda não entra na ponderação) e WhatsApp pra confirmar o cadastro.'
                : draft.sexoOrigem === 'eleitor'
                  ? 'Confirmamos sua idade na consulta cadastral do CPF; o sexo foi informado por você (confira abaixo). Precisamos também do seu município, escolaridade, faixa de renda (a Resolução TSE pede a composição da amostra por nível econômico; a renda não entra na ponderação) e WhatsApp pra confirmar o cadastro.'
                  : 'Confirmamos sua idade na consulta cadastral do CPF — agora precisamos do seu município, sexo (a consulta cadastral não informou), escolaridade, faixa de renda (a Resolução TSE pede a composição da amostra por nível econômico; a renda não entra na ponderação) e WhatsApp pra confirmar o cadastro.'}
            </p>
          </div>

          <DadosForm
            municipios={municipios ?? []}
            exigirTitulo={draft.faixaEtaria === '16-17'}
            perguntarSexo={!draft.sexo || draft.sexoOrigem === 'eleitor'}
            {...(draft.sexo && draft.sexoOrigem === 'eleitor'
              ? { prefilledSexo: draft.sexo }
              : {})}
            algumPrefill={Boolean(
              draft.municipioIbge ||
                draft.whatsappE164 ||
                draft.escolaridadeDetalhe ||
                draft.nivelEconomico,
            )}
            {...(draft.municipioIbge !== undefined
              ? { prefilledMunicipio: draft.municipioIbge }
              : {})}
            {...(draft.whatsappE164 !== undefined
              ? { prefilledWhatsapp: draft.whatsappE164 }
              : {})}
            {...(draft.escolaridadeDetalhe !== undefined
              ? { prefilledEscolaridade: draft.escolaridadeDetalhe }
              : {})}
            {...(draft.nivelEconomico !== undefined
              ? { prefilledNivelEconomico: draft.nivelEconomico }
              : {})}
          />

          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Por que pedimos esses dados?
            </summary>
            <div className="pt-3 flex flex-col gap-2">
              <p>
                Município, sexo, faixa etária e escolaridade são as variáveis
                do plano amostral: a amostra é ponderada por elas contra o
                eleitorado oficial do TSE (Res.-TSE 23.600/2019, com a redação
                da Res.-TSE 23.747/2026). A faixa de renda <strong>não entra
                na ponderação</strong> — só descreve a composição da amostra
                por nível econômico, como a Resolução exige.
              </p>
              <p>
                Também registramos, para auditoria, o endereço IP, o
                navegador e uma impressão do dispositivo — apenas registrados,
                sem bloquear ninguém. Detalhes em{' '}
                <Link href="/privacidade" className="text-primary hover:underline">
                  /privacidade
                </Link>
                .
              </p>
              <p>
                Esses dados ficam só na <strong>Sala 1</strong> (validação) —
                <strong> nunca</strong> são gravados junto com seus votos. Na
                hora de divulgar resultados cruzados (ex.:{' '}
                <em>&ldquo;intenção entre mulheres de 25-34 em Aracaju&rdquo;</em>),
                aplicamos k-anonymity ≥ 30 — ou seja, só publicamos cortes com
                pelo menos 30 respondentes.
              </p>
            </div>
          </details>
        </div>
      </section>
    </main>
    <RodapeInstitucional registro={edicao?.registro} />
    </>
  )
}
