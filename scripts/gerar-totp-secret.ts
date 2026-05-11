#!/usr/bin/env tsx
/**
 * Gera um segredo TOTP novo pro admin (Google Authenticator etc).
 *
 * Saida:
 *   1. Segredo Base32 pra colar no .env.local (ADMIN_TOTP_SECRET=...)
 *      e na Vercel (Settings → Environment Variables).
 *   2. URL otpauth:// que voce escaneia como QR no app.
 *
 * Como cadastrar no app:
 *   a) Abre Google Authenticator (ou Authy / 1Password / Microsoft
 *      Authenticator — qualquer um TOTP padrao funciona).
 *   b) Adiciona conta nova → "Inserir chave de configuracao".
 *   c) Nome da conta: "Pesquisa SE 2026". Chave: o segredo abaixo.
 *      Tipo: Tempo (TOTP), nao Contador (HOTP).
 *   d) OU: cola a URL otpauth:// num gerador de QR (ex.: qr-code-
 *      generator.com) e escaneia.
 *
 * Apos colocar no .env e no Vercel, o login admin passa a exigir
 * senha + codigo de 6 digitos.
 *
 * Rodar:
 *   npm run totp:setup
 */
import { randomBytes } from 'node:crypto'

import { base32Encode, otpauthUrl } from '../lib/totp-core'

const ISSUER = 'Pesquisa SE 2026'
const ACCOUNT = 'admin@cdlaju'

function main() {
  // 20 bytes (160 bits) = 32 chars Base32 — recomendacao da RFC 4226
  const secret = base32Encode(randomBytes(20))
  const url = otpauthUrl({
    secretBase32: secret,
    issuer: ISSUER,
    accountName: ACCOUNT,
  })

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  TOTP / Google Authenticator — segredo novo')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('1) Cole no .env.local e na Vercel:')
  console.log('')
  console.log(`   ADMIN_TOTP_SECRET=${secret}`)
  console.log('')
  console.log('2) Cadastre no app (manual ou via QR):')
  console.log('')
  console.log(`   ${url}`)
  console.log('')
  console.log('   • Manual: Google Authenticator → "Inserir chave"')
  console.log(`     - Conta: ${ACCOUNT}`)
  console.log(`     - Chave: ${secret}`)
  console.log('     - Tipo: Tempo (TOTP)')
  console.log('')
  console.log('   • QR: cola a URL otpauth:// acima em um gerador de QR')
  console.log('     (ex.: https://qrcode.show/) e escaneia.')
  console.log('')
  console.log('3) Apos atualizar Vercel, faz o re-deploy e testa o login.')
  console.log('   Se o codigo nao bater, conferir o relogio do celular.')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
}

main()
