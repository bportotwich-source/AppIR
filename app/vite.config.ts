import { readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Gera o sw.js com a lista de arquivos do build, para o app abrir sem internet.
 *
 * Arquivos com hash no nome vêm do cache; a página em si tenta a rede primeiro,
 * para a versão nova chegar assim que houver internet.
 */
function servicoOffline(): Plugin {
  return {
    name: 'meu-mei-offline',
    apply: 'build',
    generateBundle(_, bundle) {
      const arquivos = ['./', ...Object.keys(bundle), ...readdirSync('public')].filter((f) => f !== 'sw.js').map((f) => (f === './' ? f : `./${f}`))
      const versao = createHash('sha256').update(arquivos.join('\n')).digest('hex').slice(0, 12)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `// Gerado no build (vite.config.ts).
const CACHE = 'meu-mei-${versao}'
const ARQUIVOS = ${JSON.stringify(arquivos)}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('meu-mei-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('./', copia)); return r })
        .catch(() => caches.match('./')),
    )
    return
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)))
})
`,
      })
    },
  }
}

// base relativa: o mesmo build funciona no GitHub Pages (/AppIR/) e em localhost.
export default defineConfig({
  base: './',
  plugins: [react(), servicoOffline()],
  server: { fs: { allow: ['..'] } },
})
