// Convierte el Excel de "Principales indicadores INDEC" en src/data/indec.json
// Se ejecuta antes de cada build (local y en Vercel). Es genérico: detecta los
// bloques por las filas "Unidad de medida", así que sigue funcionando cuando
// el INDEC corre los períodos (nuevos meses/trimestres) en el Excel.
import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'data')
const OUT = path.join(ROOT, 'src', 'data', 'indec.json')

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const UNIT_MARK = 'unidad de medida'

// ---------- utilidades de celda ----------
function raw(cell) {
  if (!cell) return null
  // celdas combinadas: ExcelJS repite el valor del maestro en las esclavas -> ignorarlas
  if (cell.isMerged && cell.master && cell.master.address !== cell.address) return null
  let v = cell.value
  if (v == null) return null
  if (typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) v = v.result // fórmula: usamos el valor cacheado
    else if ('richText' in v) v = v.richText.map((t) => t.text).join('')
    else if ('hyperlink' in v) v = v.hyperlink
    else if ('error' in v) v = v.error
    else if ('text' in v) v = v.text
  }
  if (typeof v === 'object' && v && !(v instanceof Date)) {
    if ('error' in v) v = v.error
    else if ('richText' in v) v = v.richText.map((t) => t.text).join('')
  }
  if (typeof v === 'string') v = v.trim()
  return v === '' ? null : v
}
const isErr = (v) => typeof v === 'string' && /^#(REF!|N\/A|DIV\/0!|VALUE!|NAME\?|NUM!|NULL!)/.test(v)
const clean = (s) => (s == null ? '' : String(s).replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())

function periodLabel(v) {
  if (v instanceof Date) {
    return { label: `${MESES[v.getUTCMonth()]}-${String(v.getUTCFullYear()).slice(2)}`, iso: v.toISOString().slice(0, 7) }
  }
  if (typeof v === 'number') return { label: String(v) }
  return { label: clean(v) }
}

// Tipo de dato según la unidad: pct (fracción -> %), pp (ya en puntos porcentuales), num
function kindOf(unit) {
  const t = clean(unit).toLowerCase()
  if (!t) return 'num'
  if (/p\.\s?p\./.test(t) || /\bpp\b/.test(t)) return 'pp'
  if (/^(millones|miles)/.test(t)) return 'num'
  if (t.includes('%')) return 'pct'
  return 'num'
}

function cellVal(v, kind) {
  if (v == null) return { v: null }
  if (isErr(v)) return { v: null, e: v }
  if (typeof v === 'number') return { v, k: kind }
  if (v instanceof Date) return { v: null }
  return { v: null, e: v === '-' ? '-' : 'texto' }
}

// ---------- detección de grupos de columnas en una fila de encabezado ----------
function headerGroups(ws, rowNum) {
  const row = ws.getRow(rowNum)
  const cells = []
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    if (col >= 3) cells.push({ col, v: raw(cell) })
  })
  const runs = []
  for (const c of cells) {
    const last = runs[runs.length - 1]
    if (last && c.col === last[last.length - 1].col + 1) last.push(c)
    else runs.push([c])
  }
  // descartar textos sueltos a la izquierda (p. ej. el título de sección en C)
  const firstUnit = runs.findIndex((r) => clean(r[0].v).toLowerCase() === UNIT_MARK)
  if (firstUnit > 0) runs.splice(0, firstUnit)
  const names = ['ref', 'recent', 'latest', 'change', 'extra']
  const groups = []
  const above = ws.getRow(rowNum - 1)
  for (const run of runs) {
    const hasUnit = clean(run[0].v).toLowerCase() === UNIT_MARK
    const cols = (hasUnit ? run.slice(1) : run).map((c) => ({ col: c.col, ...periodLabel(c.v), raw: c.v }))
    const g = { unitCol: hasUnit ? run[0].col : null, cols }
    // período que cuelga arriba del bloque "último dato" (fila anterior)
    const ab = cols.length ? raw(above.getCell(cols[0].col)) : null
    if (!hasUnit && ab != null) g.period = periodLabel(ab).label
    groups.push(g)
  }
  // Un run sin unidad de un solo elemento al final = "Último dato" (fecha)
  let lastCol = null
  if (groups.length && !groups[groups.length - 1].unitCol && groups[groups.length - 1].cols.length === 1 &&
      /(ú|u)ltimo dato/i.test(clean(groups[groups.length - 1].cols[0].raw))) {
    lastCol = groups.pop().cols[0].col
  }
  groups.forEach((g, i) => (g.name = names[Math.min(i, names.length - 1)]))
  return { groups, lastCol, firstUnitCol: groups.find((g) => g.unitCol)?.unitCol ?? 4 }
}

