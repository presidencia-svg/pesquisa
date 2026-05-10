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
    return optional('SPC_AMBIENTE', 'homologacao') as 'homologacao' | 'producao'
  },
  get SPC_API_URL() {
    return optional(
      'SPC_API_URL',
      'https://api.spcbrasil.com.br/spcconsulta/recurso/consulta/padrao',
    )
  },
  get SPC_API_URL_HOMOLOG() {
    return optional(
      'SPC_API_URL_HOMOLOG',
      'https://treinamento.spcbrasil.com.br/spcconsulta/recurso/consulta/padrao',
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

  // ─── Cloudflare Turnstile ─────────────────────────────────────────────
  get TURNSTILE_SECRET_KEY() {
    return optional('TURNSTILE_SECRET_KEY')
  },

  // ─── Admin ────────────────────────────────────────────────────────────
  get ADMIN_PASSWORD() {
    return required('ADMIN_PASSWORD')
  },
  get JWT_SECRET() {
    return required('JWT_SECRET')
  },
} as const
