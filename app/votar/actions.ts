'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { cpfValido, mascararCpf, normalizarCpf } from '@/lib/cpf'
import { hashCpf } from '@/lib/crypto'
import { detalheDeEstrato, isEscolaridadeDetalhe, isNivelEconomico } from '@/lib/demograficos'
import { resolverEdicaoAlvo } from '@/lib/edicao-alvo'
import { DEV_MODE } from '@/lib/env'
import { dentroDeSergipe, ipEmSergipe } from '@/lib/geo-sergipe'
import { obterIpCliente } from '@/lib/ip'
import { registrarTentativaIp } from '@/lib/rate-limit'
import { consultarSpc, type SpcDadosEleitor } from '@/lib/spc'
import { setPreVoto, type FonteDado, type PreVotoDraft } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyTurnstile } from '@/lib/turnstile'

/**
 * Códigos de erro estruturados para o cliente diferenciar UX:
 *  - input_invalido    → erro do usuário, mostra mensagem simples
 *  - cpf_invalido      → mesmo grupo, foco no input do CPF
 *  - idade_minima      → bloqueio definitivo, sem botão "tentar de novo"
 *  - cpf_irregular     → bloqueio definitivo, instrui regularização
 *  - servico_indisponivel → falha transitória, sugere tentar mais tarde +
 *                            mostra canal de suporte
 *  - rate_limit        → muitas tentativas, espera
 *  - sistema           → erro nosso, mostra suporte
 */
export type VotarErroCode =
  | 'input_invalido'
  | 'cpf_invalido'
  | 'idade_minima'
  | 'cpf_irregular'
  | 'cpf_inativo'
  | 'cpf_falecido'
  | 'navegador_anonimo'
  | 'localizacao'
  | 'ainda_nao_abriu'
  | 'servico_indisponivel'
  | 'rate_limit'
  | 'sistema'

export type VotarFormState = {
  ok: boolean
  message?: string
  code?: VotarErroCode
}

/**
 * Server Action chamada pelo form de /votar.
 *
 * Fluxo:
 *  1. Valida formato + checksum do CPF.
 *  2. Busca edicao ativa.
 *  3. Registra a tentativa por IP (sem bloqueio).
 *  4. Hasheia CPF, busca em `cdl_base`. Hit -> fonte='cdl_base', skip SPC,
 *     puxa pre-preenchimento do que estiver na cdl_base.
 *  5. Miss em cdl_base -> consulta SPC. Sucesso -> fonte='spc', spc_validado=true,
 *     pre-preenchimento com o que SPC retornou. Falha -> erro pro eleitor.
 *  6. Grava rascunho no cookie `pre_voto` e redireciona pra /votar/confirma.
 *
 * NAO cria linha em `eleitores_pesquisa` ainda — a linha so entra quando
 * o eleitor confirmar municipio + WhatsApp em /votar/confirma.
 */
