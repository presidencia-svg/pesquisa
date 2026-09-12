import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import { RodapeInstitucional } from '@/components/rodape-institucional'

export const metadata = {
  title: 'Política de Privacidade · Pesquisa Eleitoral Sergipe 2026',
  description:
    'Como a CDL Aracaju trata seus dados pessoais nesta pesquisa eleitoral, em conformidade com a Lei 13.709/2018 (LGPD).',
}

/**
 * Inventário de dados pessoais tratados na pesquisa. Cada linha descreve
 * o que o código realmente grava (cdl_base / eleitores_pesquisa) e o prazo
 * aplicado pelo job de retenção (app/api/cron/retencao/route.ts).
 */
const INVENTARIO: ReadonlyArray<{
  dado: string
  finalidade: string
  base: string
  prazo: string
}> = [
  {
    dado: 'CPF (somente como hash HMAC-SHA256; o número nunca é gravado)',
    finalidade:
      'Garantir um único cadastro por pessoa por edição e localizar seu registro para atender pedidos de exclusão',
    base: 'Consentimento (art. 7º, I) e obrigação legal — sistema interno de controle exigido pela Res.-TSE 23.600/2019 (art. 7º, II)',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão',
  },
  {
    dado: 'Nome',
    finalidade:
      'Conferência de identidade (exibido mascarado na tela de confirmação) e auditoria',
    base: 'Consentimento (art. 7º, I) e obrigação legal (art. 7º, II)',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão',
  },
  {
    dado: 'WhatsApp',
    finalidade:
      'Envio do código de confirmação (OTP), voto único por número, envio dos resultados se você optar, e convite para edições seguintes',
    base: 'Consentimento (art. 7º, I); convite: legítimo interesse (art. 7º, IX), com opt-out',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão; códigos OTP apagados após 30 dias',
  },
  {
    dado: 'UF e município do título de eleitor',
    finalidade:
      'Definir quais cargos você vota (outra UF vota só para Presidente) e ponderar a amostra pelo eleitorado oficial do TSE',
    base: 'Obrigação legal — plano amostral e composição da amostra (art. 7º, II)',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão',
  },
  {
    dado: 'Número do título de eleitor (só para quem tem 16 ou 17 anos)',
    finalidade: 'Conferir que o voto facultativo já está habilitado',
    base: 'Obrigação legal (art. 7º, II)',
    prazo: 'Validado no servidor e não armazenado',
  },
  {
    dado: 'Sexo (do cadastro; perguntado a você só quando o cadastro não traz) e proveniência dessa informação',
    finalidade: 'Ponderação da amostra e composição da amostra reportada à Justiça Eleitoral',
    base: 'Obrigação legal (art. 7º, II)',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão',
  },
  {
    dado: 'Faixa etária (calculada da data de nascimento do cadastro; nunca perguntada)',
    finalidade: 'Idade mínima de 16 anos, ponderação e composição da amostra',
    base: 'Obrigação legal (art. 7º, II)',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão',
  },
  {
    dado: 'Escolaridade (4 opções, agregadas em 3 estratos como o TSE)',
    finalidade: 'Ponderação e composição da amostra',
    base: 'Obrigação legal (art. 7º, II)',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão',
  },
  {
    dado: 'Faixa de renda familiar (em salários mínimos; aceita "não sei" e "prefiro não informar")',
    finalidade:
      'Composição da amostra por nível econômico exigida pela Resolução; não entra na ponderação',
    base: 'Obrigação legal (art. 7º, II)',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão',
  },
  {
    dado: 'Dados devolvidos pelo SPC Brasil: nome, situação cadastral do CPF, data de nascimento, nome da mãe, estado civil, endereço e a resposta bruta da consulta',
    finalidade:
      'Confirmar que o CPF existe e está regular, calcular a faixa etária e manter prova da validação para auditoria',
    base: 'Consentimento (art. 7º, I) e obrigação legal (art. 7º, II)',
    prazo: '6 meses após o fim da coleta da edição, ou até pedido de exclusão',
  },
  {
    dado: 'Endereço IP, identificação do navegador (user-agent) e impressão do dispositivo (fingerprint)',
    finalidade:
      'Auditoria e análise antifraude pós-coleta. São apenas registrados: não bloqueiam cadastro nem limitam CPFs por aparelho',
    base: 'Obrigação legal — sistema interno de controle (art. 7º, II) e legítimo interesse na prevenção a fraude (art. 7º, IX)',
    prazo: '6 meses após o fim da coleta da edição',
  },
  {
    dado: 'Opção de receber os resultados por WhatsApp',
    finalidade: 'Enviar a você o resultado da edição, uma única vez, quando a CDL Aracaju divulgar',
    base: 'Consentimento (art. 7º, I) — caixa desmarcada por padrão',
    prazo: 'Até o envio ou até pedido de exclusão',
  },
  {
    dado: 'Votos (tabela separada, sem CPF, nome, WhatsApp ou IP; só sexo, faixa etária, escolaridade, renda e município)',
    finalidade: 'Apuração, ponderação e recortes agregados com k-anonimato (mínimo de 30 respondentes por célula)',
    base: 'Consentimento específico e destacado (art. 11, I) — opinião política é dado sensível',
    prazo: 'Indefinido, em forma pseudonimizada',
  },
]

