#!/usr/bin/env node
/**
 * Gera docs/ata-dpo.docx a partir do conteúdo formal da Ata de Designação
 * do DPO (Lei 13.709/2018, art. 41 + Res. ANPD 02/2022).
 *
 * O arquivo .md (docs/ata-dpo.md) é a fonte de verdade textual. Este
 * script reproduz o mesmo conteúdo em formato Word com formatação
 * adequada pra impressão e assinatura (Times New Roman 12, A4, margens
 * 2,5 cm, espaços pra rubrica).
 *
 * Uso:
 *   node scripts/build-ata-dpo.mjs
 *
 * Requer `docx` instalado globalmente:
 *   npm install -g docx
 */

import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

// docx está instalado globalmente; resolvemos via NODE_PATH dinâmico
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
const SIZE_BODY = 24       // 12pt em half-points
const SIZE_H1 = 28         // 14pt
const SIZE_KICKER = 20     // 10pt

/** Run helper com fonte padrão. */
const txt = (text, opts = {}) =>
  new TextRun({ text, font: FONT, size: SIZE_BODY, ...opts })

/** Parágrafo de corpo justificado. */
const para = (children) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 320 },
    children,
  })

/** Parágrafo centralizado (cabeçalho, assinaturas). */
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

/** Título h1 centralizado bold 14pt. */
const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [
      new TextRun({ text, font: FONT, size: SIZE_H1, bold: true }),
    ],
  })

/** Subtítulo de artigo. */
const h2 = (text) =>
  new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({ text, font: FONT, size: SIZE_BODY, bold: true }),
    ],
  })

/** Espaço em branco (linha em branco). */
const blank = (n = 1) =>
  Array.from({ length: n }, () => new Paragraph({ children: [txt('')] }))

/** Linha pra rubrica/assinatura. */
const linhaAssinatura = () => center('____________________________________________________')

const considerando = (textoSemPrefixo) =>
  para([
    txt('CONSIDERANDO ', { bold: true }),
    txt(textoSemPrefixo),
  ])

