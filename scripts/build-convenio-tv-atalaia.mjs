#!/usr/bin/env node
/**
 * Gera docs/convenio-tv-atalaia.docx — convênio jornalístico entre
 * CDL Aracaju e Televisão Atalaia Ltda para divulgação conjunta
 * da Pesquisa Sergipe 2026.
 *
 * Conforme Lei 9.504/1997, Resolução TSE 23.747/2026 e LGPD.
 *
 * Uso:
 *   node scripts/build-convenio-tv-atalaia.mjs
 *
 * Requer `docx` instalado globalmente:
 *   npm install -g docx
 */

import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const docxPath = process.execPath.replace(/\/bin\/node$/, '/lib/node_modules/docx')
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageOrientation,
} = require(docxPath)

const FONT = 'Times New Roman'
const SIZE_BODY = 24
const SIZE_H1 = 28
const SIZE_KICKER = 20

const txt = (text, opts = {}) =>
  new TextRun({ text, font: FONT, size: SIZE_BODY, ...opts })

const para = (children) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 320 },
    children,
  })

const center = (text, opts = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.kicker ? SIZE_KICKER : SIZE_BODY,
        bold: opts.bold,
        italics: opts.italic,
      }),
    ],
  })

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 200 },
    children: [
      new TextRun({ text, font: FONT, size: SIZE_H1, bold: true }),
    ],
  })

const h2 = (text) =>
  new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({ text, font: FONT, size: SIZE_BODY, bold: true }),
    ],
  })

const blank = (n = 1) =>
  Array.from({ length: n }, () => new Paragraph({ children: [txt('')] }))

const linhaAssinatura = () => center('____________________________________________________')

const considerando = (textoSemPrefixo) =>
  para([txt('CONSIDERANDO ', { bold: true }), txt(textoSemPrefixo)])

const inciso = (numeral, texto) =>
  para([txt(`${numeral}. `, { bold: true }), txt(texto)])

