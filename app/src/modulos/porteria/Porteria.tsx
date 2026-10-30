import { Route, Routes } from 'react-router-dom'
import { DoorOpen, Fingerprint, Users } from 'lucide-react'
import { TabletShell } from '../comun/TabletShell'
import { Ola } from '../../ui'
import Ingreso from './Ingreso'
import Dentro from './Dentro'
import Asistencia from './Asistencia'

export default function Porteria() {
  return (
    <TabletShell id="porteria"
      marca={<span className="wordmark"><Ola /><span>Portería<small>Casino de Pimentel</small></span></span>}
      pestanas={[
        { a: '/porteria', etiqueta: 'Ingresos', icono: DoorOpen, fin: true },
        { a: '/porteria/dentro', etiqueta: 'Dentro hoy', icono: Users },
        { a: '/porteria/asistencia', etiqueta: 'Asistencia', icono: Fingerprint },
      ]}>
      <Routes>
        <Route index element={<Ingreso />} />
        <Route path="dentro" element={<Dentro />} />
        <Route path="asistencia" element={<Asistencia />} />
      </Routes>
    </TabletShell>
  )
}
