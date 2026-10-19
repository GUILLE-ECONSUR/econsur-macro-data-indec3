const nf = (min, max) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: min, maximumFractionDigits: max })
const F = { pct: nf(1, 1), pp: nf(1, 1), n0: nf(0, 0), n1: nf(0, 1), n2: nf(0, 2) }

export function fmt(cell) {
  if (!cell || cell.v == null) return '—'
  const { v, k } = cell
  if (k === 'pct') return `${F.pct.format(v * 100)}%`
  if (k === 'pp') return `${F.pp.format(v)} p.p.`
  if (k === 'pts') return `${F.pct.format(v)}%` // ya viene en puntos de %
  if (k === 'dif') return (v > 0 ? '+' : '') + fmt({ v, k: 'num' })
  const a = Math.abs(v)
  return (a >= 1000 ? F.n0 : a >= 100 ? F.n1 : F.n2).format(v)
}

export const tone = (cell) => {
  if (!cell || cell.v == null || (cell.k !== 'pct' && cell.k !== 'pp' && cell.k !== 'dif')) return ''
  return cell.v > 0 ? 'pos' : cell.v < 0 ? 'neg' : ''
}

export const isNum = (c) => c && typeof c.v === 'number'
export const naTitle = (c) => (c?.e && c.e !== '-' ? `Sin dato en el Excel de origen (${c.e})` : undefined)
