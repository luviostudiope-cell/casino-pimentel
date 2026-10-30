import { useEffect, useMemo, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Building2, CalendarDays, CheckCircle2, Trophy, UserPlus, Users, X } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { diaMes, fechaCorta, fechaLarga, hoyLima, monedaCorta } from '../../lib/formato'
import { Aviso, Boton, Campo, Chips, EjemploTag, Esqueleto, Hoja, PillEstado, Pestanas, Selector, Tarjeta, Vacio, useConfirmar, useToast } from '../../ui'
import { useSocio } from './Socio'
import { PARENTESCO } from './datos'

export default function Reservas() {
  const loc = useLocation()
  const navegar = useNavigate()
  const tab = loc.pathname.endsWith('/invitados') ? 'invitados' : loc.pathname.endsWith('/ambientes') ? 'ambientes' : 'tenis'
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <div>
        <h1>Reservas</h1>
        <p className="page-lead">Tenis, tus invitados y los ambientes del club.</p>
      </div>
      <Pestanas etiqueta="Tipo de reserva" bloque valor={tab} onCambio={(v) => navegar(v === 'tenis' ? '/socio/reservas' : `/socio/reservas/${v}`)}
        opciones={[{ valor: 'tenis', etiqueta: 'Tenis', icono: <Trophy aria-hidden /> }, { valor: 'invitados', etiqueta: 'Invitados', icono: <UserPlus aria-hidden /> }, { valor: 'ambientes', etiqueta: 'Ambientes', icono: <Building2 aria-hidden /> }]} />
      <Routes>
        <Route index element={<Tenis />} />
        <Route path="invitados" element={<Invitados />} />
        <Route path="ambientes" element={<Ambientes />} />
      </Routes>
    </div>
  )
}

/* ------------------------------ Tenis ------------------------------ */
interface Slot { hora: string; estado: 'libre' | 'reservado' | 'bloqueado' | 'pasado'; propio: boolean; reserva_id: string | null; quien: string | null; motivo: string | null }
interface Disponibilidad { fecha: string; duracion_min: number; canchas: { id: string; nombre: string; slots: Slot[] }[]; reglas: { max_por_dia: number; max_por_semana: number; edad_max_hijos: number; dias_anticipacion: number } }

function edad(nac: string | null) {
  if (!nac) return null
  const h = new Date(hoyLima()); const n = new Date(nac)
  let e = h.getFullYear() - n.getFullYear()
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--
  return e
}

