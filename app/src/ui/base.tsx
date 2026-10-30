import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { AlertCircle, CheckCircle2, Clock, CircleAlert, CircleDashed, FlaskConical, XCircle } from 'lucide-react'
import { iniciales } from '../lib/formato'

/* ---------------- Botón ---------------- */
type Variante = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'ok' | 'arena'
interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tam?: 'sm' | 'md' | 'lg' | 'xl'
  icono?: ReactNode
  cargando?: boolean
  bloque?: boolean
}
export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  { variante = 'primary', tam = 'md', icono, cargando, bloque, className = '', children, disabled, type = 'button', ...rest }, ref,
) {
  const cls = ['btn', `btn-${variante}`, tam !== 'md' && `btn-${tam}`, bloque && 'btn-block', className].filter(Boolean).join(' ')
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || cargando} aria-busy={cargando || undefined} {...rest}>
      {icono}
      {children && <span>{children}</span>}
      {cargando && <span className="spinner" aria-hidden />}
    </button>
  )
})

/** Botón de ícono SIEMPRE con etiqueta de texto visible */
export function BotonIcono({ icono, etiqueta, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icono: ReactNode; etiqueta: string }) {
  return (
    <button type="button" className={`btn btn-ghost btn-icono ${className}`} {...rest}>
      {icono}
      <span>{etiqueta}</span>
    </button>
  )
}

export function IconoBoton({ icono, etiqueta, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icono: ReactNode; etiqueta: string }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={etiqueta} title={etiqueta} {...rest}>
      {icono}
    </button>
  )
}

export function Spinner({ etiqueta = 'Cargando' }: { etiqueta?: string }) {
  return <span className="spinner" role="status" aria-label={etiqueta} />
}

/* ---------------- Pill de estado ---------------- */
export type Estado =
  | 'al_dia' | 'por_vencer' | 'deuda' | 'presente' | 'tardanza' | 'falta'
  | 'pagado' | 'pendiente' | 'vencido' | 'por_validar' | 'validado' | 'rechazado'
  | 'confirmada' | 'cancelada' | 'abierta' | 'cerrada' | 'faltante' | 'sobrante' | 'cuadrado'
  | 'activo' | 'inactivo' | 'nuevo' | 'dentro' | 'salio' | 'preregistrado' | 'solicitado' | 'confirmado' | 'anulada' | 'anulado' | 'suspendido'

const ESTADOS: Record<Estado, { clase: string; texto: string; icono?: ReactNode }> = {
  al_dia: { clase: 'pill-ok', texto: 'Al día', icono: <CheckCircle2 aria-hidden /> },
  pagado: { clase: 'pill-ok', texto: 'Pagado', icono: <CheckCircle2 aria-hidden /> },
  validado: { clase: 'pill-ok', texto: 'Validado', icono: <CheckCircle2 aria-hidden /> },
  presente: { clase: 'pill-ok', texto: 'Presente', icono: <CheckCircle2 aria-hidden /> },
  confirmada: { clase: 'pill-ok', texto: 'Confirmada', icono: <CheckCircle2 aria-hidden /> },
  confirmado: { clase: 'pill-ok', texto: 'Confirmado', icono: <CheckCircle2 aria-hidden /> },
  cuadrado: { clase: 'pill-ok', texto: 'Cuadra', icono: <CheckCircle2 aria-hidden /> },
  activo: { clase: 'pill-ok', texto: 'Activo' },
  dentro: { clase: 'pill-ok', texto: 'Dentro' },
  por_vencer: { clase: 'pill-alerta', texto: 'Por vencer', icono: <Clock aria-hidden /> },
  pendiente: { clase: 'pill-alerta', texto: 'Pendiente', icono: <Clock aria-hidden /> },
  tardanza: { clase: 'pill-alerta', texto: 'Tardanza', icono: <Clock aria-hidden /> },
  abierta: { clase: 'pill-alerta', texto: 'Abierta', icono: <CircleDashed aria-hidden /> },
  sobrante: { clase: 'pill-alerta', texto: 'Sobrante', icono: <CircleAlert aria-hidden /> },
  preregistrado: { clase: 'pill-alerta', texto: 'Por llegar', icono: <Clock aria-hidden /> },
  solicitado: { clase: 'pill-alerta', texto: 'Por confirmar', icono: <Clock aria-hidden /> },
  por_validar: { clase: 'pill-info', texto: 'Por validar', icono: <Clock aria-hidden /> },
  deuda: { clase: 'pill-peligro', texto: 'Con deuda', icono: <AlertCircle aria-hidden /> },
  vencido: { clase: 'pill-peligro', texto: 'Vencido', icono: <AlertCircle aria-hidden /> },
  falta: { clase: 'pill-peligro', texto: 'Falta', icono: <XCircle aria-hidden /> },
  rechazado: { clase: 'pill-peligro', texto: 'Rechazado', icono: <XCircle aria-hidden /> },
  faltante: { clase: 'pill-peligro', texto: 'Faltante', icono: <AlertCircle aria-hidden /> },
  cancelada: { clase: 'pill-neutro', texto: 'Cancelada' },
  anulada: { clase: 'pill-neutro', texto: 'Anulada' },
  anulado: { clase: 'pill-neutro', texto: 'Anulado' },
  suspendido: { clase: 'pill-peligro', texto: 'Suspendido' },
  cerrada: { clase: 'pill-neutro', texto: 'Cerrada' },
  inactivo: { clase: 'pill-neutro', texto: 'Inactivo' },
  salio: { clase: 'pill-neutro', texto: 'Salió' },
  nuevo: { clase: 'pill-sol', texto: 'Nuevo' },
}

