import { Database } from 'lucide-react'
import { Vacio, Wordmark } from '../../ui'

export default function SinConfigurar() {
  return (
    <main className="acceso">
      <div className="acceso-caja card stack" style={{ alignItems: 'center' }}>
        <Wordmark />
        <Vacio icono={<Database />} titulo="Falta conectar la base de datos"
          texto="La app aún no tiene la dirección del servidor. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY y vuelve a publicar."
          accion={<a className="btn btn-secondary" href="/app/sistema">Ver el sistema de diseño</a>} />
      </div>
    </main>
  )
}
