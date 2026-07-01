import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import { RodapeInstitucional } from '@/components/rodape-institucional'

export const metadata = {
  title: 'Política de Privacidade · Pesquisa Eleitoral Sergipe 2026',
  description:
    'Como a CDL Aracaju trata seus dados pessoais nesta pesquisa eleitoral, em conformidade com a Lei 13.709/2018 (LGPD).',
}

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
              Versão 1.0 · vigente desde 13/05/2026
            </p>
          </header>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              1. Quem somos
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
              Esta política descreve como tratamos seus dados pessoais
              durante a <strong>Pesquisa Eleitoral Sergipe 2026</strong> — pesquisa
              de intenção de voto registrada no TRE/SE conforme Resolução
              TSE 23.747/2026.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              2. Dados que coletamos
            </h2>

            <h3 className="text-base font-semibold">
              Durante o cadastro (Sala 1)
            </h3>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>CPF</strong> — armazenado <em>somente como hash
                criptográfico</em> (HMAC-SHA256 com chave secreta do
                servidor). O CPF original nunca é gravado em banco.
                Usado para garantir que cada pessoa vote uma vez.
              </li>
              <li>
                <strong>WhatsApp (E.164)</strong> — usado para enviar o
                código de autenticação. Mantido após a pesquisa apenas
                para auditoria e re-uso em próximas edições, se você
                consentir.
              </li>
              <li>
                <strong>Município de domicílio eleitoral</strong> —
                usado para projeção estadual e ponderação por
                mesorregião.
              </li>
              <li>
                <strong>
                  Sexo, faixa etária, escolaridade e renda familiar
                </strong>{' '}
                — coletados em conformidade com a{' '}
                <strong>Resolução TSE 23.747/2026, Art. 2º § 7º, IV</strong>
                , que exige reportar ao TRE/SE a composição da amostra final
                por gênero, idade, grau de instrução e nível econômico. A
                pergunta de renda familiar usa faixas amplas (classes ABEP) e
                inclui a opção <em>&ldquo;prefiro não informar&rdquo;</em> —
                sua escolha não bloqueia o cadastro. Dados sensíveis (renda)
                são tratados apenas em <strong>agregados estatísticos</strong>,
                nunca individualmente.
              </li>
              <li>
                <strong>Endereço IP e User-Agent do navegador</strong> —
                registrados para auditoria, antifraude e cumprimento da
                Resolução. Acessíveis apenas pelo operador da pesquisa.
              </li>
              <li>
                <strong>Nome mascarado</strong> (ex.: &ldquo;MARIA S.
                ***&rdquo;) — exibido na confirmação do cadastro para
                você reconhecer que estamos consultando os dados certos.
                Vindo da consulta ao SPC Brasil (CPFs novos) ou da base
                histórica da CDL.
              </li>
            </ul>

            <h3 className="text-base font-semibold pt-3">
              Durante a votação (Sala 2)
            </h3>
            <p className="leading-relaxed">
              Seus <strong>votos</strong> são armazenados em tabela
              separada, sem nenhuma referência ao seu CPF, IP ou nome.
              A única ponte entre as duas salas é um <em>token aleatório
              criptografado</em> que vive apenas no cookie do seu
              navegador e é destruído ao fim da votação.
            </p>
            <p className="leading-relaxed">
              Não existe chave (chave estrangeira, CPF, IP ou nome) ligando
              um voto a uma pessoa — a reidentificação é inviável por meios
              comuns. Os votos guardam apenas atributos demográficos (sexo,
              faixa etária, escolaridade, município) usados na ponderação
              amostral; por isso são tratados como{' '}
              <strong>pseudonimizados</strong> (não anônimos em sentido
              absoluto) e permanecem protegidos pela LGPD. Auditoria técnica
              em{' '}
              <Link href="/transparencia" className="text-primary hover:underline">
                /transparencia
              </Link>
              .
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              3. Finalidade do tratamento
            </h2>
            <p className="leading-relaxed">
              Os dados pessoais são tratados <strong>exclusivamente</strong>{' '}
              para:
            </p>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                Realização da pesquisa eleitoral conforme Lei 9.504/97 e
                Resolução TSE 23.747/2026.
              </li>
              <li>Verificação de identidade do respondente.</li>
              <li>
                Ponderação estatística da amostra contra a distribuição
                oficial do TSE (sexo × idade × escolaridade × renda ×
                município) e composição do relatório complementar exigido
                pelo § 7º-A do art. 2º da Resolução TSE 23.747/2026.
              </li>
              <li>Antifraude (rate limit, device fingerprint).</li>
              <li>
                Auditoria, atendendo eventual requisição do TRE/SE ou
                autoridades.
              </li>
              <li>
                <strong>Envio dos resultados ao seu WhatsApp</strong> —
                apenas se você marcar explicitamente a caixa
                &quot;Quero receber os resultados em primeira mão&quot;
                no formulário de cadastro. Envio único por edição, com a
                divulgação consolidada da pesquisa. Não é marketing nem
                propaganda — é o resultado da pesquisa em que você
                participou. Você pode cancelar a qualquer momento
                solicitando exclusão dos dados em{' '}
                <Link
                  href="/privacidade/excluir"
                  className="text-primary hover:underline"
                >
                  /privacidade/excluir
                </Link>
                .
              </li>
            </ul>
            <p className="leading-relaxed">
              <strong>Não usamos seus dados</strong> para fins
              comerciais, marketing, perfil de consumo, ou
              compartilhamento com terceiros (exceto integrações
              técnicas necessárias — SPC Brasil para validação de CPF,
              Meta WhatsApp para envio de OTP).
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              4. Base legal (Arts. 7 e 11 LGPD)
            </h2>
            <p className="leading-relaxed rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
              A <strong>intenção de voto é dado pessoal sensível</strong>{' '}
              (Art. 5º, II — opinião política) e, por isso, seu tratamento
              observa o <strong>regime específico do Art. 11 da LGPD</strong>,
              apoiado em consentimento específico e destacado para esta
              finalidade. As bases do Art. 7 abaixo cobrem os demais dados
              (identidade e variáveis demográficas usadas na ponderação).
            </p>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>Consentimento</strong> (Art. 7, I) — você marca
                explicitamente a caixa de aceite na entrada do{' '}
                <Link href="/votar" className="text-primary hover:underline">
                  /votar
                </Link>
                . Sem consentimento o cadastro não é realizado.
              </li>
              <li>
                <strong>Cumprimento de obrigação legal</strong> (Art. 7,
                II) — a Resolução TSE 23.747/2026 exige coleta dessas
                variáveis para registro PesqEle.
              </li>
              <li>
                <strong>Exercício regular de direitos</strong> (Art. 7,
                VI) — auditoria + transparência pública.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              5. Seus direitos (Art. 18 LGPD)
            </h2>
            <p className="leading-relaxed">
              Você pode, a qualquer momento:
            </p>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>Confirmar</strong> que estamos tratando seus
                dados (Art. 18, I).
              </li>
              <li>
                <strong>Acessar</strong> os dados que temos sobre você
                (Art. 18, II).
              </li>
              <li>
                <strong>Corrigir</strong> dados incompletos, inexatos ou
                desatualizados (Art. 18, III).
              </li>
              <li>
                <strong>Solicitar exclusão</strong> dos seus dados
                pessoais (Art. 18, VI). Após exclusão, seu voto
                permanece anonimamente computado, mas sua identidade
                desaparece do banco.{' '}
                <Link
                  href="/privacidade/excluir"
                  className="text-primary hover:underline font-medium"
                >
                  Solicitar exclusão →
                </Link>
              </li>
              <li>
                <strong>Revogar consentimento</strong> a qualquer momento
                (Art. 8, §5).
              </li>
              <li>
                <strong>Saber com quem compartilhamos seus dados</strong>{' '}
                (Art. 18, VII).
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              6. Compartilhamento com terceiros
            </h2>
            <p className="leading-relaxed">
              Para operação da pesquisa, integramos com:
            </p>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>SPC Brasil</strong> (Câmara Nacional de
                Dirigentes Lojistas) — consulta de validação de CPF.
                Enviamos apenas o CPF, recebemos confirmação de
                existência e regularidade.
              </li>
              <li>
                <strong>Meta Platforms Ireland Ltd</strong> (WhatsApp
                Business Cloud API) — envio do código OTP. Enviamos o
                número e o código (6 dígitos).
              </li>
              <li>
                <strong>Vercel Inc.</strong> (hospedagem) e{' '}
                <strong>Supabase Inc.</strong> (banco de dados) —
                provedores de infraestrutura. Não acessam seus dados
                fora da operação normal do serviço.
              </li>
              <li>
                <strong>Cloudflare Inc.</strong> (Turnstile) —
                verificação anti-bot. Não recebe dados pessoais, apenas
                sinal técnico do navegador.
              </li>
            </ul>
            <p className="leading-relaxed">
              Nenhum dado pessoal é vendido, repassado para campanhas
              eleitorais, partidos, ou anunciantes. Período.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              7. Período de retenção
            </h2>
            <p className="leading-relaxed">
              Os dados são mantidos pelos seguintes prazos:
            </p>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                <strong>Votos (Sala 2)</strong> — indefinido, em forma
                pseudonimizada (sem chave direta para a identidade; conserva
                atributos demográficos para ponderação).
              </li>
              <li>
                <strong>Identidade (Sala 1)</strong> — até{' '}
                <strong>6 meses após o encerramento da pesquisa</strong>,
                ou até pedido de exclusão pelo titular, o que ocorrer
                primeiro. Mantido durante esse período para auditoria do
                TRE/SE.
              </li>
              <li>
                <strong>Base CDL histórica</strong> — mantida
                indefinidamente para reuso em pesquisas futuras, com
                base no consentimento original do Melhores do Ano. Você
                pode solicitar exclusão a qualquer momento.
              </li>
              <li>
                <strong>Logs de IP, User-Agent</strong> — 90 dias após
                inserção, depois descartados automaticamente.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              8. Segurança técnica
            </h2>
            <ul className="list-disc pl-6 leading-relaxed flex flex-col gap-2">
              <li>
                Conexão sempre <strong>HTTPS</strong> (TLS 1.3, HSTS
                preload — força HTTPS por 2 anos).
              </li>
              <li>
                CPF criptografado com <strong>HMAC-SHA256</strong> e
                chave secreta no servidor. Banco nunca vê o CPF
                original.
              </li>
              <li>
                Identidade e voto em <strong>tabelas separadas</strong>{' '}
                sem chave de junção (arquitetura &ldquo;duas
                salas&rdquo;).
              </li>
              <li>
                Acesso ao banco de dados restrito a{' '}
                <em>service role keys</em> mantidos apenas em variáveis
                de ambiente do servidor — nunca expostos a clientes.
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
                correlação minuto-a-minuto.
              </li>
              <li>
                Código-fonte aberto e auditável em{' '}
                <Link
                  href="https://github.com/presidencia-svg/pesquisa"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/presidencia-svg/pesquisa
                </Link>
                .
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-l-2 border-accent pl-4">
              9. Encarregado de Dados (DPO)
            </h2>
            <p className="leading-relaxed">
              Encarregada pelo Tratamento de Dados Pessoais da CDL
              Aracaju: <strong>Claudimara Fontes Carvalho</strong>,
              Diretora Secretária, designada por Ata de Reunião
              Extraordinária da Diretoria nº 001/2026-EXT, de 26 de
              maio de 2026, na forma do art. 41 da Lei 13.709/2018.
            </p>
            <ul className="list-none leading-relaxed flex flex-col gap-1 pl-1">
              <li>📧 dpo@cdlaju.com.br</li>
              <li>📞 Telefone institucional: (79) 3212-7700</li>
              <li>📮 Rua Santa Luzia, 570, São José, Aracaju/SE — CEP 49015-190</li>
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
              10. Alterações
            </h2>
            <p className="leading-relaxed">
              Esta política pode ser atualizada para refletir mudanças
              no tratamento de dados ou exigências regulatórias.
              Versões anteriores ficam disponíveis no nosso
              repositório público em{' '}
              <Link
                href="https://github.com/presidencia-svg/pesquisa/commits/main/app/privacidade/page.tsx"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-mono text-xs"
              >
                github
              </Link>
              .
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
