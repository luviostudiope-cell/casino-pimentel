import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, ChevronDown, FileCheck2, Receipt, Upload, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { fechaCorta, mesCorto, moneda, monedaCorta } from '../../lib/formato'
import { useSesion } from '../../lib/sesion'
import { Aviso, Boton, Campo, CodigoQR, EjemploTag, Hoja, PillEstado, Tarjeta, Vacio, useToast, type Estado } from '../../ui'
import { useSocio } from './Socio'

interface Cuota { id: string; periodo: string; monto: number; vencimiento: string; estado: 'pendiente' | 'pagado' | 'vencido' | 'anulada'; tipo: string; es_ejemplo: boolean }
interface Movimiento { id: string; fecha: string; tipo: 'cargo' | 'abono'; origen: string; concepto: string; monto: number; detalle: { items?: { producto: string; cantidad: number; subtotal: number; cortesia?: boolean }[]; mesa?: string } | null }
interface Pago { id: string; creado_en: string; medio: string; monto: number; estado: 'por_validar' | 'validado' | 'rechazado'; motivo_rechazo: string | null; operacion: string | null }

async function cargar(socioId: string) {
  const [c, m, p, cfg] = await Promise.all([
    supabase.from('cuotas').select('id, periodo, monto, vencimiento, estado, tipo, es_ejemplo').eq('socio_id', socioId).is('eliminado_en', null).order('periodo', { ascending: false }).limit(24),
    supabase.from('cuenta_socio').select('id, fecha, tipo, origen, concepto, monto, detalle').eq('socio_id', socioId).is('eliminado_en', null).order('fecha', { ascending: false }).limit(60),
    supabase.from('pagos').select('id, creado_en, medio, monto, estado, motivo_rechazo, operacion').eq('socio_id', socioId).is('eliminado_en', null).order('creado_en', { ascending: false }).limit(30),
    supabase.from('config').select('reglas').maybeSingle(),
  ])
  return { cuotas: ok(c) as Cuota[], movimientos: ok(m) as Movimiento[], pagos: ok(p) as Pago[], pagosCfg: (ok(cfg) as { reglas: { pagos?: { yape_numero?: string; yape_titular?: string } } } | null)?.reglas?.pagos }
}

const ESTADO_MES: Record<string, string> = { pagado: 'Pagado', pendiente: 'Pendiente', vencido: 'Vencido', por_validar: 'Por validar' }

