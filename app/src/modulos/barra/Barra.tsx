import { createContext, useContext, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Anchor, ClipboardList, Lock, ShoppingBag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { dispositivo } from '../../lib/sesion'
import { Boton, Chips, EjemploTag, Esqueleto, Tarjeta, useToast } from '../../ui'
import { TabletShell } from '../comun/TabletShell'
import Venta from './Venta'
import Cierre from './Cierre'
import Comandas from './Comandas'

export interface Turno { id: string; barra_id: string; barra: string; mesero_id: string; mesero: string }
interface Ctx { turno: Turno; cambiar: () => void }
const TurnoCtx = createContext<Ctx | null>(null)
export const useTurno = () => {
  const c = useContext(TurnoCtx)
  if (!c) throw new Error('useTurno fuera de Barra')
  return c
}

const CLAVE = 'cp-turno-barra'

function Marca({ turno }: { turno?: Turno | null }) {
  return (
    <span className="marca-astillero">
      <Anchor aria-hidden strokeWidth={2.2} />
      <span><b>El Astillero</b><small>{turno ? `${turno.barra} · ${turno.mesero.split(' ')[0]}` : 'Casino de Pimentel'}</small></span>
    </span>
  )
}

export default function Barra() {
  const [turno, setTurno] = useState<Turno | null>(() => { try { return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') } catch { return null } })
  useEffect(() => { try { if (turno) localStorage.setItem(CLAVE, JSON.stringify(turno)); else localStorage.removeItem(CLAVE) } catch { /* */ } }, [turno])

  return (
    <TabletShell id="barra" tono="arena" marca={<Marca turno={turno} />}
      pestanas={[
        { a: '/barra', etiqueta: 'Venta', icono: ShoppingBag, fin: true },
        { a: '/barra/comandas', etiqueta: 'Comandas de hoy', icono: ClipboardList },
        { a: '/barra/cierre', etiqueta: 'Cierre del día', icono: Lock },
      ]}>
      {!turno ? <InicioTurno onListo={setTurno} /> : (
        <TurnoCtx.Provider value={{ turno, cambiar: () => setTurno(null) }}>
          <Routes>
            <Route index element={<Venta />} />
            <Route path="comandas" element={<Comandas />} />
            <Route path="cierre" element={<Cierre />} />
          </Routes>
        </TurnoCtx.Provider>
      )}
    </TabletShell>
  )
}

function InicioTurno({ onListo }: { onListo: (t: Turno) => void }) {
  const avisar = useToast()
  const { datos } = useDatos(async () => {
    const [b, p] = await Promise.all([
      supabase.from('barras').select('id, nombre, ubicacion').eq('activa', true).order('orden'),
      supabase.from('personal').select('id, nombres, apellidos, cargo, es_ejemplo').eq('area', 'barra').eq('activo', true).is('eliminado_en', null).order('nombres'),
    ])
    return { barras: ok(b) as { id: string; nombre: string }[], meseros: ok(p) as { id: string; nombres: string; apellidos: string; cargo: string; es_ejemplo: boolean }[] }
  }, [])
  const [barra, setBarra] = useState('')
  const [mesero, setMesero] = useState('')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { if (datos?.barras.length === 1) setBarra(datos.barras[0].id) }, [datos])

  const empezar = async () => {
    const b = datos!.barras.find((x) => x.id === barra)!
    const m = datos!.meseros.find((x) => x.id === mesero)!
    setGuardando(true)
    try {
      const { data: perfil } = await supabase.rpc('mi_perfil')
      const r = ok(await supabase.from('turnos_barra').insert({ club_id: perfil.club_id, barra_id: b.id, mesero_id: m.id, dispositivo: dispositivo() }).select('id').single()) as { id: string }
      onListo({ id: r.id, barra_id: b.id, barra: b.nombre, mesero_id: m.id, mesero: `${m.nombres} ${m.apellidos}` })
      avisar(`Turno abierto: ${b.nombre} con ${m.nombres.split(' ')[0]}`)
    } catch (e) { avisar((e as Error).message, 'error') } finally { setGuardando(false) }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 820, marginInline: 'auto' }}>
      <div>
        <h1 className="page-title">Empezar turno</h1>
        <p className="page-lead">Elige la barra y quién atiende. Queda guardado en esta tablet hasta el cierre.</p>
      </div>
      <Tarjeta titulo="1. ¿Qué barra?" tono="arena">
        {datos ? <Chips etiqueta="Barra" valor={barra} onCambio={setBarra} opciones={datos.barras.map((b) => ({ valor: b.id, etiqueta: b.nombre }))} /> : <Esqueleto alto={48} />}
      </Tarjeta>
      <Tarjeta titulo="2. ¿Quién atiende?" tono="arena">
        {datos ? <Chips etiqueta="Mesero" valor={mesero} onCambio={setMesero} opciones={datos.meseros.map((m) => ({ valor: m.id, etiqueta: `${m.nombres.split(' ')[0]} ${m.apellidos.split(' ')[0]} · ${m.cargo}` }))} /> : <Esqueleto alto={48} />}
        {datos?.meseros.some((m) => m.es_ejemplo) && <div style={{ marginTop: 12 }}><EjemploTag texto="Personal de ejemplo" /></div>}
      </Tarjeta>
      <Boton tam="xl" variante="primary" disabled={!barra || !mesero} cargando={guardando} onClick={empezar}>Empezar turno</Boton>
    </div>
  )
}