function parseSheet(ws, { mainSheet = false } = {}) {
  const headers = []
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    let found = false
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      if (col >= 3 && clean(raw(cell)).toLowerCase() === UNIT_MARK) found = true
    })
    if (found) headers.push(n)
  })

  const blocks = []
  const freqHeadings = [] // filas con solo texto en C (p. ej. "Indicadores mensuales")
  let currentFreq = null
  let currentTitle = ''
  const maxRow = ws.rowCount
  const firstHeader = headers[0] ?? maxRow

  // Títulos de la hoja (antes del primer bloque)
  const pageTitle = (() => {
    for (let r = 1; r < firstHeader; r++) {
      const v = clean(raw(ws.getRow(r).getCell(mainSheet ? 6 : 5)))
      if (v && !/^principales indicadores$/i.test(v) && !/^fuentes$/i.test(v)) return v
    }
    return null
  })()

  headers.forEach((hRow, bi) => {
    const endRow = (headers[bi + 1] ?? maxRow + 1) - 1
    const { groups, lastCol, firstUnitCol } = headerGroups(ws, hRow)
    const labelMaxCol = firstUnitCol - 1

    // título del bloque: texto en C de la fila de encabezado (hoja principal) o primera fila C-only
    const hdr = ws.getRow(hRow)
    let title = clean(raw(hdr.getCell(3)))
    if (mainSheet) { if (title) currentTitle = title; else title = currentTitle }
    const block = {
      id: `b${hRow}`,
      title: '',
      freq: null,
      groups: groups.map((g) => ({
        name: g.name,
        period: g.period ?? null,
        unitHeader: g.unitCol ? clean(raw(hdr.getCell(g.unitCol))) : null,
        cols: g.cols.map((c) => ({ label: c.label, iso: c.iso ?? null })),
      })),
      hasLast: lastCol != null,
      rows: [],
    }

    // la frecuencia (Indicadores mensuales/trimestrales/semestrales)
    if (mainSheet) {
      for (let r = hRow - 1; r >= 1 && r > (headers[bi - 1] ?? 0); r--) {
        const t = clean(raw(ws.getRow(r).getCell(3)))
        if (/^indicadores\s/i.test(t)) { currentFreq = t.replace(/^indicadores\s+/i, ''); break }
      }
      block.freq = currentFreq
    }

    const prevUnit = {} // herencia de unidad por grupo
    let lastDataRow = null
    for (let r = hRow + 1; r <= endRow; r++) {
      const row = ws.getRow(r)
      // etiqueta: primera celda con texto entre C y la col. anterior a la unidad
      let label = ''
      let labelCell = null
      for (let c = 3; c <= labelMaxCol; c++) {
        const v = raw(row.getCell(c))
        if (v != null && typeof v === 'string') { label = clean(v); labelCell = row.getCell(c); break }
      }
      if (!label && !mainSheet) {
        const v = raw(row.getCell(3)); if (typeof v === 'string') { label = clean(v); labelCell = row.getCell(3) }
      }
      if (/^m[aá]s informaci[oó]n en/i.test(label)) break
      if (mainSheet && /^indicadores\s/i.test(label)) break // pertenece al siguiente bloque

      const values = {}
      const units = {}
      let hasValue = false
      for (const g of groups) {
        const unitRaw = g.unitCol ? String(raw(row.getCell(g.unitCol)) ?? '').trim() : ''
        units[g.name] = unitRaw
        values[g.name] = g.cols.map((c) => {
          const v = raw(row.getCell(c.col))
          if (v != null) hasValue = true
          return v
        })
      }
      const lastDate = lastCol ? raw(row.getCell(lastCol)) : null

      if (!hasValue && !label) continue
      if (!hasValue) {
        // fila de título / subtítulo
        const bold = !!labelCell?.font?.bold
        if (!block.title && !block.rows.length && r <= hRow + 2 && !mainSheet) {
          block.title = label
          continue
        }
        block.rows.push({ t: 'h', text: label, bold, last: lastDate ? periodLabel(lastDate).label : null })
        continue
      }

      // fila de datos (o continuación de la anterior: sin etiqueta)
      const isCont = !label && lastDataRow
      const lines = {}
      for (const g of groups) {
        const parts = (units[g.name] || '').split(/\s*\n\s*/).filter(Boolean)
        if (!isCont) {
          const u = parts[0] ?? prevUnit[g.name]?.parts?.[0] ?? ''
          if (parts.length) prevUnit[g.name] = { parts }
          units[g.name] = u
          lines[g.name] = { fromParts: parts.length ? parts : prevUnit[g.name]?.parts ?? [] }
        } else {
          const idx = lastDataRow.contIdx + 1
          const parentParts = lastDataRow.parts[g.name] ?? []
          units[g.name] = units[g.name] ? units[g.name].split(/\s*\n\s*/)[0] : parentParts[idx] ?? ''
        }
      }

      const mk = (g, i, v) => {
        let u = units[g.name]
        // columna "último dato" sin unidad propia: usar el encabezado de la columna
        if (!g.unitCol) {
          const h = clean(g.cols[i]?.raw ?? '')
          u = h
          if (/\//.test(h) && /millones|miles/i.test(h) && /%/.test(h)) u = units.recent || h
        }
        return cellVal(v, kindOf(u))
      }
      const outRow = {
        t: 'r',
        label: isCont ? '' : label,
        cont: !!isCont,
        indent: labelCell?.alignment?.indent ?? 0,
        bold: !!labelCell?.font?.bold,
        u: {},
        v: {},
        last: lastDate ? periodLabel(lastDate).label : null,
      }
      groups.forEach((g, gi) => {
        outRow.u[g.name] = units[g.name]
        outRow.v[g.name] = values[g.name].map((v, i) => mk(g, i, v))
      })
      // encabezados de columna "latest" como etiquetas de medida (kinds por columna)
      block.rows.push(outRow)

      if (!isCont) {
        const parts = {}
        for (const g of groups) parts[g.name] = lines[g.name]?.fromParts ?? []
        lastDataRow = { contIdx: 0, parts }
      } else {
        lastDataRow.contIdx++
      }
    }
    if (!block.title) block.title = title || pageTitle || ''
    blocks.push(block)
  })
  return { pageTitle, blocks }
}

