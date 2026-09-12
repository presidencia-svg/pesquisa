// Diagnóstico da resposta do SPC (API nova, POST /spcconsulta/recurso/consulta/padrao):
// mostra QUAIS campos vieram em consumidorPessoaFisica e o valor bruto de `sexo`,
// para confirmar por que ~22% dos respondentes ficaram sem sexo.
//
// Uso (CPF do próprio operador ou de titular que consentiu; nada é gravado):
//   node --env-file=.env.local scripts/spc-diagnostico-sexo.mjs 00000000000
//
// Imprime apenas: status HTTP, ambiente, produto, lista de chaves (caminhos) da resposta,
// valor e tipo de `sexo` e qualquer chave cujo nome contenha "sex" ou "gener".
// NÃO imprime nome, nome da mãe, CPF, data de nascimento nem qualquer valor além de `sexo`.
import { argv, env, exit } from 'node:process'

const cpf = (argv[2] ?? '').replace(/\D/g, '')
if (!/^\d{11}$/.test(cpf)) { console.error('informe o CPF (11 dígitos) como argumento'); exit(2) }
const user = env.SPC_USER, senha = env.SPC_PASSWORD
if (!user || !senha) { console.error('SPC_USER/SPC_PASSWORD ausentes no ambiente'); exit(2) }
const ambiente = env.SPC_AMBIENTE ?? 'producao'
const url = ambiente === 'producao'
  ? (env.SPC_API_URL_NOVA ?? 'https://api.spcbrasil.com.br/spcconsulta/recurso/consulta/padrao')
  : (env.SPC_API_URL_NOVA_HOMOLOG ?? 'https://treinamento.spcbrasil.com.br/spcconsulta/recurso/consulta/padrao')
const produto = env.SPC_CODIGO_PRODUTO_NOVO ?? '11'

const auth = Buffer.from(`${user}:${senha}`).toString('base64')
const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ codigoProduto: produto, tipoConsumidor: 'F', documentoConsumidor: cpf, codigoInsumoOpcional: [] }),
})
console.log(`ambiente=${ambiente} produto=${produto} http=${res.status}`)
let data
try { data = await res.json() } catch { console.log('resposta não-JSON'); exit(1) }

// Caminhos de todas as chaves (sem valores), até 6 níveis
const caminhos = []
const andar = (o, pre, prof) => {
  if (!o || typeof o !== 'object' || prof > 6) return
  for (const [k, v] of Object.entries(o)) {
    const c = pre ? `${pre}.${k}` : k
    caminhos.push(c)
    if (v && typeof v === 'object' && !Array.isArray(v)) andar(v, c, prof + 1)
  }
}
andar(data, '', 0)
console.log('chaves da resposta:'); for (const c of caminhos) console.log('  ' + c)

const pf = data?.result?.return_object?.resultado?.consumidor?.consumidorPessoaFisica
console.log('consumidorPessoaFisica presente:', Boolean(pf))
if (pf) {
  console.log('sexo bruto:', JSON.stringify(pf.sexo), 'tipo:', typeof pf.sexo)
  console.log('tem idade:', typeof pf.idade === 'number', '| tem dataNascimento:', pf.dataNascimento != null)
  console.log('mapeamento da plataforma:', pf.sexo === 'FEMININO' ? 'F' : pf.sexo === 'MASCULINO' ? 'M' : 'NULO (valor não reconhecido ou ausente)')
}
const relacionadas = caminhos.filter((c) => /sex|gener/i.test(c.split('.').pop() ?? ''))
console.log('chaves relacionadas a sexo/gênero em qualquer nível:', relacionadas.length ? relacionadas.join(', ') : '(nenhuma além das acima)')
if (data?.message) console.log('message:', String(data.message).slice(0, 200))
