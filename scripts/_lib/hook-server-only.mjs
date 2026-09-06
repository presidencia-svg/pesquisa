import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'
const stub = pathToFileURL(new URL('./server-only-stub.js', import.meta.url).pathname).href
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'server-only') return { url: stub, shortCircuit: true }
    return next(specifier, context)
  },
})
