// Descarga series históricas de la API de Series de Tiempo (datos.gob.ar) y las deja
// en frecuencia trimestral en src/data/series.json. Se ejecuta en cada build.
//
// Nunca rompe el build: si la API falla, usa data/series-cache.json (última descarga
// buena, si está commiteada); si tampoco hay caché, la solapa muestra el aviso.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SERIES } from './series-config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src', 'data', 'series.json')
const CACHE = path.join(ROOT, 'data', 'series-cache.json')
const OVERRIDES = path.join(ROOT, 'data', 'series-overrides.json')
export const BASE = process.env.SERIES_API_BASE || 'https://apis.datos.gob.ar/series/api'
const START = '1993-01-01'

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
const qIdx = (y, m) => y * 4 + Math.floor((m - 1) / 3)
const qLabel = (i) => `${Math.floor(i / 4)}T${(i % 4) + 1}`

async function getJSON(url, tries = 3) {
  let err
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), 25000)
      const res = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } })
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      err = e
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw err
}

const freqOf = (s = '') => {
  const t = String(s).toLowerCase()
  if (/p1m|month|mensual/.test(t)) return 'M'
  if (/p3m|quarter|trimest/.test(t)) return 'T'
  if (/p1d|day|diari/.test(t)) return 'D'
  if (/p1y|year|anual/.test(t)) return 'A'
  if (/p6m|semest/.test(t)) return 'S'
  return null
}

// Serie diaria -> mensual (el último dato del mes cuenta solo si el mes llegó al día 24+)
function dailyToMonthly(rows, agg) {
  const by = new Map()
  for (const [d, v] of rows) {
    if (typeof v !== 'number') continue
    const k = d.slice(0, 7)
    if (!by.has(k)) by.set(k, [])
    by.get(k).push([+d.slice(8, 10), v])
  }
  const out = []
  for (const [k, arr] of by) {
    if (arr.at(-1)[0] < 24) continue
    const vals = arr.map((x) => x[1])
    const v = agg === 'sum' ? vals.reduce((a, b) => a + b, 0) : agg === 'eop' ? vals.at(-1) : vals.reduce((a, b) => a + b, 0) / vals.length
    out.push([`${k}-01`, v])
  }
  return out
}

// Agrega filas [fecha, valor] a trimestre. Mensuales: solo trimestres con los 3 meses.
function toQuarterly(rows, freq, agg) {
  const out = new Map()
  if (freq === 'T') {
    for (const [d, v] of rows) if (typeof v === 'number') out.set(qIdx(+d.slice(0, 4), +d.slice(5, 7)), v)
    return out
  }
  if (freq === 'D') rows = dailyToMonthly(rows, agg)
  else if (freq !== 'M') return out
  const buckets = new Map()
  for (const [d, v] of rows) {
    if (typeof v !== 'number') continue
    const y = +d.slice(0, 4), m = +d.slice(5, 7)
    const k = qIdx(y, m)
    if (!buckets.has(k)) buckets.set(k, new Map())
    buckets.get(k).set(m, v)
  }
  for (const [k, months] of buckets) {
    if (months.size < 3) continue
    const vals = [...months.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1])
    out.set(k, agg === 'sum' ? vals.reduce((a, b) => a + b, 0) : agg === 'eop' ? vals[2] : vals.reduce((a, b) => a + b, 0) / 3)
  }
  return out
}

async function getAllRows(url) {
  const rows = []
  let meta = null
  for (let start = 0; start <= 30000; start += 1000) {
    const j = await getJSON(`${url}&start=${start}`)
    meta ??= j?.meta
    const d = j?.data ?? []
    rows.push(...d)
    if (d.length < 1000) break
  }
  return { data: rows, meta }
}

const NOW_Q = (() => { const n = new Date(); return qIdx(n.getFullYear(), n.getMonth() + 1) })()

