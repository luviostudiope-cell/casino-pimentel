import { useMemo, useState } from 'react'
import { Camera, FileDown, KeyRound, Plus, UserPlus } from 'lucide-react'
import { rpc, supabase, urlFirmada } from '../../lib/supabase'
import { ok, useDatos, useEnVivo } from '../../lib/datos'
import { useSesion } from '../../lib/sesion'
import { exportarExcel } from '../../lib/excel'
import { fechaCorta, hora, hoyLima, moneda } from '../../lib/formato'
import { Avatar, Boton, CalendarioTurnos, Campo, Chips, EjemploTag, Encabezado, EsqueletoLista, Hoja, Interruptor, ItemLista, PillEstado, Pestanas, Selector, Tarjeta, Vacio, useToast } from '../../ui'

type Tab = 'hoy' | 'turnos' | 'fichas' | 'mensual'
interface Persona { id: string; nombres: string; apellidos: string; dni: string; area: string; cargo: string; tipo_contrato: 'planilla' | 'recibo'; sueldo_mensual: number | null; pago_hora: number | null; es_encargado: boolean; activo: boolean; celular: string | null; es_ejemplo: boolean }
const AREAS = ['barra', 'porteria', 'administracion', 'mantenimiento', 'limpieza', 'piscina', 'seguridad', 'jardineria', 'cocina', 'otro']
const AREA: Record<string, string> = { barra: 'Barra', porteria: 'Portería', administracion: 'Administración', mantenimiento: 'Mantenimiento', limpieza: 'Limpieza', piscina: 'Piscina', seguridad: 'Seguridad', jardineria: 'Jardinería', cocina: 'Cocina', otro: 'Otro' }

export default function Personal() {
  const [tab, setTab] = useState<Tab>('hoy')
  const { datos: personal, recargar } = useDatos(async () => ok(await supabase.from('personal').select('*').is('eliminado_en', null).order('apellidos')) as Persona[], [])
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Personal" explicacion="Fichas del equipo, turnos por área, asistencia del día con foto de cada marcación y el reporte mensual para el pago." />
      <Pestanas etiqueta="Secciones de personal" valor={tab} onCambio={setTab} opciones={[{ valor: 'hoy', etiqueta: 'Asistencia de hoy' }, { valor: 'turnos', etiqueta: 'Turnos' }, { valor: 'fichas', etiqueta: 'Fichas' }, { valor: 'mensual', etiqueta: 'Reporte mensual' }]} />
      {!personal ? <EsqueletoLista filas={6} /> : (
        <>
          {tab === 'hoy' && <AsistenciaHoy personal={personal} />}
          {tab === 'turnos' && <Turnos personal={personal} />}
          {tab === 'fichas' && <Fichas personal={personal} recargar={() => recargar(true)} />}
          {tab === 'mensual' && <Mensual />}
        </>
      )}
    </div>
  )
}

