import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Clock, Coffee, LogIn, LogOut, UtensilsCrossed } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { useSesion, dispositivo } from '../../lib/sesion'
import { hoyLima } from '../../lib/formato'
import { Boton, EjemploTag, TecladoNumerico, useToast } from '../../ui'

type Tipo = 'entrada' | 'inicio_refrigerio' | 'fin_refrigerio' | 'salida'
const TIPOS: Record<Tipo, { etiqueta: string; icono: typeof LogIn }> = {
  entrada: { etiqueta: 'Entrada', icono: LogIn },
  inicio_refrigerio: { etiqueta: 'Salgo a refrigerio', icono: UtensilsCrossed },
  fin_refrigerio: { etiqueta: 'Vuelvo de refrigerio', icono: Coffee },
  salida: { etiqueta: 'Salida', icono: LogOut },
}
interface Persona { ok: boolean; mensaje?: string; personal_id: string; nombres: string; apellidos: string; cargo: string; sugerido: Tipo; turno: { inicio: string; fin: string } | null; es_ejemplo: boolean }
interface Marca { ok: boolean; mensaje: string; hora: string; minutos_tarde: number; aviso_tarde: string | null }

/** Modo kiosco: el trabajador escribe su DNI o PIN, la tablet toma una foto y marca. */
export default function Asistencia() {
  const { perfil } = useSesion()
  const avisar = useToast()
  const reducir = useReducedMotion()
  const [codigo, setCodigo] = useState('')
  const [persona, setPersona] = useState<Persona | null>(null)
  const [hecho, setHecho] = useState<(Marca & { nombre: string; tipo: Tipo }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const flujo = useRef<MediaStream | null>(null)
  const foto = useRef<Blob | null>(null)

  const apagarCamara = () => { flujo.current?.getTracks().forEach((t) => t.stop()); flujo.current = null }
  useEffect(() => apagarCamara, [])

  // Al identificar a la persona: abre la cámara frontal y toma la foto sola
  useEffect(() => {
    if (!persona) return
    let vivo = true
    foto.current = null
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false }).then(async (s) => {
      if (!vivo) { s.getTracks().forEach((t) => t.stop()); return }
      flujo.current = s
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}) }
      setTimeout(() => {
        const v = video.current
        if (!v || !v.videoWidth) return
        const c = document.createElement('canvas'); c.width = 480; c.height = Math.round((v.videoHeight / v.videoWidth) * 480)
        c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
        c.toBlob((b) => { foto.current = b }, 'image/jpeg', 0.8)
      }, 1200)
    }).catch(() => { /* sin cámara: se marca sin foto */ })
    return () => { vivo = false; apagarCamara() }
  }, [persona])

  const reiniciar = useCallback(() => { setPersona(null); setHecho(null); setCodigo(''); setError(null) }, [])
  useEffect(() => { if (!hecho) return; const t = setTimeout(reiniciar, 5000); return () => clearTimeout(t) }, [hecho, reiniciar])

  const identificar = async () => {
    if (codigo.length < 4) { setError('Escribe tu DNI (8 números) o tu PIN.'); return }
    setCargando(true); setError(null)
    try {
      const r = await rpc<Persona>('identificar_personal', { p_codigo: codigo })
      if (!r.ok) { setError(r.mensaje ?? 'No te encontramos.'); setCodigo(''); return }
      setPersona(r)
    } catch (e) { setError((e as Error).message) } finally { setCargando(false) }
  }

  const marcar = async (tipo: Tipo) => {
    if (!persona) return
    setCargando(true)
    try {
      let ruta: string | null = null
      if (foto.current) {
        ruta = `${perfil!.club_id}/${hoyLima()}/${persona.personal_id}-${Date.now()}.jpg`
        const up = await supabase.storage.from('fotos-marcacion').upload(ruta, foto.current, { contentType: 'image/jpeg' })
        if (up.error) ruta = null
      }
      const r = await rpc<Marca>('marcar_asistencia', { p_personal_id: persona.personal_id, p_tipo: tipo, p_foto_path: ruta, p_dispositivo: dispositivo() })
      apagarCamara()
      if (!r.ok) { avisar(r.mensaje, 'alerta'); reiniciar(); return }
      setHecho({ ...r, nombre: persona.nombres.split(' ')[0], tipo }); setPersona(null)
    } catch (e) { avisar((e as Error).message, 'error') } finally { setCargando(false) }
  }

  const anim = reducir ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, transform: 'scale(0.98)' }, animate: { opacity: 1, transform: 'scale(1)' }, exit: { opacity: 0, transform: 'scale(0.98)' } }

  return (
    <div style={{ maxWidth: 980, marginInline: 'auto' }}>
      <AnimatePresence mode="wait" initial={false}>
        {!persona && !hecho && (
          <motion.div key="codigo" {...anim} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', alignItems: 'center', ['--gap' as string]: '32px' }}>
            <div className="stack" style={{ ['--gap' as string]: '14px' }}>
              <span className="empty-icono" style={{ width: 80, height: 80 }} aria-hidden><Clock size={40} /></span>
              <h1 className="page-title">Marca tu asistencia</h1>
              <p className="page-lead" style={{ fontSize: 'var(--text-md)' }}>Escribe tu <b>DNI</b> o tu <b>PIN</b>. La tablet toma una foto y registra la hora.</p>
              <div className="monto-display" aria-live="polite" style={{ letterSpacing: '0.18em', minHeight: 64, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: '6px 16px', boxShadow: 'var(--shadow-1)' }}>
                {codigo ? '•'.repeat(codigo.length) : <span className="muted" style={{ letterSpacing: 0, fontSize: 'var(--text-lg)' }}>DNI o PIN</span>}
              </div>
              {error && <div className="aviso peligro" role="alert" style={{ fontSize: 'var(--text-md)' }}>{error}</div>}
            </div>
            <div className="stack">
              <TecladoNumerico onTecla={(d) => { setError(null); setCodigo((c) => (c.length < 8 ? c + d : c)) }} onBorrar={() => setCodigo((c) => c.slice(0, -1))} onAceptar={identificar} aceptarTexto="Continuar" deshabilitado={cargando} />
            </div>
          </motion.div>
        )}

        {persona && (
          <motion.div key="persona" {...anim} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start', ['--gap' as string]: '28px' }}>
            <div className="stack" style={{ alignItems: 'center' }}>
              <div style={{ width: 'min(100%, 340px)', aspectRatio: '1', borderRadius: 'var(--r-card)', overflow: 'hidden', background: '#0B1B2B' }}>
                <video ref={video} playsInline muted aria-label="Cámara para la foto de asistencia" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              </div>
              <span className="small muted">La foto se guarda con tu marcación.</span>
            </div>
            <div className="stack" style={{ ['--gap' as string]: '14px' }}>
              <h1 className="page-title">Hola, {persona.nombres.split(' ')[0]}</h1>
              <p className="muted" style={{ fontSize: 'var(--text-md)' }}>{persona.cargo}{persona.turno ? ` · turno de ${persona.turno.inicio} a ${persona.turno.fin}` : ' · sin turno hoy'}</p>
              {persona.es_ejemplo && <EjemploTag texto="Trabajador de ejemplo" />}
              {(() => { const T = TIPOS[persona.sugerido]; return <Boton tam="xl" variante="ok" icono={<T.icono aria-hidden />} cargando={cargando} onClick={() => marcar(persona.sugerido)}>{T.etiqueta}</Boton> })()}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', ['--gap' as string]: '10px' }}>
                {(Object.keys(TIPOS) as Tipo[]).filter((t) => t !== persona.sugerido).map((t) => {
                  const T = TIPOS[t]
                  return <Boton key={t} variante="secondary" tam="lg" icono={<T.icono aria-hidden />} onClick={() => marcar(t)} disabled={cargando}>{T.etiqueta}</Boton>
                })}
              </div>
              <Boton variante="ghost" onClick={reiniciar}>No soy {persona.nombres.split(' ')[0]}</Boton>
            </div>
          </motion.div>
        )}

        {hecho && (
          <motion.div key="hecho" {...anim} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="centro stack" style={{ ['--gap' as string]: '16px' }}>
            <motion.span className="empty-icono" style={{ width: 128, height: 128, background: hecho.minutos_tarde > 0 ? 'var(--alerta-suave)' : 'var(--ok-suave)', color: hecho.minutos_tarde > 0 ? 'var(--alerta-tinta)' : 'var(--ok-tinta)' }}
              initial={reducir ? false : { transform: 'scale(0.85)' }} animate={{ transform: 'scale(1)' }} transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }} aria-hidden>
              {(() => { const T = TIPOS[hecho.tipo]; return <T.icono size={60} /> })()}
            </motion.span>
            <h1 className="page-title">{hecho.mensaje}</h1>
            <span className="cifra xl">{hecho.hora}</span>
            {hecho.aviso_tarde && <span className="pill pill-alerta pill-xl"><Clock aria-hidden />{hecho.aviso_tarde}</span>}
            <Boton variante="outline" tam="lg" onClick={reiniciar}>Listo</Boton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
