import { useCallback, useState } from 'react'
import { Hand } from 'lucide-react'
import { Aviso, Carnet, Chips, EjemploTag } from '../../ui'
import { useSocio } from './Socio'
import { PARENTESCO, estadoCarnet, tokenCarnet } from './datos'

export default function CarnetPantalla() {
  const { familia } = useSocio()
  const { miembros, socio, cuenta } = familia
  const [sel, setSel] = useState(miembros[0]?.id ?? '')
  const m = miembros.find((x) => x.id === sel) ?? miembros[0]
  const est = estadoCarnet(cuenta)
  const obtener = useCallback(() => tokenCarnet(m.id), [m.id])
  if (!m) return null
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <div>
        <h1>Carnet</h1>
        <p className="page-lead">Muéstralo en portería para entrar al club.</p>
      </div>
      {miembros.length > 1 && (
        <Chips etiqueta="Carnet de" scroll valor={sel} onCambio={setSel}
          opciones={miembros.map((x) => ({ valor: x.id, etiqueta: `${x.nombres.split(' ')[0]} · ${PARENTESCO[x.parentesco]}` }))} />
      )}
      <Carnet key={m.id} obtenerToken={obtener}
        datos={{ nombre: `${m.nombres} ${m.apellidos}`, tipo: PARENTESCO[m.parentesco], numero: socio.numero, foto: m.foto, estado: est.estado, estadoTexto: est.texto }} />
      <Aviso icono={<Hand aria-hidden />}>
        <b>Toca la tarjeta</b> para mostrar el código. El portero lo lee con su tablet. El código cambia cada 30 segundos, así que una foto del código no sirve.
      </Aviso>
      {!m.puede_ingresar && <Aviso tono="peligro">Este carnet tiene el ingreso suspendido. Consulta en administración.</Aviso>}
      {m.es_ejemplo && <EjemploTag texto="Socio de ejemplo" />}
    </div>
  )
}
