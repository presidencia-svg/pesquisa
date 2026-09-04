import Link from 'next/link'

import { AvisoRegistro } from '@/components/aviso-registro'
import { BaseEleitoralSe } from '@/components/base-eleitoral-se'
import { MarcaCdl } from '@/components/marca-cdl'
import { RodapeInstitucional } from '@/components/rodape-institucional'

export const metadata = {
  title: 'Transparência · Pesquisa Eleitoral Sergipe 2026',
  description:
    'Como a Pesquisa Eleitoral Sergipe 2026 funciona: arquitetura de anonimato, plano amostral, base legal, anti-fraude e como auditar.',
}

const secoes = [
  { id: 'ficha-tecnica', label: 'Ficha técnica (formato instituto)' },
  { id: 'codigo-aberto', label: 'Código aberto e proteção dos dados' },
  { id: 'duas-salas', label: 'As duas salas (anonimato)' },
  { id: 'plano-amostral', label: 'Plano amostral' },
  { id: 'variaveis', label: 'Variáveis coletadas' },
  { id: 'base-legal', label: 'Base legal' },
  { id: 'antifraude', label: 'Anti-fraude' },
  { id: 'k-anonymity', label: 'K-anonymity' },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'auditar', label: 'Como auditar (3 níveis)' },
  { id: 'cdl', label: 'Quem executa' },
]

