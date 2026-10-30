import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSesion } from './lib/sesion'
import { inicioDeRol, puedeEntrar } from './lib/roles'
import { supabaseConfigurado } from './lib/supabase'
import { Spinner } from './ui'
import Ingresar from './modulos/acceso/Ingresar'
import CambiarPin from './modulos/acceso/CambiarPin'
import SinConfigurar from './modulos/acceso/SinConfigurar'

const Sistema = lazy(() => import('./modulos/sistema/Sistema'))
const Admin = lazy(() => import('./modulos/admin/Admin'))
const Barra = lazy(() => import('./modulos/barra/Barra'))
const Porteria = lazy(() => import('./modulos/porteria/Porteria'))
const Socio = lazy(() => import('./modulos/socio/Socio'))

function Cargando() {
  return <div className="centro" role="status" aria-label="Cargando"><Spinner /></div>
}

function Protegida({ modulo, children }: { modulo: 'admin' | 'barra' | 'porteria' | 'socio'; children: ReactNode }) {
  const { cargando, sesion, perfil } = useSesion()
  const loc = useLocation()
  if (cargando) return <Cargando />
  if (!sesion || !perfil) return <Navigate to="/ingresar" replace state={{ desde: loc.pathname }} />
  if (perfil.debe_cambiar_pin) return <Navigate to="/cambiar-pin" replace />
  if (!puedeEntrar(perfil.rol, modulo)) return <Navigate to={inicioDeRol(perfil.rol)} replace />
  return <>{children}</>
}

function Inicio() {
  const { cargando, sesion, perfil } = useSesion()
  if (cargando) return <Cargando />
  if (!sesion || !perfil) return <Navigate to="/ingresar" replace />
  if (perfil.debe_cambiar_pin) return <Navigate to="/cambiar-pin" replace />
  return <Navigate to={inicioDeRol(perfil.rol)} replace />
}

export default function App() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path="/sistema" element={<Sistema />} />
        {!supabaseConfigurado ? (
          <Route path="*" element={<SinConfigurar />} />
        ) : (
          <>
            <Route path="/" element={<Inicio />} />
            <Route path="/ingresar" element={<Ingresar />} />
            <Route path="/cambiar-pin" element={<CambiarPin />} />
            <Route path="/admin/*" element={<Protegida modulo="admin"><Admin /></Protegida>} />
            <Route path="/barra/*" element={<Protegida modulo="barra"><Barra /></Protegida>} />
            <Route path="/porteria/*" element={<Protegida modulo="porteria"><Porteria /></Protegida>} />
            <Route path="/socio/*" element={<Protegida modulo="socio"><Socio /></Protegida>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  )
}
