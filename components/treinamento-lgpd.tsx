'use client'

/**
 * Modal de treinamento LGPD que aparece no PRIMEIRO ACESSO de cada
 * sessao do navegador admin. 5 slides ilustrativos cobrindo:
 *   1. Por que LGPD importa pra pesquisa eleitoral
 *   2. As 2 salas (arquitetura de anonimato)
 *   3. Dados que voce admin ve e o que pode/nao pode fazer
 *   4. Como reagir se titular pedir exclusao/acesso
 *   5. Plano de incidente — quando acionar DPO
 *
 * Estado: localStorage 'lgpd_training_v1'. Quando atualizar conteudo,
 * bumpar pra v2 → todos os admins reveem.
 *
 * Esta e' a versao 1.
 */
import { useEffect, useState } from 'react'

const VERSAO = 'lgpd_training_v1'

type Slide = {
  titulo: string
  icone: string
  conteudo: React.ReactNode
}

const SLIDES: Slide[] = [
  {
    titulo: 'Por que a LGPD importa aqui',
    icone: '⚖️',
    conteudo: (
      <>
        <p className="leading-relaxed">
          A Lei Geral de Proteção de Dados (Lei 13.709/2018) regula
          como tratamos dados pessoais. <strong>Pesquisa eleitoral é
          campo sensível</strong> — opinião política está entre os
          dados protegidos.
        </p>
        <p className="leading-relaxed">
          A CDL Aracaju é a <strong>controladora</strong> dos dados
          aqui. Você, como administrador, é quem opera o tratamento.
          Suas decisões na ferramenta têm efeito legal direto.
        </p>
        <p className="leading-relaxed text-sm text-muted-foreground">
          <strong>Consequência prática:</strong> erros aqui podem
          resultar em multa da ANPD (até 2% do faturamento da CDL,
          limitado a R$ 50 milhões), além de prejuízo reputacional. Por
          isso esse treinamento existe.
        </p>
      </>
    ),
  },
  {
    titulo: 'Como o sistema protege o sigilo do voto',
    icone: '🔐',
    conteudo: (
      <>
        <p className="leading-relaxed">
          O sistema usa <strong>duas tabelas separadas sem ponte
          persistida</strong>:
        </p>
        <div className="grid grid-cols-2 gap-3 my-2">
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              SALA 1 · eleitores_pesquisa
            </p>
            <p className="font-mono text-xs">
              cpf_hash, demograficos,
              <br />
              ip, user_agent
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              SEM voto
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              SALA 2 · votos_pesquisa
            </p>
            <p className="font-mono text-xs">
              token_hash,
              <br />
              voto, hora truncada
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              SEM CPF
            </p>
          </div>
        </div>
        <p className="leading-relaxed text-sm">
          A única ponte é um <strong>token aleatório no cookie do
          navegador</strong> do eleitor — destruído ao fim da votação.
          O servidor não persiste a ligação.
        </p>
        <p className="leading-relaxed text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <strong>Importante:</strong> nem você, admin, consegue saber
          em quem alguém votou. Mesmo abrindo o banco no SQL Editor do
          Supabase, as duas salas não se conectam.
        </p>
      </>
    ),
  },
  {
    titulo: 'O que você pode (e não pode) fazer',
    icone: '✋',
    conteudo: (
      <>
        <p className="font-semibold text-foreground">
          ✅ Você pode:
        </p>
        <ul className="list-disc pl-5 leading-relaxed text-sm flex flex-col gap-1">
          <li>Ver agregados de resultados em /admin/resultados</li>
          <li>Cadastrar/desativar candidatos</li>
          <li>Marcar candidatos como sub-judice</li>
          <li>
            Divulgar resultados publicamente (com registro TRE/SE
            preenchido)
          </li>
          <li>Ajustar configuração de turno (1º/2º)</li>
        </ul>
        <p className="font-semibold text-foreground mt-3">
          🚫 Você NÃO deve:
        </p>
        <ul className="list-disc pl-5 leading-relaxed text-sm flex flex-col gap-1">
          <li>
            <strong>Compartilhar sua senha ou TOTP com ninguém</strong>{' '}
            — nem outro membro da CDL
          </li>
          <li>
            <strong>Tirar print de tela mostrando WhatsApp ou IP de
            eleitores</strong>
          </li>
          <li>
            <strong>Acessar o painel de uma rede Wi-Fi pública</strong>
          </li>
          <li>
            <strong>Logar de um computador compartilhado</strong>{' '}
            (cybercafé, computador da família)
          </li>
          <li>
            <strong>Divulgar resultados antes do registro PesqEle</strong>{' '}
            (5 dias mínimos — Resolução TSE 23.747/2026)
          </li>
        </ul>
      </>
    ),
  },
  {
    titulo: 'Quando o titular reclamar',
    icone: '💬',
    conteudo: (
      <>
        <p className="leading-relaxed">
          A LGPD dá ao eleitor 8 direitos (art. 18). Os mais comuns que
          você vai ver:
        </p>
        <ul className="list-disc pl-5 leading-relaxed text-sm flex flex-col gap-2 my-2">
          <li>
            <strong>&ldquo;Excluam meus dados&rdquo;</strong> — encaminha
            ao endpoint{' '}
            <code className="font-mono text-xs bg-muted px-1">
              /privacidade/excluir
            </code>{' '}
            (self-service, ele mesmo faz).
          </li>
          <li>
            <strong>&ldquo;Quais dados vocês têm sobre mim?&rdquo;</strong>{' '}
            — encaminhe ao DPO. Resposta deve sair em até 15 dias úteis
            (Art. 19 LGPD).
          </li>
          <li>
            <strong>
              &ldquo;Não consenti, quem autorizou isso?&rdquo;
            </strong>{' '}
            — confirme que houve checkbox em /votar. Se contestado,
            DPO trata e pode oferecer exclusão.
          </li>
        </ul>
        <p className="leading-relaxed text-sm bg-blue-50 border border-blue-200 rounded px-3 py-2 text-blue-900">
          📧 <strong>Sempre encaminhe ao DPO:</strong>{' '}
          dpo@cdlaju.com.br. Você não responde diretamente em nome da
          CDL — só o DPO tem essa atribuição.
        </p>
      </>
    ),
  },
  {
    titulo: 'Se algo der errado — Plano de Incidente',
    icone: '🚨',
    conteudo: (
      <>
        <p className="leading-relaxed">
          Se você desconfiar de qualquer coisa anormal:
        </p>
        <ul className="list-disc pl-5 leading-relaxed text-sm flex flex-col gap-2 my-2">
          <li>Login estranho que você não fez</li>
          <li>Resultado que mudou sem motivo</li>
          <li>Eleitor reclamando que &ldquo;alguém votou no nome dele&rdquo;</li>
          <li>Mensagem da ANPD, TRE/SE ou um pesquisador externo</li>
          <li>Alerta automático ou erro repetido nos logs</li>
        </ul>
        <p className="font-semibold leading-relaxed">
          ⏱️ Comunique o DPO em até 1 hora.
        </p>
        <div className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm leading-relaxed">
          <p className="font-semibold text-error">
            Contato emergencial 24/7:
          </p>
          <ul className="list-none pl-0 mt-1">
            <li>📱 WhatsApp DPO: (79) _____-_____</li>
            <li>📱 WhatsApp Presidente CDL: (79) _____-_____</li>
            <li>📧 dpo@cdlaju.com.br</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          O DPO decide se aciona o Comitê de Resposta a Incidente (CRI).
          Não tente resolver sozinho — coleta de evidência feita errada
          atrapalha a investigação. Documento completo:{' '}
          <a
            href="https://github.com/presidencia-svg/pesquisa/blob/main/docs/plano-incidente.md"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            docs/plano-incidente.md
          </a>
          .
        </p>
      </>
    ),
  },
]

