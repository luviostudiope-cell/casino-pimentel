import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Bell, CalendarDays, Home, IdCard, Megaphone, UserRound, Wallet } from 'lucide-react'
import { useSesion } from '../../lib/sesion'
import { useDatos, useEnVivo } from '../../lib/datos'
import { supabase } from '../../lib/supabase'
import { Avatar, Boton, EsqueletoLista, Vacio, Wordmark } from '../../ui'
import { cargarFamilia } from './datos'
import Bienvenida from './Bienvenida'

const Inicio = lazy(() => import('./Inicio'))
const CarnetPantalla = lazy(() => import('./CarnetPantalla'))
const Cuenta = lazy(() => import('./Cuenta'))
const Reservas = lazy(() => import('./Reservas'))
const Avisos = lazy(() => import('./Avisos'))
const Perfil = lazy(() => import('./Perfil'))
const Notificaciones = lazy(() => import('../comun/Notificaciones'))

type Familia = Awaited<ReturnType<typeof cargarFamilia>>
interface Ctx { familia: Familia; recargar: () => Promise<void> }
const SocioCtx = createContext<Ctx | null>(null)
export const useSocio = () => {
  const c = useContext(SocioCtx)
  if (!c) throw new Error('useSocio fuera de Socio')
  return c
}

const PESTANAS = [
  { a: '/socio', etiqueta: 'Inicio', icono: Home, fin: true },
  { a: '/socio/carnet', etiqueta: 'Carnet', icono: IdCard },
  { a: '/socio/cuenta', etiqueta: 'Mi cuenta', icono: Wallet },
  { a: '/socio/reservas', etiqueta: 'Reservas', icono: CalendarDays },
  { a: '/socio/avisos', etiqueta: 'Avisos', icono: Megaphone },
]

export default function Socio() {
  const { perfil } = useSesion()
  const reducir = useReducedMotion()
  const loc = useLocation()
  const navegar = useNavigate()
  const { datos, cargando, error, recargar } = useDatos(() => cargarFamilia(perfil!.socio_id!), [perfil?.socio_id])
  const [sinLeer, setSinLeer] = useState(0)
  const [bienvenida, setBienvenida] = useState(() => { try { return !localStorage.getItem('cp-bienvenida-socio') } catch { return false } })

  const contarNoLeidas = async () => {
    const { count } = await supabase.from('notificaciones').select('id', { count: 'exact', head: true }).eq('leida', false)
    setSinLeer(count ?? 0)
  }
  useEffect(() => { contarNoLeidas() }, [loc.pathname])
  useEnVivo(['notificaciones'], contarNoLeidas)
  useEnVivo(['pagos', 'reservas_cancha'], () => recargar(true))

  if (bienvenida) return <Bienvenida onTerminar={() => { try { localStorage.setItem('cp-bienvenida-socio', '1') } catch { /* */ } setBienvenida(false) }} />

  const titular = datos?.miembros.find((m) => m.parentesco === 'titular')

  return (
    <div className="socio">
      <header className="socio-top">
        <Wordmark href="/app/socio" />
        <div className="row" style={{ ['--gap' as string]: '8px' }}>
          <button type="button" className="icon-btn" aria-label={`Notificaciones${sinLeer ? `, ${sinLeer} sin leer` : ''}`} onClick={() => navegar('/socio/notificaciones')} style={{ position: 'relative' }}>
            <Bell aria-hidden />
            {sinLeer > 0 && <span className="badge" style={{ position: 'absolute', top: -2, right: -2 }}>{sinLeer > 9 ? '9+' : sinLeer}</span>}
          </button>
          <button type="button" className="icon-btn" aria-label="Mi perfil" onClick={() => navegar('/socio/perfil')} style={{ padding: 0, overflow: 'hidden' }}>
            {titular ? <Avatar nombre={`${titular.nombres} ${titular.apellidos}`} foto={titular.foto} /> : <UserRound aria-hidden />}
          </button>
        </div>
      </header>
      <main className="socio-main" id="contenido">
        {cargando && !datos ? <EsqueletoLista filas={4} /> : error && !datos ? (
          <Vacio icono={<Wallet />} titulo="No pudimos cargar tus datos" texto={error} accion={<Boton onClick={() => recargar()}>Intentar de nuevo</Boton>} />
        ) : datos && (
          <SocioCtx.Provider value={{ familia: datos, recargar: () => recargar(true) }}>
            <Suspense fallback={<EsqueletoLista filas={3} />}>
              <motion.div key={loc.pathname} initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }} animate={reducir ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
                <Routes>
                  <Route index element={<Inicio />} />
                  <Route path="carnet" element={<CarnetPantalla />} />
                  <Route path="cuenta" element={<Cuenta />} />
                  <Route path="reservas/*" element={<Reservas />} />
                  <Route path="avisos" element={<Avisos />} />
                  <Route path="perfil" element={<Perfil onVerBienvenida={() => setBienvenida(true)} />} />
                  <Route path="notificaciones" element={<Notificaciones />} />
                </Routes>
              </motion.div>
            </Suspense>
          </SocioCtx.Provider>
        )}
      </main>
      <nav className="tabbar" aria-label="Secciones">
        {PESTANAS.map((p) => (
          <NavLink key={p.a} to={p.a} end={p.fin}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="socio-tab" className="tab-fondo" transition={reducir ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.4 }} />}
                <p.icono aria-hidden />
                <span>{p.etiqueta}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