async function fetchSeries(id, cfg) {
  const collapse = cfg.freq === 'T' ? '&collapse=quarter' : ''
  const url = `${BASE}/series/?ids=${encodeURIComponent(id)}&start_date=${START}&limit=1000&format=json${collapse}`
  const j = await getAllRows(url)
  if (!j?.data?.length) return null
  const freq = freqOf(j.meta?.[0]?.frequency) ?? cfg.freq
  const field = j.meta?.find((m) => m?.field)?.field ?? {}
  const q = toQuarterly(j.data, freq, cfg.agg)
  if (!q.size) return null
  const m = j.meta?.find((x) => x?.dataset) ?? {}
  const lastQ = Math.max(...q.keys())
  return { id, q, lastQ, title: field.description || field.title || id, units: field.units || '', source: m.dataset?.source || '', dataset: m.dataset?.title || '' }
}

async function searchSeries(cfg) {
  const { q, match, not } = cfg.search
  const j = await getJSON(`${BASE}/search/?q=${encodeURIComponent(q)}&limit=50`)
  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const out = []
  for (const it of j?.data ?? []) {
    const f = it.field ?? {}
    const fr = freqOf(f.frequency ?? it.dataset?.accrualPeriodicity)
    if (fr && fr !== cfg.freq) continue
    const end = f.time_index_end ? new Date(f.time_index_end) : null
    if (end && end < yearAgo) continue // serie discontinuada
    const text = [f.description, f.title, it.dataset?.title, f.units].filter(Boolean).join(' ')
    if (match && !match.test(text)) continue
    if (not && not.test(text)) continue
    out.push(f.id)
  }
  return out
}

function derive(a, b, op = 'sub') {
  const out = new Map()
  for (const [k, v] of a) if (b.has(k)) out.set(k, op === 'add' ? v + b.get(k) : v - b.get(k))
  return out
}

