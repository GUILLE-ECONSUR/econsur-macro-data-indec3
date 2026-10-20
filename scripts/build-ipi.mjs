// IPI manufacturero mensual (nivel general + divisiones + subclases) desde la API de Series de Tiempo.
// Misma lógica que build-emae.mjs: desestacionalizada oficial para el nivel general y estimación propia
// (descomposición clásica multiplicativa) para divisiones y subclases.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchMonthly, adjustArray, control, gapsOf, ymIdx, idxYm } from './build-emae.mjs'
import { BLOCKS, TOTAL } from './ipi-config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src', 'data', 'ipi.json')
const CACHE = path.join(ROOT, 'data', 'ipi-cache.json')
const OVERRIDES = path.join(ROOT, 'data', 'series-overrides.json')
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
const NOW = (() => { const n = new Date(); return n.getFullYear() * 12 + n.getMonth() })()

// lista plana de filas, en el orden de presentación
const ROWS = [
  { key: 'ipi_total', label: 'IPI manufacturero · nivel general', group: 'Nivel general', level: 0, head: true, id: TOTAL.orig, saId: TOTAL.sa },
  { key: 'ipi_tc', label: 'IPI manufacturero · tendencia-ciclo', group: 'Nivel general', level: 0, head: false, id: TOTAL.tc },
  ...BLOCKS.flatMap((b) => b.rows.map(([label, id, level, head]) => ({ key: slug(label), label, group: b.group, level, head: !!head, id }))),
]
const dup = ROWS.map((r) => r.key).filter((k, i, a) => a.indexOf(k) !== i)
if (dup.length) throw new Error('claves duplicadas en ipi-config: ' + dup.join(', '))

// pool de concurrencia para no saturar la API (≈90 series)
async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k) } }))
  return out
}

async function run() {
  const overrides = readJSON(OVERRIDES, {})
  const cache = readJSON(CACHE, { raw: {} })
  const log = []
  const get = async (id) => {
    if (!id) return null
    try {
      const h = await fetchMonthly(id)
      if (!h) return { id, status: 'missing' }
      if (/variaci[oó]n|porcentual/i.test(h.units)) return { id, status: 'rejected', units: h.units }
      return { ...h, status: ymIdx(h.last) < NOW - 24 ? 'stale' : 'ok' }
    } catch { return cache.raw?.[id] ? { ...cache.raw[id], status: 'cache' } : { id, status: 'error' } }
  }

  const raw = await pool(ROWS, 6, async (r) => ({
    orig: await get(overrides[r.key] ?? r.id),
    sa: r.saId ? await get(overrides[`${r.key}_sa`] ?? r.saId) : null,
  }))

  let min = Infinity, max = -Infinity
  for (const r of raw) for (const h of [r.orig, r.sa]) for (const k of Object.keys(h?.map ?? {})) { const i = ymIdx(k); min = Math.min(min, i); max = Math.max(max, i) }
  const months = Number.isFinite(min) ? Array.from({ length: max - min + 1 }, (_, i) => idxYm(min + i)) : []
  const align = (h) => (h?.map ? months.map((m) => (m in h.map ? h.map[m] : null)) : null)

  let ctrl = null
  const series = ROWS.map((r, k) => {
    const o = raw[k].orig, s = raw[k].sa
    const orig = align(o)
    let sa = null, saKind = null
    if (orig) {
      if (s?.map) { sa = align(s); saKind = 'oficial' }
      else if (r.key !== 'ipi_tc') { sa = adjustArray(orig, months); saKind = sa ? 'propia' : null }
    }
    if (r.key === 'ipi_total' && orig && sa && saKind === 'oficial') { const own = adjustArray(orig, months); if (own) ctrl = control(own, sa) }
    const gaps = orig ? gapsOf(orig, months) : []
    log.push(`${(o?.status ?? 'missing').padEnd(8)} ${r.key.padEnd(40)} ${o?.id ?? r.id}${o?.nulls?.length ? `  API-null:${o.nulls.length}` : ''}${gaps.length ? `  FALTAN:${gaps.length}` : ''}`)
    return {
      key: r.key, label: r.label, group: r.group, level: r.level, head: r.head, id: o?.id ?? r.id, status: o?.status ?? 'missing',
      title: o?.title ?? null, last: o?.last ?? null, saId: s?.id ?? null, saKind, orig, sa, gaps, filled: [], apiNulls: o?.nulls?.length ?? 0,
    }
  })

  const ok = series.filter((x) => x.orig).length
  const meta = { fetchedAt: new Date().toISOString(), total: series.length, ok, start: months[0] ?? null, end: months.at(-1) ?? null, control: ctrl }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ meta, months, series }))

  const fresh = {}
  for (const r of raw) for (const h of [r.orig, r.sa]) if (h?.map && ['ok', 'stale'].includes(h.status)) fresh[h.id] = { id: h.id, map: h.map, last: h.last, title: h.title, units: h.units }
  if (Object.keys(fresh).length) { try { fs.writeFileSync(CACHE, JSON.stringify({ fetchedAt: meta.fetchedAt, raw: { ...cache.raw, ...fresh } })) } catch {} }

  console.log(`[econsur] IPI → ${path.relative(ROOT, OUT)} | ${ok}/${series.length} series | ${meta.start ?? '—'} a ${meta.end ?? '—'}${ctrl ? ` | control SA propia vs oficial: corr ${ctrl.corr}` : ''}`)
  const bad = series.filter((x) => !x.orig)
  const withGaps = series.filter((x) => x.gaps.length)
  if (withGaps.length) console.log(`[econsur] IPI con meses faltantes en la API: ${withGaps.length} series`)
  if (bad.length) console.log(`[econsur] IPI sin datos (${bad.length}): ${bad.map((x) => x.key).join(', ')} (fijá el ID en data/series-overrides.json)`)
  if (process.env.SERIES_VERBOSE) console.log(log.join('\n'))
}

run().catch((e) => {
  console.warn('[econsur] no se pudo actualizar el IPI:', e.message)
  if (!fs.existsSync(OUT)) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify({ meta: { fetchedAt: null, ok: 0, total: ROWS.length }, months: [], series: [] }))
  }
})