function AsistenciaHoy({ personal }: { personal: Persona[] }) {
  const hoy = hoyLima()
  const [foto, setFoto] = useState<string | null>(null)
  const { datos, recargar } = useDatos(async () => {
    const [t, m] = await Promise.all([
      supabase.from('turnos').select('personal_id, hora_inicio, hora_fin').eq('fecha', hoy).is('eliminado_en', null),
      supabase.from('marcaciones').select('id, personal_id, tipo, hora, minutos_tarde, foto_path').eq('fecha', hoy).is('eliminado_en', null).order('hora'),
    ])
    return { turnos: ok(t) as { personal_id: string; hora_inicio: string; hora_fin: string }[], marcas: ok(m) as { id: string; personal_id: string; tipo: string; hora: string; minutos_tarde: number; foto_path: string | null }[] }
  }, [hoy])
  useEnVivo(['marcaciones'], () => recargar(true))
  if (!datos) return <EsqueletoLista filas={6} />
  const ahora = hora(new Date())
  const filas = personal.filter((p) => p.activo).map((p) => {
    const t = datos.turnos.find((x) => x.personal_id === p.id)
    const m = datos.marcas.filter((x) => x.personal_id === p.id)
    const entrada = m.find((x) => x.tipo === 'entrada')
    const estado = !t ? null : entrada ? (entrada.minutos_tarde > 0 ? 'tardanza' : 'presente') : t.hora_inicio.slice(0, 5) < ahora ? 'falta' : null
    return { p, t, m, entrada, estado }
  }).filter((f) => f.t || f.m.length)
  return (
    <div className="card list" style={{ padding: 8 }}>
      {!filas.length ? <Vacio icono={<Camera />} titulo="Nadie programado hoy" texto="Asigna turnos en la pestaña Turnos." /> : filas.map(({ p, t, m, entrada, estado }) => (
        <div key={p.id} className="list-item" style={{ alignItems: 'flex-start' }}>
          <Avatar nombre={`${p.nombres} ${p.apellidos}`} />
          <span className="li-main">
            <span className="li-title" style={{ display: 'block' }}>{p.nombres} {p.apellidos}</span>
            <span className="li-sub" style={{ display: 'block' }}>{AREA[p.area]} · {t ? `turno ${t.hora_inicio.slice(0, 5)}–${t.hora_fin.slice(0, 5)}` : 'sin turno'}</span>
            <span className="row wrap small" style={{ marginTop: 6, ['--gap' as string]: '6px' }}>
              {m.map((x) => (
                <button key={x.id} type="button" className="pill pill-info" onClick={async () => setFoto(await urlFirmada('fotos-marcacion', x.foto_path) ?? '')} aria-label={`Ver foto de ${x.tipo.replace('_', ' ')} a las ${hora(x.hora)}`}>
                  {x.foto_path && <Camera aria-hidden />}{x.tipo.replace('_', ' ')} {hora(x.hora)}
                </button>
              ))}
            </span>
          </span>
          {estado && <PillEstado estado={estado as 'presente'} texto={estado === 'tardanza' && entrada ? `Tarde ${entrada.minutos_tarde} min` : undefined} />}
        </div>
      ))}
      <Hoja abierta={foto !== null} onCerrar={() => setFoto(null)} titulo="Foto de la marcación">
        {foto ? <img src={foto} alt="Foto tomada al marcar" style={{ width: '100%', borderRadius: 18 }} /> : <p className="muted">Esta marcación no tiene foto (dato de ejemplo o cámara no disponible).</p>}
      </Hoja>
    </div>
  )
}

