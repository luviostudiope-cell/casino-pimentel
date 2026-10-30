import { useEffect, useState } from 'react'
import { Lock, Plus, Save, Tablet, UserCog } from 'lucide-react'
import { funcion, supabase } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { useSesion } from '../../lib/sesion'
import { ETIQUETA_ROL, puedeConfigurar, type RolStaff } from '../../lib/roles'
import { fechaHora } from '../../lib/formato'
import { Aviso, Boton, Campo, Encabezado, EsqueletoLista, Hoja, Interruptor, ItemLista, Pestanas, PillEstado, Selector, Tarjeta, useToast } from '../../ui'

// deno-lint-ignore no-explicit-any
type Reglas = Record<string, any>
type Tab = 'reglas' | 'usuarios' | 'tablets'

export default function Configuracion() {
  const { perfil } = useSesion()
  const editable = puedeConfigurar(perfil?.rol)
  const [tab, setTab] = useState<Tab>('reglas')
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Configuración" explicacion="Las reglas del club, los usuarios y sus roles, y las tablets registradas. Solo administración puede cambiarlas." />
      {!editable && <Aviso tono="alerta" icono={<Lock aria-hidden />}>Puedes ver la configuración, pero solo administración (Julita o Sebastián) puede cambiarla.</Aviso>}
      <Pestanas etiqueta="Secciones de configuración" valor={tab} onCambio={setTab} opciones={[{ valor: 'reglas', etiqueta: 'Reglas del club' }, { valor: 'usuarios', etiqueta: 'Usuarios y roles' }, { valor: 'tablets', etiqueta: 'Tablets' }]} />
      {tab === 'reglas' && <ReglasForm editable={editable} />}
      {tab === 'usuarios' && <Usuarios editable={editable} />}
      {tab === 'tablets' && <Tablets editable={editable} />}
    </div>
  )
}

