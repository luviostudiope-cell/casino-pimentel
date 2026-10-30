import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  Bell, BarChart3, Building2, ClipboardList, Cog, DoorOpen, Home, LayoutGrid, LogOut, Megaphone, Receipt,
  ShieldCheck, Trophy, Users, Wallet, Wine, type LucideIcon,
} from 'lucide-react'
import { useSesion } from '../../lib/sesion'
import { supabase, rpc } from '../../lib/supabase'
import { useEnVivo } from '../../lib/datos'
import { ETIQUETA_ROL } from '../../lib/roles'
import { Avatar, Buscador, EsqueletoLista, Hoja, PillEstado, Wordmark, useConfirmar, useDebounce, type Estado } from '../../ui'

const Hoy = lazy(() => import('./Hoy'))
const Socios = lazy(() => import('./Socios'))
const FichaSocio = lazy(() => import('./FichaSocio'))
const Importar = lazy(() => import('./Importar'))
const Cobranza = lazy(() => import('./Cobranza'))
const BarraAdmin = lazy(() => import('./BarraAdmin'))
const Caja = lazy(() => import('./Caja'))
const PorteriaAdmin = lazy(() => import('./PorteriaAdmin'))
const Personal = lazy(() => import('./Personal'))
const Tenis = lazy(() => import('./Tenis'))
const Ambientes = lazy(() => import('./Ambientes'))
const Avisos = lazy(() => import('./Avisos'))
const Reportes = lazy(() => import('./Reportes'))
const Registro = lazy(() => import('./Registro'))
const Configuracion = lazy(() => import('./Configuracion'))
const Notificaciones = lazy(() => import('../comun/Notificaciones'))

interface Seccion { a: string; etiqueta: string; icono: LucideIcon; fin?: boolean }
const GRUPOS: { titulo: string; items: Seccion[] }[] = [
  { titulo: 'Día a día', items: [
    { a: '/admin', etiqueta: 'Hoy', icono: Home, fin: true },
    { a: '/admin/alertas', etiqueta: 'Alertas', icono: Bell },
  ] },
  { titulo: 'Socios', items: [
    { a: '/admin/socios', etiqueta: 'Socios', icono: Users },
    { a: '/admin/cobranza', etiqueta: 'Cobranza', icono: Wallet },
  ] },
  { titulo: 'Operación', items: [
    { a: '/admin/barra', etiqueta: 'Barra El Astillero', icono: Wine },
    { a: '/admin/caja', etiqueta: 'Caja de oficina', icono: Receipt },
    { a: '/admin/porteria', etiqueta: 'Portería', icono: DoorOpen },
    { a: '/admin/personal', etiqueta: 'Personal', icono: ClipboardList },
    { a: '/admin/tenis', etiqueta: 'Tenis', icono: Trophy },
    { a: '/admin/ambientes', etiqueta: 'Ambientes', icono: Building2 },
    { a: '/admin/avisos', etiqueta: 'Avisos', icono: Megaphone },
  ] },
  { titulo: 'Control', items: [
    { a: '/admin/reportes', etiqueta: 'Reportes', icono: BarChart3 },
    { a: '/admin/registro', etiqueta: 'Registro', icono: ShieldCheck },
    { a: '/admin/configuracion', etiqueta: 'Configuración', icono: Cog },
  ] },
]
const TABS: Seccion[] = [
  { a: '/admin', etiqueta: 'Hoy', icono: Home, fin: true },
  { a: '/admin/socios', etiqueta: 'Socios', icono: Users },
  { a: '/admin/barra', etiqueta: 'Barra', icono: Wine },
  { a: '/admin/alertas', etiqueta: 'Alertas', icono: Bell },
]