export function TreinamentoLgpd() {
  const [visivel, setVisivel] = useState(false)
  const [slide, setSlide] = useState(0)
  const [aceito, setAceito] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const visto = window.localStorage.getItem(VERSAO)
    if (!visto) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisivel(true)
    }
  }, [])

  if (!visivel) return null

  const total = SLIDES.length
  const eUltimo = slide === total - 1
  const proximo = () => {
    if (eUltimo) return
    setSlide((s) => s + 1)
  }
  const anterior = () => {
    if (slide === 0) return
    setSlide((s) => s - 1)
  }
  const concluir = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VERSAO, new Date().toISOString())
    }
    setVisivel(false)
  }

  const s = SLIDES[slide]

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-background border border-border rounded-md flex flex-col gap-5 my-4 sm:my-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              {s.icone}
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-accent font-semibold">
                Treinamento LGPD · {slide + 1} de {total}
              </p>
              <h2 className="text-lg sm:text-xl font-bold leading-tight">
                {s.titulo}
              </h2>
            </div>
          </div>
        </div>

        {/* Conteudo */}
        <div className="px-5 sm:px-6 flex flex-col gap-3 text-sm sm:text-base text-foreground">
          {s.conteudo}
        </div>

        {/* Progress bar */}
        <div className="px-5 sm:px-6">
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${((slide + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Aceite (no último slide) */}
        {eUltimo && (
          <div className="px-5 sm:px-6">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={aceito}
                onChange={(e) => setAceito(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-none"
              />
              <span className="leading-snug text-foreground">
                Li e entendi as orientações de tratamento de dados desta
                pesquisa. Comprometo-me a seguir o procedimento e
                contatar o DPO em caso de qualquer incidente.
              </span>
            </label>
          </div>
        )}

        {/* Botões */}
        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={anterior}
            disabled={slide === 0}
            className="h-10 px-4 rounded-md border border-border text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition"
          >
            ← Anterior
          </button>
          <div className="flex gap-1">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition ${
                  i === slide
                    ? 'bg-accent'
                    : i < slide
                      ? 'bg-foreground/40'
                      : 'bg-border'
                }`}
              />
            ))}
          </div>
          {!eUltimo ? (
            <button
              type="button"
              onClick={proximo}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              Próximo →
            </button>
          ) : (
            <button
              type="button"
              onClick={concluir}
              disabled={!aceito}
              className="h-10 px-4 rounded-md bg-accent text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              Concluir treinamento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
