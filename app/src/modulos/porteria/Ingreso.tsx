import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, ArrowLeft, CheckCircle2, QrCode, Search, Ticket, UserPlus, XCircle } from 'lucide-react'
import { rpc, urlFirmada } from '../../lib/supabase'
import { useDebounce } from '../../ui/interaccion'
import { dispositivo } from '../../lib/sesion'
import { fechaHora, hora, moneda, monedaCorta } from '../../lib/formato'
import { Avatar, Aviso, Boton, Buscador, Campo, Chips, EjemploTag, Esqueleto, Hoja, LectorQR, PillEstado, Tarjeta, Vacio, useToast, type Estado } from '../../ui'

const EASE = [0.23, 1, 0.32, 1] as const
const PARENTESCO: Record<string, string> = { titular: 'Titular', esposa: 'Esposa', esposo: 'Esposo', hijo: 'Hijo', hija: 'Hija', otro: 'Familiar' }

interface Validacion {
  metodo: 'qr' | 'busqueda'
  miembro: { id: string; nombres: string; apellidos: string; parentesco: string; foto_path: string | null; dni: string | null; puede_ingresar: boolean; edad: number | null; es_ejemplo: boolean }
  socio: { id: string; numero: string; nombres: string; apellidos: string; estado: string; es_ejemplo: boolean }
  cuenta: { estado: 'al_dia' | 'por_vencer' | 'deuda'; saldo: number; cuotas_vencidas: number }
  familia: { id: string; nombres: string; apellidos: string; parentesco: string; dentro: boolean }[]
  ya_dentro: { hora: string; ticket: number } | null
  invitados_hoy: number
  max_invitados_dia: number
  preregistrados: { ingreso_id: string; dni: string; nombres: string; tipo_ingreso: string; monto: number }[]
}
interface Resultado { ok: boolean; mensaje: string; ticket?: number; monto?: number; con_deuda?: boolean; regla?: string; ya_estaba?: boolean }
interface Encontrado { miembro_id: string; numero: string; nombres: string; apellidos: string; parentesco: string; foto_path: string | null; estado_cuenta: Estado; saldo: number; es_ejemplo: boolean }
type Vista = 'inicio' | 'escanear' | 'buscar' | 'persona' | 'listo'

