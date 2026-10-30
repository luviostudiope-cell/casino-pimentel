import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Lock, Wine } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { botellasOnzas, moneda, numero } from '../../lib/formato'
import { Aviso, Boton, Campo, EjemploTag, Esqueleto, Indicador, PillEstado, Tarjeta, useConfirmar, useToast } from '../../ui'
import { useTurno } from './Barra'

type Medios = { efectivo: number; yape: number; tarjeta: number; cuenta_socio: number }
interface Resumen { esperado: Medios; total_ventas: number; total_cortesias: number; n_comandas: number; abiertas: { id: string; numero: number; mesa: string | null; total: number }[]; cortesias: { motivo: string; valor: number; autorizo: string }[]; cierre: CierreHecho | null }
interface CierreHecho { esperado: Medios; contado: Medios; diferencia: Medios; diferencia_total: number; faltante_kardex: number; conteo_id: string | null; total_ventas: number }
interface Licor { id: string; nombre: string; oz_por_botella: number; es_ejemplo: boolean }
const MEDIOS: { k: keyof Medios; etiqueta: string }[] = [{ k: 'efectivo', etiqueta: 'Efectivo' }, { k: 'yape', etiqueta: 'Yape' }, { k: 'tarjeta', etiqueta: 'Tarjeta' }, { k: 'cuenta_socio', etiqueta: 'A cuenta de socios' }]

