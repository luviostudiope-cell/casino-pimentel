import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, KeyRound, LogOut, Phone } from 'lucide-react'
import { useSesion } from '../../lib/sesion'
import { funcion } from '../../lib/supabase'
import { fechaCorta } from '../../lib/formato'
import { Avatar, Boton, Campo, EjemploTag, Hoja, ItemLista, Tarjeta, useConfirmar, useToast } from '../../ui'
import { ActivarPush } from '../comun/ActivarPush'
import { useSocio } from './Socio'
import { PARENTESCO } from './datos'

export default function Perfil({ onVerBienvenida }: { onVerBienvenida: () => void }) {
  const { familia } = useSocio()
  const { salir } = useSesion()
  const navegar = useNavigate()
  const confirmar = useConfirmar()
  const avisar = useToast()
  const [pinHoja, setPinHoja] = useState(false)
  const [actual, setActual] = useState('')
  const [nuevo, setNuevo] = useState('')
  const [repite, setRepite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cambiarPin = async () => {
    setError(null)
    if (!/^\d{6}$/.test(nuevo)) { setError('El nuevo PIN debe tener 6 números.'); return }
    if (nuevo !== repite) { setError('Los dos PIN nuevos no coinciden.'); return }
    setGuardando(true)
    try {
      await funcion('cambiar-pin', { pin: nuevo, pin_actual: actual })
      avisar('PIN cambiado. Úsalo la próxima vez que entres.')
      setPinHoja(false); setActual(''); setNuevo(''); setRepite('')
    } catch (e) { setError((e as Error).message) } finally { setGuardando(false) }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <div>
        <h1>Mi perfil</h1>
        <p className="page-lead">Socio N° <span className="num">{familia.socio.numero}</span></p>
      </div>
      <Tarjeta titulo="Mi familia en el club">
        <div className="list">
          {familia.miembros.map((m) => (
            <ItemLista key={m.id} inicio={<Avatar nombre={`${m.nombres} ${m.apellidos}`} foto={m.foto} />}
              titulo={`${m.nombres} ${m.apellidos}`}
              sub={`${PARENTESCO[m.parentesco]}${m.fecha_nacimiento ? ` · nació el ${fechaCorta(m.fecha_nacimiento)}` : ''}`}
              fin={m.es_ejemplo ? <EjemploTag texto="Ejemplo" /> : undefined} />
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>Para agregar o corregir a un familiar, comunícate con administración.</p>
      </Tarjeta>
      <ActivarPush />
      <div className="stack" style={{ ['--gap' as string]: '10px' }}>
        <Boton variante="secondary" tam="lg" bloque icono={<KeyRound aria-hidden />} onClick={() => setPinHoja(true)}>Cambiar mi PIN</Boton>
        <Boton variante="secondary" tam="lg" bloque icono={<BookOpen aria-hidden />} onClick={onVerBienvenida}>Ver cómo usar la app</Boton>
        <a className="btn btn-secondary btn-lg btn-block" href="tel:074425244"><Phone aria-hidden /><span>Llamar a administración</span></a>
        <Boton variante="outline" tam="lg" bloque icono={<LogOut aria-hidden />} onClick={async () => {
          if (await confirmar({ titulo: '¿Cerrar sesión?', texto: 'Para volver a entrar necesitarás tu DNI y tu PIN.', confirmar: 'Cerrar sesión' })) { await salir(); navegar('/ingresar', { replace: true }) }
        }}>Cerrar sesión</Boton>
      </div>
      <Hoja abierta={pinHoja} onCerrar={() => setPinHoja(false)} titulo="Cambiar mi PIN"
        pie={<><Boton variante="outline" onClick={() => setPinHoja(false)}>Cancelar</Boton><Boton onClick={cambiarPin} cargando={guardando}>Guardar PIN</Boton></>}>
        <div className="stack">
          <Campo etiqueta="PIN actual" type="password" inputMode="numeric" maxLength={6} autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value.replace(/\D/g, ''))} />
          <Campo etiqueta="Nuevo PIN (6 números)" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={nuevo} onChange={(e) => setNuevo(e.target.value.replace(/\D/g, ''))} />
          <Campo etiqueta="Repite el nuevo PIN" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={repite} onChange={(e) => setRepite(e.target.value.replace(/\D/g, ''))} error={error} />
        </div>
      </Hoja>
    </div>
  )
}