function Turnos({ personal }: { personal: Persona[] }) {
  const { perfil } = useSesion()
  const avisar = useToast()
  const [area, setArea] = useState('todas')
  const [semana, setSemana] = useState(0)
  const dias = useMemo(() => {
    const hoy = new Date(hoyLima() + 'T12:00:00')
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) + semana * 7)
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); const f = d.toISOString().slice(0, 10); return { fecha: f, etiqueta: new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric' }).format(d) } })
  }, [semana])
  const { datos, recargar } = useDatos(async () => ok(await supabase.from('turnos').select('id, personal_id, fecha, hora_inicio, hora_fin').gte('fecha', dias[0].fecha).lte('fecha', dias[6].fecha).is('eliminado_en', null)) as { id: string; personal_id: string; fecha: string; hora_inicio: string; hora_fin: string }[], [dias[0].fecha])
  const [nuevo, setNuevo] = useState({ personal: '', fecha: hoyLima(), inicio: '07:00', fin: '15:00', abierta: false })
  const lista = personal.filter((p) => p.activo && (area === 'todas' || p.area === area))
  const guardar = async () => {
    const ex = datos?.find((t) => t.personal_id === nuevo.personal && t.fecha === nuevo.fecha)
    const q = ex ? supabase.from('turnos').update({ hora_inicio: nuevo.inicio, hora_fin: nuevo.fin }).eq('id', ex.id)
      : supabase.from('turnos').insert({ club_id: perfil!.club_id, personal_id: nuevo.personal, fecha: nuevo.fecha, hora_inicio: nuevo.inicio, hora_fin: nuevo.fin })
    const { error } = await q
    if (error) avisar(error.message, 'error'); else { avisar('Turno guardado.'); setNuevo({ ...nuevo, abierta: false }); recargar(true) }
  }
  return (
    <div className="stack">
      <div className="row wrap between">
        <Chips etiqueta="Área" scroll valor={area} onCambio={setArea} opciones={[{ valor: 'todas', etiqueta: 'Todas' }, ...AREAS.filter((a) => personal.some((p) => p.area === a)).map((a) => ({ valor: a, etiqueta: AREA[a] }))]} />
        <div className="row"><Boton variante="ghost" onClick={() => setSemana(semana - 1)}>Semana anterior</Boton><Boton variante="ghost" onClick={() => setSemana(semana + 1)}>Siguiente</Boton><Boton icono={<Plus aria-hidden />} onClick={() => setNuevo({ ...nuevo, abierta: true })}>Asignar turno</Boton></div>
      </div>
      <Tarjeta>
        <CalendarioTurnos personas={lista.map((p) => ({ id: p.id, nombre: `${p.nombres.split(' ')[0]} ${p.apellidos.split(' ')[0]}` }))} dias={dias}
          celda={(pid, f) => { const t = datos?.find((x) => x.personal_id === pid && x.fecha === f); return t ? { inicio: t.hora_inicio.slice(0, 5), fin: t.hora_fin.slice(0, 5) } : null }} />
      </Tarjeta>
      <Hoja abierta={nuevo.abierta} onCerrar={() => setNuevo({ ...nuevo, abierta: false })} titulo="Asignar turno" pie={<><Boton variante="outline" onClick={() => setNuevo({ ...nuevo, abierta: false })}>Cancelar</Boton><Boton onClick={guardar} disabled={!nuevo.personal}>Guardar turno</Boton></>}>
        <div className="stack">
          <Selector etiqueta="Persona" value={nuevo.personal} onChange={(e) => setNuevo({ ...nuevo, personal: e.target.value })}><option value="">Elige…</option>{personal.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} · {AREA[p.area]}</option>)}</Selector>
          <Campo etiqueta="Día" type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} />
          <div className="row"><Campo etiqueta="Entra" type="time" value={nuevo.inicio} onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })} className="grow" /><Campo etiqueta="Sale" type="time" value={nuevo.fin} onChange={(e) => setNuevo({ ...nuevo, fin: e.target.value })} className="grow" /></div>
        </div>
      </Hoja>
    </div>
  )
}