export default function Cuenta() {
  const { familia, recargar } = useSocio()
  const { socio, cuenta } = familia
  const { datos, recargar: recargarCuenta } = useDatos(() => cargar(socio.id), [socio.id])
  const [pagar, setPagar] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const hayPorValidar = datos?.pagos.some((p) => p.estado === 'por_validar')
  const consumos = useMemo(() => (datos?.movimientos ?? []).filter((m) => m.origen === 'barra'), [datos])
  const deuda = Math.max(0, Number(cuenta.saldo))
  const cuotasAnio = (datos?.cuotas ?? []).filter((c) => c.tipo === 'mantenimiento').slice(0, 12).reverse()

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <div>
        <h1>Mi cuenta</h1>
        <p className="page-lead">Tus cuotas, tus consumos en El Astillero y tus pagos.</p>
      </div>

      <section className="card stack" style={{ ['--gap' as string]: '12px' }} aria-labelledby="deuda-t">
        <span id="deuda-t" className="stat-label"><Wallet aria-hidden />{deuda > 0 ? 'Debes en total' : 'Saldo'}</span>
        <span className="cifra xl" style={{ color: cuenta.estado_cuenta === 'deuda' ? 'var(--peligro-tinta)' : 'var(--azul)' }}>{moneda(deuda)}</span>
        <div className="row wrap">
          <PillEstado estado={cuenta.estado_cuenta as Estado} tam="lg" />
          {cuenta.proximo_vencimiento && <span className="muted">Próximo vencimiento: <b className="num">{fechaCorta(cuenta.proximo_vencimiento)}</b></span>}
        </div>
        {hayPorValidar && <Aviso>Tienes un pago <b>por validar</b>. Administración lo revisa y te avisamos.</Aviso>}
        <Boton tam="lg" bloque icono={<Upload aria-hidden />} onClick={() => setPagar(true)} disabled={deuda <= 0 && !cuenta.cuotas_pendientes}>Pagar con Yape</Boton>
        {socio.es_ejemplo && <EjemploTag />}
      </section>

      <Tarjeta titulo="Cuotas mes a mes">
        {cuotasAnio.length ? (
          <>
            <div className="meses" role="list">
              {cuotasAnio.map((c) => {
                const st = c.estado === 'pendiente' && hayPorValidar ? 'por_validar' : c.estado
                return (
                  <div key={c.id} role="listitem" className={`mes ${st}`} aria-label={`${mesCorto(c.periodo)}: ${ESTADO_MES[st] ?? st}, ${monedaCorta(c.monto)}`}>
                    <span style={{ textTransform: 'capitalize' }}>{mesCorto(c.periodo)}</span>
                    <small>{ESTADO_MES[st] ?? st}</small>
                  </div>
                )
              })}
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>Cada cuota es de {monedaCorta(cuotasAnio.at(-1)?.monto)} y vence el día 10 del mes siguiente.</p>
          </>
        ) : <p className="muted">Aún no hay cuotas registradas.</p>}
      </Tarjeta>

      <Tarjeta titulo="Consumos a cuenta en El Astillero">
        {consumos.length ? (
          <div className="list">
            {consumos.slice(0, 10).map((c) => (
              <div key={c.id}>
                <button type="button" className="list-item" aria-expanded={abierto === c.id} onClick={() => setAbierto(abierto === c.id ? null : c.id)}>
                  <span className="empty-icono" style={{ width: 48, height: 48, background: 'var(--arena)', color: 'var(--arena-tinta)' }} aria-hidden><Receipt size={22} /></span>
                  <span className="li-main">
                    <span className="li-title" style={{ display: 'block' }}>{c.concepto}</span>
                    <span className="li-sub" style={{ display: 'block' }}>{fechaCorta(c.fecha)}</span>
                  </span>
                  <span className="li-end"><b className="num">{moneda(c.monto)}</b><ChevronDown aria-hidden style={{ transform: abierto === c.id ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }} /></span>
                </button>
                <AnimatePresence initial={false}>
                  {abierto === c.id && c.detalle?.items && (
                    <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                      style={{ listStyle: 'none', margin: '0 0 8px', padding: '8px 16px', background: 'var(--arena-suave)', borderRadius: 16 }}>
                      {c.detalle.items.map((it, k) => (
                        <li key={k} className="kv"><span>{it.cantidad} × {it.producto}{it.cortesia ? ' (cortesía)' : ''}</span><b className="num">{it.cortesia ? 'S/ 0.00' : moneda(it.subtotal)}</b></li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ) : <p className="muted">No tienes consumos a cuenta. Cuando pidas en la barra "a cuenta del socio", aparecerán aquí con su detalle.</p>}
      </Tarjeta>

      <Tarjeta titulo="Historial de pagos">
        {datos?.pagos.length ? (
          <div className="list">
            {datos.pagos.map((p) => (
              <div key={p.id} className="list-item">
                <span className="li-main">
                  <span className="li-title" style={{ display: 'block' }}>{moneda(p.monto)} · {p.medio === 'yape' ? 'Yape' : p.medio.charAt(0).toUpperCase() + p.medio.slice(1)}</span>
                  <span className="li-sub" style={{ display: 'block' }}>{fechaCorta(p.creado_en)}{p.estado === 'rechazado' && p.motivo_rechazo ? ` · ${p.motivo_rechazo}` : ''}</span>
                </span>
                <PillEstado estado={p.estado} />
              </div>
            ))}
          </div>
        ) : <Vacio icono={<FileCheck2 />} titulo="Sin pagos todavía" texto="Cuando pagues con Yape y subas la constancia, verás aquí si ya fue validada." />}
      </Tarjeta>

      <PagarHoja abierta={pagar} onCerrar={() => setPagar(false)} socioId={socio.id} sugerido={deuda > 0 ? deuda : 80} yape={datos?.pagosCfg}
        onListo={() => { setPagar(false); recargarCuenta(true); recargar() }} />
    </div>
  )
}

function PagarHoja({ abierta, onCerrar, socioId, sugerido, yape, onListo }: {
  abierta: boolean; onCerrar: () => void; socioId: string; sugerido: number; yape?: { yape_numero?: string; yape_titular?: string }; onListo: () => void
}) {
  const { perfil } = useSesion()
  const avisar = useToast()
  const archivo = useRef<HTMLInputElement>(null)
  const [monto, setMonto] = useState(String(sugerido))
  const [operacion, setOperacion] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async () => {
    const m = Number(monto.replace(',', '.'))
    if (!m || m <= 0) { setError('Escribe el monto que yapeaste. Ejemplo: 80'); return }
    if (!foto) { setError('Sube la captura de tu Yape para que administración la valide.'); return }
    setEnviando(true); setError(null)
    try {
      const ext = (foto.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const ruta = `${perfil!.club_id}/${socioId}/${Date.now()}.${ext}`
      const up = await supabase.storage.from('constancias').upload(ruta, foto, { contentType: foto.type || 'image/jpeg', upsert: false })
      if (up.error) throw new Error('No pudimos subir la imagen. Revisa tu conexión e intenta de nuevo.')
      ok(await supabase.from('pagos').insert({ club_id: perfil!.club_id, socio_id: socioId, medio: 'yape', monto: m, operacion: operacion.trim() || null, constancia_path: ruta }))
      avisar('Recibimos tu constancia. Te avisaremos cuando esté validada.')
      setFoto(null); setOperacion('')
      onListo()
    } catch (e) { setError((e as Error).message) } finally { setEnviando(false) }
  }

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Pagar con Yape" subtitulo="1. Yapea al club  ·  2. Sube la captura"
      pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton onClick={enviar} cargando={enviando}>Enviar constancia</Boton></>}>
      <div className="stack" style={{ ['--gap' as string]: '18px' }}>
        <div className="card-2 stack" style={{ alignItems: 'center', ['--gap' as string]: '10px' }}>
          <div style={{ width: 200, background: '#fff', padding: 10, borderRadius: 20 }}>
            <CodigoQR texto="QR DE YAPE DE EJEMPLO · Casino de Pimentel" tam={180} etiqueta="QR de Yape del club (ejemplo)" />
          </div>
          <b>{yape?.yape_titular ?? 'Casino de Pimentel'}</b>
          <span className="muted num">{yape?.yape_numero ?? 'Número de Yape por confirmar'}</span>
          <EjemploTag texto="QR de ejemplo" />
        </div>
        <Campo etiqueta="Monto que yapeaste (S/)" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} className="num" />
        <Campo etiqueta="N° de operación (opcional)" inputMode="numeric" value={operacion} onChange={(e) => setOperacion(e.target.value.replace(/\D/g, ''))} ayuda="Aparece en tu Yape debajo del monto." />
        <div className="field">
          <span className="field-label">Captura de tu Yape</span>
          <input ref={archivo} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { setFoto(e.target.files?.[0] ?? null); setError(null) }} />
          <Boton variante={foto ? 'ok' : 'secondary'} tam="lg" icono={foto ? <FileCheck2 aria-hidden /> : <Camera aria-hidden />} onClick={() => archivo.current?.click()}>
            {foto ? 'Captura lista: cambiar' : 'Elegir la captura'}
          </Boton>
          {foto && <span className="small muted ellipsis">{foto.name}</span>}
        </div>
        {error && <Aviso tono="peligro">{error}</Aviso>}
        <p className="small muted">Tu pago queda "por validar" hasta que administración lo revise. Te llegará un aviso.</p>
      </div>
    </Hoja>
  )
}
