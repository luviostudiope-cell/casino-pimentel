import { useEffect, useMemo, useState } from 'react'
import { Ban, Trophy } from 'lucide-react'
import { rpc } from '../../lib/supabase'
import { useDatos, useEnVivo } from '../../lib/datos'
import { diaMes, fechaLarga, hoyLima } from '../../lib/formato'
import { Aviso, Boton, Buscador, Campo, Chips, Encabezado, Esqueleto, Hoja, PillEstado, Selector, Tarjeta, useConfirmar, useDebounce, useToast } from '../../ui'

interface Slot { hora: string; estado: 'libre' | 'reservado' | 'bloqueado' | 'pasado'; reserva_id: string | null; quien: string | null; numero: string | null; motivo: string | null }
interface Disp { canchas: { id: string; nombre: string; slots: Slot[] }[] }

export default function Tenis() {
  const avisar = useToast()
  const confirmar = useConfirmar()
  const dias = useMemo(() => Array.from({ length: 14 }, (_, i) => hoyLima(i)), [])
  const [fecha, setFecha] = useState(dias[0])
  const { datos, recargar } = useDatos(() => rpc<Disp>('disponibilidad_tenis', { p_fecha: fecha }), [fecha])
  useEnVivo(['reservas_cancha'], () => recargar(true))
  const [libre, setLibre] = useState<{ cancha: string; nombre: string; hora: string } | null>(null)
  const [bloquear, setBloquear] = useState(false)
  const reservadas = (datos?.canchas ?? []).flatMap((c) => c.slots.filter((s) => s.estado === 'reservado')).length

  const cancelar = async (s: Slot, cancha: string) => {
    if (!s.reserva_id) return
    if (!(await confirmar({ titulo: '¿Cancelar la reserva?', texto: `${cancha} a las ${s.hora}${s.quien ? ` de ${s.quien}` : ''}. Se le avisará al socio.`, confirmar: 'Cancelar reserva', peligro: true }))) return
    try { const r = await rpc<{ mensaje: string }>('cancelar_reserva', { p_reserva_id: s.reserva_id, p_motivo: 'Cancelada por administración' }); avisar(r.mensaje); recargar(true) } catch (e) { avisar((e as Error).message, 'error') }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Tenis" explicacion="Las 2 canchas de tenis por día. Reserva por un socio, cancela o bloquea horarios para torneos y mantenimiento. El básquet es libre."
        acciones={<Boton variante="secondary" icono={<Ban aria-hidden />} onClick={() => setBloquear(true)}>Bloquear horario</Boton>} />
      <Chips etiqueta="Día" scroll valor={fecha} onCambio={setFecha} opciones={dias.map((d, i) => ({ valor: d, etiqueta: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${fechaLarga(d).slice(0, 3)} ${diaMes(d)}` }))} />
      <p className="muted"><b className="num">{reservadas}</b> turnos reservados el {fechaLarga(fecha)}.</p>
      {!datos ? <Esqueleto alto={360} radio={28} /> : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', alignItems: 'start' }}>
          {datos.canchas.map((c) => (
            <Tarjeta key={c.id} titulo={c.nombre}>
              <div className="stack" style={{ ['--gap' as string]: '6px' }}>
                {c.slots.map((s) => (
                  <div key={s.hora} className="row" style={{ minHeight: 52, borderBottom: '1px solid var(--border)', ['--gap' as string]: '12px' }}>
                    <b className="num" style={{ width: 52 }}>{s.hora}</b>
                    {s.estado === 'libre' ? <button type="button" className="turno-pill libre grow" style={{ cursor: 'pointer', justifyContent: 'flex-start', paddingLeft: 16 }} onClick={() => setLibre({ cancha: c.id, nombre: c.nombre, hora: s.hora })}>Libre · reservar</button>
                      : s.estado === 'reservado' ? <><span className="turno-pill manana grow ellipsis" style={{ justifyContent: 'flex-start', paddingLeft: 16 }}>{s.quien}{s.numero ? ` · N° ${s.numero}` : ''}</span><Boton variante="ghost" tam="sm" onClick={() => cancelar(s, c.nombre)}>Cancelar</Boton></>
                      : s.estado === 'bloqueado' ? <span className="turno-pill tarde grow" style={{ justifyContent: 'flex-start', paddingLeft: 16 }}>Bloqueado · {s.motivo}</span>
                      : <span className="small muted grow">Pasó</span>}
                  </div>
                ))}
              </div>
            </Tarjeta>
          ))}
        </div>
      )}
      <ReservarPor abierto={libre} onCerrar={() => setLibre(null)} fecha={fecha} onListo={() => { setLibre(null); recargar(true) }} />
      <Bloquear abierta={bloquear} onCerrar={() => setBloquear(false)} canchas={datos?.canchas ?? []} fecha={fecha} onListo={() => { setBloquear(false); recargar(true) }} />
    </div>
  )
}

function ReservarPor({ abierto, onCerrar, fecha, onListo }: { abierto: { cancha: string; nombre: string; hora: string } | null; onCerrar: () => void; fecha: string; onListo: () => void }) {
  const avisar = useToast()
  const [q, setQ] = useState('')
  const qd = useDebounce(q, 250)
  const [res, setRes] = useState<{ miembro_id: string; nombres: string; apellidos: string; numero: string; parentesco: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!abierto) { setQ(''); setRes([]); setError(null) } }, [abierto])
  useEffect(() => { if (qd.length >= 2) rpc<typeof res>('buscar_miembros', { p_q: qd, p_limite: 10 }).then(setRes).catch(() => setRes([])); else setRes([]) }, [qd])
  const reservar = async (m: string) => {
    try { const r = await rpc<{ ok: boolean; mensaje: string }>('reservar_tenis', { p_cancha_id: abierto!.cancha, p_fecha: fecha, p_hora: abierto!.hora, p_miembro_id: m }); if (!r.ok) { setError(r.mensaje); return } avisar(r.mensaje); onListo() }
    catch (e) { setError((e as Error).message) }
  }
  return (
    <Hoja abierta={Boolean(abierto)} onCerrar={onCerrar} titulo={abierto ? `Reservar ${abierto.nombre} · ${abierto.hora}` : ''} subtitulo="Busca a quien va a jugar. Se aplican las mismas reglas que en la app.">
      <div className="stack">
        <Buscador valor={q} onCambio={setQ} autoFocus placeholder="Nombre, N° de socio o DNI" />
        {error && <Aviso tono="peligro">{error}</Aviso>}
        <div className="list">{res.map((r) => (
          <button key={r.miembro_id} type="button" className="list-item" onClick={() => reservar(r.miembro_id)}><span className="li-main"><span className="li-title" style={{ display: 'block' }}>{r.nombres} {r.apellidos}</span><span className="li-sub" style={{ display: 'block' }}>N° {r.numero} · {r.parentesco}</span></span><PillEstado estado="nuevo" texto="Reservar" /></button>
        ))}</div>
      </div>
    </Hoja>
  )
}

function Bloquear({ abierta, onCerrar, canchas, fecha, onListo }: { abierta: boolean; onCerrar: () => void; canchas: { id: string; nombre: string }[]; fecha: string; onListo: () => void }) {
  const avisar = useToast()
  const [f, setF] = useState({ cancha: '', fecha, inicio: '08:00', fin: '12:00', motivo: '' })
  useEffect(() => { if (abierta) setF((x) => ({ ...x, fecha, cancha: x.cancha || canchas[0]?.id || '' })) }, [abierta, fecha, canchas])
  const guardar = async () => {
    try { const r = await rpc<{ mensaje: string }>('bloquear_cancha', { p_cancha_id: f.cancha, p_fecha: f.fecha, p_hora_inicio: f.inicio, p_hora_fin: f.fin, p_motivo: f.motivo }); avisar(r.mensaje); onListo() }
    catch (e) { avisar((e as Error).message, 'error') }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Bloquear horario" subtitulo="Para torneos o mantenimiento. Las reservas que se crucen se cancelan y se avisa a los socios."
      pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={f.motivo.trim().length < 3}>Bloquear</Boton></>}>
      <div className="stack">
        <Selector etiqueta="Cancha" value={f.cancha} onChange={(e) => setF({ ...f, cancha: e.target.value })}>{canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector>
        <Campo etiqueta="Día" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        <div className="row"><Campo etiqueta="Desde" type="time" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} className="grow" /><Campo etiqueta="Hasta" type="time" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} className="grow" /></div>
        <Campo etiqueta="Motivo" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Torneo interno, mantenimiento…" icono={<Trophy aria-hidden />} />
      </div>
    </Hoja>
  )
}
