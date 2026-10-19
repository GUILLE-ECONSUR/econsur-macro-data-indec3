import { fmt, tone, naTitle } from '../format.js'

const GROUP_TITLE = {
  ref: 'Referencia',
  recent: 'Últimos períodos',
  latest: 'Último dato',
  change: 'Variación',
  extra: 'Variación',
}

function Cell({ c }) {
  const na = !c || c.v == null
  return (
    <td className={`num ${na ? 'na' : tone(c)}`} title={naTitle(c)}>
      {fmt(c)}
    </td>
  )
}

// Agrupa las filas en secciones (encabezados) y marca qué filas coinciden con la búsqueda
function useItems(block, query) {
  const q = query.trim().toLowerCase()
  const out = []
  let pending = null
  let parent = null
  for (const r of block.rows) {
    if (r.t === 'h') {
      pending = r
      parent = null
      continue
    }
    if (!r.cont) parent = r
    const hit = !q || (parent?.label || '').toLowerCase().includes(q)
    if (!hit) continue
    if (pending) { out.push(pending); pending = null }
    out.push(r)
  }
  return out
}

export default function BlockTable({ block, query = '', onPick }) {
  const items = useItems(block, query)
  if (!items.length) return null
  const gs = block.groups

  return (
    <section className="block">
      <div className="tablewrap">
        <table>
          <thead>
            <tr className="grp">
              <th rowSpan={2} className="lbl">Indicador</th>
              {gs.map((g) => {
                const span = g.cols.length + (g.unitHeader ? 1 : 0)
                const title = g.name === 'latest' && g.period ? `Último dato · ${g.period}` : GROUP_TITLE[g.name]
                return <th key={g.name} colSpan={span} className={`g-${g.name}`}>{title}</th>
              })}
              {block.hasLast && <th rowSpan={2} className="lastcol">Período</th>}
            </tr>
            <tr className="cols">
              {gs.map((g) => [
                g.unitHeader ? <th key={g.name + 'u'} className="unit">Unidad</th> : null,
                ...g.cols.map((c, i) => <th key={g.name + i} className={`g-${g.name}`}>{c.label}</th>),
              ])}
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) =>
              r.t === 'h' ? (
                <tr key={i} className="sub"><td colSpan={99}>{r.text}</td></tr>
              ) : (
                <tr key={i} className={r.cont ? 'cont' : 'data'} onClick={() => onPick?.(block, r)} tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onPick?.(block, r)}>
                  <th scope="row" className="lbl">
                    {r.cont ? <span className="contmark">↳ {r.u.recent || r.u.ref || r.u.latest}</span> : r.label}
                  </th>
                  {gs.map((g) => [
                    g.unitHeader ? <td key={g.name + 'u'} className="unit">{r.u[g.name]}</td> : null,
                    ...r.v[g.name].map((c, j) => <Cell key={g.name + j} c={c} />),
                  ])}
                  {block.hasLast && <td className="lastcol">{r.last ?? ''}</td>}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
