/**
 * Acesso tipado a variaveis de ambiente.
 *
 * Nomes alinhados com o projeto irmao "Melhores do Ano" pra permitir
 * reuso direto de credenciais (Meta WhatsApp Cloud API, SPC Brasil) sem
 * retrabalho. Quando um nome novo aparecer aqui, espelha-se no
 * .env.example.
 *
 * Importar este modulo a partir de um Client Component pode vazar valores
 * privados pro bundle do navegador. Fica protegido por get/lazy abaixo.
 */

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Variavel de ambiente ${name} nao definida. Veja .env.example.`,
    )
  }
  return value
}

const optional = (name: string, fallback = ''): string =>
  process.env[name] ?? fallback

/**
 * `DEV_MODE=true` em .env.local ativa stubs locais (SPC e WhatsApp viram
 * no-ops que sempre validam, OTP volta no log do servidor). Em producao
 * (Vercel) deve ser explicitamente `false` ou ausente.
 */
export const DEV_MODE = process.env.DEV_MODE === 'true'

/**
 * Variaveis publicas — disponiveis no bundle do navegador.
 */
export const PUBLIC_ENV = {
  SUPABASE_URL: required('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  TURNSTILE_SITE_KEY: optional('NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
} as const

/**
 * Variaveis privadas — server-only. Lazy-evaluated pra que importar este
 * arquivo num client component nao quebre o build, mas sim no momento do
 * primeiro acesso (que so deve acontecer no servidor).
 */
export const SERVER_ENV = {
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required('SUPABASE_SERVICE_ROLE_KEY')
  },
  get CPF_HASH_SECRET() {
    return required('CPF_HASH_SECRET')
  },
  get TOKEN_VOTO_SECRET() {
    return required('TOKEN_VOTO_SECRET')
  },

  // ─── SPC Brasil (nomes do Melhores do Ano) ────────────────────────────
  get SPC_AMBIENTE() {
    // Default = producao (este projeto e' real, nao sandbox).
    // Pra rodar contra homologacao, setar SPC_AMBIENTE=homologacao no .env.
    return optional('SPC_AMBIENTE', 'producao') as 'homologacao' | 'producao'
  },
  /**
   * Base da API SPC JUD pra consulta cadastral. O codigo apenda
   * `/cpf/{CPF}/1` na hora da chamada. Sobrescreva no .env.local se a
   * URL real do contrato for diferente (ex.: outro path, outro produto).
   */
  get SPC_API_URL() {
    return optional(
      'SPC_API_URL',
      'https://api.spcbrasil.com.br/spc/remoting/rest/consultaCadastral',
    )
  },
  get SPC_API_URL_HOMOLOG() {
    return optional(
      'SPC_API_URL_HOMOLOG',
      'https://treinamento.spcbrasil.com.br/spc/remoting/rest/consultaCadastral',
    )
  },
  get SPC_USER() {
    return optional('SPC_USER')
  },
  get SPC_PASSWORD() {
    return optional('SPC_PASSWORD')
  },
  get SPC_CODIGO_PRODUTO() {
    return optional('SPC_CODIGO_PRODUTO', '11')
  },
  /**
   * Quando 'true', a aplicação usa a API REST nova da SPC
   * (`/spcconsulta/recurso/consulta/padrao` POST) em vez da SPC JUD
   * legada (`/spc/remoting/rest/consultaCadastral` GET).
   *
   * A API nova retorna estrutura aninhada com situacaoCpf,
   * dataNascimento (epoch ms), idade direta — mais robusto.
   */
  get SPC_USAR_API_NOVA() {
    return process.env.SPC_USAR_API_NOVA === 'true'
  },
  /** URL da API nova (POST /spcconsulta/recurso/consulta/padrao). */
  get SPC_API_URL_NOVA() {
    return optional(
      'SPC_API_URL_NOVA',
      'https://api.spcbrasil.com.br/spcconsulta/recurso/consulta/padrao',
    )
  },
  get SPC_API_URL_NOVA_HOMOLOG() {
    return optional(
      'SPC_API_URL_NOVA_HOMOLOG',
      'https://treinamento.spcbrasil.com.br/spcconsulta/recurso/consulta/padrao',
    )
  },
  /**
   * codigoProduto usado na API nova. Recomendados pra fluxo de
   * cadastro eleitor (precisa apenas de nome + data nascimento +
   * situação CPF):
   *   11  CONFIRME PF        — mais barato, traz CPF básico + status RF
   *   222 CONFIRME PF RF     — com receita federal explícita
   *   320 CONSULTA COMPLETA  — mais cara, todos os insumos
   *   479 CONSULTA CPF SPC   — padrão consulta cadastral
   * Default '11' (CONFIRME PF) — suficiente pro nosso caso.
   */
  get SPC_CODIGO_PRODUTO_NOVO() {
    return optional('SPC_CODIGO_PRODUTO_NOVO', '11')
  },
  get SPC_MOCK() {
    return process.env.SPC_MOCK === 'true'
  },

  // ─── Meta WhatsApp Cloud API (nomes do Melhores do Ano) ───────────────
  get META_WHATSAPP_TOKEN() {
    return optional('META_WHATSAPP_TOKEN')
  },
  /** CSV de phone_number_ids. O cliente faz round-robin entre eles. */
  get META_WHATSAPP_PHONE_IDS() {
    return optional('META_WHATSAPP_PHONE_IDS')
  },
  get META_API_VERSION() {
    return optional('META_API_VERSION', 'v21.0')
  },
  /** Nome do template Meta de OTP (categoria AUTHENTICATION) aprovado pra esta pesquisa. */
  get META_TEMPLATE_OTP() {
    return optional('META_TEMPLATE_OTP', 'otp_pesquisa_sergipe')
  },
  /** Idioma do template Meta (ex.: 'pt_BR'). */
  get META_TEMPLATE_OTP_LANG() {
    return optional('META_TEMPLATE_OTP_LANG', 'pt_BR')
  },
  /** Template Meta (categoria UTILITY) pro envio de resultado consolidado. */
  get META_TEMPLATE_RESULTADO() {
    return optional('META_TEMPLATE_RESULTADO', 'resultado_pesquisa_sergipe')
  },

  // ─── Cloudflare Turnstile ─────────────────────────────────────────────
  get TURNSTILE_SECRET_KEY() {
    return optional('TURNSTILE_SECRET_KEY')
  },

  // ─── Admin ────────────────────────────────────────────────────────────
  get ADMIN_PASSWORD() {
    return required('ADMIN_PASSWORD')
  },
  /**
   * Segredo TOTP em Base32 pra 2FA do admin (Google Authenticator).
   * Se ausente, login usa so' senha. Gerar via `npm run totp:setup`.
   */
  get ADMIN_TOTP_SECRET() {
    return optional('ADMIN_TOTP_SECRET')
  },
  get JWT_SECRET() {
    return required('JWT_SECRET')
  },

  // ─── Cron (Vercel Scheduled Functions) ────────────────────────────────
  /**
   * Segredo compartilhado pra autenticar chamadas a /api/cron/* fora do
   * runtime de cron da Vercel. Em produção, Vercel injeta automaticamente
   * o cabeçalho `vercel-cron` que dispensa esse segredo — mas usar Bearer
   * permite acionar manualmente (curl/admin) sem expor o endpoint.
   */
  get CRON_SECRET() {
    return optional('CRON_SECRET')
  },
} as const