const children = [
  // ─── Título ────────────────────────────────────────────────────────────
  h1('CONVÊNIO DE COOPERAÇÃO JORNALÍSTICA'),
  center('Divulgação Conjunta — Pesquisa Sergipe 2026', { kicker: true }),
  ...blank(2),

  // ─── Qualificação das partes ───────────────────────────────────────────
  h2('PARTES'),

  para([
    txt('CONVENENTE 1 — CÂMARA DE DIRIGENTES LOJISTAS DE ARACAJU (CDL ARACAJU): ', {
      bold: true,
    }),
    txt(
      'associação civil sem fins lucrativos, fundada em 21 de dezembro de 1961, entidade de utilidade pública pela Lei Municipal nº 63, de 6 de dezembro de 1967, inscrita no CNPJ sob o nº 13.045.935/0001-36, com sede na Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190, neste ato representada por seu Presidente do triênio 2026–2028, Sr. ',
    ),
    txt('Elison Vieira Santos do Bomfim', { bold: true }),
    txt(', inscrito no CPF sob o nº 776.463.555-34, doravante denominada '),
    txt('CDL ARACAJU', { bold: true }),
    txt('.'),
  ]),

  para([
    txt('CONVENENTE 2 — TELEVISÃO ATALAIA LTDA (TV ATALAIA): ', { bold: true }),
    txt(
      'sociedade empresária limitada, inscrita no CNPJ sob o nº 13.079.397/0001-09, com sede na Rua Cláudio Batista, 122, Santo Antônio, Aracaju/SE — CEP 49.060-100, dedicada à atividade de televisão aberta (CNAE 6021-7/00), afiliada à Record TV no Estado de Sergipe, neste ato representada por seu(sua) Diretor(a)-Geral, Sr(a). ',
    ),
    txt('_____________________________________', { bold: true }),
    txt(', inscrito(a) no CPF sob o nº ________________________, doravante denominada '),
    txt('TV ATALAIA', { bold: true }),
    txt('.'),
  ]),

  // ─── Considerandos ─────────────────────────────────────────────────────
  h2('CONSIDERANDOS'),

  considerando(
    'que a CDL Aracaju conduz a Pesquisa Sergipe 2026, pesquisa de intenção de voto para as Eleições 2026 no Estado de Sergipe, abrangendo os cargos de Presidente da República, Governador, Senador, Deputado Federal e Deputado Estadual, com metodologia estatística publicada em https://pesquisa.cdlaju.com.br/transparencia e registro no sistema PesqEle do Tribunal Regional Eleitoral de Sergipe (TRE/SE), nos termos da Lei nº 9.504/1997 e da Resolução TSE nº 23.747/2026;',
  ),
  considerando(
    'que a TV Atalaia é emissora de televisão aberta de alcance estadual, com programação jornalística diária reconhecida pela sociedade sergipana, sendo veículo idôneo para a divulgação responsável de pesquisas eleitorais ao público em geral;',
  ),
  considerando(
    'o interesse público da divulgação ampla, transparente e jornalisticamente contextualizada dos resultados da Pesquisa Sergipe 2026, em conformidade com o direito à informação assegurado pelo art. 5º, XIV, da Constituição Federal;',
  ),
  considerando(
    'que a divulgação de pesquisas eleitorais deve observar estritamente a Resolução TSE nº 23.747/2026, sob pena de aplicação das sanções previstas no art. 33 da Lei nº 9.504/1997;',
  ),
  considerando(
    'o interesse mútuo das partes em estabelecer formato de divulgação que combine rigor jornalístico (apresentação contextualizada pela equipe da TV Atalaia) com rigor metodológico (presença do Presidente da CDL Aracaju, responsável institucional pela pesquisa);',
  ),

  para([
    txt('RESOLVEM ', { bold: true }),
    txt(
      'celebrar o presente Convênio de Cooperação Jornalística, sem natureza comercial e sem transferência de recursos financeiros entre as partes, que se regerá pelas cláusulas e condições a seguir.',
    ),
  ]),

  // ─── Cláusula 1ª — Objeto ─────────────────────────────────────────────
  h2('Cláusula 1ª — Objeto'),
  para([
    txt(
      'O presente convênio tem por objeto a cooperação entre CDL Aracaju e TV Atalaia para divulgação ao vivo, em telejornal de alcance estadual, dos resultados da Pesquisa Sergipe 2026, em formato que garanta o direito à informação dos eleitores sergipanos, com presença simultânea de representante editorial da TV Atalaia e do Presidente da CDL Aracaju ou, na sua impossibilidade, de seu suplente formalmente designado.',
    ),
  ]),

  // ─── Cláusula 2ª — Obrigações da CDL ──────────────────────────────────
  h2('Cláusula 2ª — Obrigações da CDL Aracaju'),
  para([txt('A CDL Aracaju se compromete a:')]),
  inciso('I', 'concluir o registro da pesquisa no sistema PesqEle do TRE/SE antes de qualquer divulgação, com pelo menos 5 (cinco) dias úteis de antecedência em relação à data prevista da divulgação conjunta, conforme exigência do art. 2º da Resolução TSE nº 23.747/2026;'),
  inciso('II', 'disponibilizar à TV Atalaia, em ambiente seguro e com embargo jornalístico, os resultados consolidados (números, percentuais, margem de erro, recortes regionais e demográficos) com antecedência mínima de 24 (vinte e quatro) horas em relação ao horário do telejornal previsto, exclusivamente para fins de preparação editorial;'),
  inciso('III', 'não divulgar publicamente, por qualquer meio (site institucional, redes sociais, releases à imprensa, entrevistas), os resultados da Pesquisa Sergipe 2026 antes do encerramento do telejornal da TV Atalaia que primeiro os divulgar — vigência do embargo;'),
  inciso('IV', 'garantir a presença do Presidente da CDL Aracaju (ou suplente) no estúdio da TV Atalaia, na data e horário acordados, para participar da divulgação ao vivo e responder a esclarecimentos sobre a metodologia;'),
  inciso('V', 'após o término do telejornal, disponibilizar imediatamente a íntegra dos resultados no portal https://pesquisa.cdlaju.com.br/resultados, em conformidade com o princípio da transparência (Resolução TSE 23.747/2026, art. 5º);'),
  inciso('VI', 'fornecer à TV Atalaia a metodologia, ficha técnica, estatístico responsável (com CONRE), nome do contratante, valor, período de coleta e demais informações exigidas pelo art. 33 da Lei 9.504/1997, para inclusão na reportagem.'),

  // ─── Cláusula 3ª — Obrigações da TV Atalaia ───────────────────────────
  h2('Cláusula 3ª — Obrigações da TV Atalaia'),
  para([txt('A TV Atalaia se compromete a:')]),
  inciso('I', 'veicular a Pesquisa Sergipe 2026 em telejornal de horário nobre, com cobertura estadual, em data e horário previamente acordados entre as partes;'),
  inciso('II', 'realizar a divulgação ao vivo, com transmissão simultânea para todo o Estado de Sergipe via sinal aberto e plataformas digitais da emissora;'),
  inciso('III', 'conceder espaço editorial para participação do Presidente da CDL Aracaju (Elison Vieira Santos do Bomfim) ou, na sua impossibilidade, de seu suplente formalmente designado, com tempo de fala adequado para apresentação dos números e esclarecimento metodológico;'),
  inciso('IV', 'apresentar os resultados com fidelidade aos números fornecidos pela CDL Aracaju, sem manipulação editorial que altere ordem de classificação, percentuais ou contexto metodológico — admitindo-se livre análise jornalística, comentários e contraponto;'),
  inciso('V', 'exibir, na reportagem, todas as informações obrigatórias do art. 33 da Lei 9.504/1997 e da Resolução TSE 23.747/2026: contratante, executora, período de coleta, amostragem, nível de confiança, margem de erro, registro no PesqEle/TRE-SE;'),
  inciso('VI', 'respeitar o embargo estabelecido na Cláusula 2ª, III — não divulgar antecipadamente, em qualquer formato, dados objeto deste convênio antes do horário acordado;'),
  inciso('VII', 'garantir aos candidatos mencionados na pesquisa, no mesmo ou em telejornal subsequente, direito de resposta ou comentário, conforme política editorial da emissora, sem prejuízo de eventual direito de resposta judicial regulado pela Lei 9.504/1997.'),

  // ─── Cláusula 4ª — Conformidade legal ──────────────────────────────────
  h2('Cláusula 4ª — Conformidade legal'),
  para([txt('As partes declaram e reconhecem que:')]),
  inciso('I', 'a divulgação da Pesquisa Sergipe 2026 está integralmente submetida à Lei nº 9.504/1997, à Resolução TSE nº 23.747/2026 e demais normas da Justiça Eleitoral;'),
  inciso('II', 'os dados pessoais dos respondentes da pesquisa não são objeto deste convênio — a TV Atalaia recebe apenas resultados agregados e anonimizados, conforme metodologia da CDL Aracaju, em pleno respeito à Lei Geral de Proteção de Dados (Lei nº 13.709/2018);'),
  inciso('III', 'é vedado às partes utilizar a pesquisa ou sua divulgação como propaganda eleitoral, em favor ou desfavor de qualquer candidato, partido, federação ou coligação;'),
  inciso('IV', 'eventuais impugnações ou questionamentos quanto à pesquisa serão tratados pela CDL Aracaju, na qualidade de contratante e responsável institucional, junto ao TRE/SE.'),

  // ─── Cláusula 5ª — Sigilo durante embargo ─────────────────────────────
  h2('Cláusula 5ª — Sigilo durante o embargo'),
  para([
    txt(
      'Durante o período de embargo (Cláusula 2ª, III), as partes manterão sigilo absoluto sobre os números da pesquisa, restringindo o acesso apenas aos profissionais diretamente envolvidos na preparação editorial e na coordenação institucional.',
    ),
  ]),
  para([
    txt(
      'A violação do embargo por qualquer das partes — inclusive por funcionário, contratado ou prestador de serviço — autorizará a parte prejudicada a rescindir imediatamente este convênio, sem prejuízo de eventual reparação por perdas e danos.',
    ),
  ]),

  // ─── Cláusula 6ª — Marca e propriedade intelectual ─────────────────────
  h2('Cláusula 6ª — Marca, imagem e propriedade intelectual'),
  inciso('I', 'a TV Atalaia poderá utilizar, na reportagem e em peças jornalísticas correlatas, a marca e o nome institucional da CDL Aracaju, exclusivamente no contexto da divulgação da Pesquisa Sergipe 2026 e sem caráter publicitário;'),
  inciso('II', 'a CDL Aracaju poderá mencionar a TV Atalaia em comunicados institucionais relativos à divulgação, identificando-a como veículo parceiro do convênio;'),
  inciso('III', 'a metodologia, base de dados, código-fonte do sistema de coleta e identidade visual da Pesquisa Sergipe 2026 permanecem de titularidade exclusiva da CDL Aracaju;'),
  inciso('IV', 'a reportagem e produção audiovisual elaboradas pela TV Atalaia são de titularidade exclusiva da emissora, respeitados os direitos morais dos jornalistas envolvidos.'),

  // ─── Cláusula 7ª — Natureza não comercial ──────────────────────────────
  h2('Cláusula 7ª — Natureza não comercial'),
  para([
    txt(
      'O presente convênio é gratuito, sem contrapartida financeira entre as partes. Não há pagamento da CDL Aracaju à TV Atalaia, nem da TV Atalaia à CDL Aracaju, pela divulgação aqui pactuada. As partes reconhecem o interesse público como motivação central da cooperação.',
    ),
  ]),

  // ─── Cláusula 8ª — Vigência ────────────────────────────────────────────
  h2('Cláusula 8ª — Vigência'),
  para([
    txt(
      'Este convênio entra em vigor na data de sua assinatura e vigorará até 31 de dezembro de 2026, abrangendo todas as edições (1º e eventual 2º turno) da Pesquisa Sergipe 2026.',
    ),
  ]),
  para([
    txt(
      'Caso a CDL Aracaju conduza pesquisas em ciclos eleitorais futuros, a renovação do convênio dependerá de manifestação expressa de ambas as partes, mediante termo aditivo.',
    ),
  ]),

  // ─── Cláusula 9ª — Rescisão ────────────────────────────────────────────
  h2('Cláusula 9ª — Rescisão'),
  para([txt('O convênio poderá ser rescindido:')]),
  inciso('I', 'por mútuo acordo das partes, mediante termo escrito;'),
  inciso('II', 'unilateralmente, com notificação prévia de 15 (quinze) dias, em caso de descumprimento de qualquer cláusula por uma das partes;'),
  inciso('III', 'imediatamente, sem necessidade de notificação prévia, em caso de violação do embargo (Cláusula 5ª) ou de uso da pesquisa como propaganda eleitoral (Cláusula 4ª, III);'),
  inciso('IV', 'por decisão judicial ou administrativa do TRE/SE que impeça a continuidade da divulgação.'),
  para([
    txt(
      'A rescisão não exime as partes do cumprimento das obrigações já incorridas até a data do encerramento.',
    ),
  ]),

  // ─── Cláusula 10ª — Comunicações ──────────────────────────────────────
  h2('Cláusula 10ª — Comunicações'),
  para([
    txt(
      'Toda e qualquer comunicação oficial entre as partes deverá ser enviada por escrito, com confirmação de recebimento, aos seguintes endereços:',
    ),
  ]),
  para([txt('CDL Aracaju: ', { bold: true }), txt('Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190 · presidencia@cdlaju.com.br · dpo@cdlaju.com.br (DPO para questões de dados).')]),
  para([txt('TV Atalaia: ', { bold: true }), txt('Rua Cláudio Batista, 122, Santo Antônio, Aracaju/SE — CEP 49.060-100 · e-mail: ________________________________________')]),

  // ─── Cláusula 11ª — Foro ──────────────────────────────────────────────
  h2('Cláusula 11ª — Foro'),
  para([
    txt(
      'Fica eleito o Foro da Comarca de Aracaju, Estado de Sergipe, com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas ou controvérsias decorrentes deste convênio que não puderem ser resolvidas amigavelmente.',
    ),
  ]),

  // ─── Encerramento ─────────────────────────────────────────────────────
  h1('ENCERRAMENTO'),
  para([
    txt(
      'E, por estarem assim ajustadas, as partes firmam o presente convênio em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo identificadas, para que produza seus jurídicos e legais efeitos.',
    ),
  ]),
  ...blank(1),
  center('Aracaju, 26 de maio de 2026.'),
  ...blank(4),

  // Assinaturas
  linhaAssinatura(),
  center('ELISON VIEIRA SANTOS DO BOMFIM', { bold: true }),
  center('Presidente da CDL Aracaju (triênio 2026–2028)'),
  center('CPF 776.463.555-34'),
  ...blank(4),

  linhaAssinatura(),
  center('[NOME COMPLETO DO REPRESENTANTE LEGAL]', { bold: true }),
  center('Diretor(a)-Geral · Televisão Atalaia Ltda'),
  center('CPF ________________________'),
  ...blank(3),

  h2('Testemunhas'),
  ...blank(2),

  linhaAssinatura(),
  center('Nome: ________________________________________'),
  center('CPF: ________________________'),
  ...blank(3),

  linhaAssinatura(),
  center('Nome: ________________________________________'),
  center('CPF: ________________________'),
  ...blank(2),

  // Rodapé
  center(
    'Documento elaborado em conformidade com Lei nº 9.504/1997, Resolução TSE nº 23.747/2026 e Lei nº 13.709/2018 (LGPD).',
    { kicker: true },
  ),
  center('Versão 1.0', { kicker: true }),
]

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: SIZE_BODY } } },
  },
  sections: [
    {
      properties: {
        page: {
          size: {
            width: 11906,
            height: 16838,
            orientation: PageOrientation.PORTRAIT,
          },
          margin: { top: 1417, right: 1417, bottom: 1417, left: 1417 },
        },
      },
      children,
    },
  ],
})

const out = 'docs/convenio-tv-atalaia.docx'
Packer.toBuffer(doc).then((buf) => {
  writeFileSync(out, buf)
  console.log(`OK — ${out} criado (${buf.length} bytes)`)
})
