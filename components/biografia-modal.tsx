'use client'

/**
 * Modal de biografia. Recebe nome + partido (pra ajudar desambiguação)
 * e busca em /api/biografia. Renderiza extrato, foto e link pra Wikipedia.
 *
 * Estados: loading | sucesso | nao_encontrado | erro
 */

import { useEffect, useState } from 'react'

type Bio = {
  titulo: string
  extrato: string
  thumbnail: string | null
  url: string | null
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'sucesso'; bio: Bio }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'erro' }

export function BiografiaModal({
  nome,
  partido,
  onClose,
}: {
  nome: string
  partido: string
  onClose: () => void
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })

  useEffect(() => {
    let cancelado = false
    const params = new URLSearchParams({ nome })
    if (partido) params.set('partido', partido)

    fetch(`/api/biografia?${params.toString()}`)
      .then(async (res) => {
        if (cancelado) return
        if (res.status === 404) {
          setEstado({ tipo: 'nao_encontrado' })
          return
        }
        if (!res.ok) {
          setEstado({ tipo: 'erro' })
          return
        }
        const bio = (await res.json()) as Bio
        setEstado({ tipo: 'sucesso', bio })
      })
      .catch(() => {
        if (!cancelado) setEstado({ tipo: 'erro' })
      })

    return () => {
      cancelado = true
    }
  }, [nome, partido])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="bio-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Biografia do candidato"
    >
      <div className="bio-card" onClick={(e) => e.stopPropagation()}>
        <div className="bio-header">
          <div>
            <p className="bio-kicker">Biografia</p>
            <h3 className="bio-title">{nome}</h3>
            <p className="bio-partido">{partido}</p>
          </div>
          <button
            type="button"
            className="bio-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {estado.tipo === 'carregando' && (
          <div className="bio-body">
            <p className="bio-loading">Buscando na Wikipédia…</p>
          </div>
        )}

        {estado.tipo === 'nao_encontrado' && (
          <div className="bio-body">
            <p className="bio-empty">
              Sem biografia disponível na Wikipédia para este candidato.
            </p>
          </div>
        )}

        {estado.tipo === 'erro' && (
          <div className="bio-body">
            <p className="bio-empty">
              Não foi possível consultar a Wikipédia agora. Tente de novo
              em alguns instantes.
            </p>
          </div>
        )}

        {estado.tipo === 'sucesso' && (
          <div className="bio-body">
            {estado.bio.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={estado.bio.thumbnail}
                alt={`Foto de ${nome}`}
                width={120}
                height={120}
                className="bio-thumb"
                loading="lazy"
              />
            )}
            <p className="bio-extrato">{estado.bio.extrato}</p>
            {estado.bio.url && (
              <a
                href={estado.bio.url}
                target="_blank"
                rel="noreferrer"
                className="bio-link"
              >
                Ler o artigo completo na Wikipédia →
              </a>
            )}
            <p className="bio-fonte">
              Fonte: Wikipédia em português, sob licença{' '}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
