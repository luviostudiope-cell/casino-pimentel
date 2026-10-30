import { useState } from 'react'
import { ClipboardList, Gift } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos, useEnVivo } from '../../lib/datos'
import { hora, hoyLima, moneda } from '../../lib/formato'
import { AreaTexto, Boton, EjemploTag, EsqueletoLista, Hoja, PillEstado, Vacio, useToast } from '../../ui'
import { useTurno } from './Barra'

interface Comanda {
  id: string; numero: number; mesa: string | null; total: number; total_cortesias: number; estado: 'abierta' | 'cerrada' | 'anulada'; abierta_en: string; cliente_nombre: string | null; es_ejemplo: boolean
  cobros: { medio: string; monto: number }[]
  comanda_items: { cantidad: number; subtotal: number; es_cortesia: boolean; anulado: boolean; productos: { nombre: string } }[]
}
const MEDIO: Record<string, string> = { efectivo: 'Efectivo', yape: 'Yape', tarjeta: 'Tarjeta', cuenta_socio: 'A cuenta' }

export default function Comandas() {
  const { turno } = useTurno()
  const avisar = useToast()
  const [sel, setSel] = useState<Comanda | null>(null)
  const [motivo, setMotivo] = useState('')
  const { datos, cargando, recargar } = useDatos(async () => ok(await supabase.from('comandas')
    .select('id, numero, mesa, total, total_cortesias, estado, abierta_en, cliente_nombre, es_ejemplo, cobros(medio, monto), comanda_items(cantidad, subtotal, es_cortesia, anulado, productos(nombre))')
    .eq('barra_id', turno.barra_id).eq('fecha', hoyLima()).order('numero', { ascending: false })) as unknown as Comanda[], [turno.barra_id])
  useEnVivo(['comandas'], () => recargar(true))

  const anular = async () => {
    if (!sel) return
    try { const r = await rpc<{ ok: boolean; mensaje: string }>('anular_comanda', { p_comanda_id: sel.id, p_motivo: motivo }); avisar(r.mensaje, r.ok ? 'ok' : 'alerta'); setSel(null); setMotivo(''); recargar(true) }
    catch (e) { avisar((e as Error).message, 'error') }
  }
  const total = (datos ?? []).filter((c) => c.estado === 'cerrada').reduce((s, c) => s + Number(c.total), 0)

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 1080, marginInline: 'auto' }}>
      <div className="row wrap between">
        <div>
          <h1 className="page-title">Comandas de hoy</h1>
          <p className="page-lead">{turno.barra}: {datos?.length ?? 0} comandas · {moneda(total)} cobrados.</p>
        </div>
      </div>
      {cargando && !datos ? <EsqueletoLista filas={6} /> : !datos?.length ? (
        <Vacio icono={<ClipboardList />} titulo="Aún no hay comandas hoy" texto="Las ventas que cobres en la pestaña Venta aparecerán aquí con su detalle." />
      ) : (
        <div className="card tabla-wrap" style={{ padding: 8 }}>
          <table className="tabla">
            <thead><tr><th>N°</th><th>Hora</th><th>Mesa</th><th>Cliente</th><th>Pago</th><th className="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {datos.map((c) => (
                <tr key={c.id} onClick={() => setSel(c)} style={{ cursor: 'pointer' }}>
                  <td className="num bold"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setSel(c)} aria-label={`Ver comanda ${c.numero}`}>{c.numero}</button></td>
                  <td className="num">{hora(c.abierta_en)}</td>
                  <td>{c.mesa ? `Mesa ${c.mesa}` : 'Barra'}</td>
                  <td className="break">{c.cliente_nombre ?? 'Externo'}{c.es_ejemplo && <div><EjemploTag texto="Ejemplo" /></div>}</td>
                  <td>{c.cobros.map((x) => MEDIO[x.medio]).join(' + ') || (c.total_cortesias > 0 ? 'Cortesía' : '—')}</td>
                  <td className="num bold">{moneda(c.total)}</td>
                  <td><PillEstado estado={c.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Hoja abierta={Boolean(sel)} onCerrar={() => setSel(null)} titulo={sel ? `Comanda N° ${sel.numero}` : ''} subtitulo={sel ? `${sel.mesa ? `Mesa ${sel.mesa}` : 'Barra'} · ${hora(sel.abierta_en)}` : ''}
        pie={sel?.estado === 'abierta' ? <Boton variante="danger" disabled={motivo.trim().length < 3} onClick={anular}>Anular comanda</Boton> : undefined}>
        {sel && (
          <div className="stack">
            <dl style={{ margin: 0 }}>
              {sel.comanda_items.filter((i) => !i.anulado).map((i, k) => (
                <div key={k} className="kv"><dt>{i.cantidad} × {i.productos.nombre}{i.es_cortesia && <> <Gift size={14} aria-label="cortesía" /></>}</dt><dd>{i.es_cortesia ? 'Cortesía' : moneda(i.subtotal)}</dd></div>
              ))}
              <div className="kv"><dt className="bold">Total</dt><dd>{moneda(sel.total)}</dd></div>
            </dl>
            {sel.estado === 'abierta' && <AreaTexto etiqueta="Motivo de la anulación" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el cliente se fue sin pedir" />}
          </div>
        )}
      </Hoja>
    </div>
  )
}