export default function Ingreso() {
  const avisar = useToast()
  const reducir = useReducedMotion()
  const [vista, setVista] = useState<Vista>('inicio')
  const [val, setVal] = useState<Validacion | null>(null)
  const [foto, setFoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [ticket, setTicket] = useState<{ numero?: number; nombre: string; detalle: string; monto: number; deuda?: boolean; mensaje: string } | null>(null)
  const [invitado, setInvitado] = useState(false)

  const abrir = useCallback(async (args: { p_token?: string; p_miembro_id?: string }) => {
    setCargando(true); setError(null)
    try {
      const v = await rpc<Validacion>('validar_ingreso', args)
      setVal(v); setFoto(await urlFirmada('fotos-socios', v.miembro.foto_path)); setVista('persona')
    } catch (e) { setError((e as Error).message); navigator.vibrate?.([60, 60, 60]) }
    finally { setCargando(false) }
  }, [])

  const registrar = async (miembroId = val!.miembro.id, nombre = `${val!.miembro.nombres} ${val!.miembro.apellidos}`) => {
    setCargando(true)
    try {
      const r = await rpc<Resultado>('registrar_ingreso', { p_miembro_id: miembroId, p_tipo_ingreso: 'club', p_metodo: val?.metodo ?? 'busqueda', p_dispositivo: dispositivo() })
      if (!r.ok) { setError(r.mensaje); return }
      setTicket({ numero: r.ticket, nombre, detalle: `Socio N° ${val!.socio.numero} · ingreso de socio`, monto: 0, deuda: r.con_deuda, mensaje: r.mensaje })
      setVista('listo')
    } catch (e) { avisar((e as Error).message, 'error') } finally { setCargando(false) }
  }

  // Vuelve a la pantalla principal sola después del ticket
  useEffect(() => {
    if (vista !== 'listo') return
    const t = setTimeout(() => { setVista('inicio'); setVal(null); setTicket(null) }, 7000)
    return () => clearTimeout(t)
  }, [vista])

  const volver = () => { setVista('inicio'); setVal(null); setError(null) }
  const anim = reducir ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, transform: 'translateY(12px)' }, animate: { opacity: 1, transform: 'translateY(0px)' }, exit: { opacity: 0, transform: 'translateY(-8px)' } }

  return (
    <div style={{ maxWidth: 1100, marginInline: 'auto' }}>
      <AnimatePresence mode="wait" initial={false}>
        {vista === 'inicio' && (
          <motion.div key="inicio" {...anim} transition={{ duration: 0.22, ease: EASE }} className="stack" style={{ ['--gap' as string]: '20px' }}>
            <div>
              <h1 className="page-title">Ingreso al club</h1>
              <p className="page-lead">Escanea el carnet del socio o búscalo por nombre, N° o DNI.</p>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', ['--gap' as string]: '20px' }}>
              <button type="button" className="btn btn-primary" style={{ minHeight: 'min(46vh, 340px)', flexDirection: 'column', gap: 18, borderRadius: 'var(--r-card)', fontSize: 'var(--text-xl)' }} onClick={() => { setError(null); setVista('escanear') }}>
                <QrCode size={88} strokeWidth={1.6} aria-hidden /><span>Escanear carnet</span>
              </button>
              <button type="button" className="btn btn-secondary" style={{ minHeight: 'min(46vh, 340px)', flexDirection: 'column', gap: 18, borderRadius: 'var(--r-card)', fontSize: 'var(--text-xl)' }} onClick={() => { setError(null); setVista('buscar') }}>
                <Search size={88} strokeWidth={1.6} aria-hidden /><span>Buscar socio</span>
              </button>
            </div>
            <Aviso>El ticket es digital: ya no se usa el talonario. Los invitados se registran desde la ficha del socio que los trae.</Aviso>
          </motion.div>
        )}

        {vista === 'escanear' && (
          <motion.div key="escanear" {...anim} transition={{ duration: 0.22, ease: EASE }} className="stack">
            <div className="row"><Boton variante="ghost" icono={<ArrowLeft aria-hidden />} onClick={volver}>Volver</Boton><h1 className="page-title">Escanear carnet</h1></div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', alignItems: 'start' }}>
              <LectorQR activo={!cargando} onLeido={(t) => abrir({ p_token: t })} />
              <div className="stack">
                {cargando && <Esqueleto alto={120} radio={28} />}
                {error && <ErrorGrande texto={error} />}
                <Aviso>Pide al socio que abra la app, toque <b>Carnet</b> y luego la tarjeta. El código vence a los 30 segundos.</Aviso>
              </div>
            </div>
          </motion.div>
        )}

        {vista === 'buscar' && (
          <motion.div key="buscar" {...anim} transition={{ duration: 0.22, ease: EASE }}>
            <BuscarPersona onVolver={volver} onElegir={(id) => abrir({ p_miembro_id: id })} error={error} cargando={cargando} />
          </motion.div>
        )}

        {vista === 'persona' && val && (
          <motion.div key="persona" {...anim} transition={{ duration: 0.22, ease: EASE }} className="stack" style={{ ['--gap' as string]: '20px' }}>
            <div className="row"><Boton variante="ghost" icono={<ArrowLeft aria-hidden />} onClick={volver}>Otro socio</Boton></div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', alignItems: 'start', ['--gap' as string]: '20px' }}>
              <section className="card stack" style={{ ['--gap' as string]: '16px', alignItems: 'center', textAlign: 'center' }} aria-live="polite">
                <Avatar nombre={`${val.miembro.nombres} ${val.miembro.apellidos}`} foto={foto} tam="xl" />
                <div>
                  <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--tinta)', overflowWrap: 'anywhere' }}>{val.miembro.nombres} {val.miembro.apellidos}</h2>
                  <p className="muted" style={{ fontSize: 'var(--text-md)' }}>{PARENTESCO[val.miembro.parentesco]} · Socio N° <span className="num">{val.socio.numero}</span>{val.miembro.edad !== null ? ` · ${val.miembro.edad} años` : ''}</p>
                </div>
                {val.cuenta.estado === 'deuda'
                  ? <PillEstado estado="deuda" texto={`Debe ${moneda(val.cuenta.saldo)}`} tam="xl" />
                  : <PillEstado estado={val.cuenta.estado} tam="xl" />}
                {val.cuenta.estado === 'deuda' && (
                  <Aviso tono="peligro" icono={<AlertTriangle aria-hidden />}>
                    Tiene {val.cuenta.cuotas_vencidas} cuota(s) vencida(s). Puede ingresar: al registrarlo se avisa a administración. Recuérdale con amabilidad que se acerque a la oficina.
                  </Aviso>
                )}
                {(val.socio.estado !== 'activo' || !val.miembro.puede_ingresar) && <Aviso tono="peligro">Ingreso suspendido. Llama a administración antes de dejarlo pasar.</Aviso>}
                {val.ya_dentro
                  ? <Aviso tono="ok" icono={<CheckCircle2 aria-hidden />}>Ya entró hoy a las {hora(val.ya_dentro.hora)} (ticket N° {val.ya_dentro.ticket}).</Aviso>
                  : <Boton tam="xl" bloque variante="ok" cargando={cargando} icono={<CheckCircle2 aria-hidden />} onClick={() => registrar()}
                      disabled={val.socio.estado !== 'activo' || !val.miembro.puede_ingresar}>Registrar ingreso</Boton>}
                {error && <ErrorGrande texto={error} />}
                {val.miembro.es_ejemplo && <EjemploTag />}
              </section>
              <div className="stack" style={{ ['--gap' as string]: '16px' }}>
                <Tarjeta titulo="Familia">
                  <div className="list">
                    {val.familia.map((f) => (
                      <div key={f.id} className="list-item">
                        <Avatar nombre={`${f.nombres} ${f.apellidos}`} />
                        <span className="li-main">
                          <span className="li-title" style={{ display: 'block' }}>{f.nombres} {f.apellidos}</span>
                          <span className="li-sub" style={{ display: 'block' }}>{PARENTESCO[f.parentesco]}</span>
                        </span>
                        {f.dentro ? <PillEstado estado="dentro" /> : f.id !== val.miembro.id && <Boton variante="secondary" tam="sm" onClick={() => registrar(f.id, `${f.nombres} ${f.apellidos}`)}>Ingresa</Boton>}
                      </div>
                    ))}
                  </div>
                </Tarjeta>
                <Tarjeta titulo="Invitados de hoy" accion={<span className="pill pill-info num">{val.invitados_hoy} de {val.max_invitados_dia}</span>}>
                  {val.preregistrados.length > 0 && (
                    <div className="list" style={{ marginBottom: 12 }}>
                      {val.preregistrados.map((p) => (
                        <div key={p.ingreso_id} className="list-item">
                          <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{p.nombres}</span><span className="li-sub" style={{ display: 'block' }}>Registrado por el socio · {p.tipo_ingreso} {monedaCorta(p.monto)}</span></span>
                          <PillEstado estado="preregistrado" />
                        </div>
                      ))}
                    </div>
                  )}
                  <Boton variante="primary" tam="lg" bloque icono={<UserPlus aria-hidden />} onClick={() => setInvitado(true)}>Invitado</Boton>
                </Tarjeta>
              </div>
            </div>
            <InvitadoHoja abierta={invitado} onCerrar={() => setInvitado(false)} val={val}
              onListo={(r, nombre, tipo) => {
                setInvitado(false)
                setTicket({ numero: r.ticket, nombre, detalle: `Invitado de ${val.socio.nombres.split(' ')[0]} ${val.socio.apellidos.split(' ')[0]} · ${tipo}`, monto: r.monto ?? 0, mensaje: r.mensaje })
                setVista('listo')
              }} />
          </motion.div>
        )}

        {vista === 'listo' && ticket && (
          <motion.div key="listo" {...anim} transition={{ duration: 0.25, ease: EASE }} className="stack" style={{ alignItems: 'center', ['--gap' as string]: '20px', paddingTop: 20 }}>
            <motion.span className="empty-icono" style={{ width: 120, height: 120, background: 'var(--ok-suave)', color: 'var(--ok-tinta)' }}
              initial={reducir ? false : { transform: 'scale(0.8)', opacity: 0 }} animate={{ transform: 'scale(1)', opacity: 1 }} transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }} aria-hidden>
              <CheckCircle2 size={64} />
            </motion.span>
            <h1 className="page-title" style={{ textAlign: 'center' }}>{ticket.mensaje}</h1>
            <section className="card stack" style={{ width: 'min(100%, 460px)', ['--gap' as string]: '6px', borderTop: '6px solid var(--azul)' }} aria-label="Ticket digital">
              <div className="row between"><span className="row"><Ticket aria-hidden color="var(--azul)" /><b>Ingreso Portería</b></span><b className="num" style={{ fontSize: 'var(--text-lg)' }}>N° {String(ticket.numero ?? '').padStart(6, '0')}</b></div>
              <hr className="hr" />
              <div className="kv"><span className="muted">Nombre</span><b style={{ textAlign: 'right' }}>{ticket.nombre}</b></div>
              <div className="kv"><span className="muted">Detalle</span><span style={{ textAlign: 'right' }}>{ticket.detalle}</span></div>
              <div className="kv"><span className="muted">Fecha y hora</span><span className="num">{fechaHora(new Date())}</span></div>
              <div className="kv"><span className="muted">Cobro</span><b className="num">{ticket.monto > 0 ? moneda(ticket.monto) : 'Sin cobro'}</b></div>
            </section>
            {ticket.deuda && <Aviso tono="alerta" icono={<AlertTriangle aria-hidden />}>Se avisó a administración que el socio ingresó con deuda.</Aviso>}
            <Boton tam="xl" onClick={() => { setVista('inicio'); setVal(null); setTicket(null) }}>Siguiente</Boton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ErrorGrande({ texto }: { texto: string }) {
  return (
    <div className="aviso peligro" role="alert" style={{ fontSize: 'var(--text-md)', padding: 20 }}>
      <XCircle aria-hidden size={30} /><div>{texto}</div>
    </div>
  )
}