async function run() {
  const overrides = readJSON(OVERRIDES, {})
  const cache = readJSON(CACHE, { series: {} })
  const results = {}
  const log = []

  // 1) series directas (resolución: override → ids → search)
  await Promise.all(SERIES.filter((c) => !c.derive || c.ids?.length).map(async (cfg) => {
    const candidates = [overrides[cfg.key], ...(cfg.ids ?? [])].filter(Boolean)
    let hit = null
    let apiDown = false
    const tryId = async (id) => {
      try { return await fetchSeries(id, cfg) } catch (e) { apiDown = true; return null }
    }
    let stale = null
    const rejected = []
    // acepta niveles; rechaza series que en realidad son variaciones (unidades "variación porcentual")
    const judge = (h, viaSearch) => {
      if (!h) return false
      h.viaSearch = viaSearch
      if (cfg.type === 'idx' && /variaci[oó]n|porcentual|porcentaje/i.test(h.units)) { rejected.push(`${h.id} (${h.units})`); return false }
      if (cfg.unitsMatch && h.units && !cfg.unitsMatch.test(h.units)) { rejected.push(`${h.id} (${h.units})`); return false }
      if (h.lastQ < NOW_Q - 8) { stale ??= h; return false } // sin datos hace +2 años: discontinuada
      return true
    }
    for (const id of candidates) { const h = await tryId(id); if (judge(h, false)) { hit = h; break } }
    if (!hit && cfg.search && !overrides[cfg.key]) {
      try {
        for (const id of (await searchSeries(cfg)).slice(0, 6)) { const h = await tryId(id); if (judge(h, true)) { hit = h; break } }
      } catch { apiDown = true }
    }
    if (!hit && stale) { hit = stale; hit.stale = true }
    if (rejected.length) log.push(`rechazadas ${cfg.key}: ${rejected.join(', ')}`)
    if (hit) results[cfg.key] = { ...hit, status: hit.stale ? 'stale' : hit.viaSearch ? 'search' : 'ok' }
    else if (cache.series?.[cfg.key]) {
      const c = cache.series[cfg.key]
      results[cfg.key] = { ...c, q: new Map(Object.entries(c.q).map(([k, v]) => [+k, v])), status: 'cache' }
    } else results[cfg.key] = { status: apiDown ? 'error' : 'missing' }
  }))

  // 2) series derivadas
  for (const cfg of SERIES.filter((c) => c.derive && !results[c.key]?.q)) {
    const a = results[cfg.derive.a], b = results[cfg.derive.b]
    results[cfg.key] = a?.q && b?.q
      ? { id: `${a.id} ${cfg.derive.op === 'add' ? '+' : '−'} ${b.id}`, q: derive(a.q, b.q, cfg.derive.op), title: cfg.label, units: cfg.unit, source: a.source, status: 'derived' }
      : { status: 'missing' }
  }

  // 3) armar salida alineada a un eje trimestral común
  let min = Infinity, max = -Infinity
  for (const r of Object.values(results)) for (const k of r.q?.keys() ?? []) { min = Math.min(min, k); max = Math.max(max, k) }
  const qs = Number.isFinite(min) ? Array.from({ length: max - min + 1 }, (_, i) => qLabel(min + i)) : []

  const series = SERIES.map((cfg) => {
    const r = results[cfg.key]
    let values = null
    if (r.q) {
      values = qs.map((_, i) => (r.q.has(min + i) ? r.q.get(min + i) : null))
      if (cfg.type === 'rate') {
        const nums = values.filter((v) => v != null)
        if (nums.length && Math.max(...nums.map(Math.abs)) <= 1.5) values = values.map((v) => (v == null ? null : +(v * 100).toFixed(6)))
      }
    }
    log.push(`${r.status.padEnd(8)} ${cfg.key.padEnd(13)} ${r.id ?? '—'}`)
    return {
      key: cfg.key, label: cfg.label, group: cfg.group, unit: cfg.unit, type: cfg.type, agg: cfg.agg, sa: cfg.sa, tab: cfg.tab ?? 'series', indent: cfg.indent ?? 0,
      status: r.status, id: r.id ?? null, last: r.q?.size ? qLabel(Math.max(...r.q.keys())) : null, title: r.title ?? null, source: r.source ?? null, values,
    }
  })

  const ok = series.filter((s) => s.values).length
  const meta = { fetchedAt: new Date().toISOString(), api: BASE, total: series.length, ok, start: qs[0] ?? null, end: qs.at(-1) ?? null }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ meta, qs, series }))

  // caché de la última descarga buena (solo si hubo datos nuevos de la API)
  if (series.some((s) => ['ok', 'search'].includes(s.status))) {
    const c = { fetchedAt: meta.fetchedAt, series: {} }
    for (const cfg of SERIES) {
      const r = results[cfg.key]
      if (r.q && ['ok', 'search', 'cache'].includes(r.status)) c.series[cfg.key] = { id: r.id, title: r.title, units: r.units, source: r.source, q: Object.fromEntries(r.q) }
    }
    try { fs.writeFileSync(CACHE, JSON.stringify(c)) } catch {}
  }

  console.log(`[econsur] Series de Tiempo → ${path.relative(ROOT, OUT)} | ${ok}/${series.length} series | ${meta.start ?? '—'} a ${meta.end ?? '—'}`)
  const bad = series.filter((s) => !s.values)
  if (bad.length) console.log(`[econsur] sin datos: ${bad.map((s) => s.key).join(', ')} (fijá el ID en data/series-overrides.json; buscá con: npm run series:find -- "texto")`)
  if (process.env.SERIES_VERBOSE) console.log(log.join('\n'))
}

run().catch((e) => {
  // último recurso: que el build siga con una solapa vacía en lugar de fallar
  console.warn('[econsur] no se pudo actualizar series históricas:', e.message)
  if (!fs.existsSync(OUT)) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify({ meta: { fetchedAt: null, ok: 0, total: SERIES.length }, qs: [], series: [] }))
  }
})
