import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { fmt, isNum, tone } from '../format.js'

// Indicadores destacados: se buscan por nombre en la hoja principal, así sobreviven a cambios de fila.
const PICKS = [
  { re: /estimador mensual de actividad/i, name: 'Actividad (EMAE)' },
  { re: /precios al consumidor/i, name: 'Inflación (IPC)' },
  { re: /^producto interno bruto/i, name: 'PIB' },
  { re: /tasa de desocupaci/i, name: 'Desocupación' },
  { re: /^pobreza/i, name: 'Pobreza' },
  { re: /saldo comercial/i, name: 'Saldo comercial' },
  { re: /^índice de salarios/i, name: 'Salarios' },
  { re: /canasta básica total/i, name: 'Canasta básica total' },
]

export function pickKpis(blocks) {
  const out = []
  for (const p of PICKS) {
    outer: for (const b of blocks) {
      for (const r of b.rows) {
        if (r.t === 'r' && !r.cont && p.re.test(r.label)) { out.push({ ...p, block: b, row: r }); break outer }
      }
    }
  }
  return out
}

function headline(block, row) {
  // Primer valor numérico del grupo "último dato"; si no hay, el último de "últimos períodos"
  const latest = block.groups.find((g) => g.name === 'latest')
  const li = latest ? row.v.latest.findIndex(isNum) : -1
  if (li >= 0) return { cell: row.v.latest[li], period: latest.period || latest.cols[li].label, unit: row.u.latest || latest.cols[li].label }
  const rec = block.groups.find((g) => g.name === 'recent')
  const vals = row.v.recent ?? []
  for (let i = vals.length - 1; i >= 0; i--) if (isNum(vals[i])) return { cell: vals[i], period: rec.cols[i].label, unit: row.u.recent }
  return null
}

export default function KpiStrip({ items, onPick }) {
  return (
    <div className="kpis">
      {items.map(({ name, block, row }) => {
        const h = headline(block, row)
        if (!h) return null
        const change = block.groups.find((g) => g.name === 'change')
        const spark = (row.v.recent ?? []).filter(isNum).map((c, i) => ({ i, v: c.v }))
        return (
          <button key={name} className="kpi" onClick={() => onPick(block, row)}>
            <span className="kpi-name">{name}</span>
            <span className={`kpi-val ${tone(h.cell)}`}>{fmt(h.cell)}</span>
            <span className="kpi-meta">{h.unit} · {h.period}</span>
            <span className="kpi-chg">
              {change?.cols.map((c, i) => isNum(row.v.change[i]) && (
                <span key={i}><em>{c.label}</em> <b className={tone(row.v.change[i])}>{fmt(row.v.change[i])}</b></span>
              ))}
            </span>
            {spark.length > 1 && (
              <span className="kpi-spark" aria-hidden>
                <ResponsiveContainer width="100%" height={34}>
                  <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <Area type="monotone" dataKey="v" stroke="var(--accent)" fill="var(--accent-soft)" strokeWidth={1.6} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