function Fichas({ personal, recargar }: { personal: Persona[]; recargar: () => void }) {
  const { perfil } = useSesion()
  const avisar = useToast()
  const [ed, setEd] = useState<Partial<Persona> | null>(null)
  const [pin, setPin] = useState('')
  const guardar = async () => {
    if (!ed?.nombres || !ed.apellidos || !ed.dni || !ed.cargo) { avisar('Completa nombres, apellidos, DNI y cargo.', 'alerta'); return }
    const fila = { nombres: ed.nombres, apellidos: ed.apellidos, dni: ed.dni, area: ed.area ?? 'otro', cargo: ed.cargo, tipo_contrato: ed.tipo_contrato ?? 'planilla', sueldo_mensual: ed.sueldo_mensual || null, pago_hora: ed.pago_hora || null, es_encargado: Boolean(ed.es_encargado), activo: ed.activo ?? true, celular: ed.celular || null }
    const { data, error } = ed.id ? await supabase.from('personal').update(fila).eq('id', ed.id).select('id').single() : await supabase.from('personal').insert({ ...fila, club_id: perfil!.club_id }).select('id').single()
    if (error) { avisar(error.message.includes('duplicate') ? 'Ya hay alguien con ese DNI.' : error.message, 'error'); return }
    if (pin) { try { await rpc('fijar_pin_personal', { p_personal_id: (data as { id: string }).id, p_pin: pin }) } catch (e) { avisar((e as Error).message, 'error'); return } }
    avisar('Ficha guardada.'); setEd(null); setPin(''); recargar()
  }
  return (
    <div className="stack">
      <div className="row between wrap"><p className="muted">{personal.filter((p) => p.tipo_contrato === 'planilla' && p.activo).length} en planilla · {personal.filter((p) => p.tipo_contrato === 'recibo' && p.activo).length} por recibo por honorarios</p><Boton icono={<UserPlus aria-hidden />} onClick={() => setEd({ activo: true, tipo_contrato: 'planilla', area: 'barra' })}>Nueva ficha</Boton></div>
      <div className="card list" style={{ padding: 8 }}>
        {personal.map((p) => (
          <ItemLista key={p.id} onClick={() => setEd(p)} inicio={<Avatar nombre={`${p.nombres} ${p.apellidos}`} />} titulo={`${p.nombres} ${p.apellidos}`}
            sub={`${p.cargo} · ${AREA[p.area]} · ${p.tipo_contrato === 'planilla' ? 'Planilla' : 'Recibo'}${p.es_encargado ? ' · encargado' : ''}`}
            fin={<>{p.es_ejemplo && <EjemploTag texto="Ejemplo" />}<PillEstado estado={p.activo ? 'activo' : 'inactivo'} /></>} />
        ))}
      </div>
      <Hoja abierta={Boolean(ed)} onCerrar={() => setEd(null)} titulo={ed?.id ? 'Ficha del trabajador' : 'Nueva ficha'} pie={<><Boton variante="outline" onClick={() => setEd(null)}>Cancelar</Boton><Boton onClick={guardar}>Guardar</Boton></>}>
        {ed && (
          <div className="stack">
            <Campo etiqueta="Nombres" value={ed.nombres ?? ''} onChange={(e) => setEd({ ...ed, nombres: e.target.value })} />
            <Campo etiqueta="Apellidos" value={ed.apellidos ?? ''} onChange={(e) => setEd({ ...ed, apellidos: e.target.value })} />
            <Campo etiqueta="DNI" inputMode="numeric" maxLength={8} value={ed.dni ?? ''} onChange={(e) => setEd({ ...ed, dni: e.target.value.replace(/\D/g, '') })} />
            <Selector etiqueta="Área" value={ed.area} onChange={(e) => setEd({ ...ed, area: e.target.value })}>{AREAS.map((a) => <option key={a} value={a}>{AREA[a]}</option>)}</Selector>
            <Campo etiqueta="Cargo" value={ed.cargo ?? ''} onChange={(e) => setEd({ ...ed, cargo: e.target.value })} />
            <Chips etiqueta="Tipo de contrato" valor={ed.tipo_contrato ?? 'planilla'} onCambio={(v) => setEd({ ...ed, tipo_contrato: v })} opciones={[{ valor: 'planilla', etiqueta: 'Planilla' }, { valor: 'recibo', etiqueta: 'Recibo por honorarios' }]} />
            {ed.tipo_contrato === 'recibo' ? <Campo etiqueta="Pago por hora (S/)" inputMode="decimal" value={String(ed.pago_hora ?? '')} onChange={(e) => setEd({ ...ed, pago_hora: Number(e.target.value) || null })} />
              : <Campo etiqueta="Sueldo mensual (S/)" inputMode="decimal" value={String(ed.sueldo_mensual ?? '')} onChange={(e) => setEd({ ...ed, sueldo_mensual: Number(e.target.value) || null })} />}
            <Campo etiqueta="Celular" inputMode="tel" value={ed.celular ?? ''} onChange={(e) => setEd({ ...ed, celular: e.target.value })} />
            <Campo etiqueta={ed.id ? 'Nuevo PIN de asistencia (opcional)' : 'PIN de asistencia (4 a 6 números)'} inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} icono={<KeyRound aria-hidden />} ayuda="Con su DNI o este PIN marca entrada y salida en la tablet de portería." />
            <Interruptor etiqueta="Puede autorizar cortesías" descripcion="Encargado de barra o administración." activo={Boolean(ed.es_encargado)} onCambio={(v) => setEd({ ...ed, es_encargado: v })} />
            <Interruptor etiqueta="Activo" activo={ed.activo ?? true} onCambio={(v) => setEd({ ...ed, activo: v })} />
          </div>
        )}
      </Hoja>
    </div>
  )
}

