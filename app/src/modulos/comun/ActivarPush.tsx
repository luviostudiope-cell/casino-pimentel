import { useEffect, useState } from 'react'
import { BellRing, Share } from 'lucide-react'
import { activarPush, desactivarPush, estadoPush, type EstadoPush } from '../../lib/push'
import { Aviso, Interruptor, useToast } from '../../ui'

/** Interruptor de notificaciones en el celular, con la explicación para iPhone. */
export function ActivarPush() {
  const avisar = useToast()
  const [estado, setEstado] = useState<EstadoPush | null>(null)
  useEffect(() => { estadoPush().then(setEstado).catch(() => setEstado('no-soportado')) }, [])
  if (!estado) return null
  if (estado === 'ios-instalar') {
    return <Aviso icono={<Share aria-hidden />}>Para recibir notificaciones en iPhone, primero toca <b>Compartir</b> y luego <b>"Agregar a pantalla de inicio"</b>. Después abre la app desde ese ícono.</Aviso>
  }
  if (estado === 'no-soportado') return <Aviso tono="alerta">Este navegador no permite notificaciones. Igual las verás aquí dentro.</Aviso>
  if (estado === 'sin-clave') return null
  if (estado === 'bloqueado') return <Aviso tono="alerta">Bloqueaste las notificaciones. Actívalas en la configuración del navegador para este sitio.</Aviso>
  return (
    <div className="card" style={{ padding: '8px 20px' }}>
      <Interruptor etiqueta="Notificaciones en este celular" descripcion="Te avisamos de pagos, reservas y noticias del club."
        activo={estado === 'activo'}
        onCambio={async (v) => {
          try {
            if (v) { await activarPush(); avisar('Listo. Te llegarán las notificaciones.') } else { await desactivarPush(); avisar('Notificaciones desactivadas.', 'info') }
            setEstado(await estadoPush())
          } catch (e) { avisar((e as Error).message, 'error') }
        }} />
      <span className="sr-only"><BellRing /></span>
    </div>
  )
}