export function PillEstado({ estado, texto, tam, className = '' }: { estado: Estado; texto?: string; tam?: 'lg' | 'xl'; className?: string }) {
  const e = ESTADOS[estado] ?? ESTADOS.pendiente
  return (
    <span className={`pill ${e.clase} ${tam ? `pill-${tam}` : ''} ${className}`}>
      {e.icono ?? <span className="punto" aria-hidden />}
      {texto ?? e.texto}
    </span>
  )
}

export function Pill({ children, tono = 'info', className = '' }: { children: ReactNode; tono?: 'info' | 'ok' | 'alerta' | 'peligro' | 'neutro' | 'sol' | 'arena'; className?: string }) {
  return <span className={`pill pill-${tono} ${className}`}>{children}</span>
}

/** Etiqueta discreta para registros con es_ejemplo = true */
export function EjemploTag({ visible = true, texto = 'Dato de ejemplo' }: { visible?: boolean; texto?: string }) {
  if (!visible) return null
  return <span className="ejemplo-tag" title="Este dato es de ejemplo: se reemplaza con el dato real del club."><FlaskConical size={14} aria-hidden />{texto}</span>
}

/* ---------------- Tarjeta ---------------- */
export function Tarjeta({ titulo, accion, children, className = '', tono }: { titulo?: ReactNode; accion?: ReactNode; children: ReactNode; className?: string; tono?: 'celeste' | 'arena' }) {
  const base = tono === 'celeste' ? 'card-2' : tono === 'arena' ? 'card-arena' : 'card'
  return (
    <section className={`${base} ${className}`}>
      {(titulo || accion) && (
        <header className="card-header">
          {typeof titulo === 'string' ? <h2>{titulo}</h2> : titulo}
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}

/* ---------------- Contador animado ---------------- */
export function Contador({ valor, formato = (n) => Math.round(n).toLocaleString('es-PE'), duracion = 0.9 }: { valor: number; formato?: (n: number) => string; duracion?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previo = useRef(0)
  const reducir = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const desde = previo.current
    previo.current = valor
    if (reducir || desde === valor) { el.textContent = formato(valor); return }
    const ctrl = animate(desde, valor, { duration: duracion, ease: [0.23, 1, 0.32, 1], onUpdate: (v) => { el.textContent = formato(v) } })
    return () => ctrl.stop()
  }, [valor, reducir, duracion, formato])
  return <span ref={ref} className="num">{formato(0)}</span>
}

export function Indicador({ etiqueta, valor, formato, icono, nota, destacado, onClick }: {
  etiqueta: string; valor: number; formato?: (n: number) => string; icono?: ReactNode; nota?: ReactNode; destacado?: boolean; onClick?: () => void
}) {
  const contenido = (
    <div className={`stat ${destacado ? 'destacado' : ''}`}>
      <span className="stat-label">{icono}{etiqueta}</span>
      <span className="stat-valor"><Contador valor={valor} formato={formato} /></span>
      {nota && <span className="stat-nota">{nota}</span>}
    </div>
  )
  if (onClick) return <button type="button" className="card card-press" onClick={onClick}>{contenido}</button>
  return <div className="card">{contenido}</div>
}

/* ---------------- Campos ---------------- */
interface CampoBase { etiqueta: string; ayuda?: ReactNode; error?: string | null; icono?: ReactNode; accion?: ReactNode }
export const Campo = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & CampoBase & { cargando?: boolean }>(function Campo(
  { etiqueta, ayuda, error, icono, accion, cargando, className = '', id, ...rest }, ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={fid}>{etiqueta}</label>
      <div className="input-wrap">
        {icono}
        <input ref={ref} id={fid} className="input" aria-invalid={error ? true : undefined}
          aria-describedby={[ayuda && `${fid}-a`, error && `${fid}-e`].filter(Boolean).join(' ') || undefined} {...rest} />
        {(accion || cargando) && <span className="input-accion">{cargando ? <Spinner /> : accion}</span>}
      </div>
      {ayuda && !error && <span id={`${fid}-a`} className="field-hint">{ayuda}</span>}
      {error && <span id={`${fid}-e`} className="field-error" role="alert"><AlertCircle aria-hidden />{error}</span>}
    </div>
  )
})

export function Selector({ etiqueta, ayuda, error, children, className = '', id, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & CampoBase) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={fid}>{etiqueta}</label>
      <select id={fid} className="select" aria-invalid={error ? true : undefined} {...rest}>{children}</select>
      {ayuda && !error && <span className="field-hint">{ayuda}</span>}
      {error && <span className="field-error" role="alert"><AlertCircle aria-hidden />{error}</span>}
    </div>
  )
}