function BuscarPersona({ onVolver, onElegir, error, cargando }: { onVolver: () => void; onElegir: (id: string) => void; error: string | null; cargando: boolean }) {
  const [q, setQ] = useState('')
  const qd = useDebounce(q, 250)
  const [res, setRes] = useState<Encontrado[] | null>(null)
  useEffect(() => {
    let vivo = true
    if (qd.trim().length < 2) { setRes(null); return }
    rpc<Encontrado[]>('buscar_miembros', { p_q: qd, p_limite: 24 }).then((r) => vivo && setRes(r)).catch(() => vivo && setRes([]))
    return () => { vivo = false }
  }, [qd])
  return (
    <div className="stack" style={{ ['--gap' as string]: '16px' }}>
      <div className="row"><Boton variante="ghost" icono={<ArrowLeft aria-hidden />} onClick={onVolver}>Volver</Boton><h1 className="page-title">Buscar socio</h1></div>
      <Buscador valor={q} onCambio={setQ} autoFocus placeholder="Nombre, apellido, N° de socio o DNI" etiqueta="Buscar socio o familiar" />
      {error && <ErrorGrande texto={error} />}
      {cargando && <Esqueleto alto={72} radio={20} />}
      {res && !res.length && <Vacio icono={<Search />} titulo="No encontramos a nadie" texto="Revisa cómo está escrito o prueba con el DNI o el N° de socio." />}
      {res && res.length > 0 && (
        <div className="card list" style={{ padding: 8 }}>
          {res.map((r) => (
            <button key={r.miembro_id} type="button" className="list-item" onClick={() => onElegir(r.miembro_id)} style={{ minHeight: 80 }}>
              <Avatar nombre={`${r.nombres} ${r.apellidos}`} />
              <span className="li-main">
                <span className="li-title" style={{ display: 'block', fontSize: 'var(--text-md)' }}>{r.nombres} {r.apellidos}</span>
                <span className="li-sub" style={{ display: 'block' }}>{PARENTESCO[r.parentesco]} · N° {r.numero}</span>
              </span>
              <PillEstado estado={r.estado_cuenta} texto={r.estado_cuenta === 'deuda' ? `Debe ${moneda(r.saldo)}` : undefined} />
            </button>
          ))}
        </div>
      )}
      {!res && <p className="muted">Escribe al menos 2 letras. También funciona con el N° de socio (por ejemplo 142) o el DNI.</p>}
    </div>
  )
}