function Tenis() {
  const { familia } = useSocio()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const dias = useMemo(() => Array.from({ length: 8 }, (_, i) => hoyLima(i)), [])
  const [fecha, setFecha] = useState(dias[0])
  const habiles = familia.miembros.filter((m) => m.parentesco !== 'otro')
  const [quien, setQuien] = useState(habiles[0]?.id ?? '')
  const [elegido, setElegido] = useState<{ cancha: string; canchaNombre: string; hora: string } | null>(null)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const { datos, cargando, recargar } = useDatos(() => rpc<Disponibilidad>('disponibilidad_tenis', { p_fecha: fecha }), [fecha])
  const { datos: mias, recargar: recargarMias } = useDatos(async () => ok(await supabase.from('reservas_cancha')
    .select('id, fecha, hora_inicio, canchas(nombre), miembros(nombres)').eq('socio_id', familia.socio.id).eq('estado', 'confirmada').gte('fecha', hoyLima()).order('fecha').order('hora_inicio')) as unknown as
    { id: string; fecha: string; hora_inicio: string; canchas: { nombre: string }; miembros: { nombres: string } | null }[], [familia.socio.id])

  useEffect(() => setMensaje(null), [fecha, quien])
  const miembro = habiles.find((m) => m.id === quien)
  const e = edad(miembro?.fecha_nacimiento ?? null)

  const reservar = async () => {
    if (!elegido || !miembro) return
    setEnviando(true)
    try {
      const r = await rpc<{ ok: boolean; mensaje: string }>('reservar_tenis', { p_cancha_id: elegido.cancha, p_fecha: fecha, p_hora: elegido.hora, p_miembro_id: miembro.id })
      setMensaje({ ok: r.ok, texto: r.mensaje })
      if (r.ok) { avisar(r.mensaje); setElegido(null); recargar(true); recargarMias(true) }
    } catch (er) { setMensaje({ ok: false, texto: (er as Error).message }) } finally { setEnviando(false) }
  }

  const cancelar = async (id: string, texto: string) => {
    if (!(await confirmar({ titulo: '¿Cancelar esta reserva?', texto, confirmar: 'Sí, cancelar', cancelar: 'No', peligro: true }))) return
    try {
      const r = await rpc<{ ok: boolean; mensaje: string }>('cancelar_reserva', { p_reserva_id: id })
      avisar(r.mensaje, r.ok ? 'ok' : 'alerta'); recargar(true); recargarMias(true)
    } catch (er) { avisar((er as Error).message, 'error') }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Tarjeta titulo="1. Elige el día">
        <Chips etiqueta="Día" scroll valor={fecha} onCambio={setFecha}
          opciones={dias.map((d, i) => ({ valor: d, etiqueta: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${fechaLarga(d).split(' ')[0].slice(0, 3)} ${diaMes(d).slice(0, 2)}` }))} />
      </Tarjeta>
      <Tarjeta titulo="2. ¿Quién juega?">
        <Chips etiqueta="Quién juega" valor={quien} onCambio={setQuien}
          opciones={habiles.map((m) => ({ valor: m.id, etiqueta: `${m.nombres.split(' ')[0]} · ${PARENTESCO[m.parentesco]}` }))} />
        {miembro && (miembro.parentesco === 'hijo' || miembro.parentesco === 'hija') && e !== null && e >= (datos?.reglas.edad_max_hijos ?? 25) && (
          <div style={{ marginTop: 12 }}><Aviso tono="alerta" icono={<AlertCircle aria-hidden />}>{miembro.nombres.split(' ')[0]} tiene {e} años. Los hijos pueden reservar hasta antes de cumplir {datos?.reglas.edad_max_hijos ?? 25}.</Aviso></div>
        )}
      </Tarjeta>
      <Tarjeta titulo="3. Toca una hora libre">
        {cargando && !datos ? <Esqueleto alto={160} radio={20} /> : datos?.canchas.map((c) => (
          <div key={c.id} className="stack" style={{ ['--gap' as string]: '10px', marginBottom: 18 }}>
            <b>{c.nombre}</b>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', ['--gap' as string]: '8px' }}>
              {c.slots.map((s) => {
                const sel = elegido?.cancha === c.id && elegido.hora === s.hora
                const libre = s.estado === 'libre'
                return (
                  <button key={s.hora} type="button" disabled={!libre}
                    className={`turno-pill ${s.propio ? 'manana' : libre ? '' : 'libre'}`}
                    aria-pressed={sel}
                    aria-label={`${c.nombre} ${s.hora}: ${s.propio ? 'tu reserva' : s.estado === 'libre' ? 'libre' : s.estado === 'bloqueado' ? 'bloqueado' : s.estado === 'pasado' ? 'ya pasó' : 'ocupado'}`}
                    style={{ minHeight: 52, fontSize: 'var(--text-base)', background: sel ? 'var(--azul)' : undefined, color: sel ? '#fff' : !libre && !s.propio ? '#66778A' : undefined, textDecoration: s.estado === 'pasado' ? 'line-through' : undefined, cursor: libre ? 'pointer' : 'default', transition: 'transform 140ms var(--ease-out), background-color 160ms ease' }}
                    onClick={() => setElegido({ cancha: c.id, canchaNombre: c.nombre, hora: s.hora })}>
                    {s.hora}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <p className="small muted">Turnos de 1 hora, de 6:00 a 22:00. Cada persona: 1 reserva por día y {datos?.reglas.max_por_semana ?? 3} por semana.</p>
      </Tarjeta>

      <AnimatePresence>
        {mensaje && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Aviso tono={mensaje.ok ? 'ok' : 'peligro'} icono={mensaje.ok ? <CheckCircle2 aria-hidden /> : <AlertCircle aria-hidden />}>{mensaje.texto}</Aviso>
          </motion.div>
        )}
      </AnimatePresence>

      <Tarjeta titulo="Tus próximas reservas">
        {mias?.length ? (
          <div className="list">
            {mias.map((r) => (
              <div key={r.id} className="list-item">
                <span className="li-main">
                  <span className="li-title" style={{ display: 'block' }}>{r.canchas?.nombre} · {r.hora_inicio.slice(0, 5)}</span>
                  <span className="li-sub" style={{ display: 'block' }}>{fechaLarga(r.fecha)}{r.miembros ? ` · ${r.miembros.nombres.split(' ')[0]}` : ''}</span>
                </span>
                <Boton variante="ghost" tam="sm" icono={<X aria-hidden />} onClick={() => cancelar(r.id, `${r.canchas?.nombre}, ${fechaLarga(r.fecha)} a las ${r.hora_inicio.slice(0, 5)}.`)}>Cancelar</Boton>
              </div>
            ))}
          </div>
        ) : <p className="muted">No tienes reservas próximas.</p>}
      </Tarjeta>

      <Hoja abierta={Boolean(elegido)} onCerrar={() => setElegido(null)} titulo="Confirmar reserva" lado={false}
        pie={<><Boton variante="outline" onClick={() => setElegido(null)}>Volver</Boton><Boton onClick={reservar} cargando={enviando}>Reservar</Boton></>}>
        {elegido && miembro && (
          <dl style={{ margin: 0 }}>
            <div className="kv"><dt>Cancha</dt><dd>{elegido.canchaNombre}</dd></div>
            <div className="kv"><dt>Día</dt><dd>{fechaLarga(fecha)}</dd></div>
            <div className="kv"><dt>Hora</dt><dd className="num">{elegido.hora} a {String(Number(elegido.hora.slice(0, 2)) + 1).padStart(2, '0')}:00</dd></div>
            <div className="kv"><dt>Juega</dt><dd>{miembro.nombres} {miembro.apellidos}</dd></div>
          </dl>
        )}
      </Hoja>
    </div>
  )
}

/* ------------------------------ Invitados ------------------------------ */
interface Cupos { invitados_hoy: number; max_dia: number; restantes_hoy: number; visitas_mes: number; max_mes: number; restantes_mes: number; conocido: boolean; tarifas: { club: number; piscina: number; comedor: number } }

function Invitados() {
  const { familia } = useSocio()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const dias = useMemo(() => Array.from({ length: 4 }, (_, i) => hoyLima(i)), [])
  const [fecha, setFecha] = useState(dias[0])
  const [dni, setDni] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'club' | 'piscina' | 'comedor'>('club')
  const [error, setError] = useState<{ campo?: string; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const { datos: cupos, recargar: recargarCupos } = useDatos(() => rpc<Cupos>('cupos_invitados', { p_fecha: fecha }), [fecha])
  const { datos: cuposDni } = useDatos(async () => (dni.length === 8 ? rpc<Cupos>('cupos_invitados', { p_dni: dni, p_fecha: fecha }) : null), [dni, fecha])
  const { datos: lista, recargar: recargarLista } = useDatos(async () => ok(await supabase.from('ingresos')
    .select('id, fecha, tipo_ingreso, monto, estado, invitados(nombres, dni)').eq('socio_id', familia.socio.id).eq('persona', 'invitado').gte('fecha', hoyLima()).neq('estado', 'anulado').order('fecha')) as unknown as
    { id: string; fecha: string; tipo_ingreso: string; monto: number; estado: 'preregistrado' | 'dentro' | 'salio'; invitados: { nombres: string; dni: string } }[], [familia.socio.id])

  const registrar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    if (!/^\d{8}$/.test(dni)) { setError({ campo: 'dni', texto: 'El DNI tiene 8 números.' }); return }
    if (nombre.trim().length < 3) { setError({ campo: 'nombre', texto: 'Escribe nombre y apellido del invitado.' }); return }
    setEnviando(true)
    try {
      const r = await rpc<{ ok: boolean; mensaje: string; campo?: string }>('registrar_invitado', { p_socio_id: null, p_dni: dni, p_nombres: nombre, p_tipo_ingreso: tipo, p_medio_pago: null, p_fecha: fecha })
      if (!r.ok) { setError({ campo: r.campo, texto: r.mensaje }); return }
      avisar(r.mensaje); setDni(''); setNombre(''); recargarCupos(true); recargarLista(true)
    } catch (er) { setError({ texto: (er as Error).message }) } finally { setEnviando(false) }
  }

  const anular = async (id: string, n: string) => {
    if (!(await confirmar({ titulo: `¿Quitar a ${n}?`, texto: 'Ya no figurará como tu invitado ese día.', confirmar: 'Quitar', peligro: true }))) return
    try { const r = await rpc<{ ok: boolean; mensaje: string }>('anular_ingreso', { p_ingreso_id: id, p_motivo: 'Cancelado por el socio' }); avisar(r.mensaje, r.ok ? 'ok' : 'alerta'); recargarLista(true); recargarCupos(true) }
    catch (er) { avisar((er as Error).message, 'error') }
  }

  const t = cupos?.tarifas
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <section className="card stack" style={{ ['--gap' as string]: '10px' }}>
        <span className="stat-label"><Users aria-hidden />Te quedan para {fecha === dias[0] ? 'hoy' : fechaCorta(fecha)}</span>
        <span className="cifra">{cupos ? `${cupos.restantes_hoy} de ${cupos.max_dia}` : '…'}</span>
        <span className="muted">invitados. Cada invitado puede venir hasta {cupos?.max_mes ?? 3} veces al mes.</span>
      </section>

      <Tarjeta titulo="Registrar un invitado">
        <form className="stack" onSubmit={registrar} noValidate>
          <Chips etiqueta="Día de la visita" valor={fecha} onCambio={setFecha} opciones={dias.map((d, i) => ({ valor: d, etiqueta: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fechaCorta(d).replace(/ \d{4}$/, '') }))} />
          <Campo etiqueta="DNI del invitado" inputMode="numeric" maxLength={8} value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            error={error?.campo === 'dni' ? error.texto : null}
            ayuda={cuposDni ? (cuposDni.conocido ? `Este mes ya vino ${cuposDni.visitas_mes} ${cuposDni.visitas_mes === 1 ? 'vez' : 'veces'}: le quedan ${cuposDni.restantes_mes}.` : 'Primera visita del mes.') : 'Lo usamos para contar sus visitas del mes.'} />
          <Campo etiqueta="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" error={error?.campo === 'nombres' ? error.texto : null} />
          <Selector etiqueta="Viene a" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="club">Club · {monedaCorta(t?.club ?? 10)}</option>
            <option value="piscina">Piscina · {monedaCorta(t?.piscina ?? 20)}</option>
            <option value="comedor">Solo comedor · ingreso libre</option>
          </Selector>
          {error && !error.campo && <Aviso tono="peligro" icono={<AlertCircle aria-hidden />}>{error.texto}</Aviso>}
          <Boton type="submit" tam="lg" bloque cargando={enviando} icono={<UserPlus aria-hidden />}>Registrar invitado</Boton>
          <p className="small muted">El invitado paga su ingreso en portería y solo dice su DNI.</p>
        </form>
      </Tarjeta>

      <Tarjeta titulo="Tus invitados registrados">
        {lista?.length ? (
          <div className="list">
            {lista.map((i) => (
              <div key={i.id} className="list-item">
                <span className="li-main">
                  <span className="li-title" style={{ display: 'block' }}>{i.invitados?.nombres}</span>
                  <span className="li-sub" style={{ display: 'block' }}>{fechaLarga(i.fecha)} · {i.tipo_ingreso === 'comedor' ? 'comedor' : `${i.tipo_ingreso} ${monedaCorta(i.monto)}`}</span>
                </span>
                <span className="li-end">
                  <PillEstado estado={i.estado} />
                  {i.estado === 'preregistrado' && <button type="button" className="icon-btn" aria-label={`Quitar a ${i.invitados?.nombres}`} onClick={() => anular(i.id, i.invitados?.nombres ?? '')}><X aria-hidden /></button>}
                </span>
              </div>
            ))}
          </div>
        ) : <Vacio icono={<UserPlus />} titulo="Sin invitados registrados" texto="Registra a tus invitados antes de llegar: en portería solo dirán su DNI." />}
      </Tarjeta>
    </div>
  )
}

/* ------------------------------ Ambientes ------------------------------ */
interface Ambiente { id: string; nombre: string; descripcion: string | null; capacidad: number | null; solo_temporada_baja: boolean; es_adicional: boolean; tarifas_ambiente: { tipo_cliente: string; precio: number | null; garantia: number | null }[] }

function Ambientes() {
  const avisar = useToast()
  const { familia } = useSocio()
  const [sol, setSol] = useState<Ambiente | null>(null)
  const [fecha, setFecha] = useState(hoyLima(14))
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { datos } = useDatos(async () => {
    const [a, d] = await Promise.all([
      supabase.from('ambientes').select('id, nombre, descripcion, capacidad, solo_temporada_baja, es_adicional, tarifas_ambiente(tipo_cliente, precio, garantia)').eq('activo', true).order('orden'),
      rpc<{ ambiente_id: string; fecha: string }[]>('disponibilidad_ambientes', { p_desde: hoyLima(), p_hasta: hoyLima(90) }),
    ])
    return { ambientes: ok(a) as Ambiente[], ocupados: d ?? [] }
  }, [])
  const ocupadoEse = (id: string, f: string) => datos?.ocupados.some((o) => o.ambiente_id === id && o.fecha === f)

  const solicitar = async () => {
    if (!sol) return
    setEnviando(true)
    try {
      const r = await rpc<{ ok: boolean; mensaje: string }>('solicitar_alquiler', {
        p_club_slug: 'casino-pimentel', p_nombre: `${familia.socio.nombres} ${familia.socio.apellidos}`, p_celular: familia.socio.celular ?? '000000000',
        p_fecha: fecha, p_ambiente_id: sol.id, p_tipo_cliente: 'socio', p_mensaje: mensaje || null,
      })
      avisar(r.mensaje, r.ok ? 'ok' : 'alerta')
      if (r.ok) { setSol(null); setMensaje('') }
    } catch (e) { avisar((e as Error).message, 'error') } finally { setEnviando(false) }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '16px' }}>
      <Aviso icono={<CalendarDays aria-hidden />}>Los ambientes se alquilan para eventos. Te damos el día anterior para decorar y puedes traer a tus proveedores.</Aviso>
      {(datos?.ambientes ?? []).filter((a) => !a.es_adicional).map((a) => {
        const socio = a.tarifas_ambiente.find((t) => t.tipo_cliente === 'socio')
        return (
          <section key={a.id} className="card stack" style={{ ['--gap' as string]: '10px' }}>
            <div className="row between wrap">
              <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--tinta)' }}>{a.nombre}</h2>
              <span className="pill pill-info num">{socio?.precio ? `Socio: ${monedaCorta(socio.precio)} + IGV` : 'Tarifa por confirmar'}</span>
            </div>
            {a.descripcion && <p className="muted">{a.descripcion}</p>}
            <div className="row wrap small muted">
              <span>Capacidad: {a.capacidad ?? '[por confirmar]'}</span>
              {socio?.garantia ? <span>· Garantía {monedaCorta(socio.garantia)}</span> : null}
              {a.solo_temporada_baja && <span>· Solo temporada baja (abril a noviembre)</span>}
            </div>
            <Boton variante="secondary" onClick={() => setSol(a)}>Solicitar este ambiente</Boton>
          </section>
        )
      })}
      <Hoja abierta={Boolean(sol)} onCerrar={() => setSol(null)} titulo={sol ? `Solicitar ${sol.nombre}` : ''} subtitulo="Administración te llamará para confirmar."
        pie={<><Boton variante="outline" onClick={() => setSol(null)}>Cancelar</Boton><Boton onClick={solicitar} cargando={enviando} disabled={sol ? ocupadoEse(sol.id, fecha) : false}>Enviar solicitud</Boton></>}>
        {sol && (
          <div className="stack">
            <Campo etiqueta="Fecha del evento" type="date" min={hoyLima(1)} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            {ocupadoEse(sol.id, fecha) ? <Aviso tono="peligro">Ese día ya está alquilado. Elige otra fecha.</Aviso> : <Aviso tono="ok">Ese día está libre.</Aviso>}
            <Campo etiqueta="¿Qué evento es? (opcional)" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Cumpleaños, almuerzo familiar…" />
            {familia.socio.es_ejemplo && <EjemploTag />}
          </div>
        )}
      </Hoja>
    </div>
  )
}
