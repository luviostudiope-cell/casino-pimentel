import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, ClipboardCheck, CreditCard, DoorOpen, Receipt, Send, ShoppingBag, Trophy, UserPlus, Users } from 'lucide-react'
import { funcion, rpc } from '../../lib/supabase'
import { useDatos, useEnVivo } from '../../lib/datos'
import { useSesion } from '../../lib/sesion'
import { fechaLarga, moneda, numero, saludo } from '../../lib/formato'
import { Aparece, Aviso, BarrasHorizontales, Boton, Esqueleto, Hoja, Indicador, Tarjeta, Vacio, useToast } from '../../ui'

interface Resumen {
  fecha: string; ventas_barra: number; por_barra: { barra: string; total: number; comandas: number }[]; por_medio: Record<string, number>
  caja: { saldo: number; ingresos_hoy: number; egresos_hoy: number }
  porteria: { dentro: number; ingresos: number; invitados: number; cobrado: number }
  personal: { programados: number; presentes: number; tardanzas: number; faltas: number }
  tenis: number; pagos_por_validar: number; morosos: number
  atencion: { tipo: string; titulo: string; detalle: string; url: string; importante: boolean }[]
}
const MEDIO: Record<string, string> = { tarjeta: 'Tarjeta', efectivo: 'Efectivo', yape: 'Yape', cuenta_socio: 'A cuenta de socios' }