function parseSources(ws) {
  const out = []
  let group = null
  ws.eachRow({ includeEmpty: false }, (row) => {
    const c = clean(raw(row.getCell(3)))
    const e = clean(raw(row.getCell(5)))
    const f = raw(row.getCell(6))
    if (/^m[aá]s informaci[oó]n/i.test(c)) return
    if (c && !e) return
    if (c) { group = { group: c, items: [] }; out.push(group) }
    if (e && typeof f === 'string' && /^https?:/i.test(f)) {
      if (!group) { group = { group: 'General', items: [] }; out.push(group) }
      group.items.push({ label: e, url: f })
    }
  })
  return out
}

// ---------- main ----------
function pickWorkbook() {
  const preferred = path.join(DATA_DIR, 'indicadores.xlsx')
  if (fs.existsSync(preferred)) return preferred
  const any = fs.readdirSync(DATA_DIR).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$')).sort()
  if (!any.length) throw new Error('No hay ningún .xlsx en /data. Subí el Excel como data/indicadores.xlsx')
  return path.join(DATA_DIR, any[any.length - 1])
}

const file = pickWorkbook()
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(file)

const MAIN = 'Principales Indicadores'
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const sheets = []
let sources = []
let refreshDate = null
let mainParsed = null

for (const ws of wb.worksheets) {
  if (ws.state !== 'visible') continue
  if (ws.name === MAIN) {
    const d = raw(ws.getCell('F8'))
    if (d instanceof Date) refreshDate = d.toISOString().slice(0, 10)
    mainParsed = parseSheet(ws, { mainSheet: true })
  } else if (/^fuentes$/i.test(ws.name)) {
    sources = parseSources(ws)
  } else {
    const p = parseSheet(ws)
    sheets.push({ id: slug(ws.name), name: ws.name, subtitle: p.pageTitle, blocks: p.blocks })
  }
}
if (!mainParsed) throw new Error(`No se encontró la hoja "${MAIN}"`)

// calidad de datos: celdas con error en el origen
let errors = 0
let cells = 0
const scan = (blocks) => blocks.forEach((b) => b.rows.forEach((r) => {
  if (r.t !== 'r') return
  Object.values(r.v).forEach((arr) => arr.forEach((c) => { cells++; if (c.e && c.e !== '-') errors++ }))
}))
scan(mainParsed.blocks); sheets.forEach((s) => scan(s.blocks))

const out = {
  meta: { source: path.basename(file), refreshDate, builtAt: new Date().toISOString(), cells, errors },
  main: { id: 'principales', name: 'Principales indicadores', blocks: mainParsed.blocks },
  sheets,
  sources,
}
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out))
console.log(`[econsur] ${path.basename(file)} → ${path.relative(ROOT, OUT)} | hojas: ${sheets.length + 1} | bloques: ${mainParsed.blocks.length + sheets.reduce((a, s) => a + s.blocks.length, 0)} | celdas: ${cells} | errores origen: ${errors}`)
