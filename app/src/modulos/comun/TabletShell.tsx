import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { LogOut, type LucideIcon } from 'lucide-react'
import { useSesion } from '../../lib/sesion'
import { esDirectiva } from '../../lib/roles'
import { hora } from '../../lib/formato'
import { useConfirmar } from '../../ui'

export function Reloj() {
  const [ahora, setAhora] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 15000); return () => clearInterval(t) }, [])
  return <span className="num bold" style={{ fontSize: 'var(--text-lg)' }} aria-label={`Hora ${hora(ahora)}`}>{hora(ahora)}</span>
}

/** Estructura de las tablets de barra y portería: encabezado con marca, pestañas en pill, hora y salida. */
export function TabletShell({ marca, pestanas, tono, children, id }: {
  marca: ReactNode; pestanas: { a: string; etiqueta: string; icono: LucideIcon; fin?: boolean }[]; tono?: 'arena'; children: ReactNode; id: string
}) {
  const { perfil, salir } = useSesion()
  const navegar = useNavigate()
  const confirmar = useConfirmar()
  const reducir = useReducedMotion()
  return (
    <div className={`tablet ${tono ?? ''}`}>
      <header className="tablet-top">
        {marca}
        <nav className="tabs" aria-label="Secciones" style={{ marginLeft: 8, background: tono === 'arena' ? 'rgba(255,255,255,0.45)' : undefined }}>
          {pestanas.map((p) => (
            <NavLink key={p.a} to={p.a} end={p.fin} className="tab" style={{ minHeight: 50 }}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId={`tab-${id}`} className="tab-fondo" transition={reducir ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.4 }} />}
                  <p.icono aria-hidden />
                  <span className="tab-texto">{p.etiqueta}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="grow" />
        <Reloj />
        {esDirectiva(perfil?.rol) && <a className="btn btn-ghost btn-sm" href="/app/admin">Panel</a>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={async () => {
          if (await confirmar({ titulo: '¿Cerrar la sesión de esta tablet?', texto: 'Para volver a usarla habrá que ingresar con el correo y la clave.', confirmar: 'Cerrar sesión' })) { await salir(); navegar('/ingresar', { replace: true }) }
        }}><LogOut aria-hidden /><span>Salir</span></button>
      </header>
      <main className="tablet-cuerpo" id="contenido">{children}</main>
    </div>
  )
}
