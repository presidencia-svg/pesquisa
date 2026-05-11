#!/usr/bin/env tsx
/**
 * Testa a credencial SPC direto do terminal, fora da Vercel.
 *
 * Le SPC_USER, SPC_PASSWORD, SPC_AMBIENTE do .env.local e faz uma
 * chamada de consulta cadastral pra um CPF de teste. Imprime status
 * HTTP + corpo da resposta — assim a gente sabe se o problema e' nas
 * credenciais, na URL, no produto SPC, ou no IP/rede da Vercel.
 *
 * Uso:
 *   npm run spc:test -- 12345678901
 *
 * (substitua pelo CPF que voce quer testar; um CPF real ajuda — ou
 * o seu mesmo, que voce confia que existe na base SPC.)
 */
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

const cpf = (process.argv[2] ?? '').replace(/\D/g, '')
if (!/^\d{11}$/.test(cpf)) {
  console.error('❌ Uso: npm run spc:test -- <CPF de 11 digitos>')
  process.exit(1)
}

const ambiente = process.env.SPC_AMBIENTE ?? 'producao'
const user = process.env.SPC_USER
const senha = process.env.SPC_PASSWORD

if (!user || !senha) {
  console.error('❌ SPC_USER ou SPC_PASSWORD ausente no .env.local')
  console.error('   Cole os mesmos valores que estao na Vercel.')
  process.exit(1)
}

const baseUrl =
  ambiente === 'producao'
    ? (process.env.SPC_API_URL ??
        'https://api.spcbrasil.com.br/spc/remoting/rest/consultaCadastral')
    : (process.env.SPC_API_URL_HOMOLOG ??
        'https://treinamento.spcbrasil.com.br/spc/remoting/rest/consultaCadastral')

const url = `${baseUrl.replace(/\/+$/, '')}/cpf/${cpf}/1`
const auth = Buffer.from(`${user}:${senha}`).toString('base64')

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Teste SPC')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Ambiente:', ambiente)
console.log('  URL:     ', url.replace(cpf, '***********'))
console.log('  Usuario: ', user.slice(0, 3) + '***' + ' (len=' + user.length + ')')
console.log('  Senha:   ', '*'.repeat(senha.length) + ' (len=' + senha.length + ')')
console.log('')

const res = await fetch(url, {
  method: 'GET',
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
  },
})

console.log('  HTTP:    ', res.status, res.statusText)
console.log('  Headers:')
for (const [k, v] of res.headers.entries()) {
  console.log('    ', k + ':', v)
}
console.log('')

const text = await res.text()
console.log('  Body (primeiros 800 chars):')
console.log('  ' + text.slice(0, 800).replace(/\n/g, '\n  '))
console.log('')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

if (res.status === 200) {
  console.log('✅ Credencial valida. Problema deve estar no env var da Vercel.')
} else if (res.status === 401 || res.status === 403) {
  console.log('❌ Credencial rejeitada pelo SPC.')
  console.log('   Confere se SPC_USER e SPC_PASSWORD batem com o Melhores.')
} else if (res.status === 404) {
  console.log('⚠️  URL ou CPF nao encontrado. Verificar SPC_API_URL.')
} else {
  console.log('⚠️  Resposta inesperada — leia o body acima.')
}
