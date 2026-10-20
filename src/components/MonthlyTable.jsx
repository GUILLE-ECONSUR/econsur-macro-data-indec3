import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmt, tone } from '../format.js'

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const ml = (ym) => `${MES[+ym.slice(5, 7) - 1]}-${ym.slice(2, 4)}`
const mlong = (ym) => `${MESL[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`

// ---- cálculo de variaciones sobre un arreglo de niveles (null = sin dato) ----
const ma3 = (v) => v.map((_, i) => (i >= 2 && v[i] != null && v[i - 1] != null && v[i - 2] != null ? (v[i] + v[i - 1] + v[i - 2]) / 3 : null))
const pc = (a, lag) => a.map((x, i) => (i >= lag && x != null && a[i - lag] != null && a[i - lag] !== 0 ? x / a[i - lag] - 1 : null))
const monthOf = (ym) => +ym.slice(5, 7) - 1
// YTD punta a punta: nivel del mes vs diciembre del año anterior
const ytd = (a, months) => a.map((x, i) => { const j = i - monthOf(months[i]) - 1; return j >= 0 && x != null && a[j] != null ? x / a[j] - 1 : null })
// YTD i.a.: promedio enero-mes vs promedio enero-mes del año anterior
const ytdYoy = (a, months) => a.map((_, i) => {
  const m = monthOf(months[i]); if (i - 12 - m < 0) return null
  let s1 = 0, s0 = 0
  for (let k = 0; k <= m; k++) { const x = a[i - k], y = a[i - k - 12]; if (x == null || y == null) return null; s1 += x; s0 += y }
  return s0 ? s1 / s0 - 1 : null
})

const MODES = [
  { id: 'nivel', label: 'Nivel original', kind: 'idx', fn: (s) => s.orig, desc: 'Índice base 2004=100, serie original.' },
  { id: 'nivel_sa', label: 'Nivel desest.', kind: 'idx', fn: (s) => s.sa, needsSA: true, desc: 'Índice desestacionalizado: oficial del INDEC para el nivel general; estimación propia para los sectores.' },
  { id: 'm', label: 'Mensual', kind: 'pct', fn: (s) => pc(s.orig, 1), desc: 'Variación del mes contra el mes anterior (serie original, incluye estacionalidad).' },
  { id: 'q', label: 'Trimestral', kind: 'pct', fn: (s) => pc(ma3(s.orig), 3), desc: 'Promedio de los últimos 3 meses contra el promedio de los 3 meses previos (trimestre móvil).' },
  { id: 'yoy', label: 'Mensual i.a.', kind: 'pct', fn: (s) => pc(s.orig, 12), desc: 'Variación del mes contra el mismo mes del año anterior.' },
  { id: 'qyoy', label: 'Trimestral i.a.', kind: 'pct', fn: (s) => pc(ma3(s.orig), 12), desc: 'Promedio de los últimos 3 meses contra el mismo trimestre móvil del año anterior.' },
  { id: 'ytd', label: 'YTD', kind: 'pct', fn: (s, m) => ytd(s.orig, m), desc: 'Nivel del mes contra diciembre del año anterior (punta a punta, serie original).' },
  { id: 'ytdyoy', label: 'YTD i.a.', kind: 'pct', fn: (s, m) => ytdYoy(s.orig, m), desc: 'Acumulado del año: promedio de enero al mes contra igual período del año anterior.' },
  { id: 'msa', label: 'Mensual desest.', kind: 'pct', fn: (s) => (s.sa ? pc(s.sa, 1) : s.orig.map(() => null)), needsSA: true, desc: 'Variación mensual de la serie desestacionalizada (oficial para el nivel general; estimación propia para los sectores).' },
]
const PRESETS = [{ n: 12, label: '12 m' }, { n: 24, label: '24 m' }, { n: 60, label: '5 años' }, { n: 0, label: 'Todo' }]

