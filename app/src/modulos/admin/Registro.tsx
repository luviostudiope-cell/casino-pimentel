import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { fechaHora, hoyLima } from '../../lib/formato'
import { Boton, Buscador, Campo, Encabezado, EsqueletoLista, Hoja, Pestanas, PillEstado, Selector, Vacio, useDebounce } from '../../ui'

interface Audit { id: number; tabla: string; registro_id: string | null; accion: 'INSERT' | 'UPDATE' | 'DELETE'; antes: Record<string, unknown> | null; despues: Record<string, unknown> | null; cambios: string[] | null; usuario_nombre: string | null; fecha: string }
interface Acceso { id: number; identificador: string | null; evento: string; exito: boolean; dispositivo: string | null; detalle: string | null; fecha: string }
const ACCION: Record<string, string> = { INSERT: 'Creó', UPDATE: 'Cambió', DELETE: 'Eliminó' }
const TABLA: Record<string, string> = { socios: 'Socio', miembros: 'Familiar', cuotas: 'Cuota', pagos: 'Pago', cuenta_socio: 'Cuenta del socio', ingresos: 'Ingreso', invitados: 'Invitado', comandas: 'Comanda', comanda_items: 'Línea de comanda', cobros: 'Cobro', cortesias: 'Cortesía', cierres_barra: 'Cierre de barra', productos: 'Producto', insumos: 'Insumo', recetas: 'Receta', config: 'Configuración', caja_movimientos: 'Caja', avisos: 'Aviso', reservas_cancha: 'Reserva de tenis', alquileres: 'Alquiler', personal: 'Personal', turnos: 'Turno', marcaciones: 'Marcación', usuarios_staff: 'Usuario', 'app.personal_pin': 'PIN del personal', movimientos_stock: 'Kardex', compras: 'Compra', notificaciones: 'Notificación' }
const resumir = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80))

export default function Registro() {
  const [tab, setTab] = useState<'cambios' | 'accesos'>('cambios')
  const [tabla, setTabla] = useState('')
  const [quien, setQuien] = useState('')
  const quienD = useDebounce(quien, 300)
  const [desde, setDesde] = useState(hoyLima(-7))
  const [limite, setLimite] = useState(100)
  const [sel, setSel] = useState<Audit | null>(null)
  const { datos: audit } = useDatos(async () => {
    let q = supabase.from('auditoria').select('id, tabla, registro_id, accion, antes, despues, cambios, usuario_nombre, fecha').gte('fecha', desde).order('fecha', { ascending: false }).limit(limite)
    if (tabla) q = q.eq('tabla', tabla)
    if (quienD) q = q.ilike('usuario_nombre', `%${quienD}%`)
    return ok(await q) as Audit[]
  }, [tabla, quienD, desde, limite])
  const { datos: accesos } = useDatos(async () => ok(await supabase.from('accesos').select('id, identificador, evento, exito, dispositivo, detalle, fecha').gte('fecha', desde).order('fecha', { ascending: false }).limit(200)) as Acceso[], [desde])

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Registro" explicacion="Todo queda registrado: quién creó o cambió qué y cuándo, y cada inicio de sesión. Nada se borra." />
      <Pestanas etiqueta="Tipo de registro" valor={tab} onCambio={setTab} opciones={[{ valor: 'cambios', etiqueta: 'Cambios' }, { valor: 'accesos', etiqueta: 'Accesos' }]} />
      <div className="row wrap" style={{ alignItems: 'flex-end' }}>
        <Campo etiqueta="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 170 }} />
        {tab === 'cambios' && <>
          <Selector etiqueta="Qué" value={tabla} onChange={(e) => setTabla(e.target.value)} style={{ width: 220 }}><option value="">Todo</option>{Object.entries(TABLA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selector>
          <div style={{ minWidth: 240 }} className="grow"><span className="field-label">Quién</span><div style={{ marginTop: 8 }}><Buscador valor={quien} onCambio={setQuien} placeholder="Nombre del usuario" etiqueta="Filtrar por usuario" /></div></div>
        </>}
      </div>
      {tab === 'cambios' ? (!audit ? <EsqueletoLista filas={8} /> : !audit.length ? <Vacio icono={<ShieldCheck />} titulo="Sin cambios en estas fechas" texto="Prueba con otra fecha o quita los filtros." /> : (
        <>
          <div className="card list" style={{ padding: 8 }}>
            {audit.map((a) => (
              <button key={a.id} type="button" className="list-item" onClick={() => setSel(a)}>
                <span className="li-main">
                  <span className="li-title" style={{ display: 'block' }}>{a.usuario_nombre ?? 'Sistema'} · {ACCION[a.accion]} {(TABLA[a.tabla] ?? a.tabla).toLowerCase()}</span>
                  <span className="li-sub" style={{ display: 'block' }}>{fechaHora(a.fecha)}{a.cambios?.length ? ` · ${a.cambios.filter((c) => !['actualizado_en'].includes(c)).slice(0, 4).join(', ')}` : ''}</span>
                </span>
              </button>
            ))}
          </div>
          {audit.length >= limite && <Boton variante="secondary" onClick={() => setLimite(limite + 100)}>Ver más</Boton>}
        </>
      )) : (!accesos ? <EsqueletoLista filas={8} /> : (
        <div className="card tabla-wrap" style={{ padding: 8 }}>
          <table className="tabla">
            <thead><tr><th>Fecha y hora</th><th>Quién</th><th>Evento</th><th>Dispositivo</th></tr></thead>
            <tbody>{accesos.map((a) => (
              <tr key={a.id}><td className="num">{fechaHora(a.fecha)}</td><td className="break">{a.identificador ?? '—'}</td>
                <td><PillEstado estado={a.exito ? 'validado' : a.evento === 'bloqueado' ? 'deuda' : 'rechazado'} texto={{ login: 'Ingresó', logout: 'Salió', fallido: 'Intento fallido', bloqueado: 'Bloqueado', cambio_pin: 'Cambio de PIN' }[a.evento] ?? a.evento} />{a.detalle && <div className="xs muted">{a.detalle}</div>}</td>
                <td className="small">{a.dispositivo ?? '—'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      <Hoja abierta={Boolean(sel)} onCerrar={() => setSel(null)} titulo={sel ? `${ACCION[sel.accion]} ${(TABLA[sel.tabla] ?? sel.tabla).toLowerCase()}` : ''} subtitulo={sel ? `${sel.usuario_nombre ?? 'Sistema'} · ${fechaHora(sel.fecha)}` : ''}>
        {sel && (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
              <tbody>{(sel.cambios ?? Object.keys(sel.despues ?? sel.antes ?? {})).filter((k) => !['club_id', 'creado_por'].includes(k)).map((k) => (
                <tr key={k}><td className="bold">{k}</td><td className="small break">{resumir(sel.antes?.[k])}</td><td className="small break">{resumir(sel.despues?.[k])}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Hoja>
    </div>
  )
}
