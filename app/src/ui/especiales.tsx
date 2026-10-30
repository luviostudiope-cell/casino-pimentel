import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { Camera, CameraOff, Keyboard, X } from 'lucide-react'
import { Boton, Campo, PillEstado, type Estado } from './base'
import { iniciales } from '../lib/formato'

/* ---------------- Logo provisional (wordmark + ola) ---------------- */
export function Ola({ size = 38 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#1B4F8F" />
      <path d="M11 30c5.2 0 5.2-5 10.4-5s5.2 5 10.4 5 5.2-5 10.4-5 5.2 5 10.4 5" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M11 41c5.2 0 5.2-5 10.4-5s5.2 5 10.4 5 5.2-5 10.4-5 5.2 5 10.4 5" fill="none" stroke="#8FBCE8" strokeWidth="4.6" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ sub, href }: { sub?: string; href?: string }) {
  const contenido = (
    <>
      <Ola />
      <span>Casino de Pimentel{sub && <small>{sub}</small>}</span>
    </>
  )
  return href ? <a className="wordmark" href={href} aria-label="Casino de Pimentel, inicio">{contenido}</a> : <span className="wordmark">{contenido}</span>
}

/* ---------------- QR como imagen ---------------- */
export function CodigoQR({ texto, tam = 320, etiqueta = 'Código QR' }: { texto: string; tam?: number; etiqueta?: string }) {
  const [src, setSrc] = useState<string>('')
  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(texto, { width: tam, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0E2236', light: '#FFFFFF' } })
      .then((u) => { if (vivo) setSrc(u) })
    return () => { vivo = false }
  }, [texto, tam])
  return src ? <img src={src} alt={etiqueta} width={tam} height={tam} /> : <span className="skeleton" style={{ display: 'block', width: '62%', aspectRatio: '1' }} />
}

/* ---------------- Lector de QR (cámara) ---------------- */
type Detector = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> }

export function LectorQR({ onLeido, activo = true }: { onLeido: (texto: string) => void; activo?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const lienzo = useRef<HTMLCanvasElement | null>(null)
  const [estado, setEstado] = useState<'iniciando' | 'leyendo' | 'sin-camara'>('iniciando')
  const [manual, setManual] = useState(false)
  const [codigo, setCodigo] = useState('')
  const ultimo = useRef<{ t: string; at: number }>({ t: '', at: 0 })

  const entregar = useCallback((t: string) => {
    const ahora = Date.now()
    if (t === ultimo.current.t && ahora - ultimo.current.at < 4000) return
    ultimo.current = { t, at: ahora }
    navigator.vibrate?.(30)
    onLeido(t)
  }, [onLeido])

  useEffect(() => {
    if (!activo || manual) return
    let flujo: MediaStream | null = null
    let parar = false
    let timer: number | undefined
    const Nativo = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
    const detector: Detector | null = Nativo ? new Nativo({ formats: ['qr_code'] }) : null

    async function iniciar() {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        if (parar || !video.current) return
        video.current.srcObject = flujo
        await video.current.play()
        setEstado('leyendo')
        bucle()
      } catch {
        setEstado('sin-camara')
      }
    }
    async function bucle() {
      if (parar || !video.current) return
      const v = video.current
      if (v.readyState >= 2) {
        try {
          if (detector) {
            const r = await detector.detect(v)
            if (r[0]?.rawValue) entregar(r[0].rawValue)
          } else {
            const c = lienzo.current ?? (lienzo.current = document.createElement('canvas'))
            const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * 480) || 360
            c.width = w; c.height = h
            const ctx = c.getContext('2d', { willReadFrequently: true })!
            ctx.drawImage(v, 0, 0, w, h)
            const img = ctx.getImageData(0, 0, w, h)
            const r = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
            if (r?.data) entregar(r.data)
          }
        } catch { /* sigue intentando */ }
      }
      timer = window.setTimeout(bucle, 140)
    }
    iniciar()
    return () => { parar = true; clearTimeout(timer); flujo?.getTracks().forEach((t) => t.stop()) }
  }, [activo, manual, entregar])

  if (manual || estado === 'sin-camara') {
    return (
      <div className="stack">
        {estado === 'sin-camara' && !manual && (
          <div className="aviso alerta"><CameraOff aria-hidden /><div>No pudimos usar la cámara. Revisa el permiso del navegador o escribe el código que aparece debajo del QR.</div></div>
        )}
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) entregar(codigo.trim()) }}>
          <Campo etiqueta="Código del carnet" ayuda="Está debajo del QR en el celular del socio." value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="off" icono={<Keyboard aria-hidden />} />
          <Boton type="submit" tam="lg" bloque>Validar código</Boton>
        </form>
        {manual && <Boton variante="ghost" icono={<Camera aria-hidden />} onClick={() => { setManual(false); setEstado('iniciando') }}>Volver a la cámara</Boton>}
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="qr-lector">
        <video ref={video} playsInline muted aria-label="Vista de la cámara" />
        <div className="qr-marco" aria-hidden />
        {estado === 'leyendo' && <div className="qr-linea" aria-hidden />}
        <div className="qr-estado" aria-live="polite">{estado === 'iniciando' ? 'Abriendo la cámara…' : 'Apunta al QR del carnet'}</div>
      </div>
      <Boton variante="ghost" icono={<Keyboard aria-hidden />} onClick={() => setManual(true)}>Escribir el código</Boton>
    </div>
  )
}

