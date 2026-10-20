import { useCallback, useEffect, useMemo, useState } from 'react'
import data from './data/indec.json'
import BlockTable from './components/BlockTable.jsx'
import KpiStrip, { pickKpis } from './components/KpiStrip.jsx'
import Drawer from './components/Drawer.jsx'
import History from './components/History.jsx'
import Emae from './components/Emae.jsx'
import Ipi from './components/Ipi.jsx'

const TABS = [data.main, { id: 'series-trimestrales', name: 'Series trimestrales' }, { id: 'balance-cambiario', name: 'Balance cambiario' }, { id: 'emae', name: 'EMAE' }, { id: 'ipi', name: 'IPI manufacturero' }, ...data.sheets, { id: 'fuentes', name: 'Fuentes' }]
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const fmtDate = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

const useHash = () => {
  const get = () => decodeURIComponent(location.hash.replace(/^#\/?/, '')) || data.main.id
  const [h, setH] = useState(get)
  useEffect(() => {
    const f = () => setH(get())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return h
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#F2B632" />
      <g fill="#10243A"><circle cx="16" cy="6.5" r="2.4" /><circle cx="16" cy="25.5" r="2.4" /><circle cx="7" cy="16" r="2.4" /><circle cx="25" cy="16" r="2.4" /></g>
      <circle cx="21.5" cy="21" r="1.4" fill="#10243A" />
    </svg>
  )
}

function Main({ query, onPick }) {
  const kpis = useMemo(() => pickKpis(data.main.blocks), [])
  const freqs = useMemo(() => [...new Set(data.main.blocks.map((b) => b.freq).filter(Boolean))], [])
  const [freq, setFreq] = useState('todos')
  const blocks = data.main.blocks.filter((b) => freq === 'todos' || b.freq === freq)

  let prevTitle = null
  return (
    <>
      <h1 className="page-title">Principales variables</h1>
      <KpiStrip items={kpis} onPick={onPick} />
      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Frecuencia">
          {['todos', ...freqs].map((f) => (
            <button key={f} role="tab" aria-selected={freq === f} className={freq === f ? 'on' : ''} onClick={() => setFreq(f)}>
              {cap(f)}
            </button>
          ))}
        </div>
      </div>
      {blocks.map((b) => {
        const show = b.title !== prevTitle
        prevTitle = b.title
        return (
          <div key={b.id}>
            {show && <h2 className="sec">{b.title}<small>{b.freq ? `Indicadores ${b.freq}` : ''}</small></h2>}
            <BlockTable block={b} query={query} onPick={onPick} />
          </div>
        )
      })}
    </>
  )
}

function Sheet({ sheet, query, onPick }) {
  return (
    <>
      <h1 className="page-title">{sheet.name}</h1>
      {sheet.subtitle && sheet.subtitle !== sheet.name && <p className="lede">{sheet.subtitle}</p>}
      {sheet.blocks.map((b) => (
        <div key={b.id}>
          {b.title && <h2 className="sec">{b.title}</h2>}
          <BlockTable block={b} query={query} onPick={onPick} />
        </div>
      ))}
    </>
  )
}

function Sources() {
  return (
    <>
      <h1 className="page-title">Fuentes</h1>
      <p className="lede">Enlaces del INDEC para ampliar cada indicador.</p>
      <div className="sources">
        {data.sources.map((g) => (
          <section key={g.group}>
            <h2 className="sec">{g.group}</h2>
            <ul>
              {g.items.map((i) => (
                <li key={i.url + i.label}><a href={i.url} target="_blank" rel="noreferrer">{i.label}</a></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

export default function App() {
  const hash = useHash()
  const tab = TABS.find((t) => t.id === hash) ?? TABS[0]
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(null)
  const onPick = useCallback((block, row) => setSel({ block, row }), [])
  useEffect(() => { window.scrollTo(0, 0); setQuery('') }, [tab.id])
  const { meta } = data

  return (
    <>
      <header className="top">
        <div className="brand"><Logo /><div><strong>EconSur Macro</strong><span>Indicadores del INDEC</span></div></div>
        {tab.id !== 'fuentes' && (
          <label className="search">
            <span className="sr">Buscar indicador</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar indicador…" />
          </label>
        )}
      </header>
      <nav className="tabs" aria-label="Secciones">
        {TABS.map((t) => (
          <a key={t.id} href={`#/${t.id}`} className={t.id === tab.id ? 'on' : ''} aria-current={t.id === tab.id ? 'page' : undefined}>
            {t.name}
          </a>
        ))}
      </nav>
      <main>
        {tab.id === 'principales' ? <Main query={query} onPick={onPick} />
          : tab.id === 'series-trimestrales' ? <History key="s" query={query} tab="series" />
          : tab.id === 'balance-cambiario' ? <History key="b" query={query} tab="balance" />
          : tab.id === 'emae' ? <Emae key="e" query={query} />
          : tab.id === 'ipi' ? <Ipi key="i" query={query} />
          : tab.id === 'fuentes' ? <Sources />
          : <Sheet sheet={tab} query={query} onPick={onPick} />}
      </main>
      <footer>
        <span>Fuente: INDEC. Datos del archivo <code>{meta.source}</code>{meta.refreshDate ? `, actualizado el ${fmtDate(meta.refreshDate)}` : ''}.</span>
        {meta.errors > 0 && (
          <span>{meta.errors} de {meta.cells} celdas no tienen dato en el Excel de origen y se muestran con “—”.</span>
        )}
      </footer>
      <Drawer sel={sel} onClose={() => setSel(null)} />
    </>
  )
}
