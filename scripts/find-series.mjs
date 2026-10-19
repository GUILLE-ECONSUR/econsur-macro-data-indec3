// Buscador de IDs:  npm run series:find -- "canasta básica total"
const BASE = process.env.SERIES_API_BASE || 'https://apis.datos.gob.ar/series/api'
const q = process.argv.slice(2).join(' ')
if (!q) { console.log('Uso: npm run series:find -- "texto a buscar"'); process.exit(1) }
const j = await (await fetch(`${BASE}/search/?q=${encodeURIComponent(q)}&limit=25`)).json()
for (const it of j.data ?? []) {
  const f = it.field ?? {}
  console.log(`${f.id}\n   ${f.description ?? f.title}\n   ${f.units ?? ''} | frec: ${f.frequency ?? '?'} | hasta: ${f.time_index_end ?? '?'} | ${it.dataset?.title ?? ''}\n`)
}
