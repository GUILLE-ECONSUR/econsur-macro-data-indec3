// EMAE mensual: nivel general, tendencia-ciclo y 16 series sectoriales (API de Series de Tiempo).
// - Nivel general: usa la serie desestacionalizada OFICIAL del INDEC.
// - Sectores: la API solo publica la serie original, así que se desestacionalizan acá
//   (descomposición clásica multiplicativa, ver seasonalAdjust). Es una estimación propia,
//   no el X-13 del INDEC; el build la contrasta con la oficial del nivel general.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src', 'data', 'emae.json')
const CACHE = path.join(ROOT, 'data', 'emae-cache.json')
const OVERRIDES = path.join(ROOT, 'data', 'series-overrides.json')
const BASE = process.env.SERIES_API_BASE || 'https://apis.datos.gob.ar/series/api'
const START = '2004-01-01'

// 'yoy' / 'mom' / 'samom' (opcionales): series OFICIALES de variación % interanual / mensual (original / desest.)
// que permiten reconstruir meses que la API publica vacíos. Claves en overrides: <key>_yoy, <key>_mom, <key>_samom.
// Claves para data/series-overrides.json: "<key>" fija la serie original; "<key>_sa" la desestacionalizada.
const SERIES = [
  { key: 'total', label: 'EMAE nivel general', group: 'Nivel general', orig: '143.3_NO_PR_2004_A_21', sa: '143.3_NO_PR_2004_A_31', yoy: '143.3_ICE_SERVIA_2004_A_25', samom: '143.3_ICE_SER_VM_2004_A_34' },
  { key: 'tc', label: 'EMAE tendencia-ciclo', group: 'Nivel general', orig: '143.3_NO_PR_2004_A_28', mom: '143.3_ICE_SER_VM_2004_A_31' },
  { key: 'A', label: 'A · Agricultura, ganadería, caza y silvicultura', group: 'Sectores', orig: '11.3_ISOM_2004_M_39' },
  { key: 'B', label: 'B · Pesca', group: 'Sectores', orig: '11.3_VIPAA_2004_M_5' },
  { key: 'C', label: 'C · Explotación de minas y canteras', group: 'Sectores', orig: '11.3_ISD_2004_M_26' },
  { key: 'D', label: 'D · Industria manufacturera', group: 'Sectores', orig: '11.3_VMASD_2004_M_23' },
  { key: 'E', label: 'E · Electricidad, gas y agua', group: 'Sectores', orig: '11.3_ITC_2004_M_21' },
  { key: 'F', label: 'F · Construcción', group: 'Sectores', orig: '11.3_VMATC_2004_M_12' },
  { key: 'G', label: 'G · Comercio mayorista y minorista y reparaciones', group: 'Sectores', orig: '11.3_AGCS_2004_M_41' },
  { key: 'H', label: 'H · Hoteles y restaurantes', group: 'Sectores', orig: '11.3_P_2004_M_20' },
  { key: 'I', label: 'I · Transporte, almacenamiento y comunicaciones', group: 'Sectores', orig: '11.3_EMC_2004_M_25' },
  { key: 'J', label: 'J · Intermediación financiera', group: 'Sectores', orig: '11.3_IM_2004_M_25' },
  { key: 'K', label: 'K · Inmobiliarias, empresariales y de alquiler', group: 'Sectores', orig: '11.3_SEGA_2004_M_48' },
  { key: 'L', label: 'L · Administración pública, defensa y seguridad social', group: 'Sectores', orig: '11.3_C_2004_M_60' },
  { key: 'M', label: 'M · Enseñanza', group: 'Sectores', orig: '11.3_CMMR_2004_M_10' },
  { key: 'N', label: 'N · Servicios sociales y de salud', group: 'Sectores', orig: '11.3_HR_2004_M_24' },
  { key: 'O', label: 'O · Otros servicios comunitarios, sociales y personales', group: 'Sectores', orig: '11.3_TAC_2004_M_60' },
  { key: 'IN', label: 'Impuestos netos de subsidios', group: 'Sectores', orig: '11.3_IF_2004_M_25' },
]

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
export const ymIdx = (ym) => +ym.slice(0, 4) * 12 + (+ym.slice(5, 7) - 1)
export const idxYm = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`

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
    } catch (e) { err = e; await new Promise((r) => setTimeout(r, 600 * (i + 1))) }
  }
  throw err
}

export async function fetchMonthly(id) {
  const rows = []
  let meta = null
  for (let start = 0; start <= 10000; start += 1000) {
    const j = await getJSON(`${BASE}/series/?ids=${encodeURIComponent(id)}&start_date=${START}&limit=1000&format=json&start=${start}`)
    meta ??= j?.meta
    const d = j?.data ?? []
    rows.push(...d)
    if (d.length < 1000) break
  }
  const map = {}
  const nulls = []
  for (const [d, v] of rows) { if (typeof v === 'number') map[d.slice(0, 7)] = v; else nulls.push(d.slice(0, 7)) }
  const keys = Object.keys(map)
  if (!keys.length) return null
  const field = meta?.find((m) => m?.field)?.field ?? {}
  return { id, map, nulls, last: keys.sort().at(-1), title: field.description || field.title || id, units: field.units || '' }
}

/**
 * Desestacionalización clásica multiplicativa (ratio a media móvil centrada 2x12).
 *  1) tendencia = media móvil centrada de 12 meses; 2) razón = y / tendencia;
 *  3) factor de cada mes calendario = media recortada de sus últimas 10 razones, normalizada a media 1;
 *  4) serie desest. = y / factor del mes.
 * No corrige efectos de calendario (días hábiles, Semana Santa) ni usa ARIMA: es una aproximación.
 * @param y valores positivos consecutivos (sin huecos); @param firstMonth mes (0-11) de y[0]
 */
export function seasonalAdjust(y, firstMonth) {
  const n = y.length
  if (n < 48 || y.some((v) => !(v > 0))) return null
  const ratio = new Array(n).fill(null)
  for (let t = 6; t < n - 6; t++) {
    let s = 0.5 * y[t - 6] + 0.5 * y[t + 6]
    for (let k = -5; k <= 5; k++) s += y[t + k]
    ratio[t] = Math.min(1.5, Math.max(0.5, y[t] / (s / 12)))
  }
  const f = new Array(12).fill(1)
  for (let m = 0; m < 12; m++) {
    const r = []
    for (let t = 0; t < n; t++) if (ratio[t] != null && (firstMonth + t) % 12 === m) r.push(ratio[t])
    const last = r.slice(-10).sort((a, b) => a - b)
    const trimmed = last.length >= 5 ? last.slice(1, -1) : last
    f[m] = trimmed.length ? trimmed.reduce((a, b) => a + b, 0) / trimmed.length : 1
  }
  const mean = f.reduce((a, b) => a + b, 0) / 12
  return y.map((v, t) => v / (f[(firstMonth + t) % 12] / mean))
}

// Aplica seasonalAdjust a una serie con huecos: los meses faltantes se interpolan (en logaritmos) SOLO para
// estimar los factores estacionales; la salida queda vacía en los meses que no tienen dato original.
export function adjustArray(arr, months) {
  const first = arr.findIndex((v) => v != null)
  let last = arr.length - 1
  while (last >= 0 && arr[last] == null) last--
  if (first < 0 || last - first + 1 < 48) return null
  const seg = arr.slice(first, last + 1)
  const missing = seg.filter((v) => v == null).length
  if (missing / seg.length > 0.25 || seg.some((v) => v != null && !(v > 0))) return null
  const filled = seg.slice()
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] != null) continue
    let a = i - 1, b = i + 1
    while (filled[b] == null) b++
    const w = (i - a) / (b - a)
    filled[i] = Math.exp(Math.log(filled[a]) * (1 - w) + Math.log(filled[b]) * w)
  }
  const sa = seasonalAdjust(filled, +months[first].slice(5, 7) - 1)
  if (!sa) return null
  const out = new Array(arr.length).fill(null)
  sa.forEach((v, i) => { if (seg[i] != null) out[first + i] = +v.toFixed(4) })
  return out
}

// Reconstruye meses vacíos de un nivel usando la variación oficial publicada (interanual o mensual).
const scaleOf = (v) => (Math.max(...v.filter((x) => x != null).map(Math.abs)) <= 1.5 ? 1 : 0.01) // fracción o %
function fillFromYoy(level, yoy, months) {
  const sc = scaleOf(yoy), done = []
  for (let i = 12; i < level.length; i++) if (level[i] == null && level[i - 12] != null && yoy[i] != null) { level[i] = +(level[i - 12] * (1 + yoy[i] * sc)).toFixed(4); done.push(months[i]) }
  return done
}
function fillFromMom(level, mom, months) {
  const sc = scaleOf(mom), done = []
  for (let i = 1; i < level.length; i++) if (level[i] == null && level[i - 1] != null && mom[i] != null) { level[i] = +(level[i - 1] * (1 + mom[i] * sc)).toFixed(4); done.push(months[i]) }
  for (let i = level.length - 2; i >= 0; i--) if (level[i] == null && level[i + 1] != null && mom[i + 1] != null) { level[i] = +(level[i + 1] / (1 + mom[i + 1] * sc)).toFixed(4); done.push(months[i]) }
  return done
}
export const gapsOf = (arr, months) => {
  const f = arr.findIndex((v) => v != null)
  let l = arr.length - 1
  while (l >= 0 && arr[l] == null) l--
  return f < 0 ? [] : months.slice(f, l + 1).filter((_, i) => arr[f + i] == null)
}

const mm = (a) => a.map((x, i) => (i > 0 && x != null && a[i - 1] != null ? x / a[i - 1] - 1 : null))
export function control(own, official) {
  const a = [], b = []
  const x = mm(own), y = mm(official)
  for (let i = Math.max(0, own.length - 120); i < own.length; i++) if (x[i] != null && y[i] != null) { a.push(x[i]); b.push(y[i]) }
  if (a.length < 24) return null
  const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length
  let sab = 0, saa = 0, sbb = 0, mad = 0
  a.forEach((v, i) => { sab += (v - ma) * (b[i] - mb); saa += (v - ma) ** 2; sbb += (b[i] - mb) ** 2; mad += Math.abs(v - b[i]) })
  return { corr: +(sab / Math.sqrt(saa * sbb)).toFixed(3), madPp: +((mad / a.length) * 100).toFixed(2), months: a.length }
}

const NOW = (() => { const n = new Date(); return n.getFullYear() * 12 + n.getMonth() })()

async function run() {
  const overrides = readJSON(OVERRIDES, {})
  const cache = readJSON(CACHE, { raw: {} })
  const raw = {}
  const log = []

  const get = async (id, wantLevel = true) => {
    if (!id) return null
    try {
      const h = await fetchMonthly(id)
      if (!h) return { id, status: 'missing' }
      if (wantLevel && /variaci[oó]n|porcentual/i.test(h.units)) return { id, status: 'rejected', units: h.units }
      return { ...h, status: ymIdx(h.last) < NOW - 24 ? 'stale' : 'ok' }
    } catch {
      return cache.raw?.[id] ? { ...cache.raw[id], status: 'cache' } : { id, status: 'error' }
    }
  }

  await Promise.all(SERIES.map(async (c) => {
    raw[c.key] = {
      orig: await get(overrides[c.key] ?? c.orig),
      sa: c.sa ? await get(overrides[`${c.key}_sa`] ?? c.sa) : null,
      yoy: c.yoy ? await get(overrides[`${c.key}_yoy`] ?? c.yoy, false) : null,
      mom: c.mom ? await get(overrides[`${c.key}_mom`] ?? c.mom, false) : null,
      samom: c.samom ? await get(overrides[`${c.key}_samom`] ?? c.samom, false) : null,
    }
  }))

  // eje mensual común
  let min = Infinity, max = -Infinity
  for (const r of Object.values(raw)) for (const h of [r.orig, r.sa]) for (const k of Object.keys(h?.map ?? {})) { const i = ymIdx(k); min = Math.min(min, i); max = Math.max(max, i) }
  const months = Number.isFinite(min) ? Array.from({ length: max - min + 1 }, (_, i) => idxYm(min + i)) : []
  const align = (h) => (h?.map ? months.map((m) => (m in h.map ? h.map[m] : null)) : null)

  let ctrl = null
  const series = SERIES.map((c) => {
    const o = raw[c.key].orig, s = raw[c.key].sa
    const orig = align(o)
    const filled = []
    let sa = null, saKind = null
    if (orig) {
      const R = raw[c.key]
      if (R.yoy?.map) filled.push(...fillFromYoy(orig, align(R.yoy), months))
      if (R.mom?.map) filled.push(...fillFromMom(orig, align(R.mom), months))
      if (s?.map) { sa = align(s); saKind = 'oficial'; if (R.samom?.map) fillFromMom(sa, align(R.samom), months) }
      else if (c.group === 'Sectores') { sa = adjustArray(orig, months); saKind = sa ? 'propia' : null }
    }
    if (c.key === 'total' && orig && sa && saKind === 'oficial') {
      const own = adjustArray(orig, months)
      if (own) ctrl = control(own, sa)
    }
    const gaps = orig ? gapsOf(orig, months) : []
    log.push(`${(o?.status ?? 'missing').padEnd(8)} ${c.key.padEnd(6)} ${o?.id ?? c.orig}${saKind ? '  [SA ' + saKind + ']' : ''}${o?.nulls?.length ? `  API-null:${o.nulls.length}` : ''}${filled.length ? `  reconstruidos:${filled.join(',')}` : ''}${gaps.length ? `  FALTAN:${gaps.length} (${gaps.slice(-6).join(',')}${gaps.length > 6 ? ',…' : ''})` : ''}${o?.units && o.status === 'rejected' ? '  unidades: ' + o.units : ''}`)
    return {
      key: c.key, label: c.label, group: c.group, id: o?.id ?? c.orig, status: o?.status ?? 'missing',
      title: o?.title ?? null, last: o?.last ?? null, saId: s?.id ?? null, saKind, orig, sa,
      gaps, filled, apiNulls: o?.nulls?.length ?? 0,
    }
  })

  const ok = series.filter((s) => s.orig).length
  const meta = { fetchedAt: new Date().toISOString(), api: BASE, total: series.length, ok, start: months[0] ?? null, end: months.at(-1) ?? null, control: ctrl }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ meta, months, series }))

  // caché de la última descarga buena
  const fresh = {}
  for (const r of Object.values(raw)) for (const h of [r.orig, r.sa, r.yoy, r.mom, r.samom]) if (h?.map && ['ok', 'stale'].includes(h.status)) fresh[h.id] = { id: h.id, map: h.map, last: h.last, title: h.title, units: h.units }
  if (Object.keys(fresh).length) { try { fs.writeFileSync(CACHE, JSON.stringify({ fetchedAt: meta.fetchedAt, raw: { ...cache.raw, ...fresh } })) } catch {} }

  console.log(`[econsur] EMAE → ${path.relative(ROOT, OUT)} | ${ok}/${series.length} series | ${meta.start ?? '—'} a ${meta.end ?? '—'}${ctrl ? ` | control SA propia vs oficial: corr ${ctrl.corr}` : ''}`)
  const bad = series.filter((s) => !s.orig)
  const withGaps = series.filter((x) => x.gaps?.length)
  if (withGaps.length) console.log(`[econsur] EMAE con meses faltantes en la API: ${withGaps.map((x) => `${x.key}(${x.gaps.length})`).join(', ')}`)
  if (bad.length) console.log(`[econsur] EMAE sin datos: ${bad.map((s) => s.key).join(', ')} (fijá el ID en data/series-overrides.json)`)
  if (process.env.SERIES_VERBOSE) console.log(log.join('\n'))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((e) => {
    console.warn('[econsur] no se pudo actualizar el EMAE:', e.message)
    if (!fs.existsSync(OUT)) {
      fs.mkdirSync(path.dirname(OUT), { recursive: true })
      fs.writeFileSync(OUT, JSON.stringify({ meta: { fetchedAt: null, ok: 0, total: SERIES.length }, months: [], series: [] }))
    }
  })
}
