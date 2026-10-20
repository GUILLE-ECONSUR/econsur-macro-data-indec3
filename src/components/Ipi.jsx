import data from '../data/ipi.json'
import MonthlyTable from './MonthlyTable.jsx'

export default function Ipi({ query }) {
  return (
    <MonthlyTable query={query} data={data} name="IPI manufacturero" title="IPI manufacturero" fileTag="ipi" noun="las divisiones y subclases"
      lede="Índice de Producción Industrial manufacturero (INDEC, base 2004=100): nivel general, divisiones y subclases, ordenadas por cadena productiva (agroindustria, insumos, energía, bienes de capital y automotriz). Fuente: API de Series de Tiempo (datos.gob.ar)." />
  )
}