export default function TransparenciaPage() {
  return (
    <>
      <main className="flex flex-col flex-1 bg-background">
        <header className="border-b border-border">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Início
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Transparência
            </p>
          </div>
        </header>

        <section className="px-6 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto flex flex-col gap-10">
            {/* Hero */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                Pesquisa Eleitoral Sergipe 2026
              </p>
              <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.05] tracking-tight">
                Transparência total
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Pra a Pesquisa Eleitoral Sergipe 2026 merecer crédito, ela precisa caber
                no escrutínio. Esta página cobre tudo: arquitetura de
                anonimato, plano amostral, base legal, anti-fraude e como
                você mesmo pode auditar.
              </p>
            </div>

            {/* TOC */}
            <nav
              aria-label="Sumário"
              className="rounded-md border border-border bg-muted px-6 py-5 flex flex-col gap-3"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
                O que tem nesta página
              </p>
              <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground">
                {secoes.map((s, i) => (
                  <li key={s.id} className="flex gap-2">
                    <span className="text-muted-foreground tabular-nums">
                      {String(i + 1).padStart(2, '0')}.
                    </span>
                    <a
                      href={`#${s.id}`}
                      className="hover:underline hover:text-primary"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* 0. Ficha técnica — formato instituto adaptado */}
            <section id="ficha-tecnica" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Ficha técnica
              </h2>
              <p className="text-foreground leading-relaxed">
                Formato padrão que institutos como Datafolha, Quaest e
                Paraná Pesquisas usam ao divulgar resultados, adaptado ao
                nosso modelo (online + identidade verificada + allowlist).
                Esta ficha acompanha toda divulgação pública e vai anexa
                ao registro no PesqEle do TRE/SE.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                <LinhaFicha titulo="Contratante" valor="CDL Aracaju" />
                <LinhaFicha titulo="Executor" valor="CDL Aracaju (execução direta)" />
                <LinhaFicha titulo="Universo" valor="1.731.960 eleitores aptos em SE (TSE)" />
                <LinhaFicha titulo="Abrangência" valor="75 municípios de Sergipe" />
                <LinhaFicha
                  titulo="Forma de coleta"
                  valor="Online com identidade verificada (web/PWA)"
                />
                <LinhaFicha
                  titulo="Tipo"
                  valor="Espontânea (eleitor digita número, estilo urna)"
                />
                <LinhaFicha
                  titulo="Amostragem"
                  valor="Não-probabilística com identidade verificada (post-stratification)"
                />
                <LinhaFicha
                  titulo="Ponderação geográfica"
                  valor="Pós-coleta, proporcional ao eleitorado TSE de cada município"
                />
                <LinhaFicha
                  titulo="Ponderação pós-coleta"
                  valor="Sexo, faixa etária, escolaridade"
                />
                <LinhaFicha
                  titulo="Nível de confiança"
                  valor="95%"
                />
                <LinhaFicha
                  titulo="Base potencial"
                  valor="44.545 CPFs CDL pré-validados + qualquer eleitor SE via SPC"
                />
                <LinhaFicha
                  titulo="n projetado"
                  valor="5.000–15.000 respondentes (margem ±1,4pp a ±0,8pp)"
                />
                <LinhaFicha
                  titulo="Período de coleta"
                  valor="Setembro/2026 (a confirmar)"
                />
              </div>

              <div className="rounded-md border border-accent/30 bg-accent/5 px-5 py-4 flex flex-col gap-2 text-sm">
                <p className="font-semibold text-foreground">
                  Cédulas — o que cada eleitor responde
                </p>
                <ul className="flex flex-col gap-1 text-foreground">
                  <li>1. Presidente — espontânea (1 número)</li>
                  <li>2. Governador — espontânea (1 número)</li>
                  <li>3. Senador — espontânea (até 2 números)</li>
                  <li>
                    4. Deputado Federal — espontânea por legenda + candidato (4
                    dígitos)
                  </li>
                  <li>
                    5. Deputado Estadual — espontânea por legenda + candidato (5
                    dígitos)
                  </li>
                  <li>
                    6. Consulta Zona de Expansão — estimulada de duas opções,
                    apenas para eleitores de Aracaju e São Cristóvão
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2 border-t border-accent/20">
                  Em todas as cédulas o eleitor pode optar por{' '}
                  <strong>voto em branco</strong> ou{' '}
                  <strong>não sabe / não quis responder</strong>. Em federal e
                  estadual, voto na legenda define cadeiras via Quociente
                  Eleitoral (Lei 9.504/97); voto no candidato individual define
                  a ordem dentro da legenda.
                </p>
              </div>

              <div className="rounded-md border border-border bg-muted px-5 py-4 flex flex-col gap-3 text-sm">
                <p className="font-semibold text-foreground">
                  Onde diferimos de institutos tradicionais
                </p>
                <table className="text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="font-medium text-muted-foreground pb-2 pr-3">
                        Item
                      </th>
                      <th className="font-medium text-muted-foreground pb-2 pr-3">
                        Tradicional
                      </th>
                      <th className="font-medium text-muted-foreground pb-2">
                        Nosso modelo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground align-top">
                    <tr>
                      <td className="py-1 pr-3 font-medium">Forma</td>
                      <td className="py-1 pr-3">Presencial / telefone</td>
                      <td className="py-1">Online com OTP</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3 font-medium">Amostragem</td>
                      <td className="py-1 pr-3">Sorteio probabilístico</td>
                      <td className="py-1">Allowlist verificada + ponderação pós-coleta</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3 font-medium">Entrevistador</td>
                      <td className="py-1 pr-3">Sim (introduz viés)</td>
                      <td className="py-1">Autopreenchimento</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3 font-medium">Tipo</td>
                      <td className="py-1 pr-3">Geralmente estimulada</td>
                      <td className="py-1">
                        <strong>Espontânea pura</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3 font-medium">Anonimato</td>
                      <td className="py-1 pr-3">Promessa operacional</td>
                      <td className="py-1">Garantia arquitetural</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3 font-medium">Auditoria</td>
                      <td className="py-1 pr-3">Material físico</td>
                      <td className="py-1">Código aberto + dados auditáveis</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3 font-medium">Custo</td>
                      <td className="py-1 pr-3">R$ 80k–300k por onda</td>
                      <td className="py-1">≈ R$ 0 (infraestrutura própria)</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Cada diferença foi consciente e tem trade-offs declarados.
                  Ganhos: transparência total e anonimato arquitetural.
                  Limites: amostra não-aleatória (corrigida por ponderação)
                  e viés digital (smartphone + WhatsApp). Ambos publicados
                  junto com o resultado.
                </p>
              </div>

              <p className="text-xs text-muted-foreground border-t border-border pt-4 leading-relaxed">
                Versão técnica completa (sem cortes) está em{' '}
                <a
                  href="https://github.com/presidencia-svg/pesquisa/blob/main/docs/ficha-tecnica.md"
                  className="text-primary hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  docs/ficha-tecnica.md
                </a>{' '}
                no repositório público.
              </p>
            </section>

            {/* Transparência de código + segurança */}
            <section
              id="codigo-aberto"
              className="scroll-mt-8 flex flex-col gap-5"
            >
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Código aberto para auditoria · proteção contra abuso
              </h2>
              <p className="text-foreground leading-relaxed">
                Por que abrir o código numa pesquisa eleitoral? Porque a
                única forma honesta de provar que um sistema não fraudou
                resultados é deixar ele ser inspecionado por terceiros
                independentes. Por isso o código-fonte está público em{' '}
                <a
                  href="https://github.com/presidencia-svg/pesquisa"
                  className="text-primary hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/presidencia-svg/pesquisa
                </a>
                . Qualquer pesquisador, jornalista ou cientista político
                pode verificar como os votos são contados, como os
                cruzamentos são feitos, como a separação CPF↔voto é
                garantida.
              </p>
              <p className="text-foreground leading-relaxed">
                Ao mesmo tempo, o código tem uma{' '}
                <a
                  href="https://github.com/presidencia-svg/pesquisa/blob/main/LICENSE"
                  className="text-primary hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  licença de uso restrito
                </a>{' '}
                que veda:
              </p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground flex flex-col gap-2 leading-relaxed">
                <li>
                  uso comercial ou em pesquisa eleitoral de terceira
                  entidade;
                </li>
                <li>
                  uso para conduzir pesquisas em nome de partido,
                  candidato, federação ou coligação;
                </li>
                <li>
                  uso para fraude, manipulação ou desinformação eleitoral
                  (Lei 9.504/97, Resolução TSE 23.747/2026);
                </li>
                <li>
                  reprodução da marca, identidade visual ou domínio
                  pesquisa.cdlaju.com.br.
                </li>
              </ul>
              <p className="text-foreground leading-relaxed">
                Vulnerabilidades de segurança devem ser reportadas por{' '}
                <strong>dpo@cdlaju.com.br</strong>, conforme a{' '}
                <a
                  href="https://github.com/presidencia-svg/pesquisa/blob/main/SECURITY.md"
                  className="text-primary hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  política de divulgação responsável
                </a>{' '}
                (versão machine-readable em{' '}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  /.well-known/security.txt
                </code>
                , conforme RFC 9116). Reportes de boa-fé não geram
                represália legal.
              </p>
              <div className="bg-muted/40 border border-border rounded-lg p-4 text-sm flex flex-col gap-2">
                <p className="font-medium text-foreground">
                  O que é &quot;protegido&quot; do público:
                </p>
                <ul className="list-disc pl-5 text-muted-foreground flex flex-col gap-1">
                  <li>credenciais (Supabase, SPC, Meta) — em variáveis de ambiente, jamais no código;</li>
                  <li>dados pessoais dos respondentes — guardados em banco com acesso restrito;</li>
                  <li>painel administrativo — protegido por senha + TOTP;</li>
                  <li>endpoints de gerência — autenticação obrigatória, com auditoria.</li>
                </ul>
              </div>

              <div className="border-2 border-primary/40 bg-primary/5 rounded-lg p-5 flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Como código aberto + dados privados convivem
                </h3>
                <p className="leading-relaxed text-sm">
                  É uma dúvida legítima: <em>&quot;se o código é público,
                  qualquer um vê os resultados antes da divulgação?&quot;</em>
                  Não. A separação acontece em <strong>três camadas
                  independentes</strong>:
                </p>
                <ol className="list-decimal pl-5 text-sm leading-relaxed flex flex-col gap-2">
                  <li>
                    <strong>Banco de dados isolado.</strong> As tabelas
                    sensíveis ficam atrás de regras de acesso server-side
                    que rejeitam qualquer conexão externa. Mesmo quem
                    tivesse a URL do banco e qualquer chave pública embutida
                    em página HTML não consegue ler nada — só o nosso
                    servidor, com credenciais privilegiadas guardadas em
                    variáveis de ambiente (fora do código-fonte).
                  </li>
                  <li>
                    <strong>Página de resultados com trava de divulgação.</strong>{' '}
                    Antes da CDL Aracaju marcar a edição como divulgada
                    (após o telejornal da TV Atalaia, conforme convênio com a
                    emissora), a página exibe apenas &quot;Aguardando
                    divulgação&quot;. Os números não saem do servidor.
                  </li>
                  <li>
                    <strong>Auditoria de acessos administrativos.</strong>{' '}
                    Todo acesso a resultados ou dados pessoais pelo painel
                    administrativo gera registro carimbado (timestamp, IP,
                    user-agent, contexto). Acessos ANTES da divulgação são
                    destacados — caso mais sensível, exige justificativa
                    operacional. Em conformidade com o art. 37 da LGPD.
                  </li>
                </ol>
                <p className="text-sm leading-relaxed">
                  Conclusão: o <strong>código</strong> é público porque
                  permite que qualquer cientista político ou pesquisador
                  audite COMO os votos são contados. Os <strong>dados</strong>{' '}
                  ficam privados até o momento autorizado da divulgação.
                  Após a divulgação, tornam-se públicos em{' '}
                  <a
                    href="/resultados"
                    className="text-primary hover:underline font-medium"
                  >
                    /resultados
                  </a>{' '}
                  — automaticamente.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Esta é uma descrição em linguagem leiga. Detalhes
                  técnicos (nomes de tabelas, configurações de segurança,
                  parâmetros operacionais) são compartilhados sob NDA com
                  auditores formais credenciados pela CDL — sem exposição
                  pública, pra não dar mapa a quem queira atacar.
                </p>
              </div>
            </section>

            {/* 1. As duas salas */}
            <section id="duas-salas" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                As duas salas
              </h2>
              <p className="text-foreground leading-relaxed">
                A maior fragilidade de pesquisas online é guardar CPF e voto
                na mesma tabela. A promessa de anonimato fica no discurso —
                bastaria abrir o banco e cruzar. Aqui a separação está na
                arquitetura, não no compromisso.
              </p>

              <DiagramaDuasSalas />

              <p className="text-foreground leading-relaxed">
                A única ponte entre as duas salas é um cookie{' '}
                <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">
                  httpOnly + secure
                </code>{' '}
                no navegador do eleitor. O servidor gera um token aleatório,
                grava o hash em <code className="font-mono text-sm">tokens_emitidos</code>{' '}
                (sem nenhuma referência ao CPF) e entrega o token original
                pelo cookie. As cédulas usam o cookie pra autorizar cada voto.
                Quando termina, o cookie expira e a ponte some.
              </p>
              <p className="text-foreground leading-relaxed">
                Auditor que abrir o banco vê duas tabelas que não se
                conectam. <strong>Mesmo o operador da CDL</strong> não tem
                como ligar um voto a um CPF.
              </p>
            </section>

            {/* 2. Plano amostral */}
            <section
              id="plano-amostral"
              className="scroll-mt-8 flex flex-col gap-5"
            >
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Plano amostral
              </h2>
              <p className="text-foreground leading-relaxed">
                Universo: eleitorado oficial de Sergipe segundo o TSE,
                aproximadamente <strong>1,42 milhão de eleitores</strong>{' '}
                distribuídos em 75 municípios. Cargos em disputa: Presidente
                da República, Governador, 2 Senadores, 8 Deputados Federais,
                24 Deputados Estaduais.
              </p>

              <BaseEleitoralSe />

              <div className="grid sm:grid-cols-3 gap-3">
                <FichaCampo
                  rotulo="Tamanho amostral (n)"
                  valor="a definir"
                  nota="Definido pelo estatístico CONRE antes do registro. Referência: 1.067 pra ±3pp."
                />
                <FichaCampo
                  rotulo="Margem de erro"
                  valor="±3 p.p."
                  nota="Pra n = 1.067 com IC 95%."
                />
                <FichaCampo
                  rotulo="Nível de confiança"
                  valor="95%"
                  nota="Padrão de pesquisas eleitorais brasileiras."
                />
              </div>

              <h3 className="text-base font-semibold uppercase tracking-wide text-foreground pt-3">
                Ponderação por município (pós-coleta)
              </h3>
              <p className="text-foreground leading-relaxed">
                A pesquisa <strong>não bloqueia respostas por cota</strong>:
                qualquer eleitor de Sergipe pode participar enquanto a
                coleta estiver aberta. A distorção de adesão geográfica
                (capital responde mais, interior responde menos) é
                corrigida <strong>após a coleta</strong> por ponderação
                pós-estratificação, técnica padrão de institutos digitais
                (DataFolha online, Quaest, Genial/Quaest).
              </p>
              <p className="text-foreground leading-relaxed">
                Cada resposta recebe um peso proporcional à
                sub-representação do seu município na amostra:
              </p>
              <pre className="text-xs font-mono bg-muted rounded-md px-4 py-3 overflow-x-auto leading-relaxed">
                <code>w(M) = (N(M) / N_total) / (n(M) / n_total)</code>
              </pre>
              <p className="text-foreground leading-relaxed">
                Onde <code className="font-mono text-xs">N(M)</code> é o
                eleitorado oficial do município (TSE 2024) e{' '}
                <code className="font-mono text-xs">n(M)</code> é o número
                de respostas validadas vindas dele. Município com peso
                maior que 1 estava sub-representado; menor que 1, super.
                Tamanho amostral total não muda — só o peso de cada
                resposta. Tabela completa com pesos por município fica
                pública após o registro no TRE/SE.
              </p>

              <h3 className="text-base font-semibold uppercase tracking-wide text-foreground pt-3">
                Outras ponderações
              </h3>
              <p className="text-foreground leading-relaxed">
                Além de município, a amostra também é ponderada contra a
                distribuição TSE de <strong>sexo, faixa etária e
                escolaridade</strong> — coletadas no cadastro, exigência
                da Resolução TSE 23.747/2026 art. 2 §3.
              </p>

              <h3 className="text-base font-semibold uppercase tracking-wide text-foreground pt-3">
                Recrutamento
              </h3>
              <p className="text-foreground leading-relaxed">
                Há duas portas de entrada na pesquisa, ambas validadas:
              </p>
              <ul className="text-foreground leading-relaxed list-disc pl-5 flex flex-col gap-2">
                <li>
                  <strong>Base CDL:</strong> ~50 mil consumidores que votaram
                  na premiação popular Melhores do Ano da CDL Aracaju —
                  CPFs já conhecidos, dispensa nova consulta ao SPC. Dá
                  perfil largo de consumidor (não só associados); o viés
                  geográfico (Aracaju concentra Melhores do Ano) é
                  corrigido pela ponderação pós-coleta descrita acima.
                </li>
                <li>
                  <strong>Validação SPC Brasil:</strong> qualquer eleitor
                  fora da base CDL é validado em consulta ao SPC pra
                  confirmar que o CPF é real e regular.
                </li>
              </ul>
              <p className="text-foreground leading-relaxed">
                Ambas as portas exigem em seguida a confirmação por código
                de 6 dígitos via WhatsApp — garante que o respondente é
                titular do CPF informado.
              </p>
            </section>

            {/* 3. Variáveis */}
            <section id="variaveis" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Variáveis coletadas
              </h2>

              <h3 className="text-base font-semibold uppercase tracking-wide text-foreground">
                Sala 1 (validação) — <code className="font-mono">eleitores_pesquisa</code>
              </h3>
              <ul className="text-foreground leading-relaxed list-disc pl-5 flex flex-col gap-1">
                <li>Hash do CPF (HMAC-SHA256, jamais o número original).</li>
                <li>CPF mascarado (***.***.789-XX) para auditoria.</li>
                <li>Município (IBGE).</li>
                <li>Sexo, faixa etária, escolaridade.</li>
                <li>Flags: validado pelo SPC, validado pelo WhatsApp.</li>
                <li>Origem da validação: base CDL ou SPC.</li>
                <li>Metadados antifraude: IP, user-agent, fingerprint do dispositivo.</li>
              </ul>

              <h3 className="text-base font-semibold uppercase tracking-wide text-foreground pt-2">
                Sala 2 (votação) — <code className="font-mono">tokens_emitidos</code> +{' '}
                <code className="font-mono">votos_pesquisa</code>
              </h3>
              <ul className="text-foreground leading-relaxed list-disc pl-5 flex flex-col gap-1">
                <li>Hash do token aleatório (sem ligação com nenhum CPF).</li>
                <li>Cargo (Presidente, Governador, Senador, Federal, Estadual).</li>
                <li>Candidato ou partido escolhido.</li>
                <li>Método: voto numérico, branco ou &ldquo;não sei&rdquo;.</li>
                <li>
                  Hora de criação <strong>truncada pra hora cheia</strong> —
                  análise temporal segue possível, cruzamento minuto-a-minuto
                  que poderia identificar pessoa não.
                </li>
              </ul>

              <p className="text-foreground leading-relaxed pt-2">
                Pra atender o relatório complementar exigido pelo Art. 2º
                § 7º, IV da Resolução TSE 23.747/2026 e permitir narrativa
                tipo &ldquo;intenção entre mulheres de 25-34 em Aracaju&rdquo;,
                a Sala 2 carrega uma <strong>cópia controlada</strong> dos
                atributos demográficos (sexo, faixa etária, escolaridade,
                renda, município) <em>sem o cpf_hash</em>. O voto continua
                impossível de ligar a um CPF específico, mas cruzamentos
                agregados ficam disponíveis para análise.
              </p>
              <p className="text-foreground leading-relaxed pt-1 italic">
                Toda exibição agregada por cruzamento demográfico aplica
                a regra de k-anonymity descrita abaixo — células com menos
                de 30 respondentes são suprimidas ou agregadas a um nível
                superior.
              </p>
            </section>

            {/* 4. Base legal */}
            <section id="base-legal" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Base legal
              </h2>

              <ItemLegal
                titulo="Lei nº 9.504/97 — Lei das Eleições, Art. 33"
                url="https://www.planalto.gov.br/ccivil_03/leis/l9504.htm"
              >
                Exige registro da pesquisa na Justiça Eleitoral até 5 dias
                antes da divulgação, com plano amostral, ponderação por
                sexo/idade/escolaridade/nível econômico, intervalo de
                confiança, margem de erro, contratante e valor.
              </ItemLegal>

              <ItemLegal
                titulo="Resolução TSE nº 23.747/2026"
                url="https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-747-de-26-de-fevereiro-de-2026"
              >
                Disciplina o registro e a divulgação de pesquisas pra as
                eleições 2026. Registro via sistema PesqEle. Exige declaração
                assinada com certificado digital pelo profissional de
                Estatística com registro CONRE ativo, e compromisso de manter
                documentação auditável.
              </ItemLegal>

              <ItemLegal
                titulo="LGPD — Lei nº 13.709/2018"
                url="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
              >
                Base legal pra coleta: &ldquo;execução de pesquisa de opinião&rdquo;
                (Art. 7º, IV). Princípios aplicados: finalidade exclusiva
                (sem reuso comercial), minimização (só o necessário pra a
                pesquisa), adequação técnica (CPF nunca em texto, arquitetura
                de duas salas).
              </ItemLegal>
            </section>

            {/* 5. Antifraude */}
            <section id="antifraude" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Anti-fraude
              </h2>
              <p className="text-foreground leading-relaxed">
                Camadas independentes — cada uma exige um vetor diferente
                pra ser quebrada. Atacar todas ao mesmo tempo é
                significativamente mais custoso do que ganhar a pesquisa
                campanha legítima.
              </p>
              <ul className="text-foreground leading-relaxed list-disc pl-5 flex flex-col gap-2">
                <li>
                  <strong>Validação documental:</strong> CPF tem que existir
                  na base CDL ou na consulta cadastral à Receita Federal
                  (via SPC Brasil), com situação regular e idade mínima de
                  16 anos. Sem isso, o cadastro nem começa.
                </li>
                <li>
                  <strong>Validação de propriedade do número:</strong>{' '}
                  código de 6 dígitos enviado por WhatsApp. Sem confirmação,
                  não emite token de voto.
                </li>
                <li>
                  <strong>Voto único por CPF, WhatsApp e dispositivo:</strong>{' '}
                  trava em três dimensões independentes. Quem repete em
                  qualquer uma é bloqueado.
                </li>
                <li>
                  <strong>Ponderação geográfica:</strong> a projeção final
                  aplica peso proporcional ao eleitorado de cada município,
                  evitando que excesso de adesão de uma região distorça o
                  resultado.
                </li>
                <li>
                  <strong>Limites de taxa por endereço de rede:</strong>{' '}
                  tentativas repetidas são contidas em janelas curtas. Os
                  parâmetros operacionais são revistos periodicamente —
                  publicá-los daria orçamento de ataque a quem tente burlar.
                </li>
                <li>
                  <strong>Anti-bot externo:</strong> verificação humana via
                  provedor especializado (Cloudflare Turnstile) na entrada do
                  formulário.
                </li>
                <li>
                  <strong>Bloqueio de navegação anônima/incógnita:</strong>{' '}
                  modo privado impede a trava por dispositivo, então
                  rejeitamos o cadastro nessas condições.
                </li>
                <li>
                  <strong>Análise pós-coleta:</strong> rotinas internas
                  detectam clusters anômalos (concentração temporal, IP,
                  padrão de resposta) pra revisão antes da divulgação.
                </li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pode parecer pouco transparente não citar números exatos
                (quantas tentativas em quanto tempo). É proposital: em
                segurança, divulgar o limite exato vira receita de bolo
                pra fraude. O auditor formal com credencial pode ver tudo
                em detalhe — ver{' '}
                <a href="#auditar" className="text-primary hover:underline">
                  Como auditar
                </a>{' '}
                abaixo.
              </p>
            </section>

            {/* 6. K-anonymity */}
            <section id="k-anonymity" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                K-anonymity
              </h2>
              <p className="text-foreground leading-relaxed">
                Mesmo sem ligação direta entre CPF e voto, células muito
                pequenas em cruzamentos demográficos podem reidentificar
                pessoas. Exemplo: se só uma mulher de 60+ em determinado
                município respondeu, o &ldquo;voto da maioria daquela
                célula&rdquo; é o voto dela.
              </p>
              <p className="text-foreground leading-relaxed">
                Pra evitar isso, qualquer corte cruzado divulgado
                publicamente respeita{' '}
                <strong>k ≥ 30 respondentes por célula</strong>. Cruzamentos
                que não atingem o mínimo são suprimidos ou agregados a um
                nível superior (ex.: &ldquo;mulheres de 60+ em Sergipe&rdquo;
                em vez de &ldquo;mulheres de 60+ em Itabaianinha&rdquo;). É a
                mesma convenção que
                o IBGE adota pra microdados públicos.
              </p>
            </section>

            {/* 7. Cronograma */}
            <section id="cronograma" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Cronograma
              </h2>
              <ul className="flex flex-col gap-3">
                {[
                  ['mai–jul/2026', 'Desenvolvimento. Integrações reais (SPC, Meta WhatsApp, Turnstile). Contratação do estatístico CONRE.'],
                  ['ago/2026', 'Piloto fechado, com código de convite. ~50 testers. Estressa o sistema sem divulgação pública.'],
                  ['ago/2026 (após piloto)', 'Reunião com advogado eleitoral. Trava material divulgável e questionário.'],
                  ['22/ago/2026', 'Registro no PesqEle: BR-04041/2026 (TSE) e SE-09441/2026 (TRE-SE).'],
                  ['01–03/set/2026', 'Coleta da pesquisa principal.'],
                  ['04/set/2026', 'Divulgação dos resultados.'],
                  ['04/out/2026', '1º turno das eleições.'],
                ].map(([when, what]) => (
                  <li key={when} className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                    <span className="sm:w-44 flex-none text-sm font-mono uppercase tracking-wider text-accent">
                      {when}
                    </span>
                    <span className="text-foreground leading-relaxed">{what}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 8. Auditar */}
            <section id="auditar" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Como auditar
              </h2>
              <p className="text-foreground leading-relaxed">
                A pesquisa foi desenhada para ser verificável em três níveis
                de acesso. Escolha o que cabe no seu papel:
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-background p-5 flex flex-col gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    Nível 1
                  </p>
                  <h3 className="text-base font-semibold text-foreground">
                    Cidadão / Imprensa
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed">
                    O que está totalmente público, sem precisar cadastro:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-4 flex flex-col gap-1">
                    <li>Ficha técnica nesta página</li>
                    <li>Resultados (após divulgação) em /resultados</li>
                    <li>Política de privacidade em /privacidade</li>
                    <li>Registro PesqEle no TRE/SE</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-border bg-background p-5 flex flex-col gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    Nível 2
                  </p>
                  <h3 className="text-base font-semibold text-foreground">
                    Pesquisador acadêmico
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed">
                    Quem quer auditar o sistema independentemente:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-4 flex flex-col gap-1">
                    <li>Código-fonte completo no GitHub</li>
                    <li>
                      Metodologia técnica em{' '}
                      <code className="text-xs">docs/</code>
                    </li>
                    <li>Política de divulgação responsável (SECURITY.md)</li>
                    <li>
                      Microdados anonimizados em{' '}
                      <code className="text-xs">/.well-known</code>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-5 flex flex-col gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold">
                    Nível 3
                  </p>
                  <h3 className="text-base font-semibold text-foreground">
                    Auditor formal credenciado
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed">
                    Acesso sob NDA, exigência da Justiça Eleitoral:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-4 flex flex-col gap-1">
                    <li>Sistema interno de controle (Res. 23.747/2026)</li>
                    <li>Microdados completos (sem identificadores diretos)</li>
                    <li>Logs de auditoria do painel admin</li>
                    <li>Parâmetros operacionais antifraude</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-foreground mt-2">
                Caminhos detalhados
              </h3>

              <ol className="flex flex-col gap-4 text-foreground leading-relaxed list-decimal list-outside pl-5">
                <li>
                  <strong>Código fonte aberto.</strong> Back-end, banco,
                  formulários, lógica de validação — tudo publicado em
                  repositório auditável:{' '}
                  <a
                    href="https://github.com/presidencia-svg/pesquisa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-primary hover:underline break-all"
                  >
                    github.com/presidencia-svg/pesquisa ↗
                  </a>
                  . Uso comercial restrito por{' '}
                  <a
                    href="https://github.com/presidencia-svg/pesquisa/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    licença específica
                  </a>
                  .
                </li>
                <li>
                  <strong>Documento técnico completo</strong> com fórmulas,
                  estrutura conceitual do banco e detalhes de implementação
                  está em{' '}
                  <code className="font-mono text-sm">docs/metodologia.md</code>{' '}
                  no repositório.
                </li>
                <li>
                  <strong>Política de segurança e disclosure.</strong>{' '}
                  Vulnerabilidades podem ser reportadas conforme{' '}
                  <a
                    href="https://github.com/presidencia-svg/pesquisa/blob/main/SECURITY.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    SECURITY.md
                  </a>
                  . Reportes de boa-fé não geram represália legal.
                  Formato machine-readable em{' '}
                  <code className="font-mono text-xs">/.well-known/security.txt</code>
                  {' '}(RFC 9116).
                </li>
                <li>
                  <strong>Registro no PesqEle (TSE e TRE-SE).</strong> Feito em
                  22/08/2026 sob os números BR-04041/2026 (TSE, presidente) e
                  SE-09441/2026 (TRE-SE, demais cargos). O aviso oficial da
                  Justiça Eleitoral e o caminho pra conferir estão logo abaixo.
                  <div className="mt-3">
                    <AvisoRegistro />
                  </div>
                </li>
                <li>
                  <strong>Pedido de dados auditáveis (Res. TSE 23.747/2026,
                  art. 13, §§ 8º e 9º).</strong> Qualquer interessado pode
                  requerer os dados consolidados e o sistema interno de
                  controle. A CDL responde em até 2 dias úteis. Custos da
                  inspeção, conforme a Resolução, são arcados pelo
                  requerente.
                </li>
                <li>
                  <strong>Estatístico responsável.</strong> Identificado no
                  registro PesqEle, com número CONRE ativo e declaração
                  assinada com certificado digital.
                </li>
                <li>
                  <strong>Encarregada de Dados (DPO).</strong> Claudimara
                  Fontes Carvalho, designada pela ata 001/2026-EXT de
                  26/05/2026. Atende solicitações da LGPD pelo e-mail{' '}
                  <a
                    href="mailto:dpo@cdlaju.com.br"
                    className="text-primary hover:underline"
                  >
                    dpo@cdlaju.com.br
                  </a>
                  .
                </li>
              </ol>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex flex-col gap-2">
                <p className="font-semibold">
                  Por que alguns detalhes são privados?
                </p>
                <p className="leading-relaxed">
                  Detalhes de configuração operacional (parâmetros exatos
                  de rate limit, nomes de tabelas internas, chaves
                  criptográficas, IPs de origem) não aparecem aqui — não
                  por opacidade, mas porque cada item destes facilitaria
                  um ataque de fraude se exposto publicamente. Auditores
                  formais credenciados acessam tudo isso sob NDA, conforme
                  a Resolução TSE.
                </p>
              </div>
            </section>

            {/* 9. Quem executa */}
            <section id="cdl" className="scroll-mt-8 flex flex-col gap-5">
              <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
                Quem executa
              </h2>

              <div className="flex flex-col sm:flex-row gap-6 sm:items-center pb-2">
                <MarcaCdl tamanho="md" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Câmara de Dirigentes Lojistas de Aracaju
                </p>
              </div>

              <p className="text-foreground leading-relaxed">
                A CDL Aracaju foi fundada em{' '}
                <strong>21 de dezembro de 1961</strong>, com Estatutos
                publicados no Diário Oficial do Estado de Sergipe em 10 de
                maio de 1962. É entidade declarada de utilidade pública pela{' '}
                <strong>Lei Municipal nº 63 de 6 de dezembro de 1967</strong>.
                Associação civil sem fins lucrativos, há mais de seis décadas
                representa os comerciantes lojistas e mantém serviços
                coletivos como o Serviço de Proteção ao Crédito.
              </p>
              <p className="text-foreground leading-relaxed">
                A CDL realiza atividades de interesse público há gerações,
                incluindo a premiação popular Melhores do Ano. Esta pesquisa
                eleitoral é mais uma iniciativa nessa linha:{' '}
                <strong>
                  a CDL não tem candidato, não apoia partido, não monetiza o
                  resultado
                </strong>
                . O objetivo é colocar à disposição do público sergipano um
                instrumento de medição rigoroso, auditável e desinteressado
                politicamente.
              </p>
            </section>

            {/* CTAs finais */}
            <div className="flex flex-col gap-3 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Esta página é a versão pública. O documento técnico completo,
                com schema do banco, fórmulas estatísticas, código das
                Server Actions e checklist operacional, está aberto no
                repositório.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/votar"
                  className="flex-1 inline-flex justify-center items-center h-12 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
                >
                  Quero participar
                </Link>
                <Link
                  href="/"
                  className="flex-1 inline-flex justify-center items-center h-12 px-6 rounded-md border border-border text-foreground font-medium hover:bg-muted transition"
                >
                  Voltar ao início
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <RodapeInstitucional />
    </>
  )
}

function FichaCampo({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string
  valor: string
  nota: string
}) {
  return (
    <div className="rounded-md border border-border bg-muted px-4 py-3 flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {rotulo}
      </p>
      <p className="text-xl font-semibold tabular-nums text-foreground">
        {valor}
      </p>
      <p className="text-[11px] text-muted-foreground leading-tight">{nota}</p>
    </div>
  )
}

function ItemLegal({
  titulo,
  url,
  children,
}: {
  titulo: string
  url: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 pl-4 border-l border-border">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-primary hover:underline"
      >
        {titulo} ↗
      </a>
      <p className="text-foreground leading-relaxed">{children}</p>
    </div>
  )
}

function DiagramaDuasSalas() {
  return (
    <div className="border border-border rounded-md bg-muted p-4 sm:p-6 my-2">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
        <div className="bg-background border border-border rounded-md p-4 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-primary">
            Sala 1 — Validação
          </p>
          <p className="text-sm font-mono">eleitores_pesquisa</p>
          <ul className="text-xs text-muted-foreground flex flex-col gap-0.5">
            <li>· hash do CPF</li>
            <li>· município, sexo, idade</li>
            <li>· validado pelo SPC?</li>
            <li>· validado pelo WhatsApp?</li>
            <li className="font-semibold text-foreground">
              · NÃO tem coluna de voto
            </li>
          </ul>
        </div>

        <div className="flex sm:flex-col items-center justify-center gap-2 px-2">
          <span className="text-2xl font-mono text-error/60">╳ ╳ ╳</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">
            sem chave estrangeira
          </span>
        </div>

        <div className="bg-capsule text-capsule-foreground border border-capsule rounded-md p-4 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold">
            Sala 2 — Votação
          </p>
          <p className="text-sm font-mono">tokens_emitidos · votos_pesquisa</p>
          <ul className="text-xs opacity-80 flex flex-col gap-0.5">
            <li>· hash do token aleatório</li>
            <li>· cargo, candidato/partido</li>
            <li>· método: número/branco/não sei</li>
            <li>· hora cheia (sem minuto)</li>
            <li className="font-semibold opacity-100">
              · NÃO tem referência ao CPF
            </li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4 italic">
        A única ponte entre as duas salas é um cookie httpOnly no navegador
        do eleitor. O servidor não persiste essa ponte.
      </p>
    </div>
  )
}


function LinhaFicha({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3 flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {titulo}
      </p>
      <p className="text-sm text-foreground leading-snug">{valor}</p>
    </div>
  )
}
