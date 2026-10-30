import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarCheck, IdCard, KeyRound } from 'lucide-react'
import { Boton, Wordmark } from '../../ui'

// Primer ingreso guiado: tres tareas con verbo, cada una contra lo que el socio hace hoy.
const PASOS = [
  {
    icono: KeyRound,
    titulo: 'Entras con tu DNI y tu PIN',
    texto: 'Ya no hace falta dar tus datos en la puerta. Abres la app, escribes tu DNI y tus 6 números, y listo.',
    ayuda: 'Si olvidas tu PIN, administración te da uno nuevo.',
  },
  {
    icono: IdCard,
    titulo: 'Muestras tu carnet en portería',
    texto: 'Tocas la pestaña "Carnet" y luego la tarjeta. Aparece un código que el portero lee con su tablet.',
    ayuda: 'El código cambia cada 30 segundos: una foto del código no sirve.',
  },
  {
    icono: CalendarCheck,
    titulo: 'Reservas tenis sin llamar',
    texto: 'En "Reservas" eliges el día, quién juega y la hora libre. Si no se puede, la app te dice por qué.',
    ayuda: 'También registras a tus invitados antes de llegar.',
  },
]

export default function Bienvenida({ onTerminar }: { onTerminar: () => void }) {
  const [i, setI] = useState(0)
  const reducir = useReducedMotion()
  const paso = PASOS[i]
  const Icono = paso.icono
  const ultimo = i === PASOS.length - 1
  return (
    <main className="acceso" aria-labelledby="bienvenida-titulo">
      <div className="acceso-caja stack" style={{ ['--gap' as string]: '24px' }}>
        <div className="row between">
          <Wordmark />
          <Boton variante="ghost" tam="sm" onClick={onTerminar}>Saltar</Boton>
        </div>
        <section className="card stack" style={{ ['--gap' as string]: '20px', minHeight: 420, padding: 'clamp(24px, 6vw, 36px)' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={i} className="stack" style={{ ['--gap' as string]: '16px' }}
              initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateX(28px)' }}
              animate={reducir ? { opacity: 1 } : { opacity: 1, transform: 'translateX(0px)' }}
              exit={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateX(-28px)' }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}>
              <span className="empty-icono" style={{ width: 88, height: 88 }} aria-hidden><Icono size={42} /></span>
              <p className="muted bold">Paso {i + 1} de {PASOS.length}</p>
              <h1 id="bienvenida-titulo" style={{ fontSize: 'var(--text-2xl)' }}>{paso.titulo}</h1>
              <p style={{ fontSize: 'var(--text-md)' }}>{paso.texto}</p>
              <p className="aviso">{paso.ayuda}</p>
            </motion.div>
          </AnimatePresence>
          <div className="row" style={{ justifyContent: 'center', marginTop: 'auto' }} aria-hidden>
            {PASOS.map((_, k) => <span key={k} className={`pin-punto ${k <= i ? 'lleno' : ''}`} style={{ width: 12, height: 12 }} />)}
          </div>
          <div className="row">
            {i > 0 && <Boton variante="outline" tam="lg" onClick={() => setI(i - 1)}>Atrás</Boton>}
            <Boton tam="lg" className="grow" onClick={() => (ultimo ? onTerminar() : setI(i + 1))}>{ultimo ? 'Empezar' : 'Siguiente'}</Boton>
          </div>
        </section>
      </div>
    </main>
  )
}
