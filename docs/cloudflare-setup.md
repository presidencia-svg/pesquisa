# Setup Cloudflare — pesquisa.cdlaju.com.br

Guia passo-a-passo pra colocar Cloudflare na frente do Vercel: proxy, WAF,
Geo-block (só Brasil) e Bot Fight Mode.

**Tempo estimado:** 30–60 min de setup + 1–24h de propagação DNS.

## ⚠️ Pré-requisitos críticos

Antes de mexer em qualquer coisa:

1. **Backup dos DNS atuais**. Estado atual (18/jun/2026):
   - **Nameservers** Registro.br: `b.sec.dns.br`, `c.sec.dns.br`
   - **A** `cdlaju.com.br` → `76.76.21.21`
   - **CNAME** `pesquisa.cdlaju.com.br` → `cname.vercel-dns.com`
   - **MX** `cdlaju.com.br` → `smtp.google.com` (prioridade 1)
   - **Outros**: rode `dig cdlaju.com.br ANY` antes de migrar pra ter
     lista completa (TXT SPF/DKIM, etc.)
2. **Acesso ao Registro.br** com login da CDL (pra trocar nameservers)
3. **Acesso ao Google Workspace** caso precise reconfigurar emails

> Email **não pode parar**. Vamos preservar todos os MX/TXT/CNAME do Google
> antes de mudar nameservers.

## Etapa 1 — Criar conta + adicionar zona

1. Vai em https://dash.cloudflare.com e cria conta (login com email da CDL).
2. **Add a Site** → digita `cdlaju.com.br` → seleciona plano **Free** (zero custo).
3. Cloudflare faz **DNS Discovery** automático e importa todos os records
   que conseguir achar via DNS público.
4. **Confira CADA linha** — especialmente:
   - **A `cdlaju.com.br`** → `76.76.21.21` (nuvem laranja ✅ proxy ligado)
   - **CNAME `pesquisa`** → `cname.vercel-dns.com` (nuvem laranja ✅)
   - **MX `cdlaju.com.br`** → `smtp.google.com` priority 1 (☁️ **CINZA** — DNS only)
   - **TXT SPF** `v=spf1 include:_spf.google.com ~all` (cinza)
   - **TXT DKIM** se houver (cinza)
   - **CNAME DKIM** Google Workspace (cinza)
5. **Adicione manualmente** o que faltar (compara com `dig cdlaju.com.br ANY`).

> **Regra de ouro**: emails (MX, SPF, DKIM, DMARC) ficam **CINZA** (DNS only).
> Cloudflare proxy só pra HTTP/HTTPS. Se proxyar MX, **email para**.

## Etapa 2 — SSL/TLS

1. **SSL/TLS** → **Overview** → modo **Full (strict)** (não use Flexible).
   - Vercel já serve HTTPS válido na origem, então Full strict funciona.
2. **Edge Certificates** → **Always Use HTTPS** = ON
3. **Edge Certificates** → **Automatic HTTPS Rewrites** = ON
4. **Edge Certificates** → **TLS 1.3** = ON, mín **TLS 1.2**

## Etapa 3 — Mudar nameservers no Registro.br

⚠️ **Esse é o ponto de não-retorno**. Depois de mudar nameservers, Cloudflare
passa a controlar DNS. Erro aqui = email/site quebrado por horas.

1. Cloudflare mostra os nameservers atribuídos (algo como
   `bree.ns.cloudflare.com` e `marcus.ns.cloudflare.com`).
2. Entra em https://registro.br → login da CDL → cdlaju.com.br → **DNS**.
3. Substitui `b.sec.dns.br` e `c.sec.dns.br` pelos da Cloudflare.
4. Salva.

**Propagação:** 1–24h. Site continua funcionando durante propagação (DNS antigo
e novo coexistem). Use https://dnschecker.org/#NS/cdlaju.com.br pra acompanhar.

## Etapa 4 — Ajustes pós-propagação no Cloudflare

Depois que Cloudflare aparecer como autoritativo (24h max):

### 4.1 Security → WAF (Managed Rules)

1. **Security → WAF** → **Managed Rules** → habilita:
   - **Cloudflare Free Managed Ruleset** = ON
   - Mantém ações default (block/challenge conforme severity).

### 4.2 Security → Bots

1. **Security → Bots** → **Bot Fight Mode** = ON (Free).
   - Detecta bot scraping via machine learning Cloudflare.
   - Não bloqueia bots conhecidos legítimos (Google, Bing, etc.).

