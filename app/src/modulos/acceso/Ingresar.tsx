import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, IdCard, KeyRound, Mail, Phone } from 'lucide-react'
import { Aviso, Boton, Campo, Pestanas, PuntosPin, TecladoNumerico, Wordmark } from '../../ui'
import { useSesion } from '../../lib/sesion'
import { inicioDeRol } from '../../lib/roles'

type Modo = 'socio' | 'personal'
const EASE = [0.23, 1, 0.32, 1] as const

export default function Ingresar() {
  const { sesion, perfil, ingresarSocio, ingresarStaff } = useSesion()
  const navegar = useNavigate()
  const loc = useLocation()
  const reducir = useReducedMotion()
  const [modo, setModo] = useState<Modo>(() => (localStorage.getItem('cp-modo-ingreso') as Modo) || 'socio')
  const [paso, setPaso] = useState<'dni' | 'pin'>('dni')
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => { try { localStorage.setItem('cp-modo-ingreso', modo) } catch { /* sin almacenamiento */ } }, [modo])
  useEffect(() => {
    if (sesion && perfil) navegar(perfil.debe_cambiar_pin ? '/cambiar-pin' : ((loc.state as { desde?: string })?.desde ?? inicioDeRol(perfil.rol)), { replace: true })
  }, [sesion, perfil, navegar, loc.state])

  const entrarSocio = useCallback(async (p: string) => {
    setCargando(true); setError(null)
    try {
      const pf = await ingresarSocio(dni, p)
      navegar(pf.debe_cambiar_pin ? '/cambiar-pin' : '/socio', { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setPin('')
    } finally { setCargando(false) }
  }, [dni, ingresarSocio, navegar])

  const tecla = useCallback((d: string) => {
    setError(null)
    setPin((p) => {
      if (p.length >= 6) return p
      const n = p + d
      if (n.length === 6) window.setTimeout(() => entrarSocio(n), 120)
      return n
    })
  }, [entrarSocio])
  const borrar = useCallback(() => setPin((p) => p.slice(0, -1)), [])

  const continuarDni = (e?: React.FormEvent) => {
    e?.preventDefault()
    const limpio = dni.replace(/\D/g, '')
    if (limpio.length !== 8) { setError('Escribe tu DNI completo: son 8 números.'); return }
    setDni(limpio); setError(null); setPaso('pin')
  }

  const entrarPersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correo.includes('@')) { setError('Escribe tu correo completo.'); return }
    if (clave.length < 6) { setError('La clave tiene al menos 6 caracteres.'); return }
    setCargando(true); setError(null)
    try {
      const pf = await ingresarStaff(correo, clave)
      navegar(inicioDeRol(pf.rol), { replace: true })
    } catch (er) { setError((er as Error).message) }
    finally { setCargando(false) }
  }

  const anim = (dir: number) => reducir
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, transform: `translateX(${24 * dir}px)` }, animate: { opacity: 1, transform: 'translateX(0px)' }, exit: { opacity: 0, transform: `translateX(${-24 * dir}px)` } }

  return (
    <main className="acceso">
      <div className="acceso-caja stack" style={{ ['--gap' as string]: '20px' }}>
        <div className="row between">
          <Wordmark href="/" />
          <a className="btn btn-ghost btn-sm" href="/">Ver la web</a>
        </div>
        <section className="card stack" style={{ ['--gap' as string]: '20px', padding: 'clamp(20px, 5vw, 32px)' }} aria-labelledby="titulo-ingreso">
          <div>
            <h1 id="titulo-ingreso" style={{ fontSize: 'var(--text-2xl)' }}>Ingresa al club</h1>
            <p className="muted" style={{ marginTop: 6 }}>Un solo ingreso para socios, administración, barra y portería.</p>
          </div>
          <Pestanas etiqueta="¿Quién ingresa?" bloque valor={modo} onCambio={(v) => { setModo(v); setError(null); setPaso('dni'); setPin('') }}
            opciones={[{ valor: 'socio', etiqueta: 'Soy socio', icono: <IdCard aria-hidden /> }, { valor: 'personal', etiqueta: 'Personal', icono: <KeyRound aria-hidden /> }]} />

          <AnimatePresence mode="wait" initial={false}>
            {modo === 'socio' && paso === 'dni' && (
              <motion.form key="dni" className="stack" onSubmit={continuarDni} {...anim(1)} transition={{ duration: 0.2, ease: EASE }}>
                <Campo etiqueta="Tu DNI" inputMode="numeric" autoComplete="username" maxLength={8} placeholder="8 números"
                  value={dni} onChange={(e) => { setDni(e.target.value.replace(/\D/g, '')); setError(null) }}
                  error={error} icono={<IdCard aria-hidden />} autoFocus style={{ fontSize: '1.5rem', letterSpacing: '0.08em' }} />
                <Boton type="submit" tam="lg" bloque>Continuar</Boton>
              </motion.form>
            )}
            {modo === 'socio' && paso === 'pin' && (
              <motion.div key="pin" className="stack" style={{ alignItems: 'center' }} {...anim(1)} transition={{ duration: 0.2, ease: EASE }}>
                <div className="row" style={{ width: '100%' }}>
                  <Boton variante="ghost" tam="sm" icono={<ArrowLeft aria-hidden />} onClick={() => { setPaso('dni'); setPin(''); setError(null) }}>Cambiar DNI</Boton>
                  <span className="muted num" style={{ marginLeft: 'auto' }}>DNI {dni}</span>
                </div>
                <p className="bold" style={{ fontSize: 'var(--text-md)' }}>Escribe tu PIN de 6 números</p>
                <PuntosPin largo={pin.length} error={Boolean(error)} />
                <div aria-live="assertive" style={{ minHeight: 24 }}>{error && <span className="field-error">{error}</span>}</div>
                <TecladoNumerico onTecla={tecla} onBorrar={borrar} deshabilitado={cargando} />
                {cargando && <span className="muted" role="status">Entrando…</span>}
              </motion.div>
            )}
            {modo === 'personal' && (
              <motion.form key="personal" className="stack" onSubmit={entrarPersonal} {...anim(-1)} transition={{ duration: 0.2, ease: EASE }}>
                <Campo etiqueta="Correo" type="email" autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} icono={<Mail aria-hidden />} autoFocus />
                <Campo etiqueta="Clave" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} icono={<KeyRound aria-hidden />} />
                {error && <Aviso tono="peligro">{error}</Aviso>}
                <Boton type="submit" tam="lg" bloque cargando={cargando}>Ingresar</Boton>
              </motion.form>
            )}
          </AnimatePresence>
        </section>
        <p className="muted small" style={{ textAlign: 'center' }}>
          ¿Olvidaste tu PIN o tu clave? Pídelo en administración{' '}
          <a href="tel:074425244" className="num"><Phone size={14} aria-hidden style={{ display: 'inline', verticalAlign: '-2px' }} /> 074-425244</a>
        </p>
      </div>
    </main>
  )
}
