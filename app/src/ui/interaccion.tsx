import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react'
import { AlertTriangle, Check, Delete, Search, X } from 'lucide-react'
import { Boton, IconoBoton } from './base'

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const

/* ---------------- Chips / filtros con fondo que se desliza ---------------- */
export interface OpcionChip<T extends string> { valor: T; etiqueta: string; cuenta?: number; icono?: ReactNode }
export function Chips<T extends string>({ opciones, valor, onCambio, etiqueta, scroll }: {
  opciones: OpcionChip<T>[]; valor: T; onCambio: (v: T) => void; etiqueta: string; scroll?: boolean
}) {
  const grupo = useId()
  const reducir = useReducedMotion()
  return (
    <div className={`chips ${scroll ? 'scroll' : ''}`} role="radiogroup" aria-label={etiqueta}>
      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <motion.button layout={!reducir} transition={SPRING} key={o.valor} type="button" role="radio" aria-checked={activo}
            className="chip" onClick={() => onCambio(o.valor)}>
            {activo && <motion.span layoutId={`chip-${grupo}`} className="chip-fondo" transition={reducir ? { duration: 0 } : SPRING} />}
            {o.icono}
            <span>{o.etiqueta}</span>
            {o.cuenta !== undefined && <span className="cuenta">{o.cuenta}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}

/* ---------------- Pestañas en pill ---------------- */
export function Pestanas<T extends string>({ opciones, valor, onCambio, etiqueta, bloque }: {
  opciones: OpcionChip<T>[]; valor: T; onCambio: (v: T) => void; etiqueta: string; bloque?: boolean
}) {
  const grupo = useId()
  const reducir = useReducedMotion()
  return (
    <div className={`tabs ${bloque ? 'block' : ''}`} role="tablist" aria-label={etiqueta}>
      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <button key={o.valor} type="button" role="tab" aria-selected={activo} className="tab" onClick={() => onCambio(o.valor)}>
            {activo && <motion.span layoutId={`tab-${grupo}`} className="tab-fondo" transition={reducir ? { duration: 0 } : SPRING} />}
            {o.icono}
            <span>{o.etiqueta}</span>
            {o.cuenta !== undefined && o.cuenta > 0 && <span className="badge sol">{o.cuenta}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Teclado numérico grande ---------------- */
export function TecladoNumerico({ onTecla, onBorrar, onAceptar, aceptarTexto = 'Listo', decimal = false, deshabilitado }: {
  onTecla: (d: string) => void; onBorrar: () => void; onAceptar?: () => void; aceptarTexto?: string; decimal?: boolean; deshabilitado?: boolean
}) {
  // Teclado físico también funciona (tablets con teclado, computadora)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (deshabilitado) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (/^[0-9]$/.test(e.key)) onTecla(e.key)
      else if (decimal && (e.key === '.' || e.key === ',')) onTecla('.')
      else if (e.key === 'Backspace') onBorrar()
      else if (e.key === 'Enter' && onAceptar) onAceptar()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onTecla, onBorrar, onAceptar, decimal, deshabilitado])
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  return (
    <div className="numpad" role="group" aria-label="Teclado numérico">
      {teclas.map((t) => <button key={t} type="button" className="numpad-key" disabled={deshabilitado} onClick={() => onTecla(t)}>{t}</button>)}
      {decimal
        ? <button type="button" className="numpad-key" disabled={deshabilitado} onClick={() => onTecla('.')} aria-label="Punto decimal">.</button>
        : <button type="button" className="numpad-key accion" disabled={deshabilitado} onClick={onBorrar} aria-label="Borrar"><Delete aria-hidden /><span>Borrar</span></button>}
      <button type="button" className="numpad-key" disabled={deshabilitado} onClick={() => onTecla('0')}>0</button>
      {decimal
        ? <button type="button" className="numpad-key accion" disabled={deshabilitado} onClick={onBorrar} aria-label="Borrar"><Delete aria-hidden /><span>Borrar</span></button>
        : onAceptar
          ? <button type="button" className="numpad-key accion" disabled={deshabilitado} onClick={onAceptar}><Check aria-hidden /><span>{aceptarTexto}</span></button>
          : <span />}
    </div>
  )
}

export function PuntosPin({ largo, total = 6, error }: { largo: number; total?: number; error?: boolean }) {
  const reducir = useReducedMotion()
  return (
    <motion.div className={`pin-puntos ${error ? 'error' : ''}`} aria-live="polite" aria-label={`${largo} de ${total} dígitos`}
      animate={error && !reducir ? { transform: ['translateX(0px)', 'translateX(-10px)', 'translateX(10px)', 'translateX(-6px)', 'translateX(0px)'] } : { transform: 'translateX(0px)' }}
      transition={{ duration: 0.36, ease: 'easeOut' }}>
      {Array.from({ length: total }).map((_, i) => <span key={i} className={`pin-punto ${i < largo ? 'lleno' : ''}`} />)}
    </motion.div>
  )
}

/* ---------------- Buscador ---------------- */
export function Buscador({ valor, onCambio, placeholder = 'Buscar', etiqueta = 'Buscar', autoFocus, onEnter }: {
  valor: string; onCambio: (v: string) => void; placeholder?: string; etiqueta?: string; autoFocus?: boolean; onEnter?: () => void
}) {
  const id = useId()
  return (
    <div className="search">
      <label htmlFor={id} className="sr-only">{etiqueta}</label>
      <Search aria-hidden />
      <input id={id} className="input" type="search" inputMode="search" autoComplete="off" value={valor} placeholder={placeholder}
        autoFocus={autoFocus} onChange={(e) => onCambio(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.() }} />
    </div>
  )
}

export function useDebounce<T>(valor: T, ms = 250): T {
  const [v, setV] = useState(valor)
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t) }, [valor, ms])
  return v
}

