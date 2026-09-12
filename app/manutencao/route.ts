/**
 * Página servida pelo proxy.ts quando a chave de lib/site-desabilitado.ts está ligada.
 * Responde 503 (temporário) e não pode ser cacheada. Sem números, sem links
 * para resultado — só o aviso de que a divulgação está suspensa.
 */
const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Pesquisa Eleitoral Sergipe 2026 · temporariamente indisponível</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a2a6e;color:#fff;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  main{max-width:560px;padding:40px 28px;text-align:center}
  img{width:180px;max-width:60%;margin-bottom:28px}
  h1{font-size:1.5rem;margin:0 0 12px}
  p{margin:0 0 12px;opacity:.92}
  small{display:block;margin-top:24px;opacity:.7;font-size:.85rem}
</style>
</head>
<body>
<main>
  <img src="/cdl-pesquisas-logo.png" alt="CDL Pesquisas">
  <h1>Site temporariamente indisponível</h1>
  <p>A divulgação dos resultados da Pesquisa Eleitoral Sergipe 2026 está suspensa, sob apreciação judicial (TRE-SE), até nova ordem.</p>
  <p>Nenhum resultado está sendo exibido nesta página ou em qualquer outra deste endereço.</p>
  <small>Pesquisa Eleitoral Sergipe 2026 · CDL Aracaju</small>
</main>
</body>
</html>`

export function GET() {
  return new Response(HTML, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '3600',
    },
  })
}