export async function entrarComCpf(
  _prev: VotarFormState,
  formData: FormData,
): Promise<VotarFormState> {
  const raw = formData.get('cpf')
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, code: 'input_invalido', message: 'Informe o CPF.' }
  }

  const cpf = normalizarCpf(raw)
  if (!cpfValido(cpf)) {
    return {
      ok: false,
      code: 'cpf_invalido',
      message: 'CPF inválido. Verifique os dígitos.',
    }
  }

  // Bloqueio de modo anônimo/incógnito. O cliente detecta via
  // navigator.storage.estimate() e envia este flag — se vier "1",
  // recusa o cadastro mesmo que o JS tenha sido contornado.
  if (formData.get('navegador_anonimo') === '1') {
    return {
      ok: false,
      code: 'navegador_anonimo',
      message:
        'O cadastro não é permitido em navegação anônima ou privativa. Abra esta página em uma janela normal e tente novamente.',
    }
  }

  // 0. Anti-bot (Turnstile) — antes de tudo. Em DEV_MODE faz bypass.
  const headersListEarly = await headers()
  const ipEarly = obterIpCliente(headersListEarly)
  const tokenTurnstile = formData.get('cf-turnstile-response')
  const tokenStr = typeof tokenTurnstile === 'string' ? tokenTurnstile : null
  const turnstile = await verifyTurnstile(tokenStr, ipEarly)
  if (!turnstile.ok) {
    return {
      ok: false,
      code: 'input_invalido',
      message:
        'Verificação anti-bot falhou. Recarregue a página e tente novamente.',
    }
  }

  const db = supabaseAdmin()

  // Edicao alvo primeiro: o fator de localização é um toggle POR EDIÇÃO
  // (admin/edicoes) e precisamos dele antes da checagem geo.
  const edicao = await resolverEdicaoAlvo()
  if (!edicao) {
    return {
      ok: false,
      code: 'sistema',
      message: 'Nenhuma pesquisa está ativa neste momento.',
    }
  }

  // 0b. Fator de localização: o eleitor deve estar em Sergipe. Caminho
  //     feliz: o IP (headers da Vercel) já resolve pra SE — zero fricção.
  //     Plano B: coordenadas do GPS (o client mostra o card grande).
  //     Revalidação autoritativa aqui; a coordenada é validada e
  //     DESCARTADA (LGPD). Em DEV_MODE faz bypass.
  if (!DEV_MODE && edicao.exigirLocalizacao) {
    const h = await headers()
    const ipOk = ipEmSergipe(
      h.get('x-vercel-ip-country'),
      h.get('x-vercel-ip-country-region'),
    )
    const latRaw = formData.get('geo_lat')
    const lngRaw = formData.get('geo_lng')
    const lat = typeof latRaw === 'string' && latRaw ? Number(latRaw) : NaN
    const lng = typeof lngRaw === 'string' && lngRaw ? Number(lngRaw) : NaN
    // 3ª via, sem fricção: quem já está na base da CDL Aracaju é
    //     comprovadamente do nosso cadastro sergipano — não faz sentido
    //     exigir GPS dele. No 4G o IP quase sempre cai em outro estado
    //     (a operadora roteia), e a tela de permissão fazia o eleitor
    //     desistir. O vínculo com Sergipe segue garantido adiante: na
    //     etapa seguinte ele escolhe o município, e a lista só tem os 75
    //     de Sergipe.
    let naBaseCdl = false
    if (!ipOk && !dentroDeSergipe(lat, lng)) {
      const { data: cdlGeo } = await db
        .from('cdl_base')
        .select('cpf_hash')
        .eq('cpf_hash', hashCpf(cpf))
        .maybeSingle()
      naBaseCdl = Boolean(cdlGeo)
    }
    // A pesquisa é do eleitorado de SERGIPE INTEIRO (1,73 mi) — a base da
    // CDL cobre só 44 mil. Exigir GPS de todo mundo no 4G (IP roteado pra
    // outro estado) excluiria a maioria. Aceitamos qualquer IP do BRASIL;
    // só o exterior fica de fora sem GPS-SE. O voto único e o vínculo com
    // SE seguem garantidos por CPF (Receita/SPC), WhatsApp com OTP e o
    // município do título (a lista só tem os 75 de Sergipe). IP fica
    // gravado no cadastro pra auditoria.
    const paisBrasil = h.get('x-vercel-ip-country') === 'BR'
    if (!ipOk && !dentroDeSergipe(lat, lng) && !naBaseCdl && !paisBrasil) {
      return {
        ok: false,
        code: 'localizacao',
        message:
          'Não foi possível confirmar sua localização em Sergipe. Ative a localização do aparelho e tente novamente.',
      }
    }
  }

  // 1. Janela da edição
  if (new Date(edicao.fim) < new Date()) {
    return {
      ok: false,
      code: 'sistema',
      message: 'Esta edição da pesquisa já foi encerrada.',
    }
  }
  // Janela de coleta: não permite votar antes do início declarado.
  if (new Date(edicao.inicio) > new Date()) {
    return {
      ok: false,
      code: 'ainda_nao_abriu',
      message: `A votação ainda não começou. Ela abre em ${new Date(edicao.inicio).toLocaleDateString('pt-BR', { timeZone: 'America/Recife', day: '2-digit', month: '2-digit' })}.`,
    }
  }

  // 2. IP: só registro pra auditoria. O bloqueio por IP foi retirado em
  //    12/09/2026 — com CGNAT das operadoras móveis, milhares de eleitores
  //    saem pelo mesmo IP e o teto derrubava gente legítima. Robô enumerando
  //    CPF esbarra no Turnstile (passo 0); o custo do SPC é contido pela
  //    própria verificação anti-bot e pelo cache em cdl_base.
  await registrarTentativaIp('votar_cpf')

  // 3. Hash + lookup cdl_base
  const cpfHash = hashCpf(cpf)

  const { data: cdl } = await db
    .from('cdl_base')
    .select(
      'municipio_ibge, whatsapp_e164, nome_mascarado, sexo, sexo_fonte, faixa_etaria, escolaridade, escolaridade_detalhe, nivel_economico',
    )
    .eq('cpf_hash', cpfHash)
    .maybeSingle()

  const fonte: 'cdl_base' | 'spc' = cdl ? 'cdl_base' : 'spc'

  // 4. SPC é consultado quando cdl_base não tem faixa_etaria (hit incompleto
  //    OU miss completo). Faixa é OBRIGATÓRIA — sem ela, não permitimos o
  //    cadastro (Resolução TSE 23.747/2026 exige ponderação demográfica,
  //    e a idade não é perguntada ao eleitor pra evitar autodeclaração
  //    incorreta ou tentativa de burlar bloqueio de menor de 16 anos).
  //
  //    Quando o SPC traz a faixa, gravamos de volta no cdl_base (UPSERT)
  //    pra acelerar consultas futuras e construir um cache permanente.
  let spcValidado: boolean
  let prefillSpc: SpcDadosEleitor = {}
  // Sexo na regra: a partir da Pesquisa Eleitoral Sergipe 2026, tiramos a pergunta
  // de gênero do formulário e passamos a confiar na consulta cadastral por
  // CPF (SPC, produto "Confirme PF"). Pra eleitores cujo cdl_base já tem
  // faixa mas não tem sexo (legado importado do Melhores do Ano), consultamos
  // SPC pra preencher. Quando nem o SPC devolve o sexo (na 1ª edição, 22%
  // dos respondentes, sobretudo jovens), /votar/confirma pergunta ao eleitor
  // e grava o valor autodeclarado no cache — ver confirma/actions.ts.
  const precisaSpc = !cdl || !cdl.faixa_etaria || !cdl.sexo

  if (!precisaSpc) {
    // cdl_base hit com faixa — confiança total nos dados locais
    spcValidado = true
  } else {
    const spc = await consultarSpc(cpf)
    if (!spc.ok) {
      console.error('[votar] SPC falhou', {
        razao: spc.razao,
        detalhe: spc.detalhe,
      })
      switch (spc.razao) {
        case 'cpf_inexistente':
          return {
            ok: false,
            code: 'cpf_invalido',
            message: 'CPF não localizado. Confirme os dígitos e tente de novo.',
          }
        case 'cpf_irregular':
          return {
            ok: false,
            code: 'cpf_irregular',
            message:
              'A situação cadastral do seu CPF consta como pendente de regularização (fonte: SPC Brasil). Acesse gov.br/receitafederal para regularizar e tente novamente.',
          }
        case 'cpf_inativo':
          return {
            ok: false,
            code: 'cpf_inativo',
            message:
              'A situação cadastral do seu CPF não consta como regular (suspenso, cancelado ou nulo — fonte: SPC Brasil). Apenas eleitores com CPF regular podem participar desta pesquisa. Para regularizar, acesse gov.br/receitafederal.',
          }
        case 'cpf_falecido':
          return {
            ok: false,
            code: 'cpf_falecido',
            message:
              'A situação cadastral deste CPF indica óbito do titular (fonte: SPC Brasil). Em respeito ao titular, não é possível prosseguir.',
          }
        case 'idade_minima':
          return {
            ok: false,
            code: 'idade_minima',
            message:
              'A Pesquisa Eleitoral Sergipe 2026 é uma pesquisa de intenção de voto e só pode ser respondida por eleitores com idade mínima de 16 anos (Constituição Federal, art. 14, §1º). Volte quando completar a idade mínima.',
          }
        case 'idade_indeterminada':
          return {
            ok: false,
            code: 'servico_indisponivel',
            message:
              'A consulta cadastral ao SPC Brasil não devolveu sua data de nascimento. Tente novamente em alguns minutos — se persistir, contate dpo@cdlaju.com.br.',
          }
        case 'nao_integrado':
          return {
            ok: false,
            code: 'servico_indisponivel',
            message:
              'A validação de identidade está temporariamente indisponível. A pesquisa abrirá em breve — acompanhe em pesquisa.cdlaju.com.br.',
          }
        case 'erro_api':
        default:
          return {
            ok: false,
            code: 'servico_indisponivel',
            message:
              'Não foi possível validar seu CPF no momento. Tente novamente em alguns minutos. Se o problema persistir, contate dpo@cdlaju.com.br informando o horário da tentativa.',
          }
      }
    }
    spcValidado = true
    prefillSpc = spc.dados

    // SPC respondeu OK mas sem faixaEtaria (dataDeNascimento ausente
    // ou inválida). Não permitimos prosseguir sem idade comprovada.
    if (!prefillSpc.faixaEtaria) {
      console.error('[votar] SPC ok mas sem faixaEtaria', {
        cpfHash,
        // Quais campos vieram (sem expor dados pessoais reais).
        // Útil pra diagnosticar mudanças do payload SPC.
        camposPrefill: Object.keys(prefillSpc),
        temNome: Boolean(prefillSpc.nomeMascarado),
        temSexo: Boolean(prefillSpc.sexo),
      })
      return {
        ok: false,
        code: 'servico_indisponivel',
        message:
          'Não foi possível confirmar sua faixa etária nos cadastros oficiais. Tente novamente em alguns minutos. Se persistir, contate dpo@cdlaju.com.br.',
      }
    }

    // Cadastro unificado em cdl_base (migration 051): UPDATE se hit
    // incompleto, INSERT se miss. origem='spc_lookup' distingue do importado
    // de Melhores do Ano; cada campo leva a própria proveniência (*_fonte).
    // PK do cdl_base é cpf_hash, então .upsert() funciona limpo.
    const cacheRow: Record<string, unknown> = {
      cpf_hash: cpfHash,
      faixa_etaria: prefillSpc.faixaEtaria,
      faixa_etaria_fonte: 'spc',
      atualizado_em: new Date().toISOString(),
    }
    // Bloco integral do SPC: tudo que a consulta devolveu, inclusive o JSON
    // bruto (decisão do contratante em 12/09/2026). Substitui o que houver
    // (inclusive cópia do cache do Melhores do Ano — a consulta nova é mais
    // recente).
    if (prefillSpc.cadastro) {
      const cad = prefillSpc.cadastro
      Object.assign(cacheRow, {
        nome_completo: cad.nomeCompleto,
        nome_mae: cad.nomeMae,
        data_nascimento: cad.dataNascimento,
        idade_consulta: cad.idade,
        estado_civil: cad.estadoCivil,
        cpf_situacao: cad.cpfSituacao,
        cpf_situacao_data: cad.cpfSituacaoData,
        spc_produto: cad.produto,
        spc_payload: cad.payload,
        spc_consultado_em: new Date().toISOString(),
        cadastro_spc_fonte: 'spc',
      })
    }
    // Sexo: SEMPRE atualiza quando SPC retorna (mesmo se cdl row já
    // existe), pra completar registros legados do Melhores do Ano que
    // entraram sem sexo e pra substituir um valor autodeclarado por um
    // cadastral (fonte oficial prevalece). Marca a proveniência.
    // Atenção: o SPC só é consultado enquanto o cache está incompleto
    // (precisaSpc acima). Um sexo autodeclarado gravado em cdl_base após
    // o OTP (otp/actions.ts) NÃO dispara nova consulta ao SPC — a
    // limitação é da fonte, e reconsultar custaria por CPF sem ganho
    // esperado. A proveniência fica em sexo_fonte (migrations 047/051).
    if (prefillSpc.sexo) {
      cacheRow.sexo = prefillSpc.sexo
      cacheRow.sexo_fonte = 'spc'
    }
    if (!cdl) {
      cacheRow.origem = 'spc_lookup'
      if (prefillSpc.nomeMascarado) {
        cacheRow.nome_mascarado = prefillSpc.nomeMascarado
        cacheRow.nome_fonte = 'spc'
      }
      if (prefillSpc.escolaridade) {
        cacheRow.escolaridade = prefillSpc.escolaridade
        cacheRow.escolaridade_fonte = 'spc'
      }
      if (prefillSpc.municipioIbge) {
        cacheRow.municipio_ibge = prefillSpc.municipioIbge
        cacheRow.municipio_fonte = 'spc'
      }
      if (prefillSpc.whatsappE164) {
        cacheRow.whatsapp_e164 = prefillSpc.whatsappE164
        cacheRow.whatsapp_fonte = 'spc'
      }
    }
    const { error: errCache } = await db
      .from('cdl_base')
      .upsert(cacheRow, { onConflict: 'cpf_hash' })
    if (errCache) {
      // Não bloqueia o fluxo — cache é otimização, não pré-requisito.
      console.error('[votar] erro ao popular cdl_base com dados SPC', errCache)
    }
  }

  // 5. Monta rascunho. Faixa etária garantida: vem do cdl_base (hit
  //    com faixa) ou do SPC (caso contrário). Sexo/escolaridade/etc
  //    são opcionais — formulário pergunta o que faltar.
  const draft: PreVotoDraft = {
    cpfHash,
    cpfMascarado: mascararCpf(cpf),
    edicaoId: edicao.id,
    fonte,
    spcValidado,
  }

  const municipio = cdl?.municipio_ibge ?? prefillSpc.municipioIbge
  if (municipio) draft.municipioIbge = municipio

  const whatsapp = cdl?.whatsapp_e164 ?? prefillSpc.whatsappE164
  if (whatsapp) draft.whatsappE164 = whatsapp

  const nome = cdl?.nome_mascarado ?? prefillSpc.nomeMascarado
  if (nome) draft.nomeMascarado = nome

  // Sexo — prioridade: cadastral (cdl_base com fonte mda/spc_mda/spc, ou SPC
  // agora) > informado pelo eleitor em edição anterior (cdl_base.sexo_fonte =
  // 'eleitor'), que volta pré-preenchido e editável em /votar/confirma. Só o
  // cadastral é imutável no formulário. A proveniência segue no rascunho.
  const cdlSexo = (cdl?.sexo ?? undefined) as 'M' | 'F' | undefined
  const cdlSexoFonte = (cdl?.sexo_fonte ?? null) as FonteDado | null
  const cdlSexoAutodeclarado = Boolean(cdlSexo) && cdlSexoFonte === 'eleitor'
  const spcSexo = prefillSpc.sexo as 'M' | 'F' | undefined
  const sexoPrefill = cdlSexoAutodeclarado
    ? (spcSexo ?? cdlSexo)
    : (cdlSexo ?? spcSexo)
  if (sexoPrefill) {
    draft.sexo = sexoPrefill
    draft.sexoOrigem = cdlSexoAutodeclarado
      ? spcSexo
        ? 'spc'
        : 'eleitor'
      : cdlSexo
        ? (cdlSexoFonte ?? 'spc_mda') // linha anterior à 051 sem marca = cadastral
        : 'spc'
  }

  // Faixa etária: sempre presente neste ponto (cdl_base hit com faixa
  // OU SPC retornou faixaEtaria — caso contrário já teríamos abortado).
  const faixaPrefill = (cdl?.faixa_etaria ?? prefillSpc.faixaEtaria) as
    | PreVotoDraft['faixaEtaria']
    | undefined
  if (!faixaPrefill) {
    // Defesa em profundidade — não deve chegar aqui se a lógica
    // acima estiver correta. Mas se chegar, abortar é o seguro.
    console.error('[votar] faixaEtaria ausente após resolução', { cpfHash })
    return {
      ok: false,
      code: 'sistema',
      message:
        'Não foi possível determinar sua faixa etária. Contate dpo@cdlaju.com.br se persistir.',
    }
  }
  draft.faixaEtaria = faixaPrefill

  const escolPrefill = (cdl?.escolaridade ?? prefillSpc.escolaridade) as
    | PreVotoDraft['escolaridade']
    | undefined
  if (escolPrefill) draft.escolaridade = escolPrefill
  // Opção marcada no formulário (2ª edição em diante). Quem só tem o estrato
  // da 1ª edição recebe o detalhe derivado quando não há ambiguidade
  // (medio/superior); 'fundamental' volta sem seleção.
  const detalheCdl: unknown = cdl?.escolaridade_detalhe
  const detalhePrefill = isEscolaridadeDetalhe(detalheCdl)
    ? detalheCdl
    : detalheDeEstrato(escolPrefill)
  if (detalhePrefill) draft.escolaridadeDetalhe = detalhePrefill

  // Renda: quem ja' respondeu numa edicao anterior ve o valor pre-preenchido
  // (editavel — pode ter mudado). Vem so do cache, o SPC nao devolve isso.
  // Valores da 1ª edição (A/B/C/D_E) não são oferecidos mais — sem prefill.
  const rendaCdl: unknown = cdl?.nivel_economico
  if (isNivelEconomico(rendaCdl)) draft.nivelEconomico = rendaCdl

  await setPreVoto(draft)

  redirect('/votar/confirma')
}
