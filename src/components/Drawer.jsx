import { useEffect } from 'react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmt, isNum } from '../format.js'

function Chart({ title, unit, cols, cells }) {
  const data = cols.map((c, i) => ({ label: c.label, v: isNum(cells[i]) ? cells[i].v : null, cell: cells[i] }))
  if (data.every((d) => d.v == null)) return null
  const kind = data.find((d) => d.cell?.k)?.cell.k
  const tick = (v) => fmt({ v, k: kind })
  return (
    <figure className="chart">
      <figcaption><b>{title}</b>{unit ? <span> · {unit}</span> : null}</figcaption>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={64} tickFormatter={tick} />
          <Tooltip formatter={(v) => tick(v)} cursor={{ fill: 'var(--accent-soft)' }}
            contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12 }} />
          <ReferenceLine y={0} stroke="var(--line)" />
          <Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.v != null && d.v < 0 ? 'var(--neg)' : 'var(--accent)'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}

export default function Drawer({ sel, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  if (!sel) return null
  const { block, row } = sel
  // Una fila principal + sus continuaciones (p. ej. "var. % i.a." y "var. % mensual s.e.")
  const idx = block.rows.indexOf(row)
  let start = idx
  while (start > 0 && block.rows[start].cont) start--
  const lines = [block.rows[start]]
  for (let i = start + 1; i < block.rows.length && block.rows[i].cont; i++) lines.push(block.rows[i])
  const main = lines[0]

  return (
    <div className="scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={main.label} onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <p className="crumb">{block.title}</p>
            <h2>{main.label}</h2>
          </div>
          <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        {lines.map((ln, li) =>
          block.groups
            .filter((g) => g.name === 'ref' || g.name === 'recent')
            .map((g) => (
              <Chart key={`${li}${g.name}`} title={g.name === 'ref' ? 'Referencia' : 'Últimos períodos'}
                unit={ln.u[g.name] || main.u[g.name]} cols={g.cols} cells={ln.v[g.name]} />
            )),
        )}
        <dl className="latest">
          {block.groups.filter((g) => g.name === 'latest' || g.name === 'change').flatMap((g) =>
            lines.flatMap((ln) => ln.v[g.name].map((c, i) => isNum(c) && (
              <div key={g.name + i + ln.u[g.name]}>
                <dt>{g.name === 'latest' && g.period ? `${g.cols[i].label} · ${g.period}` : g.cols[i].label}</dt>
                <dd>{fmt(c)}</dd>
              </div>
            ))),
          )}
        </dl>
      </aside>
    </div>
  )
}
