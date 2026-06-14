'use client'

export function BotaoImprimirKit() {
  return (
    <div className="kit-botao-wrapper">
      <button
        type="button"
        onClick={() => window.print()}
        className="kit-botao-imprimir"
      >
        🖨️ Imprimir / Salvar PDF
      </button>
      <p className="kit-botao-hint">
        No diálogo do browser, escolha{' '}
        <strong>&quot;Salvar como PDF&quot;</strong> em &quot;Destino&quot;.
      </p>
    </div>
  )
}
