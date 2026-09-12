import Image from 'next/image'
import QRCode from 'qrcode'

import { BotaoImprimirKit } from './botao-imprimir'
import './midia-kit.css'

export const metadata = {
  title: 'Mídia Kit · Pesquisa Eleitoral Sergipe 2026 · CDL Aracaju',
  robots: { index: false, follow: false },
}

const COTAS = [
  {
    nivel: 'diamante',
    titulo: 'OFERECIMENTO',
    tier: 'cota Diamante',
    valor: 100_000,
    vagas: '1 vaga única · exclusividade de categoria',
    cor: '#0891b2',
    beneficios: [
      'Exclusividade na categoria (nenhum concorrente patrocina)',
      'Maior destaque na faixa de patrocínio em toda a jornada do votante — entrada, cada cédula da cabine e encerramento',
      'Logo em destaque máximo no topo da página /resultados',
      'Painel dedicado na apresentação dos resultados, quando houver veiculação em TV parceira',
      'Entrevista exclusiva do Presidente da CDL para veículo do patrocinador',
      'Relatório premium customizado com cortes demográficos × voto',
      'Reunião privada com Presidente + estatístico responsável',
      'Selo "Oferecimento — Pesquisa Eleitoral Sergipe 2026"',
    ],
  },
  {
    nivel: 'ouro',
    titulo: 'PATROCÍNIO',
    tier: 'cota Ouro',
    valor: 70_000,
    vagas: 'até 3 vagas',
    cor: '#ca8a04',
    beneficios: [
      'Logo na faixa de patrocínio em toda a jornada do votante — entrada, cabine e encerramento',
      'Logo em destaque na página /resultados',
      'Relatório premium com cortes demográficos × voto',
      'Reunião de apresentação com Presidente CDL e estatístico',
      'Selo "Patrocínio — Pesquisa Eleitoral Sergipe 2026"',
    ],
  },
  {
    nivel: 'prata',
    titulo: 'APOIO',
    tier: 'cota Prata',
    valor: 30_000,
    vagas: 'vagas ilimitadas',
    cor: '#64748b',
    beneficios: [
      'Logo na faixa de patrocínio da jornada do votante (entrada, cabine e encerramento)',
      'Logo presente na página /resultados',
      'Relatório premium com cortes demográficos × voto',
      'Reunião de apresentação dos resultados',
      'Selo "Apoio — Pesquisa Eleitoral Sergipe 2026"',
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
              src="/cdl-pesquisas-logo.png"
              alt="CDL Pesquisas"
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
            2ª edição · 1º turno das Eleições 2026
          </p>
        </div>

        {/* Hero argumento */}
        <section className="kit-hero">
          <p className="kit-hero-kicker">
            Pesquisa eleitoral com identidade verificada em todo Sergipe
          </p>
          <p className="kit-hero-numero">75</p>
          <p className="kit-hero-label">
            municípios · respondentes com identidade verificada por CPF +
            WhatsApp · amostra por adesão, ponderada pelo eleitorado oficial
            do TSE (município, sexo, faixa etária e grau de instrução)
          </p>
          <p className="kit-hero-comp">
            Coleta da 2ª edição de <strong>13 a 20 de setembro de 2026</strong>.
            Registro no PesqEle (TSE e TRE-SE) antes de qualquer divulgação.
          </p>
          <p className="kit-hero-asterisco">
            Margem de erro nominal (1,96 × √(0,25/n), IC 95%) e efetiva (n de
            Kish) publicadas na ficha técnica; amostra por adesão, margem
            indicativa. Nenhum número de participantes é divulgado antes do
            registro.
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
                <td>Pesquisa Sergipe 2026 — amostra por adesão</td>
                <td className="td-num">definida ao fim da coleta</td>
                <td className="td-num">nominal e efetiva, na ficha técnica</td>
              </tr>
            </tbody>
          </table>
          <p className="kit-pequeno">
            Menor margem de erro significa que o número divulgado é mais
            próximo da realidade. O n final é o total de eleitores com CPF e
            WhatsApp validados ao fim da coleta; a margem publicada é
            indicativa, calculada como se a amostra fosse probabilística.
          </p>
        </section>

        {/* Cronograma */}
        <section className="kit-secao kit-cronograma">
          <h3>Cronograma</h3>
          <table className="kit-tabela-crono">
            <tbody>
              <tr>
                <td className="kit-crono-data">13 a 20 de setembro de 2026</td>
                <td>Coleta de campo da 2ª edição (votação online + WhatsApp)</td>
              </tr>
              <tr>
                <td className="kit-crono-data">Antes da divulgação</td>
                <td>
                  Registro no PesqEle (TSE e TRE-SE), com antecedência mínima
                  de 5 dias — Lei 9.504/97, art. 33
                </td>
              </tr>
              <tr>
                <td className="kit-crono-data">Após o registro</td>
                <td>
                  <strong>Divulgação dos resultados</strong> nesta plataforma
                  (pesquisa.cdlaju.com.br/resultados) e nos canais da CDL
                  Aracaju
                </td>
              </tr>
              <tr>
                <td className="kit-crono-data">Após a divulgação</td>
                <td>Relatório complementar no PesqEle</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ========================================================
            PÁGINA 2 — Onde a marca aparece + Cotas
            ======================================================== */}
        <div className="kit-quebra-pagina" />

        {/* Exposição na jornada do votante */}
        <section className="kit-secao">
          <h3>Onde sua marca aparece</h3>
          <p className="kit-pequeno">
            Diferente de um anúncio visto uma vez, aqui a marca acompanha o
            eleitor em <strong>todas as telas</strong> da participação — da
            identificação ao encerramento. São <strong>5 a 6 telas por
            votante</strong>, multiplicadas por cada respondente da edição.
          </p>
          <table className="kit-tabela-crono">
            <tbody>
              <tr>
                <td className="kit-crono-data">Entrada</td>
                <td>
                  Tela de identificação do eleitor — faixa de patrocinadores
                  no rodapé
                </td>
              </tr>
              <tr>
                <td className="kit-crono-data">Cabine</td>
                <td>
                  Cada cédula preenchida (Presidente, Governador, Senador,
                  Deputados…) — faixa presente em todas
                </td>
              </tr>
              <tr>
                <td className="kit-crono-data">Encerramento</td>
                <td>
                  Tela de agradecimento + convite de compartilhamento que leva
                  a pesquisa (e a marca) adiante, de forma orgânica
                </td>
              </tr>
              <tr>
                <td className="kit-crono-data">Resultados</td>
                <td>
                  Página pública pesquisa.cdlaju.com.br/resultados, canais da
                  CDL Aracaju e eventual apresentação em TV parceira
                </td>
              </tr>
            </tbody>
          </table>
          <p className="kit-pequeno">
            A prominência do logo (tamanho e posição) segue a cota. Veja a
            demonstração completa, tela a tela, em{' '}
            <strong>pesquisa.cdlaju.com.br/patrocinio/jornada</strong>.
          </p>
        </section>

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
                  <p
                    style={{
                      margin: 0,
                      fontSize: '9px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      opacity: 0.55,
                    }}
                  >
                    {cota.tier}
                  </p>
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
                  <strong style={{ color: '#0891b2' }}>Oferecimento</strong>
                </td>
                <td className="td-num">220×90 px</td>
                <td className="td-num">180×70 px</td>
                <td>PNG transparente</td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#ca8a04' }}>Patrocínio</strong>
                </td>
                <td className="td-num">160×60 px</td>
                <td className="td-num">130×48 px</td>
                <td>PNG transparente</td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#64748b' }}>Apoio</strong>
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
            ratio. O mesmo arquivo é usado na faixa de patrocínio da jornada
            do votante (fundo claro na entrada, fundo escuro na cabine e no
            encerramento).
          </p>
        </section>

        {/* Independência editorial */}
        <section className="kit-secao kit-secao-destaque">
          <h3>Independência editorial garantida</h3>
          <p>
            O patrocínio institucional é estritamente <strong>não
            eleitoral</strong> e não confere ao patrocinador poder de
            ingerência sobre metodologia, contratação de colaboradores,
            resultados divulgados ou edição de eventual reportagem. Conforme
            exige a <strong>Lei 9.504/1997, art. 33, §1º</strong>, a relação
            de patrocinadores é informada no registro no PesqEle (TSE e
            TRE-SE).
          </p>
        </section>

        {/* Quem não pode */}
        <section className="kit-secao">
          <h3>Quem NÃO pode patrocinar</h3>
          <p className="kit-pequeno">
            Como política de <em>due diligence</em> eleitoral — para afastar
            recurso de fonte vedada (<strong>Lei 9.504/97, arts. 24 e 81</strong>)
            e conduta vedada a agente público (<strong>art. 73</strong>) —, não
            aceitamos recursos originários de:
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
            Em conformidade com a Lei 9.504/1997, a Res.-TSE 23.600/2019
            (red. Res.-TSE 23.747/2026) e a LGPD 13.709/2018. Registro no
            PesqEle (TSE e TRE-SE) antes de qualquer divulgação.
          </p>
        </footer>
      </main>
    </>
  )
}