const children = [
  // ─── Cabeçalho ──────────────────────────────────────────────────────────
  center('Câmara de Dirigentes Lojistas de Aracaju · CDL Aracaju', { bold: true }),
  center('Associação civil sem fins lucrativos · Fundada em 21 de dezembro de 1961'),
  center('Entidade de utilidade pública — Lei Municipal nº 63 de 6 de dezembro de 1967'),
  center('CNPJ 13.045.935/0001-36'),
  center('Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190'),
  ...blank(1),

  // ─── Título ─────────────────────────────────────────────────────────────
  h1('ATA DE REUNIÃO EXTRAORDINÁRIA DA DIRETORIA'),
  h1('Designação do Encarregado pelo Tratamento de Dados Pessoais (DPO)'),
  ...blank(1),

  // ─── Dados da reunião ───────────────────────────────────────────────────
  para([txt('Ata nº: ', { bold: true }), txt('001/2026-EXT')]),
  para([txt('Data: ', { bold: true }), txt('26 de maio de 2026')]),
  para([txt('Hora de início: ', { bold: true }), txt('07h30')]),
  para([txt('Hora de encerramento: ', { bold: true }), txt('09h30')]),
  para([txt('Local: ', { bold: true }), txt('Hotel Vidam, Aracaju/SE.')]),
  para([
    txt('Presidente da reunião: ', { bold: true }),
    txt('Elison Vieira Santos do Bomfim — Presidente da CDL Aracaju (triênio 2026–2028).'),
  ]),
  para([
    txt('Secretária ad hoc: ', { bold: true }),
    txt('Claudimara Fontes Carvalho — 1ª Secretária da Diretoria.'),
  ]),
  para([txt('Presentes: ', { bold: true }), txt('conforme lista de presença anexa.')]),
  ...blank(1),

  // ─── Considerandos ──────────────────────────────────────────────────────
  h2('CONSIDERANDOS'),
  considerando(
    'que a Câmara de Dirigentes Lojistas de Aracaju (CDL Aracaju) realizará, no ano de 2026, pesquisa de intenção de voto para as eleições estaduais e federais em Sergipe, com registro no Pesquisas Eleitorais (PesqEle) do Tribunal Regional Eleitoral de Sergipe (TRE/SE);',
  ),
  considerando(
    'que a referida pesquisa envolverá tratamento de dados pessoais de eleitores sergipanos, abrangendo CPF (em forma criptografada), número de WhatsApp, município de domicílio eleitoral, dados demográficos (sexo, faixa etária, escolaridade) e registros técnicos (endereço IP, identificador de dispositivo);',
  ),
  considerando(
    'que o art. 41 da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD) impõe ao controlador a obrigação de indicar Encarregado pelo Tratamento de Dados Pessoais, com atribuições de aceitar reclamações e comunicações dos titulares, prestar esclarecimentos à Autoridade Nacional de Proteção de Dados (ANPD), orientar funcionários e contratados sobre práticas de proteção de dados, e executar demais atribuições determinadas pelo controlador ou em normas complementares;',
  ),
  considerando(
    'a Resolução CD/ANPD nº 02, de 27 de janeiro de 2022, que aprova o Regulamento de Aplicação da LGPD para agentes de tratamento de pequeno porte, mantendo a obrigatoriedade da indicação de Encarregado quando houver tratamento de dados pessoais que possa gerar risco aos direitos e liberdades dos titulares — caso da pesquisa eleitoral, em razão da sensibilidade política;',
  ),
  considerando(
    'a Resolução TSE nº 23.747, de 26 de fevereiro de 2026, que regulamenta as pesquisas eleitorais para o pleito de 2026 e exige conformidade integral com a LGPD;',
  ),
  ...blank(1),

  // ─── Deliberação ────────────────────────────────────────────────────────
  h1('DELIBERAÇÃO'),
  para([
    txt(
      'A Diretoria da Câmara de Dirigentes Lojistas de Aracaju, por unanimidade, conforme regularmente convocada, DELIBERA E DESIGNA:',
      { bold: true },
    ),
  ]),

  h2('Art. 1º — Designação'),
  para([
    txt('Fica designada '),
    txt('Sra. Claudimara Fontes Carvalho', { bold: true }),
    txt(
      ', inscrita no CPF sob o nº 936.060.105-59, com vínculo institucional de Diretora Secretária (1ª Secretária) da CDL Aracaju, como ',
    ),
    txt('Encarregada pelo Tratamento de Dados Pessoais (DPO)', { bold: true }),
    txt(', na forma do art. 41 da Lei nº 13.709/2018 (LGPD).'),
  ]),

  h2('Art. 2º — Canal de comunicação'),
  para([
    txt(
      'Ficam disponibilizados, como canais de comunicação oficiais da Encarregada, os seguintes meios, que serão amplamente divulgados nos sítios institucionais, na política de privacidade da Pesquisa Eleitoral Sergipe 2026 e em demais documentos:',
    ),
  ]),
  para([
    txt('• Endereço eletrônico: ', { bold: true }),
    txt('dpo@cdlaju.com.br'),
  ]),
  para([
    txt('• Telefone institucional: ', { bold: true }),
    txt('(79) 3212-7700'),
  ]),
  para([
    txt('• WhatsApp 24/7 da Encarregada: ', { bold: true }),
    txt('(79) 98115-5558 (uso restrito a acionamento em incidente de segurança da informação)'),
  ]),
  para([
    txt('• Endereço postal: ', { bold: true }),
    txt('Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190'),
  ]),

  h2('Art. 3º — Atribuições'),
  para([
    txt('Compete à Encarregada, nos termos do art. 41, §2º, da LGPD, e demais normas correlatas:'),
  ]),
  para([txt('I — aceitar reclamações e comunicações dos titulares dos dados pessoais, prestar esclarecimentos e adotar providências;')]),
  para([txt('II — receber comunicações da Autoridade Nacional de Proteção de Dados (ANPD) e adotar providências;')]),
  para([txt('III — orientar os funcionários, prestadores de serviço e demais contratados a respeito das práticas a serem tomadas em relação à proteção de dados pessoais;')]),
  para([txt('IV — executar as demais atribuições determinadas pelo controlador ou estabelecidas em normas complementares;')]),
  para([txt('V — manter relatório de impacto à proteção de dados pessoais (RIPD) atualizado, bem como os demais registros previstos no art. 37 da LGPD;')]),
  para([txt('VI — coordenar a resposta a incidentes de segurança com dados pessoais, conforme plano interno de resposta a incidentes.')]),

  h2('Art. 4º — Independência e prerrogativas'),
  para([
    txt(
      'A Encarregada exercerá suas atribuições com independência funcional, podendo reportar diretamente ao Presidente da CDL Aracaju, e terá acesso irrestrito aos dados, sistemas, processos e contratos relacionados ao tratamento de dados pessoais, observado o dever de sigilo profissional.',
    ),
  ]),

  h2('Art. 5º — Vigência'),
  para([
    txt(
      'A presente designação produz efeitos a partir da data de sua aprovação, com vigência por tempo indeterminado, podendo ser revista, alterada ou revogada por ato fundamentado da Diretoria.',
    ),
  ]),

  h2('Art. 6º — Substituição temporária'),
  para([
    txt(
      'Em caso de impedimento temporário da Encarregada titular (férias, licença, viagem, vacância), fica designada como suplente a ',
    ),
    txt('Sra. Verônica Castro Pedreira Peixoto', { bold: true }),
    txt(
      ', inscrita no CPF sob o nº 791.134.195-87, Diretora Administrativa e Financeira da CDL Aracaju.',
    ),
  ]),

  h2('Art. 7º — Publicidade'),
  para([txt('Esta deliberação deverá ser:')]),
  para([txt('I — registrada nos arquivos formais da CDL Aracaju;')]),
  para([txt('II — comunicada à ANPD, se e quando exigido pela autoridade;')]),
  para([txt('III — divulgada na política de privacidade pública da Pesquisa Eleitoral Sergipe 2026, em conformidade com o princípio da transparência (art. 6º VI da LGPD);')]),
  para([txt('IV — anexada ao Relatório de Impacto à Proteção de Dados Pessoais (RIPD) e demais documentos de governança.')]),
  ...blank(1),

  // ─── Encerramento + assinaturas ─────────────────────────────────────────
  h1('ENCERRAMENTO'),
  para([
    txt(
      'Nada mais havendo a tratar, foi lavrada a presente ata que, lida e aprovada, vai assinada pelos presentes.',
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
  center('CLAUDIMARA FONTES CARVALHO', { bold: true }),
  center('1ª Secretária da Diretoria · Secretária ad hoc desta reunião'),
  center('CPF 936.060.105-59'),
  ...blank(4),

  linhaAssinatura(),
  center('CLAUDIMARA FONTES CARVALHO', { bold: true }),
  center('Encarregada pelo Tratamento de Dados Pessoais (DPO)'),
  center('CPF 936.060.105-59'),
  center('declara ciência e aceite da designação', { italic: true }),
  ...blank(2),

  // Rodapé
  center(
    'Documento elaborado em conformidade com Lei nº 13.709/2018 (LGPD) e Resolução ANPD nº 02/2022.',
    { kicker: true },
  ),
  center('Versão 1.0', { kicker: true }),
]

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: SIZE_BODY } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: {
            width: 11906,        // A4 portrait DXA
            height: 16838,
            orientation: PageOrientation.PORTRAIT,
          },
          margin: {
            top: 1417,           // 2,5 cm
            right: 1417,
            bottom: 1417,
            left: 1417,
          },
        },
      },
      children,
    },
  ],
})

const out = 'docs/ata-dpo.docx'
Packer.toBuffer(doc).then((buf) => {
  writeFileSync(out, buf)
  console.log(`OK — ${out} criado (${buf.length} bytes)`)
})
