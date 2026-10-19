import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import hist from '../data/series.json'
import { fmt, tone } from '../format.js'

const MODES = [
  { id: 'orig', label: 'Serie original', lag: 0 },
  { id: 'qoq', label: 'Var. trimestral', lag: 1 },
  { id: 'yoy', label: 'Var. trimestral interanual', lag: 4 },
]
const PRESETS = [{ n: 8, label: '8 trim.' }, { n: 12, label: '12 trim.' }, { n: 20, label: '20 trim.' }, { n: 0, label: 'Todo' }]
const ql = (s) => `${s.slice(5)}T ${s.slice(2, 4)}` // "2024T3" -> "3T 24"
const qlong = (s) => `${s.slice(5)}° trim. ${s.slice(0, 4)}`

// Valor mostrado según modalidad
function cellFor(s, i, mode) {
  const v = s.values[i]
  if (v == null) return { v: null }
  if (mode.lag === 0) return { v, k: s.type === 'rate' ? 'pts' : 'num' }
  const p = s.values[i - mode.lag]
  if (p == null || i - mode.lag < 0) return { v: null }
  if (s.type === 'idx') return p === 0 ? { v: null } : { v: v / p - 1, k: 'pct' }
  if (s.type === 'rate') return { v: v - p, k: 'pp' }
  return { v: v - p, k: 'dif' } // saldos: variación absoluta
}

function SeriesPanel({ s, mode, from, to, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const data = []
  for (let i = from; i <= to; i++) { const c = cellFor(s, i, mode); data.push({ label: ql(hist.qs[i]), v: c.v, c }) }
  const kind = data.find((d) => d.c.k)?.c.k
  const tick = (v) => fmt({ v, k: kind })
  const isVar = mode.lag > 0
  return (
    <div className="scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={s.label} onClick={(e) => e.stopPropagation()}>
        <header>
          <div><p className="crumb">{s.group} · {mode.label}</p><h2>{s.label}</h2></div>
          <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <figure className="chart">
          <figcaption><b>{mode.label}</b><span> · {isVar ? (s.type === 'idx' ? '%' : s.type === 'rate' ? 'p.p.' : s.unit) : s.unit}</span></figcaption>
          <ResponsiveContainer width="100%" height={260}>
            {isVar ? (
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={64} tickFormatter={tick} />
                <Tooltip formatter={(v) => tick(v)} contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12 }} />
                <ReferenceLine y={0} stroke="var(--muted)" />
                <Bar dataKey="v" isAnimationActive={false}>
                  {data.map((d, i) => <Cell key={i} fill={d.v != null && d.v < 0 ? 'var(--neg)' : 'var(--accent)'} />)}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={64} tickFormatter={tick} domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => tick(v)} contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12 }} />
                <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </figure>
        <dl className="meta-list">
          <div><dt>Unidad</dt><dd>{s.unit}</dd></div>
          <div><dt>Agregación a trimestre</dt><dd>{{ avg: 'Promedio', sum: 'Suma', eop: 'Fin de período' }[s.agg]}{s.sa ? ' · serie desestacionalizada' : ''}</dd></div>
          <div><dt>ID de la serie</dt><dd><code>{s.id}</code></dd></div>
          {s.last && <div><dt>Último trimestre</dt><dd>{qlong(s.last)}</dd></div>}
          {s.status === 'stale' && <div><dt>Estado</dt><dd className="warn">Serie discontinuada o desactualizada (sin datos hace más de 2 años). Fijá otro ID en data/series-overrides.json.</dd></div>}
          {s.status === 'search' && <div><dt>Estado</dt><dd className="warn">Elegida por búsqueda automática: verificá que sea la serie correcta.</dd></div>}
          {s.status === 'cache' && <div><dt>Estado</dt><dd className="warn">La API no respondió; se muestran los últimos datos guardados.</dd></div>}
          {s.title && <div><dt>Descripción</dt><dd>{s.title}</dd></div>}
          {s.source && <div><dt>Fuente</dt><dd>{s.source}</dd></div>}
          {s.id && !String(s.id).includes('−') && (
            <div><dt>Consulta a la API</dt><dd><a href={`https://apis.datos.gob.ar/series/api/series/?ids=${s.id}&collapse=quarter&format=json`} target="_blank" rel="noreferrer">Ver datos en datos.gob.ar</a></dd></div>
          )}
        </dl>
      </aside>
    </div>
  )
}

function toCSV(rows, cols, mode) {
  const head = ['Variable', 'Unidad', ...cols.map((i) => hist.qs[i])]
  const lines = [head, ...rows.map((s) => [s.label, s.unit, ...cols.map((i) => { const c = cellFor(s, i, mode); return c.v == null ? '' : (c.k === 'pct' ? (c.v * 100).toFixed(2) : c.v.toFixed(4)) })])]
  return lines.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n')
}

const TABS = {
  series: { title: 'Series trimestrales', lede: 'Histórico de las principales variables en frecuencia trimestral, desde la API de Series de Tiempo (datos.gob.ar).' },
  balance: { title: 'Balance cambiario', lede: 'Flujos del mercado de cambios (BCRA) en millones de US$, sumados por trimestre. Fuente: API de Series de Tiempo (datos.gob.ar).' },
}