### 4.3 Security → WAF → Custom rules (Geo-block)

Cria 1 rule:

- **Rule name:** `Geo-block: bloquear não-BR`
- **Expression:** `(ip.geoip.country ne "BR")`
- **Action:** `Block`
- **Order:** primeiro (top)
- **Deploy** → enable

> Isso bloqueia 90%+ do bot scraping (geralmente vem de DC nos EUA/Europa).
> Eleitores em Sergipe não são afetados.

> Se você for viajar pro exterior e quiser testar, cria exceção pelo IP:
> `(ip.geoip.country ne "BR" and ip.src ne 203.0.113.45)`

### 4.4 Security → DDoS

- **HTTP DDoS Attack Protection** → mantém **High** sensitivity (default).
- **Network-layer DDoS Protection** → automático no plano Free.

### 4.5 Caching

⚠️ Vercel já faz cache. Não duplique cache no Cloudflare pra rotas dinâmicas.

1. **Caching → Configuration → Caching Level** = `Standard`
2. **Browser Cache TTL** = `Respect Existing Headers`
3. **Caching → Cache Rules** → cria rule:
   - **Name:** `No cache /votar /admin`
   - **Expression:** `(http.request.uri.path contains "/votar") or (http.request.uri.path contains "/admin") or (http.request.uri.path contains "/api")`
   - **Action:** `Bypass cache`
   - Garante que Server Actions, OTP, voto, admin nunca caem em cache.

## Etapa 5 — Validação

Depois que CF assumir DNS, teste cada caminho:

| Teste | Esperado |
|---|---|
| `curl -I https://pesquisa.cdlaju.com.br` | Header `cf-ray: ...` presente |
| `dig pesquisa.cdlaju.com.br` | Resolve pra IP Cloudflare (104.x.x.x ou 172.x.x.x) |
| Abre `/votar` em VPN dos EUA | Bloqueado (Geo-block) |
| Abre `/votar` no Brasil | Funciona, completa o fluxo |
| Envia email pra `presidencia@cdlaju.com.br` | Chega normalmente (Google Workspace) |
| Vê headers em `/admin/auditoria` após votar | `cf-connecting-ip` é o IP real |

O código já está pronto pra isso (ver [lib/ip.ts](../lib/ip.ts)). Quando
Cloudflare envia `cf-connecting-ip`, o app prioriza esse header sobre
`x-forwarded-for`. Auditoria mostra IP do cliente original, não do edge.

## Etapa 6 — Allowlist no Vercel (opcional, mas recomendado)

Pra impedir que alguém descubra o IP origem do Vercel (76.76.21.142) e
atinja direto, bypassando Cloudflare:

1. Vercel Dashboard → projeto pesquisa-sergipe-2026 → **Settings → Firewall**.
2. Adiciona rule: `Allow` apenas IPs do **Cloudflare** (lista oficial em
   https://www.cloudflare.com/ips/).
3. `Block` todo o resto.

⚠️ Esse passo é **avançado**. Se errar, derruba o próprio acesso ao painel.
Faça por último, depois de tudo funcionando.

## Rollback (se algo der errado)

Se email parar de funcionar ou site cair:

1. Volta no Registro.br
2. Troca nameservers de volta pra `b.sec.dns.br`, `c.sec.dns.br`
3. Propaga em 1–4h
4. Reabre o ticket no Cloudflare pra investigar

Mantém Cloudflare como standby — não precisa apagar a zona.

## Custo

| Item | Custo |
|---|---|
| Plano Free | R$ 0 |
| WAF Managed Rules | Incluso |
| Bot Fight Mode | Incluso |
| Geo-block via Custom Rules | Incluso |
| Tráfego | Ilimitado |
| **Total** | **R$ 0/mês** |

Quando ultrapassar 1M req/dia ou precisar de Bot Management ML avançado,
upgrade pra Pro ($25/mês). Pra essa pesquisa, Free é mais que suficiente.

## Pra defender publicamente

> "A Pesquisa Sergipe 2026 roda atrás de proxy Cloudflare com WAF ativo,
> Bot Fight Mode e bloqueio geográfico (apenas Brasil). Cada requisição
> passa por verificação anti-DDoS no edge antes de chegar à aplicação,
> que ainda valida o eleitor com Turnstile + CPF + WhatsApp OTP +
> fingerprint de dispositivo."

Argumento forte pra TRE/imprensa/patrocinador Diamante.
