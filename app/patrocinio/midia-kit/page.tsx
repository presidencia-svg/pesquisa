import Image from 'next/image'
import QRCode from 'qrcode'

import { BotaoImprimirKit } from './botao-imprimir'
import './midia-kit.css'

export const metadata = {
  title: 'Mídia Kit · A maior pesquisa política já realizada no Brasil',
  robots: { index: false, follow: false },
}

const COTAS = [
  {
    nivel: 'diamante',
    titulo: 'DIAMANTE',
    valor: 100_000,
    vagas: '1 vaga única · exclusividade de categoria',
    cor: '#0891b2',
    beneficios: [
      'Exclusividade na categoria (nenhum concorrente patrocina)',
      'Logo em destaque máximo no topo da página /resultados',
      'Painel dedicado nos créditos de abertura do telejornal TV Atalaia',
      'Entrevista exclusiva do Presidente da CDL para veículo do patrocinador',
      'Relatório premium customizado com cortes demográficos × voto',
      'Reunião privada com Presidente + estatístico responsável',
      'Análise customizada do segmento de interesse do patrocinador',
      'Marca "Patrocinador Master Pesquisa Eleitoral Sergipe 2026"',
    ],
  },
  {
    nivel: 'ouro',
    titulo: 'OURO',
    valor: 50_000,
    vagas: 'até 3 vagas',
    cor: '#ca8a04',
    beneficios: [
      'Logo em destaque na página /resultados',
      'Relatório premium com cortes demográficos × voto',
      'Reunião de apresentação com Presidente CDL e estatístico',
      'Marca "Patrocinador Pesquisa Eleitoral Sergipe 2026"',
    ],
  },
  {
    nivel: 'prata',
    titulo: 'PRATA',
    valor: 25_000,
    vagas: 'vagas ilimitadas',
    cor: '#64748b',
    beneficios: [
      'Logo presente na página /resultados',
      'Relatório premium com cortes demográficos × voto',
      'Reunião de apresentação dos resultados',
      'Marca "Apoiador Pesquisa Eleitoral Sergipe 2026"',
    ],
  },
] as const

