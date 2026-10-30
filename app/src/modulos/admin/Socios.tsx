import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, FileUp, UserPlus, Users } from 'lucide-react'
import { supabase, funcion } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { exportarExcel } from '../../lib/excel'
import { fechaCorta, hoyLima, moneda } from '../../lib/formato'
import { useSesion } from '../../lib/sesion'
import { Aviso, Avatar, Boton, Buscador, Campo, Chips, EjemploTag, Encabezado, EsqueletoLista, Hoja, PillEstado, Vacio, useToast, type Estado } from '../../ui'

interface Fila { socio_id: string; numero: string; apellidos: string; nombres: string; estado_socio: string; saldo: number; cuotas_vencidas: number; estado_cuenta: Estado; proximo_vencimiento: string | null; es_ejemplo: boolean }
type Filtro = 'todos' | 'al_dia' | 'por_vencer' | 'deuda' | 'inactivos'

export default function Socios() {
  const navegar = useNavigate()
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [nuevo, setNuevo] = useState(false)
  const { datos, cargando, recargar } = useDatos(async () => ok(await supabase.from('estado_socios').select('*').order('numero')) as Fila[], [])

  const cuenta = (f: Filtro) => (datos ?? []).filter((s) => (f === 'todos' ? s.estado_socio === 'activo' : f === 'inactivos' ? s.estado_socio !== 'activo' : s.estado_cuenta === f && s.estado_socio === 'activo')).length
  const filas = useMemo(() => {
    const t = q.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return (datos ?? []).filter((s) => (filtro === 'todos' ? s.estado_socio === 'activo' : filtro === 'inactivos' ? s.estado_socio !== 'activo' : s.estado_cuenta === filtro && s.estado_socio === 'activo'))
      .filter((s) => !t || `${s.numero} ${s.nombres} ${s.apellidos}`.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(t))
  }, [datos, q, filtro])

  const exportar = () => exportarExcel(`socios-${hoyLima()}`, { Socios: filas.map((s) => ({ 'N°': s.numero, Apellidos: s.apellidos, Nombres: s.nombres, Estado: s.estado_socio, Cuenta: s.estado_cuenta === 'al_dia' ? 'Al día' : s.estado_cuenta === 'por_vencer' ? 'Por vencer' : 'Con deuda', 'Saldo (S/)': Number(s.saldo), 'Cuotas vencidas': s.cuotas_vencidas, 'Dato de ejemplo': s.es_ejemplo ? 'Sí' : 'No' })) })

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Socios" explicacion="El padrón del club con el estado de cuenta de cada socio. Toca un socio para ver su ficha, su familia y sus cuotas."
        acciones={<>
          <Boton variante="secondary" icono={<FileUp aria-hidden />} onClick={() => navegar('/admin/socios/importar')}>Importar padrón</Boton>
          <Boton variante="ghost" icono={<FileDown aria-hidden />} onClick={exportar} disabled={!filas.length}>Exportar</Boton>
          <Boton icono={<UserPlus aria-hidden />} onClick={() => setNuevo(true)}>Nuevo socio</Boton>
        </>} />
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <Buscador valor={q} onCambio={setQ} placeholder="Nombre, apellido o N° de socio" etiqueta="Filtrar socios" />
        <Chips etiqueta="Filtrar por estado" scroll valor={filtro} onCambio={setFiltro} opciones={[
          { valor: 'todos', etiqueta: 'Activos', cuenta: cuenta('todos') }, { valor: 'al_dia', etiqueta: 'Al día', cuenta: cuenta('al_dia') },
          { valor: 'por_vencer', etiqueta: 'Por vencer', cuenta: cuenta('por_vencer') }, { valor: 'deuda', etiqueta: 'Con deuda', cuenta: cuenta('deuda') },
          { valor: 'inactivos', etiqueta: 'Inactivos', cuenta: cuenta('inactivos') }]} />
      </div>
      {cargando && !datos ? <EsqueletoLista filas={8} /> : !filas.length ? (
        <Vacio icono={<Users />} titulo={q ? 'Sin coincidencias' : 'No hay socios en este filtro'} texto={q ? 'Prueba con el N° de socio o solo el apellido.' : 'Importa el padrón desde Excel o agrega un socio nuevo.'}
          accion={!q ? <Boton variante="secondary" icono={<FileUp aria-hidden />} onClick={() => navegar('/admin/socios/importar')}>Importar padrón</Boton> : undefined} />
      ) : (
        <div className="card list" style={{ padding: 8 }} role="list">
          {filas.map((s) => (
            <button key={s.socio_id} type="button" role="listitem" className="list-item" onClick={() => navegar(`/admin/socios/${s.socio_id}`)}>
              <Avatar nombre={`${s.nombres} ${s.apellidos}`} />
              <span className="li-main">
                <span className="li-title" style={{ display: 'block' }}>{s.apellidos}, {s.nombres}</span>
                <span className="li-sub" style={{ display: 'block' }}>
                  N° <span className="num">{s.numero}</span>
                  {s.cuotas_vencidas > 0 ? ` · ${s.cuotas_vencidas} cuota(s) vencida(s)` : s.proximo_vencimiento ? ` · vence ${fechaCorta(s.proximo_vencimiento)}` : ''}
                  {s.es_ejemplo ? ' · ' : ''}{s.es_ejemplo && <EjemploTag texto="Ejemplo" />}
                </span>
              </span>
              <span className="li-end">
                {s.estado_socio !== 'activo' ? <PillEstado estado={s.estado_socio === 'suspendido' ? 'suspendido' : 'inactivo'} /> :
                  <PillEstado estado={s.estado_cuenta} texto={s.estado_cuenta === 'deuda' ? `Debe ${moneda(s.saldo)}` : undefined} />}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="small muted">{filas.length} de {datos?.length ?? 0} socios.</p>
      <NuevoSocio abierta={nuevo} onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); recargar(true); navegar(`/admin/socios/${id}`) }} />
    </div>
  )
}

function NuevoSocio({ abierta, onCerrar, onCreado }: { abierta: boolean; onCerrar: () => void; onCreado: (id: string) => void }) {
  const { perfil } = useSesion()
  const avisar = useToast()
  const [f, setF] = useState({ numero: '', apellidos: '', nombres: '', dni: '', celular: '', correo: '', fecha_ingreso: hoyLima() })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const guardar = async () => {
    if (!f.numero.trim() || f.apellidos.trim().length < 2 || f.nombres.trim().length < 2) { setError('Completa N° de socio, apellidos y nombres.'); return }
    if (f.dni && !/^\d{8}$/.test(f.dni)) { setError('El DNI tiene 8 números.'); return }
    setGuardando(true); setError(null)
    try {
      const r = ok(await supabase.from('socios').insert({ club_id: perfil!.club_id, numero: f.numero.trim().padStart(4, '0'), apellidos: f.apellidos.trim(), nombres: f.nombres.trim(), dni: f.dni || null, celular: f.celular || null, correo: f.correo || null, fecha_ingreso: f.fecha_ingreso || null }).select('id').single()) as { id: string }
      if (f.dni) {
        try { const c = await funcion<{ pin: string }>('admin-socios', { accion: 'reenviar_pin', socio_id: r.id }); avisar(`Socio creado. PIN temporal: ${c.pin} (entrégaselo; lo cambiará al entrar).`) }
        catch { avisar('Socio creado. La cuenta de la app se crea desde su ficha.', 'alerta') }
      } else avisar('Socio creado.')
      onCreado(r.id)
    } catch (e) { setError((e as Error).message.includes('duplicate') ? 'Ya existe un socio con ese N° o DNI.' : (e as Error).message) } finally { setGuardando(false) }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Nuevo socio" subtitulo="Con el DNI se crea su acceso a la app."
      pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} cargando={guardando}>Guardar socio</Boton></>}>
      <div className="stack">
        <Campo etiqueta="N° de socio" inputMode="numeric" value={f.numero} onChange={set('numero')} />
        <Campo etiqueta="Apellidos" value={f.apellidos} onChange={set('apellidos')} autoComplete="off" />
        <Campo etiqueta="Nombres" value={f.nombres} onChange={set('nombres')} autoComplete="off" />
        <Campo etiqueta="DNI" inputMode="numeric" maxLength={8} value={f.dni} onChange={(e) => setF({ ...f, dni: e.target.value.replace(/\D/g, '') })} />
        <Campo etiqueta="Celular" inputMode="tel" value={f.celular} onChange={set('celular')} />
        <Campo etiqueta="Correo (opcional)" type="email" value={f.correo} onChange={set('correo')} />
        <Campo etiqueta="Fecha de ingreso" type="date" value={f.fecha_ingreso} onChange={set('fecha_ingreso')} />
        {error && <Aviso tono="peligro">{error}</Aviso>}
      </div>
    </Hoja>
  )
}
