import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, IdCard, Megaphone, UserPlus, Wallet } from 'lucide-react'
import { Aparece, EjemploTag, PillEstado, Tarjeta } from '../../ui'
import { useDatos } from '../../lib/datos'
import { fechaCorta, fechaLarga, moneda, saludo } from '../../lib/formato'
import { useSocio } from './Socio'
import { avisos, estadoCarnet, proximaReserva } from './datos'

export default function Inicio() {
  const { familia } = useSocio()
  const navegar = useNavigate()
  const { socio, cuenta, miembros } = familia
  const titular = miembros.find((m) => m.parentesco === 'titular')
  const est = estadoCarnet(cuenta)
  const { datos: reservas } = useDatos(() => proximaReserva(socio.id), [socio.id])
  const { datos: ultimos } = useDatos(() => avisos(1), [])
  const proxima = reservas?.[0]
  const aviso = ultimos?.[0]

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <div>
        <p className="muted" style={{ fontSize: 'var(--text-md)' }}>{fechaLarga(new Date())}</p>
        <h1 style={{ marginTop: 4 }}>{saludo()}, {titular?.nombres.split(' ')[0] ?? socio.nombres.split(' ')[0]}</h1>
      </div>

      <Aparece>
        <button type="button" className="card card-press stack" style={{ ['--gap' as string]: '12px' }} onClick={() => navegar('/socio/cuenta')}
          aria-label={`Estado de cuenta: ${est.texto}. Ver mi cuenta`}>
          <div className="row between">
            <span className="stat-label"><Wallet aria-hidden />Tu cuenta</span>
            <ChevronRight aria-hidden color="var(--azul)" />
          </div>
          <PillEstado estado={est.estado} texto={est.texto} tam="xl" />
          <span className="muted">
            {cuenta.estado_cuenta === 'deuda' ? `Tienes ${cuenta.cuotas_vencidas} cuota(s) vencida(s). Toca para ver el detalle y pagar.`
              : cuenta.estado_cuenta === 'por_vencer' && cuenta.proximo_vencimiento ? `Tu próxima cuota vence el ${fechaCorta(cuenta.proximo_vencimiento)}.`
              : Number(cuenta.saldo) > 0 ? `Consumos por pagar: ${moneda(cuenta.saldo)}` : 'No debes nada. Gracias por estar al día.'}
          </span>
          {socio.es_ejemplo && <EjemploTag />}
        </button>
      </Aparece>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', ['--gap' as string]: '12px' }}>
        <button type="button" className="btn btn-primary btn-xl" style={{ flexDirection: 'column', gap: 8 }} onClick={() => navegar('/socio/carnet')}>
          <IdCard size={30} aria-hidden /><span>Mostrar carnet</span>
        </button>
        <button type="button" className="btn btn-secondary btn-xl" style={{ flexDirection: 'column', gap: 8 }} onClick={() => navegar('/socio/reservas')}>
          <CalendarDays size={30} aria-hidden /><span>Reservar tenis</span>
        </button>
        <button type="button" className="btn btn-secondary btn-xl" style={{ flexDirection: 'column', gap: 8 }} onClick={() => navegar('/socio/reservas/invitados')}>
          <UserPlus size={30} aria-hidden /><span>Mis invitados</span>
        </button>
        <button type="button" className="btn btn-secondary btn-xl" style={{ flexDirection: 'column', gap: 8 }} onClick={() => navegar('/socio/cuenta')}>
          <Wallet size={30} aria-hidden /><span>Pagar cuota</span>
        </button>
      </div>

      <Tarjeta titulo="Tu próxima reserva">
        {proxima ? (
          <button type="button" className="list-item" onClick={() => navegar('/socio/reservas')}>
            <span className="empty-icono" style={{ width: 52, height: 52 }} aria-hidden><CalendarDays /></span>
            <span className="li-main">
              <span className="li-title" style={{ display: 'block' }}>{proxima.canchas?.nombre} · {proxima.hora_inicio.slice(0, 5)}</span>
              <span className="li-sub" style={{ display: 'block' }}>{fechaLarga(proxima.fecha)}{proxima.miembros ? ` · juega ${proxima.miembros.nombres.split(' ')[0]}` : ''}</span>
            </span>
            <ChevronRight aria-hidden />
          </button>
        ) : <p className="muted">No tienes reservas. Las canchas de tenis se reservan desde "Reservas".</p>}
      </Tarjeta>

      <Tarjeta titulo="Último aviso del club" accion={<button type="button" className="btn btn-ghost btn-sm" onClick={() => navegar('/socio/avisos')}>Ver todos</button>}>
        {aviso ? (
          <div className="stack" style={{ ['--gap' as string]: '8px' }}>
            <div className="row"><Megaphone aria-hidden color="var(--azul)" /><b className="grow">{aviso.titulo}</b></div>
            <p className="clamp-2 muted">{aviso.texto}</p>
            <span className="small muted">{fechaCorta(aviso.publicado_en)}</span>
            {aviso.es_ejemplo && <EjemploTag />}
          </div>
        ) : <p className="muted">Aún no hay avisos.</p>}
      </Tarjeta>
    </div>
  )
}