/* ---------------- Carnet digital (momento firma) ---------------- */
export interface DatosCarnet {
  nombre: string
  tipo: string           // Titular · Esposa · Hijo
  numero?: string        // N° de socio
  foto?: string | null
  estado: Estado         // al_dia | deuda | por_vencer
  estadoTexto?: string   // "Debes S/ 160"
}

function OlasDecor() {
  return (
    <svg className="olas" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
      <path d="M0 40 C 50 20, 100 60, 150 40 S 250 20, 300 40 S 380 60, 400 40 L400 120 L0 120 Z" fill="#fff" opacity="0.35" />
      <path d="M0 70 C 60 50, 110 90, 170 70 S 270 50, 330 70 S 390 85, 400 75 L400 120 L0 120 Z" fill="#fff" opacity="0.45" />
    </svg>
  )
}

export function Carnet({ datos, obtenerToken, vigencia = 30 }: {
  datos: DatosCarnet
  obtenerToken: () => Promise<string>
  vigencia?: number
}) {
  const reducir = useReducedMotion()
  const [volteado, setVolteado] = useState(false)
  const [completo, setCompleto] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [restante, setRestante] = useState(vigencia)
  const [error, setError] = useState<string | null>(null)
  const bloqueo = useRef<{ release: () => Promise<void> } | null>(null)

  const renovar = useCallback(async () => {
    try { setToken(await obtenerToken()); setRestante(vigencia); setError(null) }
    catch (e) { setError((e as Error).message) }
  }, [obtenerToken, vigencia])

  // Cuenta regresiva y renovación del QR
  useEffect(() => {
    if (!volteado) return
    renovar()
    const t = setInterval(() => setRestante((r) => (r <= 1 ? 0 : r - 1)), 1000)
    return () => clearInterval(t)
  }, [volteado, renovar])
  useEffect(() => { if (volteado && restante === 0) renovar() }, [restante, volteado, renovar])

  // Mantener la pantalla encendida mientras se muestra el QR
  useEffect(() => {
    if (!completo) return
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => { bloqueo.current = l }).catch(() => {})
    return () => { bloqueo.current?.release().catch(() => {}); bloqueo.current = null }
  }, [completo])

  const abrir = () => {
    setVolteado(true)
    window.setTimeout(() => setCompleto(true), reducir ? 0 : 380)
  }
  const cerrar = () => { setCompleto(false); window.setTimeout(() => setVolteado(false), reducir ? 0 : 120) }

  const r = 46, circ = 2 * Math.PI * r
  return (
    <>
      <div className="carnet-escena">
        <motion.button type="button" className="carnet" onClick={() => (volteado ? cerrar() : abrir())}
          aria-label={volteado ? 'Ocultar el QR del carnet' : `Carnet de ${datos.nombre}. Toca para mostrar el QR de ingreso`}
          animate={reducir ? { opacity: 1 } : { rotateY: volteado ? 180 : 0 }}
          transition={{ type: 'spring', bounce: 0.18, duration: 0.6 }}
          whileTap={reducir ? undefined : { scale: 0.98 }}>
          <div className="carnet-cara carnet-frente">
            <OlasDecor />
            <div className="carnet-top">
              <span className="carnet-marca"><Ola size={30} />Casino de Pimentel</span>
              <PillEstado estado={datos.estado} texto={datos.estadoTexto} className={datos.estado === 'al_dia' ? 'pill-solid-ok' : datos.estado === 'deuda' ? 'pill-solid-peligro' : ''} />
            </div>
            <div className="carnet-cuerpo">
              <span className="carnet-foto">{datos.foto ? <img src={datos.foto} alt="" /> : iniciales(datos.nombre)}</span>
              <div style={{ minWidth: 0 }}>
                <div className="carnet-nombre">{datos.nombre}</div>
                <div className="carnet-tipo">{datos.tipo}{datos.numero ? ` · N° ${datos.numero}` : ''}</div>
              </div>
            </div>
          </div>
          <div className="carnet-cara carnet-dorso" aria-hidden={!volteado}>
            {token ? <CodigoQR texto={token} tam={260} etiqueta="QR de ingreso" /> : <span className="spinner" />}
            <span className="small muted">Se renueva en {restante} s</span>
          </div>
        </motion.button>
      </div>

      <AnimatePresence>
        {completo && (
          <motion.div className="qr-full" role="dialog" aria-modal="true" aria-label="QR de ingreso a pantalla completa"
            initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.94)' }}
            animate={reducir ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' }}
            exit={reducir ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
            <div className="qr-nombre">{datos.nombre}</div>
            <PillEstado estado={datos.estado} texto={datos.estadoTexto} tam="lg" />
            <div className="qr-anillo">
              <svg className="anillo" viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r={r} fill="none" stroke="#E8F2FA" strokeWidth="3.2" />
                <circle cx="50" cy="50" r={r} fill="none" stroke="#2A6BC0" strokeWidth="3.2" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - restante / vigencia)}
                  style={{ transition: reducir ? 'none' : 'stroke-dashoffset 1s linear' }} />
              </svg>
              {token ? <CodigoQR texto={token} tam={340} etiqueta={`QR de ingreso de ${datos.nombre}`} /> : <span className="spinner" />}
            </div>
            <div className="stack" style={{ alignItems: 'center', ['--gap' as string]: '6px' }}>
              <span className="bold" aria-live="polite">Se renueva en {restante} s</span>
              <span className="small muted">Sube el brillo de tu pantalla y muéstralo en portería.</span>
              {token && <code className="xs muted" style={{ wordBreak: 'break-all', maxWidth: 320, textAlign: 'center' }}>{token}</code>}
              {error && <span className="field-error">{error}</span>}
            </div>
            <Boton variante="outline" tam="lg" icono={<X aria-hidden />} onClick={cerrar}>Cerrar</Boton>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ---------------- Calendario de turnos ---------------- */
export interface TurnoCelda { inicio: string; fin: string }
export function CalendarioTurnos({ personas, dias, celda }: {
  personas: { id: string; nombre: string; area?: string }[]
  dias: { fecha: string; etiqueta: string }[]
  celda: (personaId: string, fecha: string) => TurnoCelda | null
}) {
  const clase = (t: TurnoCelda) => {
    const h = Number(t.inicio.slice(0, 2))
    return h < 12 ? 'manana' : h < 17 ? 'tarde' : 'noche'
  }
  return (
    <div className="tabla-wrap">
      <div className="turnos" role="table" aria-label="Turnos de la semana">
        <div role="row" style={{ display: 'contents' }}>
          <div className="t-head" role="columnheader" style={{ textAlign: 'left' }}>Persona</div>
          {dias.map((d) => <div key={d.fecha} className="t-head" role="columnheader">{d.etiqueta}</div>)}
        </div>
        {personas.map((p) => (
          <div key={p.id} role="row" style={{ display: 'contents' }}>
            <div className="t-nombre" role="rowheader">{p.nombre}</div>
            {dias.map((d) => {
              const t = celda(p.id, d.fecha)
              return (
                <div key={d.fecha} role="cell">
                  {t ? <span className={`turno-pill ${clase(t)}`}>{t.inicio}–{t.fin}</span> : <span className="turno-pill libre">Libre</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Encabezado de pantalla ---------------- */
export function Encabezado({ titulo, explicacion, acciones }: { titulo: string; explicacion: string; acciones?: ReactNode }) {
  return (
    <header className="row between wrap" style={{ alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
      <div className="grow" style={{ minWidth: 240 }}>
        <h1 className="page-title">{titulo}</h1>
        <p className="page-lead">{explicacion}</p>
      </div>
      {acciones && <div className="row wrap">{acciones}</div>}
    </header>
  )
}