export default async function MidiaKitPage() {
  const qrSvg = await QRCode.toString(
    'https://pesquisa.cdlaju.com.br/patrocinio',
    { type: 'svg', errorCorrectionLevel: 'M', margin: 0, width: 110 },
  )

  return (
    <>
      <BotaoImprimirKit />

      <main className="kit">
        {/* ========================================================
            PÁGINA 1 — Capa + argumento de venda
            ======================================================== */}

        <header className="kit-header">
          <div className="kit-brand">
            <Image
              src="/cdl-logo.png"
              alt="CDL Aracaju"
              width={180}
              height={88}
              className="kit-logo"
              priority
            />
            <p className="kit-cnpj">
              <strong>Câmara de Dirigentes Lojistas de Aracaju</strong>
            </p>
            <p className="kit-cnpj">CNPJ 13.045.935/0001-36</p>
            <p className="kit-endereco">
              Rua Santa Luzia, 570 · São José · Aracaju/SE · CEP 49015-190
            </p>
          </div>
          <div
            className="kit-qr"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </header>

        <div className="kit-titulo-wrap">
          <p className="kit-kicker">Cotas de patrocínio institucional</p>
          <h2 className="kit-titulo">Pesquisa Eleitoral Sergipe 2026</h2>
          <p className="kit-edicao">
            1ª edição · 1º turno das Eleições 2026
          </p>
        </div>

        {/* Hero argumento */}
        <section className="kit-hero">
          <p className="kit-hero-kicker">
            A maior pesquisa política já realizada no Brasil*
          </p>
          <p className="kit-hero-numero">200.000+</p>
          <p className="kit-hero-label">
            respondentes com identidade verificada por CPF + WhatsApp
          </p>
          <p className="kit-hero-comp">
            <strong>100× maior</strong> que Datafolha, IBOPE ou Quaest —
            margem de erro <strong>±0,11pp</strong> contra ±2,2pp dos
            institutos tradicionais.
          </p>
          <p className="kit-hero-asterisco">
            * Por critério de amostra com identidade verificada em pesquisa
            eleitoral estadual.
          </p>
        </section>

        {/* Comparativo */}
        <section className="kit-secao">
          <h3>Comparativo com institutos tradicionais</h3>
          <table className="kit-tabela-comp">
            <thead>
              <tr>
                <th>Instituto</th>
                <th className="td-num">Amostra (n)</th>
                <th className="td-num">Margem de erro (IC 95%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Datafolha (típico estado)</td>
                <td className="td-num">2.000</td>
                <td className="td-num">±2,2 pp</td>
              </tr>
              <tr>
                <td>IBOPE / Quaest</td>
                <td className="td-num">1.500 – 2.500</td>
                <td className="td-num">±2,0 – 2,5 pp</td>
              </tr>
              <tr>
                <td>AtlasIntel / Paraná Pesquisas</td>
                <td className="td-num">1.500 – 2.000</td>
                <td className="td-num">±2,2 – 2,5 pp</td>
              </tr>
              <tr className="kit-tr-destaque">
                <td>Pesquisa Eleitoral Sergipe 2026 — CDL Aracaju</td>
                <td className="td-num">200.000+</td>
                <td className="td-num">±0,11 pp</td>
              </tr>
            </tbody>
          </table>
          <p className="kit-pequeno">
            Menor margem de erro significa que o número divulgado é mais
            próximo da realidade. Com 200 mil respondentes, a Pesquisa
            Eleitoral Sergipe 2026 entrega <strong>20× mais precisão</strong>.
          </p>
        </section>

        {/* Cronograma */}
        <section className="kit-secao kit-cronograma">
          <h3>Cronograma</h3>
          <table className="kit-tabela-crono">
            <tbody>
              <tr>
                <td className="kit-crono-data">1 e 2 de setembro de 2026</td>
                <td>Coleta de campo (votação online + WhatsApp)</td>
              </tr>
              <tr>
                <td className="kit-crono-data">3 de setembro · até 4h antes</td>
                <td>Entrega de números ao patrocinador Diamante (NDA)</td>
              </tr>
              <tr>
                <td className="kit-crono-data">3 de setembro de 2026</td>
                <td>
                  <strong>Divulgação ao vivo no telejornal TV Atalaia</strong>
                </td>
              </tr>
              <tr>
                <td className="kit-crono-data">Imediatamente após anúncio</td>
                <td>
                  Publicação no portal pesquisa.cdlaju.com.br/resultados
                </td>
              </tr>
              <tr>
                <td className="kit-crono-data">Até 3 dias úteis após</td>
                <td>Relatório complementar ao TRE/SE</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ========================================================
            PÁGINA 2 — Cotas
            ======================================================== */}
        <div className="kit-quebra-pagina" />

        <section className="kit-secao">
          <h3>Cotas de patrocínio</h3>
          <div className="kit-cotas">
            {COTAS.map((cota) => (
              <div
                key={cota.nivel}
                className="kit-cota"
                style={{ borderColor: cota.cor }}
              >
                <header className="kit-cota-header">
                  <h4 style={{ color: cota.cor }}>{cota.titulo}</h4>
                  <p className="kit-cota-valor">
                    R$ {cota.valor.toLocaleString('pt-BR')}
                  </p>
                  <p className="kit-cota-vagas">{cota.vagas}</p>
                </header>
                <ul>
                  {cota.beneficios.map((b) => (
                    <li key={b}>
                      <span
                        className="kit-bullet"
                        style={{ color: cota.cor }}
                      >
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Especificações de logo */}
        <section className="kit-secao">
          <h3>Especificações do logo</h3>
          <table className="kit-tabela-comp">
            <thead>
              <tr>
                <th>Cota</th>
                <th className="td-num">Desktop</th>
                <th className="td-num">Mobile</th>
                <th>Arquivo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style={{ color: '#0891b2' }}>Diamante</strong>
                </td>
                <td className="td-num">220×90 px</td>
                <td className="td-num">180×70 px</td>
                <td>PNG transparente</td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#ca8a04' }}>Ouro</strong>
                </td>
                <td className="td-num">160×60 px</td>
                <td className="td-num">130×48 px</td>
                <td>PNG transparente</td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#64748b' }}>Prata</strong>
                </td>
                <td className="td-num">120×40 px</td>
                <td className="td-num">100×32 px</td>
                <td>PNG transparente</td>
              </tr>
            </tbody>
          </table>
          <p className="kit-pequeno">
            Aceitos: PNG, JPG, SVG ou WebP até 2 MB. Encaixe automático com
            object-fit:contain — qualquer proporção cabe preservando aspect
            ratio.
          </p>
        </section>

        {/* Independência editorial */}
        <section className="kit-secao kit-secao-destaque">
          <h3>Independência editorial garantida</h3>
          <p>
            O patrocínio institucional é estritamente <strong>não
            eleitoral</strong> e não confere ao patrocinador poder de
            ingerência sobre metodologia, contratação de colaboradores,
            resultados divulgados ou edição da reportagem. Cláusula
            espelhada do Convênio CDL × TV Atalaia v1.4. Conforme exige a{' '}
            <strong>Lei 9.504/1997, art. 33, §1º</strong>, a relação de
            patrocinadores é informada ao TRE/SE no registro PesqEle.
          </p>
        </section>

        {/* Quem não pode */}
        <section className="kit-secao">
          <h3>Quem NÃO pode patrocinar</h3>
          <p className="kit-pequeno">
            Vedações conforme <strong>Lei 9.504/1997, art. 33, §2º</strong>:
          </p>
          <ul className="kit-vedacoes">
            <li>Candidatas e candidatos, suas coligações ou federações</li>
            <li>Partidos políticos e seus diretórios</li>
            <li>Pessoas físicas filiadas a partido ou candidatura ativa</li>
            <li>
              Pessoas jurídicas controladas por candidato ou partido
            </li>
            <li>
              Órgãos da administração pública direta ou indireta
            </li>
          </ul>
          <p className="kit-pequeno">
            A CDL Aracaju realiza <strong>due diligence</strong> antes de
            aceitar qualquer patrocínio.
          </p>
        </section>

        {/* Contato */}
        <section className="kit-contato">
          <h3>Próximos passos</h3>
          <p>
            Entre em contato em{' '}
            <strong>presidencia@cdlaju.com.br</strong> ou preencha o
            formulário em{' '}
            <strong>pesquisa.cdlaju.com.br/patrocinio</strong> — nossa
            equipe responde em até 2 dias úteis com o contrato de
            patrocínio para análise jurídica e formalização.
          </p>
          <div className="kit-assinatura">
            <p>
              <strong>Elison Vieira Santos do Bomfim</strong>
            </p>
            <p>Presidente da CDL Aracaju · Triênio 2026–2028</p>
            <p>presidencia@cdlaju.com.br · (79) 3212-7700</p>
          </div>
        </section>

        <footer className="kit-footer">
          <p>
            <strong>Pesquisa Eleitoral Sergipe 2026</strong> · Câmara de Dirigentes
            Lojistas de Aracaju · CNPJ 13.045.935/0001-36
          </p>
          <p>
            Em conformidade com Lei 9.504/1997, Resolução TSE 23.747/2026 e
            LGPD 13.709/2018. Registro PesqEle/TRE-SE.
          </p>
        </footer>
      </main>
    </>
  )
}
