'use client'

/**
 * Botão flutuante "Imprimir / Salvar PDF".
 *
 * Aparece só na tela (não vai pra impressão por causa do CSS @media print
 * que esconde .botao-imprimir-wrapper). Ao clicar, abre o diálogo nativo
 * do browser onde o usuário escolhe "Salvar como PDF" como destino.
 *
 * Não usamos lib de geração de PDF (puppeteer, pdfkit, react-pdf) por
 * dois motivos:
 *   1. Zero dependência nova além da `qrcode` (já minúscula)
 *   2. O diálogo nativo do browser dá ao usuário controle sobre layout,
 *      orientação, margens — útil se a TV pedir um formato específico
 */

export function BotaoImprimir() {
  return (
    <div className="botao-imprimir-wrapper">
      <button
        type="button"
        onClick={() => window.print()}
        className="botao-imprimir"
      >
        🖨️ Imprimir / Salvar PDF
      </button>
      <p className="botao-imprimir-hint">
        No diálogo do browser, escolha <strong>&quot;Salvar como PDF&quot;</strong>{' '}
        em &quot;Destino&quot;
      </p>
    </div>
  )
}