function ReglasForm({ editable }: { editable: boolean }) {
  const { perfil } = useSesion()
  const avisar = useToast()
  const { datos, recargar } = useDatos(async () => (ok(await supabase.from('config').select('reglas, actualizado_en').single()) as { reglas: Reglas; actualizado_en: string }), [])
  const [r, setR] = useState<Reglas | null>(null)
  useEffect(() => { if (datos) setR(structuredClone(datos.reglas)) }, [datos])
  if (!r) return <EsqueletoLista filas={6} />
  const num = (ruta: string[], etiqueta: string, ayuda?: string, paso = '1') => {
    let v: Reglas = r; for (const k of ruta.slice(0, -1)) v = v[k] ?? {}
    return <Campo etiqueta={etiqueta} ayuda={ayuda} type="number" step={paso} disabled={!editable} value={String(v[ruta.at(-1)!] ?? '')}
      onChange={(e) => { const c = structuredClone(r); let o = c; for (const k of ruta.slice(0, -1)) o = o[k] ??= {}; o[ruta.at(-1)!] = e.target.value === '' ? '' : Number(e.target.value); setR(c) }} />
  }
  const txt = (ruta: string[], etiqueta: string, tipo = 'text', ayuda?: string) => {
    let v: Reglas = r; for (const k of ruta.slice(0, -1)) v = v[k] ?? {}
    return <Campo etiqueta={etiqueta} type={tipo} ayuda={ayuda} disabled={!editable} value={String(v[ruta.at(-1)!] ?? '')}
      onChange={(e) => { const c = structuredClone(r); let o = c; for (const k of ruta.slice(0, -1)) o = o[k] ??= {}; o[ruta.at(-1)!] = e.target.value; setR(c) }} />
  }
  const guardar = async () => {
    try { ok(await supabase.from('config').update({ reglas: r, actualizado_en: new Date().toISOString(), actualizado_por: perfil!.user_id }).eq('club_id', perfil!.club_id).select('club_id').single()); avisar('Reglas guardadas. Ya se aplican en todo el sistema.'); recargar(true) }
    catch (e) { avisar((e as Error).message.includes('check') ? 'Hay un valor fuera de rango. Revisa los números.' : (e as Error).message, 'error') }
  }
  return (
    <div className="stack">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', alignItems: 'start' }}>
        <Tarjeta titulo="Invitados">
          <div className="stack">{num(['invitados', 'max_por_socio_dia'], 'Máximo de invitados por socio al día')}{num(['invitados', 'max_visitas_mes'], 'Visitas al mes por invitado (DNI)')}
            {num(['invitados', 'tarifas', 'club'], 'Ingreso al club (S/)', undefined, '0.5')}{num(['invitados', 'tarifas', 'piscina'], 'Ingreso a piscina (S/)', undefined, '0.5')}{num(['invitados', 'tarifas', 'comedor'], 'Solo comedor (S/)', '0 = libre', '0.5')}</div>
        </Tarjeta>
        <Tarjeta titulo="Tenis">
          <div className="stack">{txt(['tenis', 'hora_inicio'], 'Abre', 'time')}{txt(['tenis', 'hora_fin'], 'Cierra', 'time')}{num(['tenis', 'duracion_min'], 'Duración del turno (min)')}
            {num(['tenis', 'max_por_dia'], 'Reservas por persona al día')}{num(['tenis', 'max_por_semana'], 'Reservas por persona a la semana')}{num(['tenis', 'edad_max_hijos'], 'Hijos pueden reservar hasta antes de (años)')}{num(['tenis', 'dias_anticipacion'], 'Días de anticipación')}</div>
        </Tarjeta>
        <Tarjeta titulo="Cuotas">
          <div className="stack">{num(['cuotas', 'mantenimiento'], 'Cuota de mantenimiento (S/)', 'Dato de ejemplo hasta que el club lo confirme.', '0.5')}{num(['cuotas', 'ingreso'], 'Cuota de ingreso (S/)', 'Dato de ejemplo.')}
            {num(['cuotas', 'dia_vencimiento'], 'Día de vencimiento')}{num(['cuotas', 'mes_vencimiento'], 'Vence en el mes (0 = el mismo, 1 = el siguiente)')}{num(['cuotas', 'dias_aviso'], 'Avisar al socio con días de anticipación')}</div>
        </Tarjeta>
        <Tarjeta titulo="Portería y personal">
          <div className="stack">
            <Interruptor etiqueta="Bloquear el ingreso a socios con deuda" descripcion="Si está apagado, entran y se avisa a administración." activo={Boolean(r.morosos?.bloquear_ingreso)} onCambio={(v) => editable && setR({ ...r, morosos: { ...r.morosos, bloquear_ingreso: v } })} />
            <Interruptor etiqueta="Avisar a administración cuando entra un socio con deuda" activo={Boolean(r.morosos?.avisar_administracion)} onCambio={(v) => editable && setR({ ...r, morosos: { ...r.morosos, avisar_administracion: v } })} />
            {num(['personal', 'tolerancia_tardanza_min'], 'Tolerancia de tardanza (min)')}{num(['qr', 'vigencia_seg'], 'El QR del carnet vence a los (segundos)')}
          </div>
        </Tarjeta>
        <Tarjeta titulo="Barra y alquileres">
          <div className="stack">{num(['barra', 'umbral_faltante'], 'Avisar faltantes desde (S/)')}{num(['barra', 'umbral_cortesias_dia'], 'Avisar si las cortesías del día pasan de')}{num(['alquiler', 'igv'], 'IGV de alquileres (0.18 = 18 %)', undefined, '0.01')}
            {txt(['pagos', 'yape_numero'], 'Número de Yape del club', 'text', 'Se muestra al socio al pagar. [Por confirmar]')}{txt(['pagos', 'yape_titular'], 'Titular del Yape')}</div>
        </Tarjeta>
        <Tarjeta titulo="Reporte diario y horarios">
          <div className="stack">{txt(['reporte', 'hora'], 'Hora del reporte diario (Lima)', 'time', 'Llega por Telegram y como notificación.')}
            {txt(['horarios', 'club'], 'Horario del club (web)')}{txt(['horarios', 'piscina'], 'Horario de piscina (web)')}{txt(['horarios', 'barra'], 'Horario de El Astillero (web)')}</div>
        </Tarjeta>
      </div>
      {editable && <Boton tam="lg" icono={<Save aria-hidden />} onClick={guardar} style={{ alignSelf: 'flex-start' }}>Guardar reglas</Boton>}
      {datos && <p className="small muted">Última modificación: {fechaHora(datos.actualizado_en)}. Cada cambio queda en el Registro.</p>}
    </div>
  )
}