export default function Admin() {
  const { perfil, salir } = useSesion()
  const reducir = useReducedMotion()
  const loc = useLocation()
  const navegar = useNavigate()
  const confirmar = useConfirmar()
  const [mas, setMas] = useState(false)
  const [sinLeer, setSinLeer] = useState(0)
  const contar = async () => {
    const { count } = await supabase.from('notificaciones').select('id', { count: 'exact', head: true }).eq('leida', false)
    setSinLeer(count ?? 0)
  }
  useEffect(() => { contar(); setMas(false) }, [loc.pathname])
  useEnVivo(['notificaciones'], contar)

  const cerrar = async () => {
    if (await confirmar({ titulo: '¿Cerrar sesión?', confirmar: 'Cerrar sesión' })) { await salir(); navegar('/ingresar', { replace: true }) }
  }
  const navItem = (s: Seccion, grupo: string) => (
    <NavLink key={s.a} to={s.a} end={s.fin} className="nav-item">
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId={`nav-${grupo}`} className="nav-fondo" transition={reducir ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.4 }} />}
          <s.icono aria-hidden />
          <span>{s.etiqueta}</span>
          {s.a === '/admin/alertas' && sinLeer > 0 && <span className="badge">{sinLeer > 99 ? '99+' : sinLeer}</span>}
        </>
      )}
    </NavLink>
  )

  return (
    <div className="admin">
      <aside className="admin-lateral" aria-label="Menú del panel">
        <Wordmark sub="Panel de administración" href="/app/admin" />
        <nav className="nav-lateral">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <div className="nav-grupo">{g.titulo}</div>
              {g.items.map((s) => navItem(s, 'lateral'))}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }} className="stack">
          <div className="row" style={{ padding: '0 8px' }}>
            <Avatar nombre={perfil?.nombre ?? ''} />
            <div className="grow"><div className="bold ellipsis">{perfil?.nombre}</div><div className="small muted">{perfil ? ETIQUETA_ROL[perfil.rol] : ''}</div></div>
          </div>
          <div className="row wrap" style={{ ['--gap' as string]: '6px' }}>
            <a className="btn btn-ghost btn-sm" href="/app/barra">Tablet barra</a>
            <a className="btn btn-ghost btn-sm" href="/app/porteria">Tablet portería</a>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={cerrar}><LogOut aria-hidden /><span>Cerrar sesión</span></button>
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="admin-top">
          <Wordmark href="/app/admin" />
          <BuscadorGlobal />
        </div>
        <main className="admin-main" id="contenido">
          <Suspense fallback={<EsqueletoLista filas={5} />}>
            <motion.div key={loc.pathname.split('/').slice(0, 3).join('/')} initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }} animate={reducir ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
              <Routes>
                <Route index element={<Hoy />} />
                <Route path="alertas" element={<Notificaciones />} />
                <Route path="socios" element={<Socios />} />
                <Route path="socios/importar" element={<Importar />} />
                <Route path="socios/:id" element={<FichaSocio />} />
                <Route path="cobranza" element={<Cobranza />} />
                <Route path="barra/*" element={<BarraAdmin />} />
                <Route path="caja" element={<Caja />} />
                <Route path="porteria" element={<PorteriaAdmin />} />
                <Route path="personal" element={<Personal />} />
                <Route path="tenis" element={<Tenis />} />
                <Route path="ambientes" element={<Ambientes />} />
                <Route path="avisos" element={<Avisos />} />
                <Route path="reportes" element={<Reportes />} />
                <Route path="registro" element={<Registro />} />
                <Route path="configuracion" element={<Configuracion />} />
              </Routes>
            </motion.div>
          </Suspense>
        </main>
      </div>
      <nav className="tabbar admin-tabs" aria-label="Secciones principales">
        {TABS.map((s) => (
          <NavLink key={s.a} to={s.a} end={s.fin}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="admin-tab" className="tab-fondo" transition={reducir ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.4 }} />}
                <s.icono aria-hidden /><span>{s.etiqueta}</span>
                {s.a === '/admin/alertas' && sinLeer > 0 && <span className="badge">{sinLeer > 9 ? '9+' : sinLeer}</span>}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMas(true)} aria-haspopup="dialog"><LayoutGrid aria-hidden /><span>Más</span></button>
      </nav>
      <Hoja abierta={mas} onCerrar={() => setMas(false)} titulo="Todas las secciones" lado={false}>
        <div className="stack">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <div className="nav-grupo" style={{ paddingLeft: 4 }}>{g.titulo}</div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', ['--gap' as string]: '8px' }}>
                {g.items.map((s) => (
                  <NavLink key={s.a} to={s.a} end={s.fin} className="btn btn-secondary" style={{ minHeight: 76, flexDirection: 'column', gap: 6, borderRadius: 20, fontSize: 'var(--text-sm)' }}>
                    <s.icono aria-hidden /><span>{s.etiqueta}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          <div className="row wrap"><a className="btn btn-ghost btn-sm" href="/app/barra">Tablet barra</a><a className="btn btn-ghost btn-sm" href="/app/porteria">Tablet portería</a></div>
          <button type="button" className="btn btn-outline" onClick={cerrar}><LogOut aria-hidden /><span>Cerrar sesión</span></button>
        </div>
      </Hoja>
    </div>
  )
}

/** Buscador global: socio por nombre, N° o DNI, siempre visible arriba. */
function BuscadorGlobal() {
  const navegar = useNavigate()
  const [q, setQ] = useState('')
  const qd = useDebounce(q, 220)
  const [res, setRes] = useState<{ miembro_id: string; socio_id: string; numero: string; nombres: string; apellidos: string; parentesco: string; estado_cuenta: Estado }[]>([])
  const [abierto, setAbierto] = useState(false)
  useEffect(() => {
    if (qd.trim().length < 2) { setRes([]); return }
    rpc<typeof res>('buscar_miembros', { p_q: qd, p_limite: 8 }).then((r) => { setRes(r); setAbierto(true) }).catch(() => setRes([]))
  }, [qd])
  const ir = (id: string) => { setQ(''); setRes([]); setAbierto(false); navegar(`/admin/socios/${id}`) }
  return (
    <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: 560 }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false) }}>
      <Buscador valor={q} onCambio={setQ} placeholder="Buscar socio por nombre, N° o DNI" etiqueta="Buscar socio" onEnter={() => res[0] && ir(res[0].socio_id)} />
      {abierto && res.length > 0 && (
        <div className="search-results" role="listbox" aria-label="Resultados">
          {res.map((r) => (
            <button key={r.miembro_id} type="button" role="option" aria-selected={false} className="list-item" onClick={() => ir(r.socio_id)}>
              <Avatar nombre={`${r.nombres} ${r.apellidos}`} />
              <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{r.nombres} {r.apellidos}</span><span className="li-sub" style={{ display: 'block' }}>N° {r.numero} · {r.parentesco}</span></span>
              <PillEstado estado={r.estado_cuenta} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