function SeriesPanel({ s, mode, vals, from, to, data, name, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const idx = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const isLevel = mode.kind === 'idx'
  const pts = idx.map((i) => ({
    label: ml(data.months[i]), v: vals[i], o: s.orig?.[i] ?? null, sa: s.sa?.[i] ?? null,
  }))
  const tick = (v) => fmt({ v, k: mode.kind })
  const tip = { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12 }
  const ax = { tick: { fontSize: 11, fill: 'var(--muted)' }, tickLine: false }
  return (
    <div className="scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={s.label} onClick={(e) => e.stopPropagation()}>
        <header>
          <div><p className="crumb">{name} · {mode.label}</p><h2>{s.label}</h2></div>
          <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <figure className="chart">
          <figcaption><b>{mode.label}</b><span> · {isLevel ? 'índice 2004=100' : '%'}</span></figcaption>
          <ResponsiveContainer width="100%" height={270}>
            {isLevel ? (
              <LineChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" {...ax} interval="preserveStartEnd" />
                <YAxis {...ax} axisLine={false} width={56} tickFormatter={tick} domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => tick(v)} contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {(mode.id === 'nivel' || !s.sa) && <Line name="Original" type="monotone" dataKey="o" stroke="var(--accent)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />}
                {s.sa && <Line name={s.saKind === 'oficial' ? 'Desest. (INDEC)' : 'Desest. (estimación propia)'} type="monotone" dataKey="sa" stroke="var(--sun)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />}
              </LineChart>
            ) : (
              <BarChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" {...ax} interval="preserveStartEnd" />
                <YAxis {...ax} axisLine={false} width={56} tickFormatter={tick} />
                <Tooltip formatter={(v) => tick(v)} contentStyle={tip} />
                <ReferenceLine y={0} stroke="var(--muted)" />
                <Bar dataKey="v" isAnimationActive={false}>
                  {pts.map((d, i) => <Cell key={i} fill={d.v != null && d.v < 0 ? 'var(--neg)' : 'var(--accent)'} />)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </figure>
        <p className="lede" style={{ margin: '4px 0 0', fontSize: 12 }}>{mode.desc}</p>
        <dl className="meta-list">
          <div><dt>ID serie original</dt><dd><code>{s.id}</code></dd></div>
          {s.saId && <div><dt>ID desestacionalizada</dt><dd><code>{s.saId}</code></dd></div>}
          <div><dt>Desestacionalización</dt><dd>{s.saKind === 'oficial' ? 'Serie oficial del INDEC' : s.saKind === 'propia' ? 'Estimación propia (descomposición clásica multiplicativa)' : 'No disponible'}</dd></div>
          {s.title && <div><dt>Descripción</dt><dd>{s.title}</dd></div>}
          {s.last && <div><dt>Último dato</dt><dd>{mlong(s.last)}</dd></div>}
          {s.filled?.length > 0 && <div><dt>Meses reconstruidos</dt><dd>{s.filled.map(mlong).join(', ')} (calculados con la variación oficial publicada en la API)</dd></div>}
          {s.gaps?.length > 0 && <div><dt>Meses sin dato en la API</dt><dd className="warn">{s.gaps.length}: {s.gaps.slice(-12).map(ml).join(', ')}{s.gaps.length > 12 ? ', …' : ''}</dd></div>}
          {s.status === 'stale' && <div><dt>Estado</dt><dd className="warn">Serie sin datos hace más de 2 años: revisá el ID en data/series-overrides.json.</dd></div>}
          {s.status === 'cache' && <div><dt>Estado</dt><dd className="warn">La API no respondió; se muestran los últimos datos guardados.</dd></div>}
          <div><dt>Consulta a la API</dt><dd><a href={`https://apis.datos.gob.ar/series/api/series/?ids=${s.id}&format=json`} target="_blank" rel="noreferrer">Ver datos en datos.gob.ar</a></dd></div>
        </dl>
      </aside>
    </div>
  )
}

export default function MonthlyTable({ query, data, name, title, lede, noun, fileTag, defaultMode = 'yoy' }) {
  const n = data.months.length
  const [modeId, setModeId] = useState(defaultMode)
  const [to, setTo] = useState(n - 1)
  const [from, setFrom] = useState(Math.max(0, n - 18))
  const [sel, setSel] = useState(null)
  const wrap = useRef(null)
  const mode = MODES.find((m) => m.id === modeId)

  // variación completa por serie para la modalidad elegida (se recalcula solo al cambiar de modalidad)
  const computed = useMemo(() => {
    const out = {}
    for (const s of data.series) out[s.key] = s.orig ? mode.fn(s, data.months) : null
    return out
  }, [mode])
  const cols = useMemo(() => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i), [from, to])
  useEffect(() => { if (wrap.current) wrap.current.scrollLeft = wrap.current.scrollWidth }, [from, to, modeId])

  if (!n || !data.meta.ok) {
    return (
      <>
        <h1 className="page-title">{title}</h1>
        <div className="empty"><b>No se pudieron cargar las series: {name}.</b>
          <p>La API de Series de Tiempo no respondió durante el último build. Volvé a desplegar o corré <code>npm run {fileTag}</code>.</p></div>
      </>
    )
  }

  const q = query.trim().toLowerCase()
  const rows = data.series.filter((s) => s.orig && (!q || s.label.toLowerCase().includes(q)))
  const missing = data.series.filter((s) => !s.orig)
  const cell = (s, i) => { const v = computed[s.key]?.[i]; return v == null ? { v: null } : { v, k: mode.kind } }
  const filledSet = useMemo(() => Object.fromEntries(data.series.map((s) => [s.key, new Set(s.filled ?? [])])), [])
  const gapSet = useMemo(() => Object.fromEntries(data.series.map((s) => [s.key, new Set(s.gaps ?? [])])), [])
  const setPreset = (k) => { setTo(n - 1); setFrom(k ? Math.max(0, n - k) : 0) }
  const onFrom = (v) => { setFrom(+v); if (+v > to) setTo(+v) }
  const onTo = (v) => { setTo(+v); if (+v < from) setFrom(+v) }
  const download = () => {
    const head = ['Serie', 'Grupo', ...cols.map((i) => data.months[i])]
    const lines = [head, ...rows.map((s) => [s.label, s.group, ...cols.map((i) => { const c = cell(s, i); return c.v == null ? '' : mode.kind === 'pct' ? (c.v * 100).toFixed(2) : c.v.toFixed(2) })])]
    const csv = lines.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `econsur-${fileTag}-${modeId}-${data.months[from]}-${data.months[to]}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  let prev = null
  const ctrl = data.meta.control
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="lede">{lede}</p>

      <div className="toolbar hist-tools">
        <div className="seg wrap" role="tablist" aria-label="Variación">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={modeId === m.id} className={modeId === m.id ? 'on' : ''} title={m.desc} onClick={() => setModeId(m.id)}>{m.label}</button>
          ))}
        </div>
      </div>
      <div className="toolbar hist-tools" style={{ marginTop: 0 }}>
        <label className="sel">Desde
          <select value={from} onChange={(e) => onFrom(e.target.value)}>{data.months.map((m, i) => <option key={m} value={i}>{mlong(m)}</option>)}</select>
        </label>
        <label className="sel">Hasta
          <select value={to} onChange={(e) => onTo(e.target.value)}>{data.months.map((m, i) => <option key={m} value={i}>{mlong(m)}</option>)}</select>
        </label>
        <div className="seg small" aria-label="Rangos rápidos">
          {PRESETS.map((p) => <button key={p.label} onClick={() => setPreset(p.n)}>{p.label}</button>)}
        </div>
        <button className="btn" onClick={download}>Descargar CSV</button>
      </div>
      <p className="mode-desc"><b>{mode.label}:</b> {mode.desc}</p>

      <div className="tablewrap hist" ref={wrap}>
        <table>
          <thead>
            <tr>
              <th className="lbl">Serie</th>
              {cols.map((i) => <th key={i} title={mlong(data.months[i])}>{ml(data.months[i])}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const head = s.group !== prev
              prev = s.group
              return [
                head && <tr key={s.group} className="sub"><td colSpan={cols.length + 1}>{s.group}</td></tr>,
                <tr key={s.key} className="data" tabIndex={0} onClick={() => setSel(s)} onKeyDown={(e) => e.key === 'Enter' && setSel(s)}>
                  <th scope="row" className={`lbl ${s.head ? 'head' : ''}`} style={s.level ? { paddingLeft: 10 + 18 * s.level } : undefined}>
                    {s.label}
                    {(() => { const k = cols.filter((i) => gapSet[s.key].has(data.months[i])).length; return k > 0 ? <small className="warn">{k} {k === 1 ? 'mes sin dato' : 'meses sin dato'} en el período</small> : null })()}
                    {mode.needsSA && <small>{s.saKind === 'oficial' ? 'desest. oficial INDEC' : s.saKind === 'propia' ? 'desest. estimación propia' : 'sin desestacionalizar'}</small>}
                  </th>
                  {cols.map((i) => {
                    const c = cell(s, i), ym = data.months[i]
                    const isFilled = filledSet[s.key].has(ym), isGap = gapSet[s.key].has(ym)
                    const title = isFilled ? 'Mes reconstruido con la variación oficial publicada (la API no trae el nivel)' : isGap ? 'Sin dato en la API de datos.gob.ar' : c.v == null ? 'No calculable: falta un dato de referencia' : undefined
                    return <td key={i} title={title} className={`num ${c.v == null ? (isGap ? 'na gap' : 'na') : mode.kind === 'pct' ? tone(c) : ''} ${isFilled ? 'filled' : ''}`}>{fmt(c)}</td>
                  })}
                </tr>,
              ]
            })}
          </tbody>
        </table>
      </div>

      <ul className="notes">
        <li>Series originales (sin desestacionalizar) salvo en “Nivel desest.” y “Mensual desest.”. La variación mensual y el YTD de las series originales incluyen estacionalidad; para comparar {noun} conviene la variación interanual o la mensual desestacionalizada.</li>
        <li>El INDEC publica la desestacionalizada solo para el nivel general. Para {noun} se estima acá con una descomposición clásica multiplicativa (media móvil centrada de 12 meses, factores estacionales de los últimos 10 años). No corrige efectos de calendario ni reemplaza el X-13 del INDEC: los números pueden diferir de los oficiales.{ctrl ? ` Control sobre el nivel general: la variación mensual de la estimación propia tiene correlación ${ctrl.corr.toLocaleString('es-AR')} con la oficial y un desvío medio de ${ctrl.madPp.toLocaleString('es-AR')} p.p. (últimos ${ctrl.months} meses).` : ''} En series muy irregulares (p. ej. producciones puntuales o con quiebres) la estimación es menos confiable.</li>
        <li>Trimestral y trimestral i.a. usan el trimestre móvil (promedio de 3 meses). YTD compara contra diciembre del año anterior; YTD i.a. compara el acumulado enero-mes contra el del año anterior.</li>
        <li>Los meses en blanco (“—”) son meses que la API de datos.gob.ar publica vacíos; las variaciones que dependen de ellos tampoco se pueden calcular.{data.series.some((x) => x.filled?.length) ? ' Cuando existe la serie oficial de variación, el mes se reconstruye y se muestra en cursiva.' : ''} La desestacionalización tolera huecos: los estima solo para calcular los factores y no inventa datos en los meses vacíos.</li>
        <li>Datos descargados el {new Date(data.meta.fetchedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}. {data.meta.ok} de {data.meta.total} series disponibles.</li>
      </ul>
      {(() => {
        const w = data.series.filter((x) => x.orig && (x.gaps?.length || x.filled?.length))
        if (!w.length) return null
        const recent = (x) => x.gaps.filter((m) => m >= data.months[Math.max(0, n - 36)]).length
        return (
          <details className="missing" open>
            <summary>Calidad de datos: {w.filter((x) => x.gaps.length).length} series con meses faltantes en la API</summary>
            <div className="tablewrap" style={{ marginTop: 8, maxWidth: 760 }}>
              <table>
                <thead><tr><th className="lbl">Serie</th><th>Faltantes (total)</th><th>Faltantes (últ. 36 m)</th><th>Reconstruidos</th></tr></thead>
                <tbody>{w.map((x) => <tr key={x.key}><th scope="row" className="lbl">{x.label}</th><td className="num">{x.gaps.length}</td><td className="num">{recent(x)}</td><td className="num">{x.filled.length}</td></tr>)}</tbody>
              </table>
            </div>
          </details>
        )
      })()}
      {missing.length > 0 && (
        <details className="missing"><summary>{missing.length} series sin datos</summary>
          <p>No se encontró (o no respondió): {missing.map((s) => s.label).join(', ')}. Se pueden fijar en <code>data/series-overrides.json</code> con la clave de la serie ({missing.map((s) => s.key).join(', ')}).</p></details>
      )}
      {sel && <SeriesPanel s={sel} mode={mode} vals={computed[sel.key] ?? []} from={from} to={to} data={data} name={name} onClose={() => setSel(null)} />}
    </>
  )
}