function Usuarios({ editable }: { editable: boolean }) {
  const avisar = useToast()
  const { datos, recargar } = useDatos(async () => ok(await supabase.from('usuarios_staff').select('id, nombre, correo, rol, cargo, activo').order('rol')) as { id: string; nombre: string; correo: string; rol: RolStaff; cargo: string | null; activo: boolean }[], [])
  const [nuevo, setNuevo] = useState<{ correo: string; nombre: string; rol: RolStaff; clave: string } | null>(null)
  const cambiar = async (id: string, cambios: { rol?: RolStaff; activo?: boolean }) => {
    const { error } = await supabase.from('usuarios_staff').update(cambios).eq('id', id)
    if (error) avisar('Solo administración cambia roles.', 'error'); else { avisar('Usuario actualizado.'); recargar(true) }
  }
  const crear = async () => {
    try { await funcion('admin-socios', { accion: 'crear_staff', ...nuevo }); avisar('Usuario creado. Entrégale su correo y clave.'); setNuevo(null); recargar(true) }
    catch (e) { avisar((e as Error).message, 'error') }
  }
  return (
    <div className="stack">
      {editable && <Boton icono={<Plus aria-hidden />} onClick={() => setNuevo({ correo: '', nombre: '', rol: 'barra', clave: '' })} style={{ alignSelf: 'flex-start' }}>Nuevo usuario</Boton>}
      <div className="card list" style={{ padding: 8 }}>
        {(datos ?? []).map((u) => (
          <div key={u.id} className="list-item" style={{ flexWrap: 'wrap' }}>
            <UserCog aria-hidden color="var(--azul)" />
            <span className="li-main" style={{ minWidth: 200 }}><span className="li-title" style={{ display: 'block' }}>{u.nombre}</span><span className="li-sub" style={{ display: 'block' }}>{u.correo}{u.cargo ? ` · ${u.cargo}` : ''}</span></span>
            <select className="select" aria-label={`Rol de ${u.nombre}`} style={{ width: 180, minHeight: 44 }} disabled={!editable} value={u.rol} onChange={(e) => cambiar(u.id, { rol: e.target.value as RolStaff })}>
              {(['presidente', 'directivo', 'admin', 'barra', 'porteria'] as RolStaff[]).map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!editable} onClick={() => cambiar(u.id, { activo: !u.activo })}><PillEstado estado={u.activo ? 'activo' : 'inactivo'} /></button>
          </div>
        ))}
      </div>
      <Hoja abierta={Boolean(nuevo)} onCerrar={() => setNuevo(null)} titulo="Nuevo usuario" pie={<><Boton variante="outline" onClick={() => setNuevo(null)}>Cancelar</Boton><Boton onClick={crear}>Crear usuario</Boton></>}>
        {nuevo && <div className="stack">
          <Campo etiqueta="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <Campo etiqueta="Correo" type="email" value={nuevo.correo} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} />
          <Selector etiqueta="Rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as RolStaff })}>{(['presidente', 'directivo', 'admin', 'barra', 'porteria'] as RolStaff[]).map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}</Selector>
          <Campo etiqueta="Clave inicial (8 caracteres o más)" type="text" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} autoComplete="new-password" />
        </div>}
      </Hoja>
    </div>
  )
}

function Tablets({ editable }: { editable: boolean }) {
  const { perfil } = useSesion()
  const avisar = useToast()
  const { datos, recargar } = useDatos(async () => ok(await supabase.from('dispositivos').select('id, nombre, tipo, activo, ultimo_uso, identificador, es_ejemplo, barras(nombre)').order('nombre')) as unknown as { id: string; nombre: string; tipo: string; activo: boolean; ultimo_uso: string | null; identificador: string; es_ejemplo: boolean; barras: { nombre: string } | null }[], [])
  const [nombre, setNombre] = useState(() => { try { return localStorage.getItem('cp-dispositivo') ?? '' } catch { return '' } })
  const registrar = async () => {
    if (nombre.trim().length < 3) return
    try { localStorage.setItem('cp-dispositivo', nombre.trim()) } catch { /* */ }
    const { error } = await supabase.from('dispositivos').insert({ club_id: perfil!.club_id, nombre: nombre.trim(), tipo: 'admin' })
    if (error) avisar('Solo administración registra tablets.', 'error'); else { avisar('Este equipo quedó registrado. Su nombre aparece en el Registro de accesos.'); recargar(true) }
  }
  return (
    <div className="stack">
      <Tarjeta titulo="Este equipo">
        <div className="row wrap" style={{ alignItems: 'flex-end' }}>
          <Campo etiqueta="Nombre del equipo" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Tablet portería" className="grow" icono={<Tablet aria-hidden />} />
          <Boton onClick={registrar} disabled={!editable || nombre.trim().length < 3}>Registrar</Boton>
        </div>
      </Tarjeta>
      <div className="card list" style={{ padding: 8 }}>
        {(datos ?? []).map((d) => <ItemLista key={d.id} titulo={d.nombre} sub={`${d.tipo}${d.barras ? ` · ${d.barras.nombre}` : ''} · ${d.ultimo_uso ? `usado ${fechaHora(d.ultimo_uso)}` : 'sin uso registrado'}`} fin={<PillEstado estado={d.activo ? 'activo' : 'inactivo'} />} />)}
      </div>
    </div>
  )
}