export function AreaTexto({ etiqueta, ayuda, error, className = '', id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & CampoBase) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={fid}>{etiqueta}</label>
      <textarea id={fid} className="textarea" aria-invalid={error ? true : undefined} {...rest} />
      {ayuda && !error && <span className="field-hint">{ayuda}</span>}
      {error && <span className="field-error" role="alert"><AlertCircle aria-hidden />{error}</span>}
    </div>
  )
}

export function Interruptor({ activo, onCambio, etiqueta, descripcion }: { activo: boolean; onCambio: (v: boolean) => void; etiqueta: string; descripcion?: string }) {
  const id = useId()
  return (
    <div className="row between" style={{ minHeight: 56 }}>
      <div className="grow">
        <div id={id} className="bold">{etiqueta}</div>
        {descripcion && <div className="small muted">{descripcion}</div>}
      </div>
      <button type="button" role="switch" aria-checked={activo} aria-labelledby={id} className="switch" onClick={() => onCambio(!activo)} />
    </div>
  )
}

/* ---------------- Avatar y lista ---------------- */
export function Avatar({ nombre, foto, tam }: { nombre: string; foto?: string | null; tam?: 'lg' | 'xl' }) {
  return (
    <span className={`avatar ${tam ?? ''}`} aria-hidden>
      {foto ? <img src={foto} alt="" loading="lazy" /> : iniciales(nombre)}
    </span>
  )
}

export function ItemLista({ titulo, sub, inicio, fin, onClick, href }: { titulo: ReactNode; sub?: ReactNode; inicio?: ReactNode; fin?: ReactNode; onClick?: () => void; href?: string }) {
  const contenido = (
    <>
      {inicio}
      <span className="li-main">
        <span className="li-title" style={{ display: 'block' }}>{titulo}</span>
        {sub && <span className="li-sub" style={{ display: 'block' }}>{sub}</span>}
      </span>
      {fin && <span className="li-end">{fin}</span>}
    </>
  )
  if (href) return <a className="list-item" href={href}>{contenido}</a>
  if (onClick) return <button type="button" className="list-item" onClick={onClick}>{contenido}</button>
  return <div className="list-item">{contenido}</div>
}

/* ---------------- Vacío y skeleton ---------------- */
export function Vacio({ icono, titulo, texto, accion }: { icono: ReactNode; titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icono" aria-hidden>{icono}</span>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {accion}
    </div>
  )
}

export function Esqueleto({ alto = 20, ancho = '100%', radio }: { alto?: number; ancho?: number | string; radio?: number }) {
  return <span className="skeleton" style={{ display: 'block', height: alto, width: ancho, borderRadius: radio }} aria-hidden />
}

export function EsqueletoLista({ filas = 5 }: { filas?: number }) {
  return (
    <div className="stack" style={{ ['--gap' as string]: '14px' }} role="status" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="row" style={{ padding: '8px 12px' }}>
          <Esqueleto alto={48} ancho={48} radio={24} />
          <div className="grow stack" style={{ ['--gap' as string]: '8px' }}>
            <Esqueleto alto={16} ancho="55%" />
            <Esqueleto alto={14} ancho="35%" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Aviso en línea ---------------- */
export function Aviso({ tono = 'info', icono, children }: { tono?: 'info' | 'ok' | 'alerta' | 'peligro'; icono?: ReactNode; children: ReactNode }) {
  return <div className={`aviso ${tono === 'info' ? '' : tono}`} role={tono === 'peligro' ? 'alert' : 'status'}>{icono}<div>{children}</div></div>
}

/* ---------------- Aparición suave ---------------- */
export function Aparece({ children, retraso = 0, className }: { children: ReactNode; retraso?: number; className?: string }) {
  const reducir = useReducedMotion()
  return (
    <motion.div className={className}
      initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px)' }}
      animate={reducir ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: retraso }}>
      {children}
    </motion.div>
  )
}
