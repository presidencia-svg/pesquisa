import Link from 'next/link'
import { redirect } from 'next/navigation'

import { RodapeInstitucional } from '@/components/rodape-institucional'
import { getPreVoto, getVotoToken } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { DadosForm } from './dados-form'

export const metadata = {
  title: 'Seus dados · Pesquisa Sergipe 2026',
}

export default async function ConfirmaPage() {
  // Se ja entrou na capsula, vai pra capsula.
  const token = await getVotoToken()
  if (token) redirect('/votar/anonimo')

  const draft = await getPreVoto()
  if (!draft) redirect('/votar')

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
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <section className="flex-1 flex flex-col px-6 py-12">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-foreground">
              Seus dados
            </h1>
            <p className="text-base text-muted-foreground">
              CPF identificado:{' '}
              <span className="font-mono">{draft.cpfMascarado}</span>. Agora
              precisamos do seu município, perfil demográfico (exigência da
              Resolução TSE 23.747/2026 pra ponderar a amostra) e WhatsApp pra
              confirmar o cadastro.
            </p>
          </div>

          <DadosForm
            municipios={municipios ?? []}
            algumPrefill={Boolean(
              draft.municipioIbge ||
                draft.whatsappE164 ||
                draft.sexo ||
                draft.faixaEtaria ||
                draft.escolaridade,
            )}
            {...(draft.municipioIbge !== undefined
              ? { prefilledMunicipio: draft.municipioIbge }
              : {})}
            {...(draft.whatsappE164 !== undefined
              ? { prefilledWhatsapp: draft.whatsappE164 }
              : {})}
            {...(draft.sexo !== undefined
              ? { prefilledSexo: draft.sexo }
              : {})}
            {...(draft.faixaEtaria !== undefined
              ? { prefilledFaixaEtaria: draft.faixaEtaria }
              : {})}
            {...(draft.escolaridade !== undefined
              ? { prefilledEscolaridade: draft.escolaridade }
              : {})}
          />

          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Por que pedimos esses dados?
            </summary>
            <div className="pt-3 flex flex-col gap-2">
              <p>
                Sexo, faixa etária e escolaridade são exigidos pela Resolução
                TSE 23.747/2026 pra ponderar a amostra contra o eleitorado
                oficial do TSE.
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
    <RodapeInstitucional />
    </>
  )
}
