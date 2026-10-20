import data from '../data/emae.json'
import MonthlyTable from './MonthlyTable.jsx'

export default function Emae({ query }) {
  return (
    <MonthlyTable query={query} data={data} name="EMAE" title="EMAE" fileTag="emae" noun="los sectores"
      lede="Estimador Mensual de Actividad Económica (INDEC, base 2004=100): nivel general y sectores, en distintas variaciones. Fuente: API de Series de Tiempo (datos.gob.ar)." />
  )
}