export default function History({ query, tab = 'series' }) {
  const T = TABS[tab]
  const all = useMemo(() => hist.series.filter((s) => (s.tab ?? 'series') === tab), [tab])
  const nq = hist.qs.length
  // Último trimestre con al menos un dato
  const last = useMemo(() => {
    for (let i = nq - 1; i >= 0; i--) if (all.some((s) => s.values?.[i] != null)) return i
    return nq - 1
  }, [nq, all])
  const [modeId, setModeId] = useState('orig')
  const [to, setTo] = useState(last)
  const [from, setFrom] = useState(Math.max(0, last - 11))
  const [sel, setSel] = useState(null)
  const wrap = useRef(null)
  const mode = MODES.find((m) => m.id === modeId)

  const cols = useMemo(() => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i), [from, to])
  useEffect(() => { if (wrap.current) wrap.current.scrollLeft = wrap.current.scrollWidth }, [from, to, modeId])

  if (!nq || !all.some((s) => s.values)) {
    return (
      <>
        <h1 className="page-title">{T.title}</h1>
        <div className="empty">
          <b>No se pudieron cargar las series históricas.</b>
          <p>La API de Series de Tiempo (datos.gob.ar) no respondió durante el último build. Volvé a desplegar o corré <code>npm run series</code> para reintentar.</p>
        </div>
      </>
    )
  }

  const q = query.trim().toLowerCase()
  const visible = all.filter((s) => s.values && (!q || s.label.toLowerCase().includes(q)))
  const missing = all.filter((s) => !s.values)
  const setPreset = (n) => { setTo(last); setFrom(n ? Math.max(0, last - n + 1) : 0) }
  const onFrom = (v) => { setFrom(+v); if (+v > to) setTo(+v) }
  const onTo = (v) => { setTo(+v); if (+v < from) setFrom(+v) }
  const download = () => {
    const blob = new Blob(['\ufeff' + toCSV(visible, cols, mode)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `econsur-${tab}-${modeId}-${hist.qs[from]}-${hist.qs[to]}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  let prevGroup = null
  return (
    <>
      <h1 className="page-title">{T.title}</h1>
      <p className="lede">{T.lede}</p>

      <div className="toolbar hist-tools">
        <div className="seg" role="tablist" aria-label="Modalidad">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={modeId === m.id} className={modeId === m.id ? 'on' : ''} onClick={() => setModeId(m.id)}>{m.label}</button>
          ))}
        </div>
        <label className="sel">Desde
          <select value={from} onChange={(e) => onFrom(e.target.value)}>
            {hist.qs.map((s, i) => <option key={s} value={i}>{qlong(s)}</option>)}
          </select>
        </label>
        <label className="sel">Hasta
          <select value={to} onChange={(e) => onTo(e.target.value)}>
            {hist.qs.map((s, i) => <option key={s} value={i}>{qlong(s)}</option>)}
          </select>
        </label>
        <div className="seg small" aria-label="Rangos rápidos">
          {PRESETS.map((p) => <button key={p.label} onClick={() => setPreset(p.n)}>{p.label}</button>)}
        </div>
        <button className="btn" onClick={download}>Descargar CSV</button>
      </div>

      <div className="tablewrap hist" ref={wrap}>
        <table>
          <thead>
            <tr>
              <th className="lbl">Variable</th>
              {cols.map((i) => <th key={i} title={qlong(hist.qs[i])}>{ql(hist.qs[i])}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const head = s.group !== prevGroup
              prevGroup = s.group
              return [
                head && <tr key={s.group} className="sub"><td colSpan={cols.length + 1}>{s.group}</td></tr>,
                <tr key={s.key} className="data" tabIndex={0} onClick={() => setSel(s)} onKeyDown={(e) => e.key === 'Enter' && setSel(s)}>
                  <th scope="row" className="lbl" style={s.indent ? { paddingLeft: 10 + 16 * s.indent } : undefined}>
                    {s.label}
                    <small>{mode.lag ? (s.type === 'idx' ? '% var.' : s.type === 'rate' ? 'p.p.' : s.unit) : s.unit}{mode.lag === 1 && !s.sa && s.type === 'idx' ? ' · sin desest.' : ''}{s.status === 'stale' ? ' · discontinuada' : ''}</small>
                  </th>
                  {cols.map((i) => {
                    const c = cellFor(s, i, mode)
                    return <td key={i} className={`num ${c.v == null ? 'na' : mode.lag ? tone(c) : s.type === 'signed' && c.v < 0 ? 'neg' : ''}`}>{fmt(c)}</td>
                  })}
                </tr>,
              ]
            })}
          </tbody>
        </table>
      </div>

      <ul className="notes">
        {tab === 'balance' && <li>Los saldos cambiarios pueden ser negativos, por eso las variaciones se muestran como diferencia absoluta en millones de US$ y no en %. Los valores originales negativos se marcan en rojo.</li>}
        <li>Los trimestres se arman con meses completos: promedio, suma o fin de período según la variable (ver el detalle de cada serie).</li>
        <li>La variación trimestral de series sin desestacionalizar incluye estacionalidad; para esas series conviene leer la variación interanual.</li>
        <li>En tasas (desocupación, actividad, UCII) las variaciones se expresan en puntos porcentuales; en saldos, en diferencia absoluta.</li>
        <li>Pobreza e indigencia no se incluyen porque el INDEC las publica con frecuencia semestral.</li>
        <li>Datos descargados el {new Date(hist.meta.fetchedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}. {hist.meta.ok} de {hist.meta.total} series disponibles.</li>
      </ul>
      {missing.length > 0 && (
        <details className="missing">
          <summary>{missing.length} series sin datos</summary>
          <p>No se encontró (o no respondió) la serie para: {missing.map((s) => s.label).join(', ')}. Se pueden fijar a mano en <code>data/series-overrides.json</code>.</p>
        </details>
      )}
      {sel && <SeriesPanel s={sel} mode={mode} from={from} to={to} onClose={() => setSel(null)} />}
    </>
  )
}