export default function Cierre() {
  const { turno, cambiar } = useTurno()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const { datos, cargando, recargar } = useDatos(async () => {
    const [r, l] = await Promise.all([
      rpc<Resumen>('resumen_barra_dia', { p_barra_id: turno.barra_id }),
      supabase.from('insumos').select('id, nombre, oz_por_botella, es_ejemplo').eq('unidad', 'botella').eq('activo', true).is('eliminado_en', null).order('orden'),
    ])
    return { resumen: r, licores: ok(l) as Licor[] }
  }, [turno.barra_id])
  const [contado, setContado] = useState<Record<string, string>>({ efectivo: '', yape: '', tarjeta: '' })
  const [conteo, setConteo] = useState<Record<string, { b: string; oz: string }>>({})
  const [nota, setNota] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [resultado, setResultado] = useState<CierreHecho | null>(null)
  const hecho = resultado ?? datos?.resumen.cierre ?? null

  const { datos: difLicor } = useDatos(async () => (hecho?.conteo_id ? ok(await supabase.from('conteo_items').select('diferencia, valor_diferencia, insumos(nombre, oz_por_botella)').eq('conteo_id', hecho.conteo_id).neq('diferencia', 0)) as unknown as
    { diferencia: number; valor_diferencia: number; insumos: { nombre: string; oz_por_botella: number } }[] : []), [hecho?.conteo_id])

  const contados = useMemo(() => Object.values(conteo).filter((c) => c.b !== '' || c.oz !== '').length, [conteo])

  const cerrar = async () => {
    const r = datos!.resumen
    if (r.abiertas.length) { avisar(`Hay ${r.abiertas.length} comanda(s) abierta(s). Cóbralas o anúlalas antes de cerrar.`, 'alerta'); return }
    if (!(await confirmar({ titulo: `¿Cerrar ${turno.barra} por hoy?`, texto: 'Se guarda lo contado y la diferencia contra lo esperado. Después no se puede cambiar.', confirmar: 'Cerrar el día' }))) return
    setCerrando(true)
    try {
      const p_conteo = datos!.licores.filter((l) => conteo[l.id] && (conteo[l.id].b !== '' || conteo[l.id].oz !== ''))
        .map((l) => ({ insumo_id: l.id, contado: Number(conteo[l.id].b || 0) * Number(l.oz_por_botella) + Number(conteo[l.id].oz || 0) }))
      const res = await rpc<CierreHecho & { ok: boolean; mensaje: string; cierre_id: string }>('cerrar_barra', {
        p_barra_id: turno.barra_id, p_contado: { efectivo: Number(contado.efectivo || 0), yape: Number(contado.yape || 0), tarjeta: Number(contado.tarjeta || 0) }, p_conteo, p_nota: nota || null,
      })
      if (!res.ok) { avisar(res.mensaje, 'alerta'); return }
      avisar(res.mensaje, res.diferencia_total < 0 || res.faltante_kardex > 0 ? 'alerta' : 'ok')
      const cierre = ok(await supabase.from('cierres_barra').select('esperado, contado, diferencia, diferencia_total, faltante_kardex, conteo_id, total_ventas').eq('id', res.cierre_id).single()) as CierreHecho
      setResultado(cierre); recargar(true)
    } catch (e) { avisar((e as Error).message, 'error') } finally { setCerrando(false) }
  }

  if (cargando && !datos) return <Esqueleto alto={300} radio={28} />
  const r = datos!.resumen

  if (hecho) {
    const falta = hecho.diferencia_total < 0
    return (
      <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 980, marginInline: 'auto' }}>
        <div className="row wrap between">
          <div>
            <h1 className="page-title">Cierre del día · {turno.barra}</h1>
            <p className="page-lead">Esperado según las ventas registradas contra lo que se contó.</p>
          </div>
          <PillEstado estado={falta || hecho.faltante_kardex > 0 ? 'faltante' : 'cuadrado'} tam="xl" texto={falta ? `Falta ${moneda(-hecho.diferencia_total)}` : hecho.diferencia_total > 0 ? `Sobra ${moneda(hecho.diferencia_total)}` : 'Caja cuadrada'} />
        </div>
        <section className="card tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Medio de pago</th><th className="num">Esperado</th><th className="num">Contado</th><th className="num">Diferencia</th></tr></thead>
            <tbody>
              {MEDIOS.map((m) => {
                const d = Number(hecho.diferencia[m.k] ?? 0)
                return (
                  <tr key={m.k}>
                    <td className="bold">{m.etiqueta}</td>
                    <td className="num">{moneda(hecho.esperado[m.k])}</td>
                    <td className="num">{moneda(hecho.contado[m.k])}</td>
                    <td className="num bold" style={{ color: d < 0 ? 'var(--peligro-tinta)' : d > 0 ? 'var(--alerta-tinta)' : 'var(--ok-tinta)' }}>
                      {d === 0 ? 'Cuadra' : `${d < 0 ? 'Falta' : 'Sobra'} ${moneda(Math.abs(d))}`}
                    </td>
                  </tr>
                )
              })}
              <tr className="grupo"><td>Total vendido</td><td className="num" colSpan={3}>{moneda(hecho.total_ventas)}</td></tr>
            </tbody>
          </table>
        </section>
        {falta && <Aviso tono="peligro" icono={<AlertTriangle aria-hidden />}>Se avisó a la directiva del faltante de caja.</Aviso>}
        <Tarjeta titulo="Conteo de licor" accion={hecho.faltante_kardex > 0 ? <PillEstado estado="faltante" texto={`Faltan ${moneda(hecho.faltante_kardex)}`} /> : undefined}>
          {!hecho.conteo_id ? <p className="muted">No se hizo conteo en este cierre.</p> : !difLicor?.length ? <Aviso tono="ok" icono={<CheckCircle2 aria-hidden />}>El conteo coincide con lo vendido.</Aviso> : (
            <div className="list">
              {difLicor.map((d, i) => {
                const bo = botellasOnzas(Number(d.diferencia), d.insumos.oz_por_botella)
                return (
                  <div key={i} className="list-item">
                    <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{d.insumos.nombre}</span>
                      <span className="li-sub num" style={{ display: 'block' }}>{d.diferencia < 0 ? 'Faltan' : 'Sobran'} {bo.botellas ? `${Math.abs(bo.botellas)} bot. + ` : ''}{Math.abs(bo.onzas)} oz</span></span>
                    <b className="num" style={{ color: d.valor_diferencia < 0 ? 'var(--peligro-tinta)' : 'var(--alerta-tinta)' }}>{moneda(d.valor_diferencia)}</b>
                  </div>
                )
              })}
            </div>
          )}
        </Tarjeta>
        <Boton tam="lg" variante="outline" icono={<Lock aria-hidden />} onClick={async () => { if (await confirmar({ titulo: 'Terminar el turno', texto: 'La tablet pedirá barra y mesero otra vez.', confirmar: 'Terminar turno' })) cambiar() }}>Terminar turno</Boton>
      </div>
    )
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 1080, marginInline: 'auto' }}>
      <div>
        <h1 className="page-title">Cierre del día · {turno.barra}</h1>
        <p className="page-lead">Cuenta el dinero y las botellas. El sistema compara con lo vendido y resalta la diferencia.</p>
      </div>
      <div className="grid-auto" style={{ ['--min' as string]: '200px' }}>
        <Indicador etiqueta="Vendido hoy" valor={r.total_ventas} formato={moneda} destacado />
        <Indicador etiqueta="Comandas" valor={r.n_comandas} />
        <Indicador etiqueta="Cortesías" valor={r.total_cortesias} formato={moneda} nota={`${r.cortesias.length} registradas`} />
      </div>
      {r.abiertas.length > 0 && <Aviso tono="alerta" icono={<AlertTriangle aria-hidden />}>Hay {r.abiertas.length} comanda(s) abierta(s): {r.abiertas.map((a) => `N° ${a.numero}${a.mesa ? ` (mesa ${a.mesa})` : ''}`).join(', ')}. Cóbralas o anúlalas antes de cerrar.</Aviso>}

      <Tarjeta titulo="1. Conteo rápido de licores" tono="arena" accion={<span className="pill pill-arena num">{contados} de {datos!.licores.length}</span>}>
        <p className="muted small" style={{ marginBottom: 12 }}>Escribe las botellas cerradas y las onzas de la botella abierta. Deja en blanco lo que no cuentes hoy.</p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', ['--gap' as string]: '10px' }}>
          {datos!.licores.map((l) => (
            <div key={l.id} className="row" style={{ background: '#fff', borderRadius: 18, padding: '8px 12px', ['--gap' as string]: '8px' }}>
              <Wine aria-hidden color="var(--arena-oscura)" />
              <span className="grow bold small break">{l.nombre}</span>
              <input aria-label={`${l.nombre}: botellas`} className="input num" inputMode="numeric" placeholder="bot." style={{ width: 72, minHeight: 48, textAlign: 'center' }}
                value={conteo[l.id]?.b ?? ''} onChange={(e) => setConteo((c) => ({ ...c, [l.id]: { b: e.target.value.replace(/\D/g, ''), oz: c[l.id]?.oz ?? '' } }))} />
              <input aria-label={`${l.nombre}: onzas sueltas`} className="input num" inputMode="decimal" placeholder="oz" style={{ width: 72, minHeight: 48, textAlign: 'center' }}
                value={conteo[l.id]?.oz ?? ''} onChange={(e) => setConteo((c) => ({ ...c, [l.id]: { b: c[l.id]?.b ?? '', oz: e.target.value.replace(/[^\d.]/g, '') } }))} />
            </div>
          ))}
        </div>
        {datos!.licores.some((l) => l.es_ejemplo) && <EjemploTag />}
      </Tarjeta>

      <Tarjeta titulo="2. Dinero contado">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
          <Campo etiqueta="Efectivo en caja (S/)" inputMode="decimal" className="num" value={contado.efectivo} onChange={(e) => setContado({ ...contado, efectivo: e.target.value.replace(/[^\d.]/g, '') })} ayuda="Sin contar el sencillo inicial." />
          <Campo etiqueta="Yape recibido (S/)" inputMode="decimal" value={contado.yape} onChange={(e) => setContado({ ...contado, yape: e.target.value.replace(/[^\d.]/g, '') })} ayuda="Suma de los Yape del día." />
          <Campo etiqueta="Tarjeta (S/)" inputMode="decimal" value={contado.tarjeta} onChange={(e) => setContado({ ...contado, tarjeta: e.target.value.replace(/[^\d.]/g, '') })} ayuda="Total del cierre del POS." />
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Lo cargado "a cuenta de socios" ({moneda(r.esperado.cuenta_socio)}) no se cuenta: ya está en la cuenta de cada socio.</p>
        <div style={{ marginTop: 12 }}><Campo etiqueta="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: se rompió una botella de pisco" /></div>
      </Tarjeta>
      <Boton tam="xl" variante="primary" icono={<Lock aria-hidden />} cargando={cerrando} onClick={cerrar}>Cerrar el día</Boton>
      <p className="small muted" style={{ textAlign: 'center' }}>Comandas cerradas hoy: {numero(r.n_comandas)}</p>
    </div>
  )
}