export default function PrivacidadePage() {
  return (
    <>
      <main className="flex flex-col flex-1 bg-background px-5 sm:px-6 py-10 sm:py-16">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            <Link href="/">
              <MarcaCdl tamanho="sm" />
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              LGPD · Lei 13.709/2018
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold leading-[1.05] tracking-tight">
              Política de Privacidade
            </h1>
            <p className="text-base text-muted-foreground">
              Versão 1.1 · vigente desde 13/09/2026
            </p>
            <p className="text-xs text-muted-foreground">
              A versão 1.0 vigorou de 13/05/2026 a 12/09/2026. As alterações
              estão resumidas na seção 11.
            </p>
          </header>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              1. Quem somos e a que pesquisa esta política se aplica
            </h2>
            <p className="leading-relaxed">
              <strong>CDL Aracaju</strong> — Câmara de Dirigentes Lojistas
              de Aracaju, associação civil sem fins lucrativos, CNPJ
              13.045.935/0001-36, com sede na Rua Santa Luzia, 570, São
              José, Aracaju/SE — CEP 49015-190. Fundada em 21 de dezembro
              de 1961 e declarada entidade de utilidade pública pela Lei
              Municipal nº 63 de 6 de dezembro de 1967.
            </p>
            <p className="leading-relaxed">
              Esta política descreve como tratamos seus dados pessoais na{' '}
              <strong>Pesquisa Eleitoral Sergipe 2026</strong>, pesquisa de
              intenção de voto realizada pela CDL Aracaju. A{' '}
              <strong>2ª edição</strong> tem coleta de{' '}
              <strong>13 a 20 de setembro de 2026</strong> (horário de
              Aracaju). O registro desta edição na Justiça Eleitoral (sistema
              PesqEle, TSE e TRE-SE) será feito quando a amostra atingir 20
              mil eleitores e, em qualquer caso, antes de qualquer divulgação
              (Lei 9.504/97, art. 33; Res.-TSE 23.600/2019, com a redação da
              Res.-TSE 23.747/2026). Nenhum resultado é publicado antes disso.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              2. Dados que tratamos, para quê, com que base e por quanto tempo
            </h2>
            <p className="leading-relaxed">
              A tabela abaixo é o inventário completo. Os artigos citados
              são da LGPD.
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border text-left">
                  <tr>
                    <th className="p-3 font-semibold align-top">Dado</th>
                    <th className="p-3 font-semibold align-top">Finalidade</th>
                    <th className="p-3 font-semibold align-top">Base legal</th>
                    <th className="p-3 font-semibold align-top">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {INVENTARIO.map((linha) => (
                    <tr key={linha.dado} className="border-b border-border/50 align-top">
                      <td className="p-3 font-medium">{linha.dado}</td>
                      <td className="p-3 text-muted-foreground">{linha.finalidade}</td>
                      <td className="p-3 text-muted-foreground">{linha.base}</td>
                      <td className="p-3 text-muted-foreground">{linha.prazo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-base font-semibold pt-3">
              Consulta cadastral ao SPC Brasil
            </h3>
            <p className="leading-relaxed">
              Se o seu CPF ainda não está na base da CDL (participantes do
              Melhores do Ano ou de edição anterior desta pesquisa), fazemos
              uma <strong>consulta cadastral ao SPC Brasil</strong>. Enviamos
              apenas o CPF. O SPC devolve nome, situação cadastral do CPF
              junto à Receita Federal, data de nascimento, nome da mãe, estado
              civil e endereço. Usamos a situação cadastral para aceitar só
              CPF regular, a data de nascimento para a faixa etária e a idade
              mínima de 16 anos, e guardamos a resposta como prova da
              validação. A consulta não é feita à Receita Federal diretamente
              e não altera nada no seu cadastro no SPC.
            </p>

            <h3 className="text-base font-semibold pt-3">
              O que fica no cadastro e o que fica no voto
            </h3>
            <p className="leading-relaxed">
              O cadastro (identidade) e os <strong>votos</strong> ficam em
              tabelas separadas. O voto não guarda CPF, nome, WhatsApp, IP nem
              qualquer chave que aponte para o cadastro — apenas uma cópia
              controlada de sexo, faixa etária, escolaridade, faixa de renda e
              município, usada na ponderação e nos recortes agregados. A única
              ponte entre as duas é um token aleatório que vive no cookie do
              seu navegador e é destruído ao fim da votação. Por conservarem
              atributos demográficos, os votos são tratados como{' '}
              <strong>pseudonimizados</strong> (não anônimos em sentido
              absoluto) e permanecem protegidos pela LGPD. Detalhes técnicos
              em{' '}
              <Link href="/transparencia" className="text-primary hover:underline">
                /transparencia
              </Link>
              .
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              3. Finalidades e o que o sistema faz com os dados
            </h2>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                Realização da pesquisa eleitoral conforme a Lei 9.504/97 e a
                Res.-TSE 23.600/2019 (redação da Res.-TSE 23.747/2026).
              </li>
              <li>Verificação de identidade do respondente (CPF + WhatsApp).</li>
              <li>
                <strong>Ponderação da amostra</strong> pelo eleitorado oficial
                do TSE (perfil de 2026), por ajuste iterativo proporcional
                (<em>raking</em>) nas marginais município × sexo × faixa etária
                × grau de instrução. A faixa de renda <strong>não entra na
                ponderação</strong>: serve apenas para descrever a composição
                da amostra por nível econômico, informação exigida no registro
                da pesquisa (art. 2º, § 7º, III e IV da Resolução).
              </li>
              <li>
                <strong>Antifraude e controle</strong>: verificação anti-robô
                (Cloudflare Turnstile), código de confirmação por WhatsApp,
                bloqueio do cadastro em navegação anônima ou privativa, janela
                de coleta aplicada no servidor e um cadastro por CPF e por
                WhatsApp em cada edição. Endereço IP, user-agent e impressão
                do dispositivo são <strong>apenas registrados</strong> para
                auditoria pós-coleta: não há bloqueio por IP nem limite de
                CPFs por aparelho.
              </li>
              <li>
                Auditoria e atendimento a requisições da Justiça Eleitoral ou
                de outras autoridades.
              </li>
              <li>
                <strong>Envio dos resultados ao seu WhatsApp</strong> — apenas
                se você marcar a caixa &quot;Quero receber os resultados em
                primeira mão&quot; no cadastro. Envio único por edição, quando
                a CDL Aracaju divulgar os resultados. Não é marketing nem
                propaganda. Você pode cancelar a qualquer momento em{' '}
                <Link href="/privacidade/excluir" className="text-primary hover:underline">
                  /privacidade/excluir
                </Link>
                .
              </li>
            </ul>
            <p className="leading-relaxed">
              <strong>Não usamos seus dados</strong> para fins comerciais,
              marketing, perfil de consumo ou compartilhamento com campanhas,
              partidos ou anunciantes.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              4. Convite por WhatsApp
            </h2>
            <p className="leading-relaxed">
              A CDL Aracaju envia convite para participar da pesquisa, por
              WhatsApp, às pessoas das suas bases: participantes da premiação
              Melhores do Ano e participantes da 1ª edição desta pesquisa. A
              base legal é o <strong>legítimo interesse</strong> (art. 7º, IX
              da LGPD) da entidade em realizar pesquisa de opinião com o seu
              público. O convite é único, identifica a CDL e traz a opção de
              não receber mais mensagens: <strong>responda SAIR</strong>. Quem
              pede exclusão de dados nunca recebe convite.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              5. Base legal (arts. 7º e 11 da LGPD)
            </h2>
            <p className="leading-relaxed rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
              A <strong>intenção de voto é dado pessoal sensível</strong>{' '}
              (art. 5º, II — opinião política) e, por isso, seu tratamento
              observa o <strong>regime específico do art. 11 da LGPD</strong>,
              apoiado em consentimento específico e destacado para esta
              finalidade. As bases do art. 7º cobrem os demais dados
              (identidade e variáveis demográficas), conforme a tabela da
              seção 2.
            </p>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>Consentimento</strong> (art. 7º, I) — você marca a
                caixa de aceite na entrada do{' '}
                <Link href="/votar" className="text-primary hover:underline">
                  /votar
                </Link>
                . Sem consentimento o cadastro não é realizado.
              </li>
              <li>
                <strong>Cumprimento de obrigação legal</strong> (art. 7º, II)
                — a Res.-TSE 23.600/2019 exige plano amostral, composição da
                amostra por sexo, idade, grau de instrução e nível econômico,
                e sistema interno de controle e verificação da coleta.
              </li>
              <li>
                <strong>Legítimo interesse</strong> (art. 7º, IX) — convite
                por WhatsApp às bases da CDL e registro de sinais técnicos
                (IP, user-agent, dispositivo) para análise antifraude.
              </li>
              <li>
                <strong>Exercício regular de direitos</strong> (art. 7º, VI)
                — auditoria e transparência pública.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              6. Seus direitos (art. 18 da LGPD)
            </h2>
            <p className="leading-relaxed">
              Você pode, a qualquer momento:
            </p>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>Confirmar</strong> que estamos tratando seus
                dados (art. 18, I).
              </li>
              <li>
                <strong>Acessar</strong> os dados que temos sobre você
                (art. 18, II).
              </li>
              <li>
                <strong>Corrigir</strong> dados incompletos, inexatos ou
                desatualizados (art. 18, III).
              </li>
              <li>
                <strong>Solicitar exclusão</strong> dos seus dados
                pessoais (art. 18, VI). Após a exclusão, seu voto
                permanece computado de forma pseudonimizada, mas sua
                identidade desaparece do banco e você deixa de receber
                qualquer mensagem.{' '}
                <Link
                  href="/privacidade/excluir"
                  className="text-primary hover:underline font-medium"
                >
                  Solicitar exclusão →
                </Link>
              </li>
              <li>
                <strong>Revogar consentimento</strong> a qualquer momento
                (art. 8º, § 5º).
              </li>
              <li>
                <strong>Opor-se</strong> ao tratamento baseado em legítimo
                interesse (art. 18, § 2º) — por exemplo, respondendo SAIR ao
                convite.
              </li>
              <li>
                <strong>Saber com quem compartilhamos seus dados</strong>{' '}
                (art. 18, VII).
              </li>
            </ul>
            <p className="leading-relaxed">
              O canal para exercer esses direitos é a página{' '}
              <Link href="/privacidade/excluir" className="text-primary hover:underline">
                /privacidade/excluir
              </Link>{' '}
              (exclusão imediata, sem intermediário) ou o e-mail da
              Encarregada de Dados indicado na seção 10.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              7. Operadores e compartilhamento
            </h2>
            <p className="leading-relaxed">
              Para operar a pesquisa, a CDL Aracaju usa os seguintes
              operadores (art. 5º, VII da LGPD):
            </p>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>SPC Brasil</strong> — consulta cadastral do CPF.
                Enviamos apenas o CPF; recebemos nome, situação cadastral do
                CPF, data de nascimento, nome da mãe, estado civil e
                endereço.
              </li>
              <li>
                <strong>Meta Platforms (WhatsApp Business Cloud API)</strong>{' '}
                — envio do código de confirmação (OTP), do convite e, se você
                optar, dos resultados. Recebe o número e o conteúdo da
                mensagem.
              </li>
              <li>
                <strong>Supabase</strong> (banco de dados) e{' '}
                <strong>Vercel</strong> (hospedagem) — infraestrutura. Não
                acessam seus dados fora da operação normal do serviço.
              </li>
              <li>
                <strong>Cloudflare</strong> (Turnstile) — verificação
                anti-robô. Recebe apenas sinal técnico do navegador.
              </li>
            </ul>
            <p className="leading-relaxed">
              Nenhum dado pessoal é vendido ou repassado a campanhas
              eleitorais, partidos, candidatos ou anunciantes. Dados
              consolidados (sem identificação) podem ser entregues à Justiça
              Eleitoral e a quem os requerer na forma da Resolução.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              8. Período de retenção
            </h2>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>Códigos de confirmação (OTP)</strong> — apagados
                automaticamente após <strong>30 dias</strong>.
              </li>
              <li>
                <strong>Endereço IP, user-agent e impressão do dispositivo</strong>{' '}
                — apagados automaticamente <strong>6 meses</strong> após o
                fim da coleta da edição.
              </li>
              <li>
                <strong>Cadastro da edição (identidade)</strong> — até 6
                meses após o encerramento da coleta, ou até pedido de
                exclusão, o que ocorrer primeiro. Mantido nesse período para
                auditoria da Justiça Eleitoral.
              </li>
              <li>
                <strong>Base CDL</strong> (Melhores do Ano e edições
                anteriores) — mantida para convite a pesquisas futuras, até
                pedido de exclusão ou resposta SAIR.
              </li>
              <li>
                <strong>Votos</strong> — indefinido, em forma pseudonimizada
                (sem chave para a identidade).
              </li>
            </ul>
            <p className="leading-relaxed text-sm text-muted-foreground">
              A eliminação é executada por rotina diária automática, com
              registro de cada execução para verificação.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              9. Segurança técnica
            </h2>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                Conexão sempre <strong>HTTPS</strong> (TLS 1.3, HSTS
                preload — força HTTPS por 2 anos).
              </li>
              <li>
                CPF armazenado como <strong>HMAC-SHA256</strong> com
                chave secreta no servidor. O banco nunca vê o CPF
                original.
              </li>
              <li>
                Identidade e voto em <strong>tabelas separadas</strong>{' '}
                sem chave de junção (arquitetura &ldquo;duas
                salas&rdquo;).
              </li>
              <li>
                Acesso ao banco de dados restrito a{' '}
                <em>service role keys</em> mantidas apenas em variáveis
                de ambiente do servidor — nunca expostas a clientes.
              </li>
              <li>
                Cookies marcados <code className="font-mono text-xs">
                  httpOnly
                </code>{' '}
                +{' '}
                <code className="font-mono text-xs">secure</code> +{' '}
                <code className="font-mono text-xs">SameSite=Strict</code>{' '}
                — não acessíveis por JavaScript.
              </li>
              <li>
                Hora dos votos truncada para hora cheia — impede
                correlação minuto a minuto.
              </li>
              <li>
                Todo acesso administrativo a resultados ou dados pessoais é
                registrado em trilha de auditoria.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              10. Encarregada de Dados (DPO)
            </h2>
            <p className="leading-relaxed">
              Encarregada pelo Tratamento de Dados Pessoais da CDL
              Aracaju: <strong>Claudimara Fontes Carvalho</strong>,
              Diretora Secretária, designada por Ata de Reunião
              Extraordinária da Diretoria nº 001/2026-EXT, de 26 de
              maio de 2026, na forma do art. 41 da Lei 13.709/2018.
            </p>
            <ul className="list-none leading-relaxed flex flex-col gap-1 pl-1">
              <li>E-mail: dpo@cdlaju.com.br</li>
              <li>Telefone institucional: (79) 3212-7700</li>
              <li>Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190</li>
            </ul>
            <p className="leading-relaxed">
              Para reclamações sobre tratamento de dados, você também
              pode contatar a <strong>ANPD</strong> — Autoridade
              Nacional de Proteção de Dados (
              <Link
                href="https://www.gov.br/anpd"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                gov.br/anpd
              </Link>
              ).
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              11. Alterações e histórico de versões
            </h2>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>v1.1 — 13/09/2026.</strong> 2ª edição da pesquisa.
                Inventário de dados em tabela (dado, finalidade, base legal e
                prazo); bloco da consulta ao SPC Brasil; UF/município do
                título, título de eleitor (16–17 anos), sexo perguntado quando
                ausente e faixa de renda incluídos; renda deixa de ser citada
                como variável de ponderação; convite por WhatsApp e seu
                opt-out; lista de operadores; prazos de retenção atualizados
                (OTP 30 dias; IP, user-agent e dispositivo 6 meses).
              </li>
              <li>
                <strong>v1.0 — 13/05/2026.</strong> Versão inicial, vigente
                durante a 1ª edição.
              </li>
            </ul>
            <p className="leading-relaxed">
              Esta política pode ser atualizada para refletir mudanças no
              tratamento de dados ou exigências regulatórias. A data de
              vigência no topo indica a versão em vigor.
            </p>
          </section>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Link
              href="/"
              className="text-sm text-primary hover:underline"
            >
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </main>
      <RodapeInstitucional />
    </>
  )
}