/* ---------------- Hoja inferior (móvil) / panel lateral (escritorio) ---------------- */
function useEsEscritorio() {
  const [esc, setEsc] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 900px)')
    const h = () => setEsc(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return esc
}

export function Hoja({ abierta, onCerrar, titulo, subtitulo, children, pie, lado = true }: {
  abierta: boolean; onCerrar: () => void; titulo: ReactNode; subtitulo?: ReactNode; children: ReactNode; pie?: ReactNode; lado?: boolean
}) {
  const escritorio = useEsEscritorio() && lado
  const reducir = useReducedMotion()
  const tituloId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const arrastre = useDragControls()
  const puedeArrastrar = !escritorio && !reducir

  useEffect(() => {
    if (!abierta) return
    const previo = document.activeElement as HTMLElement | null
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => panel.current?.focus())
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; previo?.focus?.() }
  }, [abierta, onCerrar])

  const oculto = reducir ? { opacity: 0 } : escritorio ? { opacity: 0, transform: 'translateX(40px)' } : { transform: 'translateY(100%)' }
  const visible = reducir ? { opacity: 1 } : escritorio ? { opacity: 1, transform: 'translateX(0px)' } : { transform: 'translateY(0%)' }

  const alSoltar = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onCerrar()
  }

  return (
    <AnimatePresence>
      {abierta && (
        <>
          <motion.div key="scrim" className="scrim" onClick={onCerrar}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} />
          <motion.div key="hoja" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={tituloId}
            className={`sheet ${lado ? 'lado' : ''}`}
            initial={oculto} animate={visible} exit={oculto}
            transition={reducir ? { duration: 0.16 } : { type: 'spring', bounce: 0, duration: 0.45 }}
            drag={puedeArrastrar ? 'y' : false} dragListener={false} dragControls={arrastre} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={alSoltar}>
            <div className="sheet-grip" aria-hidden onPointerDown={(e) => puedeArrastrar && arrastre.start(e)}><span /></div>
            <div className="sheet-head" onPointerDown={(e) => { if (puedeArrastrar && !(e.target as HTMLElement).closest('button')) arrastre.start(e) }}>
              <div className="grow">
                <h2 id={tituloId}>{titulo}</h2>
                {subtitulo && <div className="muted" style={{ marginTop: 4 }}>{subtitulo}</div>}
              </div>
              <IconoBoton icono={<X aria-hidden />} etiqueta="Cerrar" onClick={onCerrar} />
            </div>
            <div className="sheet-body">{children}</div>
            {pie && <div className="sheet-foot">{pie}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ---------------- Diálogo de confirmación ---------------- */
interface ConfirmarOpciones { titulo: string; texto?: ReactNode; confirmar?: string; cancelar?: string; peligro?: boolean }
type Resolver = (v: boolean) => void
const ConfirmarCtx = createContext<(o: ConfirmarOpciones) => Promise<boolean>>(async () => false)
export const useConfirmar = () => useContext(ConfirmarCtx)

export function ConfirmarProveedor({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<(ConfirmarOpciones & { resolver: Resolver }) | null>(null)
  const reducir = useReducedMotion()
  const confirmar = useCallback((o: ConfirmarOpciones) => new Promise<boolean>((resolver) => setEstado({ ...o, resolver })), [])
  const cerrar = (v: boolean) => { estado?.resolver(v); setEstado(null) }
  const tituloId = useId()
  useEffect(() => {
    if (!estado) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  })
  return (
    <ConfirmarCtx.Provider value={confirmar}>
      {children}
      <AnimatePresence>
        {estado && (
          <>
            <motion.div key="s" className="scrim" style={{ zIndex: 'calc(var(--z-sheet) + 2)' as unknown as number }} onClick={() => cerrar(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.div key="d" className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={tituloId} style={{ zIndex: 'calc(var(--z-sheet) + 3)' as unknown as number }}
              initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
              animate={reducir ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' }}
              exit={reducir ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
              transition={{ duration: 0.22, ease: EASE_OUT }}>
              {estado.peligro && <span className="empty-icono" style={{ background: 'var(--peligro-suave)', color: 'var(--peligro-tinta)', width: 56, height: 56, marginBottom: 12 }}><AlertTriangle aria-hidden /></span>}
              <h2 id={tituloId}>{estado.titulo}</h2>
              {estado.texto && <div className="muted">{estado.texto}</div>}
              <div className="acciones">
                <Boton variante="outline" onClick={() => cerrar(false)}>{estado.cancelar ?? 'Cancelar'}</Boton>
                <Boton variante={estado.peligro ? 'danger' : 'primary'} autoFocus onClick={() => cerrar(true)}>{estado.confirmar ?? 'Confirmar'}</Boton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ConfirmarCtx.Provider>
  )
}

/* ---------------- Toasts ---------------- */
type TonoToast = 'ok' | 'error' | 'alerta' | 'info'
interface Toast { id: number; texto: string; tono: TonoToast }
const ToastCtx = createContext<(texto: string, tono?: TonoToast) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProveedor({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([])
  const reducir = useReducedMotion()
  const avisar = useCallback((texto: string, tono: TonoToast = 'ok') => {
    const id = Date.now() + Math.random()
    setLista((l) => [...l.slice(-2), { id, texto, tono }])
    setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), tono === 'error' ? 6500 : 4000)
    if (tono === 'ok' && 'vibrate' in navigator) navigator.vibrate?.(12)
  }, [])
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {lista.map((t) => (
            <motion.div key={t.id} layout={!reducir} className={`toast ${t.tono}`} role={t.tono === 'error' ? 'alert' : 'status'}
              initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(100%)' }}
              animate={reducir ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0%)' }}
              exit={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(100%)' }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              onClick={() => setLista((l) => l.filter((x) => x.id !== t.id))}>
              <span className="toast-icono" aria-hidden>{t.tono === 'error' ? <X /> : t.tono === 'alerta' ? <AlertTriangle /> : <Check />}</span>
              <span>{t.texto}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