export default function Hoy() {
  const { perfil } = useSesion()
  const navegar = useNavigate()
  const avisar = useToast()
  const { datos: r, recargar } = useDatos(() => rpc<Resumen>('hoy_resumen'), [])
  useEnVivo(['ingresos', 'comandas', 'cobros', 'pagos', 'marcaciones', 'caja_movimientos', 'solicitudes_alquiler', 'cierres_barra', 'reservas_cancha'], () => recargar(true))
  const [reporte, setReporte] = useState<{ texto: string; generado_con: string; enviado_telegram: boolean; avisos: string[] } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const disparar = async () => {
    setEnviando(true)
    try { const x = await funcion<typeof reporte>('reporte-diario', { origen: 'manual' }); setReporte(x); avisar(x?.enviado_telegram ? 'Reporte enviado al grupo de Telegram.' : 'Reporte generado.') }
    catch (e) { avisar((e as Error).message, 'error') } finally { setEnviando(false) }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '24px' }}>
      <header className="row between wrap" style={{ alignItems: 'flex-end' }}>
        <div>
          <p className="muted" style={{ textTransform: 'capitalize' }}>{fechaLarga(new Date())}</p>
          <h1 className="page-title">{saludo()}, {perfil?.nombre.split(' ')[0]}</h1>
          {r ? (
            <p className="page-lead" style={{ fontSize: 'var(--text-md)', color: 'var(--tinta)' }}>
              Hoy entraron <b className="num">{numero(r.porteria.ingresos)}</b> personas y la barra vendió <b className="num">{moneda(r.ventas_barra)}</b>.
            </p>
          ) : <Esqueleto alto={22} ancho={340} />}
        </div>
        <Boton variante="secondary" icono={<Send aria-hidden />} cargando={enviando} onClick={disparar}>Enviar reporte del día</Boton>
      </header>

      {!r ? <div className="grid-auto"><Esqueleto alto={130} radio={28} /><Esqueleto alto={130} radio={28} /><Esqueleto alto={130} radio={28} /></div> : (
        <>
          <section aria-labelledby="atencion-t" className="stack" style={{ ['--gap' as string]: '12px' }}>
            <h2 id="atencion-t" className="section-title">Requiere tu atención</h2>
            {r.atencion.length ? (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', ['--gap' as string]: '12px' }}>
                {r.atencion.map((a, i) => (
                  <Aparece key={i} retraso={i * 0.04}>
                    <button type="button" className="card card-press row" style={{ ['--gap' as string]: '14px', alignItems: 'flex-start', borderColor: a.importante ? 'var(--peligro-suave)' : undefined }} onClick={() => navegar(a.url)}>
                      <span className="empty-icono" style={{ width: 48, height: 48, flex: 'none', background: a.importante ? 'var(--peligro-suave)' : 'var(--alerta-suave)', color: a.importante ? 'var(--peligro-tinta)' : 'var(--alerta-tinta)' }} aria-hidden><AlertTriangle size={22} /></span>
                      <span className="grow" style={{ textAlign: 'left' }}><b style={{ display: 'block' }}>{a.titulo}</b><span className="small muted">{a.detalle}</span></span>
                      <ChevronRight aria-hidden color="var(--azul)" />
                    </button>
                  </Aparece>
                ))}
              </div>
            ) : <Aviso tono="ok" icono={<ClipboardCheck aria-hidden />}>Todo en orden: no hay faltantes, pagos por validar ni alquileres pendientes.</Aviso>}
          </section>

          <section className="grid-auto" style={{ ['--min' as string]: '210px' }} aria-label="Indicadores de hoy">
            <Indicador etiqueta="Ventas de barra" valor={r.ventas_barra} formato={moneda} icono={<ShoppingBag aria-hidden />} destacado nota={r.por_barra.map((b) => `${b.barra} ${moneda(b.total)}`).join(' · ')} onClick={() => navegar('/admin/barra/cierres')} />
            <Indicador etiqueta="Personas dentro" valor={r.porteria.dentro} icono={<Users aria-hidden />} nota={`${numero(r.porteria.ingresos)} ingresos hoy`} onClick={() => navegar('/admin/porteria')} />
            <Indicador etiqueta="Invitados" valor={r.porteria.invitados} icono={<UserPlus aria-hidden />} nota={`${moneda(r.porteria.cobrado)} cobrados en portería`} onClick={() => navegar('/admin/porteria')} />
            <Indicador etiqueta="Caja de oficina" valor={r.caja.saldo} formato={moneda} icono={<Receipt aria-hidden />} nota={`Hoy: +${moneda(r.caja.ingresos_hoy)} / −${moneda(r.caja.egresos_hoy)}`} onClick={() => navegar('/admin/caja')} />
            <Indicador etiqueta="Personal presente" valor={r.personal.presentes} icono={<DoorOpen aria-hidden />} nota={`de ${r.personal.programados} · ${r.personal.tardanzas} tardanzas · ${r.personal.faltas} faltas`} onClick={() => navegar('/admin/personal')} />
            <Indicador etiqueta="Reservas de tenis" valor={r.tenis} icono={<Trophy aria-hidden />} nota="para hoy" onClick={() => navegar('/admin/tenis')} />
            <Indicador etiqueta="Pagos por validar" valor={r.pagos_por_validar} icono={<CreditCard aria-hidden />} nota={`${r.morosos} socios con deuda`} onClick={() => navegar('/admin/cobranza')} />
          </section>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
            <Tarjeta titulo="Barra: cobrado por medio de pago">
              {Object.keys(r.por_medio).length ? (
                <BarrasHorizontales formato={moneda} datos={Object.entries(r.por_medio).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ etiqueta: MEDIO[k] ?? k, valor: Number(v) }))} />
              ) : <Vacio icono={<ShoppingBag />} titulo="Aún no hay ventas hoy" texto="Cuando la barra cobre, verás aquí cómo pagaron." />}
            </Tarjeta>
            <Tarjeta titulo="Barra: ventas por barra">
              <BarrasHorizontales formato={moneda} color="var(--arena-oscura)" datos={r.por_barra.map((b) => ({ etiqueta: b.barra, valor: Number(b.total), nota: `${b.comandas} comandas` }))} />
            </Tarjeta>
          </div>
        </>
      )}

      <Hoja abierta={Boolean(reporte)} onCerrar={() => setReporte(null)} titulo="Reporte del día" subtitulo={reporte ? `Redactado con ${reporte.generado_con === 'claude' ? 'Claude' : 'la plantilla'} · ${reporte.enviado_telegram ? 'enviado a Telegram' : 'no se envió a Telegram'}` : ''}>
        {reporte && (
          <div className="stack">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-base)', lineHeight: 1.55, margin: 0, background: 'var(--surface-2)', padding: 16, borderRadius: 18 }}>{reporte.texto}</pre>
            {reporte.avisos?.map((a) => <Aviso key={a} tono="alerta">{a}</Aviso>)}
          </div>
        )}
      </Hoja>
    </div>
  )
}