function InvitadoHoja({ abierta, onCerrar, val, onListo }: { abierta: boolean; onCerrar: () => void; val: Validacion; onListo: (r: Resultado, nombre: string, tipo: string) => void }) {
  const [dni, setDni] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'club' | 'piscina' | 'comedor'>('club')
  const [medio, setMedio] = useState<'efectivo' | 'yape' | 'tarjeta' | 'cuenta_socio'>('efectivo')
  const [cupo, setCupo] = useState<{ visitas_mes: number; max_mes: number; nombre: string | null; conocido: boolean; tarifas: { club: number; piscina: number } } | null>(null)
  const [bloqueo, setBloqueo] = useState<string | null>(null)
  const [campoError, setCampoError] = useState<{ campo?: string; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => { if (abierta) { setDni(''); setNombre(''); setTipo('club'); setMedio('efectivo'); setBloqueo(null); setCampoError(null); setCupo(null) } }, [abierta])
  useEffect(() => {
    if (dni.length !== 8) { setCupo(null); return }
    rpc<typeof cupo>('cupos_invitados', { p_socio_id: val.socio.id, p_dni: dni }).then((c) => { setCupo(c); if (c?.nombre && !nombre) setNombre(c.nombre) }).catch(() => {})
  }, [dni]) // eslint-disable-line react-hooks/exhaustive-deps

  const tarifa = tipo === 'comedor' ? 0 : tipo === 'piscina' ? (cupo?.tarifas.piscina ?? 20) : (cupo?.tarifas.club ?? 10)
  const registrar = async () => {
    setBloqueo(null); setCampoError(null)
    if (!/^\d{8}$/.test(dni)) { setCampoError({ campo: 'dni', texto: 'El DNI tiene 8 números.' }); return }
    setEnviando(true)
    try {
      const r = await rpc<Resultado & { campo?: string }>('registrar_invitado', { p_socio_id: val.socio.id, p_dni: dni, p_nombres: nombre, p_tipo_ingreso: tipo, p_medio_pago: medio, p_dispositivo: dispositivo() })
      if (!r.ok) { if (r.regla) { setBloqueo(r.mensaje); navigator.vibrate?.([80, 60, 80]) } else setCampoError({ campo: r.campo, texto: r.mensaje }); return }
      onListo(r, nombre || cupo?.nombre || 'Invitado', tipo === 'comedor' ? 'comedor' : tipo)
    } catch (e) { setCampoError({ texto: (e as Error).message }) } finally { setEnviando(false) }
  }

  const sinCupoDia = val.invitados_hoy >= val.max_invitados_dia
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Registrar invitado" subtitulo={`Lo trae ${val.socio.nombres} ${val.socio.apellidos} · N° ${val.socio.numero}`}
      pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton variante="ok" onClick={registrar} cargando={enviando} disabled={sinCupoDia}>{tarifa > 0 ? `Cobrar ${monedaCorta(tarifa)} y registrar` : 'Registrar'}</Boton></>}>
      <div className="stack" style={{ ['--gap' as string]: '16px' }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', ['--gap' as string]: '10px' }}>
          <div className="card-2" style={{ padding: 14 }}><div className="small muted">Invitados del socio hoy</div><div className="stat-valor" style={{ fontSize: 'var(--text-xl)' }}>{val.invitados_hoy} de {val.max_invitados_dia}</div></div>
          <div className="card-2" style={{ padding: 14 }}><div className="small muted">Visitas de este DNI en el mes</div><div className="stat-valor" style={{ fontSize: 'var(--text-xl)' }}>{cupo ? `${cupo.visitas_mes} de ${cupo.max_mes}` : '—'}</div></div>
        </div>
        {sinCupoDia && <ErrorGrande texto={`Este socio ya registró ${val.invitados_hoy} invitados hoy. El máximo es ${val.max_invitados_dia} por día.`} />}
        {bloqueo && <ErrorGrande texto={bloqueo} />}
        <Campo etiqueta="DNI del invitado" inputMode="numeric" maxLength={8} value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} autoFocus
          error={campoError?.campo === 'dni' ? campoError.texto : null} ayuda={cupo?.conocido ? 'Ya vino antes: confirmamos su nombre.' : undefined} style={{ fontSize: '1.4rem' }} />
        <Campo etiqueta="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" error={campoError?.campo === 'nombres' ? campoError.texto : null} />
        <div className="field">
          <span className="field-label">Viene a</span>
          <Chips etiqueta="Tipo de ingreso" valor={tipo} onCambio={setTipo} opciones={[
            { valor: 'club', etiqueta: `Club ${monedaCorta(cupo?.tarifas.club ?? 10)}` }, { valor: 'piscina', etiqueta: `Piscina ${monedaCorta(cupo?.tarifas.piscina ?? 20)}` }, { valor: 'comedor', etiqueta: 'Comedor · libre' }]} />
        </div>
        {tarifa > 0 && (
          <div className="field">
            <span className="field-label">Paga con</span>
            <Chips etiqueta="Medio de pago" valor={medio} onCambio={setMedio} opciones={[
              { valor: 'efectivo', etiqueta: 'Efectivo' }, { valor: 'yape', etiqueta: 'Yape' }, { valor: 'tarjeta', etiqueta: 'Tarjeta' }, { valor: 'cuenta_socio', etiqueta: 'A cuenta del socio' }]} />
          </div>
        )}
        {campoError && !campoError.campo && <Aviso tono="peligro">{campoError.texto}</Aviso>}
      </div>
    </Hoja>
  )
}