interface FilaAsis { personal_id: string; nombre: string; area: string; tipo_contrato: 'planilla' | 'recibo'; dias_programados: number; dias_trabajados: number; tardanzas: number; minutos_tarde: number; faltas: number; horas: number; sueldo_mensual: number | null; pago_hora: number | null; es_ejemplo: boolean }

function Mensual() {
  const [mes, setMes] = useState(hoyLima().slice(0, 7))
  const desde = `${mes}-01`
  const hasta = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).toISOString().slice(0, 10)
  const { datos } = useDatos(() => rpc<{ asistencia: FilaAsis[] }>('reporte_periodo', { p_desde: desde, p_hasta: hasta }), [mes])
  const filas = datos?.asistencia ?? []
  const tabla = (tipo: 'planilla' | 'recibo') => {
    const f = filas.filter((x) => x.tipo_contrato === tipo)
    return (
      <Tarjeta titulo={tipo === 'planilla' ? 'Planilla' : 'Recibo por honorarios'}>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Trabajador</th><th className="num">Días</th><th className="num">Horas</th><th className="num">Tardanzas</th><th className="num">Faltas</th><th className="num">{tipo === 'planilla' ? 'Sueldo' : 'A pagar (horas × tarifa)'}</th></tr></thead>
            <tbody>{f.map((x) => (
              <tr key={x.personal_id}><td><b>{x.nombre}</b>{x.es_ejemplo && <div><EjemploTag texto="Ejemplo" /></div>}</td><td className="num">{x.dias_trabajados} / {x.dias_programados}</td><td className="num">{x.horas}</td><td className="num">{x.tardanzas}{x.minutos_tarde ? ` (${x.minutos_tarde} min)` : ''}</td><td className="num" style={{ color: x.faltas ? 'var(--peligro-tinta)' : undefined }}>{x.faltas}</td>
                <td className="num bold">{tipo === 'planilla' ? moneda(x.sueldo_mensual) : moneda(Number(x.horas) * Number(x.pago_hora ?? 0))}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Tarjeta>
    )
  }
  return (
    <div className="stack">
      <div className="row wrap" style={{ alignItems: 'flex-end' }}>
        <Campo etiqueta="Mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} style={{ width: 190 }} />
        <Boton variante="ghost" icono={<FileDown aria-hidden />} onClick={() => exportarExcel(`asistencia-${mes}`, {
          Planilla: filas.filter((x) => x.tipo_contrato === 'planilla').map((x) => ({ Trabajador: x.nombre, Área: x.area, 'Días trabajados': x.dias_trabajados, 'Días programados': x.dias_programados, Horas: x.horas, Tardanzas: x.tardanzas, 'Minutos tarde': x.minutos_tarde, Faltas: x.faltas, 'Sueldo (S/)': x.sueldo_mensual })),
          Recibo: filas.filter((x) => x.tipo_contrato === 'recibo').map((x) => ({ Trabajador: x.nombre, Área: x.area, 'Días trabajados': x.dias_trabajados, Horas: x.horas, Tardanzas: x.tardanzas, Faltas: x.faltas, 'Pago por hora': x.pago_hora, 'A pagar (S/)': Number(x.horas) * Number(x.pago_hora ?? 0) })),
        })}>Exportar a Excel</Boton>
      </div>
      <p className="small muted">Del {fechaCorta(desde)} al {fechaCorta(hasta)}. Horas = salida − entrada − refrigerio. Las faltas cuentan días con turno sin marcación de entrada.</p>
      {!datos ? <EsqueletoLista filas={6} /> : <>{tabla('planilla')}{tabla('recibo')}</>}
    </div>
  )
}
