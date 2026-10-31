import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Aviso, PuntosPin, TecladoNumerico, Wordmark, useToast } from '../../ui'
import { useSesion } from '../../lib/sesion'
import { funcion } from '../../lib/supabase'

/** Primer ingreso: el socio cambia el PIN temporal por uno propio (dos veces para confirmar). */
export default function CambiarPin({ alTerminar }: { alTerminar?: () => void }) {
  const { sesion, perfil, recargarPerfil } = useSesion()
  const navegar = useNavigate()
  const avisar = useToast()
  const [primero, setPrimero] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const guardar = useCallback(async (nuevo: string) => {
    setCargando(true)
    try {
      await funcion('cambiar-pin', { pin: nuevo })
      await recargarPerfil()
      avisar('Listo. Desde ahora entras con tu nuevo PIN.')
      if (alTerminar) alTerminar()
      else navegar('/socio', { replace: true })
    } catch (e) {
      setError((e as Error).message); setPrimero(null); setPin('')
    } finally { setCargando(false) }
  }, [alTerminar, avisar, navegar, recargarPerfil])

  const tecla = useCallback((d: string) => {
    setError(null)
    setPin((p) => (p.length >= 6 ? p : p + d))
  }, [])
  // Al completar 6 números: primera vez se guarda, segunda vez se confirma (fuera del actualizador de estado)
  useEffect(() => {
    if (pin.length !== 6) return
    const t = window.setTimeout(() => {
      if (!primero) {
        if (/^(\d)\1{5}$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) {
          setError('Ese PIN es muy fácil de adivinar. Elige otro.'); setPin(''); return
        }
        setPrimero(pin); setPin('')
      } else if (pin !== primero) {
        setError('Los PIN no coinciden. Empecemos otra vez.'); setPrimero(null); setPin('')
      } else guardar(pin)
    }, 140)
    return () => clearTimeout(t)
  }, [pin, primero, guardar])

  if (!sesion || !perfil) return <Navigate to="/ingresar" replace />
  if (perfil.tipo !== 'socio') return <Navigate to="/" replace />

  return (
    <main className="acceso">
      <div className="acceso-caja stack" style={{ ['--gap' as string]: '20px', alignItems: 'center' }}>
        <Wordmark />
        <section className="card stack" style={{ width: '100%', alignItems: 'center', ['--gap' as string]: '16px' }} aria-labelledby="t-pin">
          <span className="empty-icono" aria-hidden><ShieldCheck /></span>
          <h1 id="t-pin" style={{ fontSize: 'var(--text-2xl)', textAlign: 'center' }}>{primero ? 'Repite tu nuevo PIN' : 'Crea tu PIN personal'}</h1>
          <p className="muted" style={{ textAlign: 'center', maxWidth: '34ch' }}>
            {primero ? 'Escríbelo otra vez para confirmar.' : 'Son 6 números que solo tú sabes. Con tu DNI y este PIN entrarás siempre a la app.'}
          </p>
          <PuntosPin largo={pin.length} error={Boolean(error)} />
          <div aria-live="assertive" style={{ minHeight: 24 }}>{error && <span className="field-error">{error}</span>}</div>
          <TecladoNumerico onTecla={tecla} onBorrar={() => setPin((p) => p.slice(0, -1))} deshabilitado={cargando} />
          <Aviso>No uses tu fecha de nacimiento ni números seguidos como 123456.</Aviso>
        </section>
      </div>
    </main>
  )
}
