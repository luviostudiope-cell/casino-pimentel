import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileDown, Gift, Lock, PackagePlus, Plus, Save, Sparkles } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { useSesion } from '../../lib/sesion'
import { puedeConfigurar } from '../../lib/roles'
import { exportarExcel } from '../../lib/excel'
import { botellasOnzas, fechaCorta, hoyLima, moneda, monedaCorta, numero } from '../../lib/formato'
import { Aviso, Boton, Campo, Chips, EjemploTag, Encabezado, EsqueletoLista, Hoja, Interruptor, PillEstado, Pestanas, Selector, Tarjeta, Vacio, useToast } from '../../ui'

type Tab = 'carta' | 'insumos' | 'compras' | 'kardex' | 'cierres' | 'cortesias'
const TABS: { valor: Tab; etiqueta: string }[] = [
  { valor: 'kardex', etiqueta: 'Kardex' }, { valor: 'cierres', etiqueta: 'Cierres' }, { valor: 'carta', etiqueta: 'Carta' },
  { valor: 'insumos', etiqueta: 'Insumos y recetas' }, { valor: 'compras', etiqueta: 'Compras' }, { valor: 'cortesias', etiqueta: 'Cortesías' },
]

export default function BarraAdmin() {
  const loc = useLocation()
  const navegar = useNavigate()
  const tab = (loc.pathname.split('/')[3] as Tab) || 'kardex'
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Barra El Astillero" explicacion="La carta, el inventario en botellas y onzas, las compras y el cierre diario de cada barra." />
      <Pestanas etiqueta="Secciones de la barra" valor={tab} onCambio={(v) => navegar(`/admin/barra/${v}`)} opciones={TABS} />
      {tab === 'carta' && <Carta />}
      {tab === 'insumos' && <Insumos />}
      {tab === 'compras' && <Compras />}
      {tab === 'kardex' && <Kardex />}
      {tab === 'cierres' && <Cierres />}
      {tab === 'cortesias' && <Cortesias />}
    </div>
  )
}

function useBarras() {
  return useDatos(async () => ok(await supabase.from('barras').select('id, nombre').order('orden')) as { id: string; nombre: string }[], [])
}

/* ------------------------------ Carta ------------------------------ */
function Carta() {
  const { perfil } = useSesion()
  const avisar = useToast()
  const { datos, recargar } = useDatos(async () => {
    const [c, p, cfg] = await Promise.all([
      supabase.from('categorias').select('id, nombre').order('orden'),
      supabase.from('productos').select('id, nombre, subgrupo, precio, precio_evento, por_confirmar, nota_precio, activo, categoria_id, es_ejemplo').is('eliminado_en', null).order('orden'),
      supabase.from('config').select('reglas').single(),
    ])
    return { categorias: ok(c) as { id: string; nombre: string }[], productos: ok(p) as { id: string; nombre: string; subgrupo: string | null; precio: number; precio_evento: number | null; por_confirmar: boolean; nota_precio: string | null; activo: boolean; categoria_id: string; es_ejemplo: boolean }[], reglas: (ok(cfg) as { reglas: Record<string, unknown> }).reglas }
  }, [])
  const [editar, setEditar] = useState<Record<string, { precio?: string; precio_evento?: string }>>({})
  const evento = Boolean((datos?.reglas?.barra as { modo_evento?: boolean } | undefined)?.modo_evento)
  const guardar = async (id: string) => {
    const e = editar[id]
    try {
      ok(await supabase.from('productos').update({ ...(e.precio !== undefined ? { precio: Number(e.precio), por_confirmar: false } : {}), ...(e.precio_evento !== undefined ? { precio_evento: e.precio_evento === '' ? null : Number(e.precio_evento) } : {}) }).eq('id', id))
      avisar('Precio guardado. La barra lo ve al instante.'); setEditar((x) => { const y = { ...x }; delete y[id]; return y }); recargar(true)
    } catch (er) { avisar((er as Error).message, 'error') }
  }
  const modoEvento = async (v: boolean) => {
    try {
      const reglas = { ...datos!.reglas, barra: { ...(datos!.reglas.barra as object), modo_evento: v } }
      ok(await supabase.from('config').update({ reglas }).eq('club_id', perfil!.club_id).select('club_id').single())
      avisar(v ? 'Modo evento activado: la barra cobra precios de evento.' : 'Modo evento desactivado.', v ? 'alerta' : 'ok'); recargar(true)
    } catch { avisar('Solo administración puede cambiar el modo evento.', 'error') }
  }
  if (!datos) return <EsqueletoLista filas={8} />
  return (
    <div className="stack">
      <Tarjeta tono="arena">
        <Interruptor etiqueta="Modo evento" descripcion={puedeConfigurar(perfil?.rol) ? 'Usa el precio de evento en los productos que lo tengan.' : 'Solo administración puede activarlo.'} activo={evento} onCambio={modoEvento} />
      </Tarjeta>
      {datos.productos.some((p) => p.por_confirmar) && <Aviso tono="alerta" icono={<Sparkles aria-hidden />}>Hay precios por confirmar: la carta impresa y la lista interna no coinciden. Al guardar un precio, deja de estar "por confirmar".</Aviso>}
      {datos.categorias.map((c) => (
        <Tarjeta key={c.id} titulo={c.nombre}>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Producto</th><th className="num">Precio normal</th><th className="num">Precio de evento</th><th><span className="sr-only">Guardar</span></th></tr></thead>
              <tbody>
                {datos.productos.filter((p) => p.categoria_id === c.id).map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.nombre}</b>{p.subgrupo && <span className="muted small"> · {p.subgrupo}</span>}{p.por_confirmar && <div><PillEstado estado="pendiente" texto="Precio por confirmar" /> <span className="xs muted">{p.nota_precio}</span></div>}</td>
                    <td className="num"><input className="input num" style={{ width: 110, minHeight: 44, textAlign: 'right' }} inputMode="decimal" aria-label={`Precio de ${p.nombre}`}
                      value={editar[p.id]?.precio ?? String(p.precio)} onChange={(e) => setEditar({ ...editar, [p.id]: { ...editar[p.id], precio: e.target.value.replace(/[^\d.]/g, '') } })} /></td>
                    <td className="num"><input className="input num" style={{ width: 110, minHeight: 44, textAlign: 'right' }} inputMode="decimal" placeholder="—" aria-label={`Precio de evento de ${p.nombre}`}
                      value={editar[p.id]?.precio_evento ?? (p.precio_evento != null ? String(p.precio_evento) : '')} onChange={(e) => setEditar({ ...editar, [p.id]: { ...editar[p.id], precio_evento: e.target.value.replace(/[^\d.]/g, '') } })} /></td>
                    <td>{editar[p.id] && <Boton tam="sm" icono={<Save aria-hidden />} onClick={() => guardar(p.id)}>Guardar</Boton>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      ))}
    </div>
  )
}

/* ------------------------------ Insumos y recetas ------------------------------ */
function Insumos() {
  const avisar = useToast()
  const { perfil } = useSesion()
  const { datos, recargar } = useDatos(async () => {
    const [i, p, r] = await Promise.all([
      supabase.from('insumos').select('id, nombre, grupo, unidad, oz_por_botella, costo, costo_es_ejemplo, stock_minimo').is('eliminado_en', null).order('orden'),
      supabase.from('productos').select('id, nombre').is('eliminado_en', null).order('nombre'),
      supabase.from('recetas').select('id, producto_id, insumo_id, cantidad, es_ejemplo'),
    ])
    return { insumos: ok(i) as { id: string; nombre: string; grupo: string; unidad: string; oz_por_botella: number | null; costo: number | null; costo_es_ejemplo: boolean; stock_minimo: number }[], productos: ok(p) as { id: string; nombre: string }[], recetas: ok(r) as { id: string; producto_id: string; insumo_id: string; cantidad: number; es_ejemplo: boolean }[] }
  }, [])
  const [prod, setProd] = useState('')
  const [costos, setCostos] = useState<Record<string, string>>({})
  const [nueva, setNueva] = useState({ insumo: '', cantidad: '' })
  if (!datos) return <EsqueletoLista filas={8} />
  const grupos = [...new Set(datos.insumos.map((i) => i.grupo))]
  const nombre = (id: string) => datos.insumos.find((i) => i.id === id)
  const receta = datos.recetas.filter((r) => r.producto_id === prod)
  const unidadControl = (u: string) => (u === 'botella' ? 'oz' : u === 'unidad' ? 'und.' : u)
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', alignItems: 'start' }}>
      <Tarjeta titulo="Insumos (lista del club)" accion={<span className="pill pill-alerta">Costos de ejemplo</span>}>
        <p className="small muted" style={{ marginBottom: 10 }}>Cargados tal cual la lista de insumos de barras, con su unidad. Los licores se controlan en onzas.</p>
        {grupos.map((g) => (
          <details key={g} style={{ marginBottom: 8 }} open={g === grupos[0]}>
            <summary className="bold" style={{ minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>{g} ({datos.insumos.filter((i) => i.grupo === g).length})</summary>
            <div className="list">
              {datos.insumos.filter((i) => i.grupo === g).map((i) => (
                <div key={i.id} className="list-item" style={{ minHeight: 56 }}>
                  <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{i.nombre}</span><span className="li-sub" style={{ display: 'block' }}>{i.unidad}{i.oz_por_botella ? ` · ${i.oz_por_botella} oz` : ''}</span></span>
                  <input className="input num" inputMode="decimal" aria-label={`Costo de ${i.nombre}`} style={{ width: 96, minHeight: 44, textAlign: 'right' }} value={costos[i.id] ?? (i.costo != null ? String(i.costo) : '')}
                    onChange={(e) => setCostos({ ...costos, [i.id]: e.target.value.replace(/[^\d.]/g, '') })}
                    onBlur={async () => { if (costos[i.id] === undefined) return; await supabase.from('insumos').update({ costo: Number(costos[i.id]), costo_es_ejemplo: false }).eq('id', i.id); avisar(`Costo de ${i.nombre} guardado.`); recargar(true) }} />
                  {i.costo_es_ejemplo && <EjemploTag texto="Ej." />}
                </div>
              ))}
            </div>
          </details>
        ))}
      </Tarjeta>
      <Tarjeta titulo="Recetas" accion={<span className="pill pill-alerta">De ejemplo</span>}>
        <div className="stack">
          <Selector etiqueta="Producto de la carta" value={prod} onChange={(e) => setProd(e.target.value)}>
            <option value="">Elige un producto…</option>
            {datos.productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Selector>
          {prod && (
            <>
              {!receta.length ? <p className="muted">Sin receta: al venderlo no descuenta stock.</p> : (<>
                <div className="list">
                  {receta.map((r) => { const i = nombre(r.insumo_id); return (
                    <div key={r.id} className="list-item" style={{ minHeight: 56 }}>
                      <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{i?.nombre}</span></span>
                      <b className="num">{numero(r.cantidad, true)} {unidadControl(i?.unidad ?? '')}</b>
                    </div>
                  ) })}
                </div>
                <p className="small muted">Para cambiar una cantidad, elige el mismo insumo abajo y guarda la nueva cantidad.</p></>
              )}
              <div className="row wrap" style={{ alignItems: 'flex-end' }}>
                <Selector etiqueta="Insumo" value={nueva.insumo} onChange={(e) => setNueva({ ...nueva, insumo: e.target.value })} className="grow">
                  <option value="">Elige…</option>{datos.insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </Selector>
                <Campo etiqueta={`Cantidad (${unidadControl(nombre(nueva.insumo)?.unidad ?? 'oz')})`} inputMode="decimal" value={nueva.cantidad} onChange={(e) => setNueva({ ...nueva, cantidad: e.target.value.replace(/[^\d.]/g, '') })} style={{ width: 120 }} />
                <Boton icono={<Plus aria-hidden />} disabled={!nueva.insumo || !Number(nueva.cantidad)} onClick={async () => {
                  const ex = receta.find((r) => r.insumo_id === nueva.insumo)
                  const q = ex ? supabase.from('recetas').update({ cantidad: Number(nueva.cantidad), es_ejemplo: false }).eq('id', ex.id) : supabase.from('recetas').insert({ club_id: perfil!.club_id, producto_id: prod, insumo_id: nueva.insumo, cantidad: Number(nueva.cantidad), es_ejemplo: false })
                  const { error } = await q; if (error) avisar(error.message, 'error'); else { avisar('Receta guardada.'); setNueva({ insumo: '', cantidad: '' }); recargar(true) }
                }}>Guardar</Boton>
              </div>
            </>
          )}
        </div>
      </Tarjeta>
    </div>
  )
}

/* ------------------------------ Compras ------------------------------ */
function Compras() {
  const { perfil } = useSesion()
  const avisar = useToast()
  const { datos: barras } = useBarras()
  const { datos, recargar } = useDatos(async () => {
    const [c, p, i] = await Promise.all([
      supabase.from('compras').select('id, fecha, comprobante, total, es_ejemplo, proveedores(nombre), barras(nombre), compra_items(cantidad, costo_unitario, insumos(nombre))').is('eliminado_en', null).order('fecha', { ascending: false }).limit(60),
      supabase.from('proveedores').select('id, nombre').order('nombre'),
      supabase.from('insumos').select('id, nombre, unidad, costo').is('eliminado_en', null).order('nombre'),
    ])
    return { compras: ok(c) as unknown as { id: string; fecha: string; comprobante: string | null; total: number; es_ejemplo: boolean; proveedores: { nombre: string }; barras: { nombre: string }; compra_items: { cantidad: number; costo_unitario: number; insumos: { nombre: string } }[] }[], proveedores: ok(p) as { id: string; nombre: string }[], insumos: ok(i) as { id: string; nombre: string; unidad: string; costo: number | null }[] }
  }, [])
  const [abierta, setAbierta] = useState(false)
  const [f, setF] = useState({ proveedor: '', barra: '', fecha: hoyLima(), comprobante: '' })
  const [items, setItems] = useState<{ insumo: string; cantidad: string; costo: string }[]>([{ insumo: '', cantidad: '', costo: '' }])
  const total = items.reduce((s, i) => s + Number(i.cantidad || 0) * Number(i.costo || 0), 0)
  const guardar = async () => {
    const validos = items.filter((i) => i.insumo && Number(i.cantidad) > 0)
    if (!f.proveedor || !f.barra || !validos.length) { avisar('Elige proveedor, barra y al menos un insumo.', 'alerta'); return }
    try {
      const c = ok(await supabase.from('compras').insert({ club_id: perfil!.club_id, proveedor_id: f.proveedor, barra_id: f.barra, fecha: f.fecha, comprobante: f.comprobante || null }).select('id').single()) as { id: string }
      ok(await supabase.from('compra_items').insert(validos.map((i) => ({ club_id: perfil!.club_id, compra_id: c.id, insumo_id: i.insumo, cantidad: Number(i.cantidad), costo_unitario: Number(i.costo || 0) }))))
      avisar(`Compra registrada por ${moneda(total)}. El stock ya subió en el kardex.`); setAbierta(false); setItems([{ insumo: '', cantidad: '', costo: '' }]); recargar(true)
    } catch (e) { avisar((e as Error).message, 'error') }
  }
  return (
    <div className="stack">
      <div className="row between wrap"><p className="muted">Se compra una vez al mes (dos en temporada alta). Cada compra suma al kardex de la barra que la recibe.</p><Boton icono={<PackagePlus aria-hidden />} onClick={() => setAbierta(true)}>Registrar compra</Boton></div>
      {!datos ? <EsqueletoLista filas={5} /> : !datos.compras.length ? <Vacio icono={<PackagePlus />} titulo="Sin compras registradas" texto="Registra la compra del mes con su comprobante." /> : (
        <div className="card tabla-wrap" style={{ padding: 8 }}>
          <table className="tabla">
            <thead><tr><th>Fecha</th><th>Proveedor</th><th>Barra</th><th>Comprobante</th><th>Detalle</th><th className="num">Total</th></tr></thead>
            <tbody>{datos.compras.map((c) => (
              <tr key={c.id}><td className="num">{fechaCorta(c.fecha)}</td><td className="bold">{c.proveedores.nombre}{c.es_ejemplo && <div><EjemploTag texto="Ejemplo" /></div>}</td><td>{c.barras.nombre}</td><td className="num">{c.comprobante ?? '—'}</td>
                <td className="small">{c.compra_items.map((i) => `${numero(i.cantidad)} ${i.insumos.nombre}`).join(', ')}</td><td className="num bold">{moneda(c.total)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Registrar compra" subtitulo="Cantidades en la unidad de compra (botellas, unidades, kilos)."
        pie={<><Boton variante="outline" onClick={() => setAbierta(false)}>Cancelar</Boton><Boton onClick={guardar}>Guardar compra · {moneda(total)}</Boton></>}>
        <div className="stack">
          <Selector etiqueta="Proveedor" value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })}><option value="">Elige…</option>{datos?.proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Selector>
          <Selector etiqueta="Llega a" value={f.barra} onChange={(e) => setF({ ...f, barra: e.target.value })}><option value="">Elige la barra…</option>{barras?.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</Selector>
          <div className="row"><Campo etiqueta="Fecha" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className="grow" /><Campo etiqueta="Comprobante" value={f.comprobante} onChange={(e) => setF({ ...f, comprobante: e.target.value })} className="grow" /></div>
          {items.map((it, k) => (
            <div key={k} className="card-2 stack" style={{ ['--gap' as string]: '8px', padding: 14 }}>
              <Selector etiqueta={`Insumo ${k + 1}`} value={it.insumo} onChange={(e) => { const ins = datos?.insumos.find((x) => x.id === e.target.value); setItems(items.map((x, j) => (j === k ? { ...x, insumo: e.target.value, costo: x.costo || String(ins?.costo ?? '') } : x))) }}>
                <option value="">Elige…</option>{datos?.insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
              </Selector>
              <div className="row"><Campo etiqueta="Cantidad" inputMode="decimal" value={it.cantidad} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, cantidad: e.target.value } : x)))} className="grow" />
                <Campo etiqueta="Costo unitario (S/)" inputMode="decimal" value={it.costo} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, costo: e.target.value } : x)))} className="grow" /></div>
            </div>
          ))}
          <Boton variante="ghost" icono={<Plus aria-hidden />} onClick={() => setItems([...items, { insumo: '', cantidad: '', costo: '' }])}>Otro insumo</Boton>
        </div>
      </Hoja>
    </div>
  )
}

/* ------------------------------ Kardex ------------------------------ */
interface FilaKardex { insumo_id: string; nombre: string; grupo: string; unidad: string; oz_por_botella: number | null; costo: number | null; costo_es_ejemplo: boolean; stock_minimo: number; inicio: number; ingresos: number; ventas: number; cortesias: number; ajustes: number; saldo: number; ultimo_conteo: string | null; contado: number | null; diferencia: number | null; valor_diferencia: number | null; venta_soles: number }

function Kardex() {
  const { datos: barras } = useBarras()
  const [barra, setBarra] = useState<string>('todas')
  const [desde, setDesde] = useState(hoyLima().slice(0, 8) + '01')
  const [hasta, setHasta] = useState(hoyLima())
  const [grupo, setGrupo] = useState('Licores por botella')
  const { datos, cargando } = useDatos(() => rpc<FilaKardex[]>('kardex', { p_barra_id: barra === 'todas' ? null : barra, p_desde: desde, p_hasta: hasta }), [barra, desde, hasta])
  const grupos = useMemo(() => [...new Set((datos ?? []).map((k) => k.grupo))], [datos])
  const filas = (datos ?? []).filter((k) => grupo === 'todos' || k.grupo === grupo)
  const fmt = (oz: number, k: FilaKardex) => {
    if (k.unidad !== 'botella') return `${numero(oz, true)} ${k.unidad === 'unidad' ? 'und.' : k.unidad}`
    const b = botellasOnzas(oz, k.oz_por_botella)
    return `${b.botellas} bot. ${Math.abs(b.onzas) > 0 ? `+ ${Math.abs(b.onzas)} oz` : ''}`
  }
  const faltante = filas.reduce((s, k) => s + Math.min(0, Number(k.valor_diferencia ?? 0)), 0)
  return (
    <div className="stack">
      <p className="muted">Inicio + compras − ventas − cortesías ± ajustes = saldo teórico. El conteo físico al cierre muestra la diferencia en botellas y onzas.</p>
      <div className="row wrap" style={{ alignItems: 'flex-end' }}>
        <Chips etiqueta="Barra" valor={barra} onCambio={setBarra} opciones={[{ valor: 'todas', etiqueta: 'Ambas barras' }, ...(barras ?? []).map((b) => ({ valor: b.id, etiqueta: b.nombre }))]} />
        <Campo etiqueta="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 170 }} />
        <Campo etiqueta="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 170 }} />
        <Boton variante="ghost" icono={<FileDown aria-hidden />} onClick={() => exportarExcel(`kardex-${desde}-al-${hasta}`, { Kardex: filas.map((k) => ({ Insumo: k.nombre, Grupo: k.grupo, Unidad: k.unidad, Inicio: fmt(k.inicio, k), Compras: fmt(k.ingresos, k), Ventas: fmt(k.ventas, k), Cortesías: fmt(k.cortesias, k), Ajustes: fmt(k.ajustes, k), 'Saldo teórico': fmt(k.saldo, k), 'Último conteo': k.ultimo_conteo ?? '', Diferencia: k.diferencia != null ? fmt(k.diferencia, k) : '', 'Valor diferencia (S/)': Number(k.valor_diferencia ?? 0), 'Venta (S/)': Number(k.venta_soles) })) })}>Exportar</Boton>
      </div>
      <Chips etiqueta="Grupo de insumos" scroll valor={grupo} onCambio={setGrupo} opciones={[...grupos.map((g) => ({ valor: g, etiqueta: g })), { valor: 'todos', etiqueta: 'Todos' }]} />
      {faltante < 0 && <Aviso tono="peligro">El último conteo del período muestra un faltante valorizado en <b className="num">{moneda(-faltante)}</b> (a costo de ejemplo).</Aviso>}
      {cargando && !datos ? <EsqueletoLista filas={8} /> : (
        <div className="card tabla-wrap" style={{ padding: 8 }}>
          <table className="tabla" style={{ minWidth: 980 }}>
            <thead><tr><th>Insumo</th><th className="num">Inicio</th><th className="num">Compras</th><th className="num">Ventas</th><th className="num">Cortesías</th><th className="num">Ajustes</th><th className="num">Saldo teórico</th><th className="num">Conteo</th><th className="num">Diferencia</th></tr></thead>
            <tbody>{filas.map((k) => {
              const bajo = k.stock_minimo > 0 && k.saldo < (k.unidad === 'botella' ? k.stock_minimo * Number(k.oz_por_botella) : k.stock_minimo)
              return (
                <tr key={k.insumo_id}>
                  <td><b className="break">{k.nombre}</b>{bajo && <div><PillEstado estado="por_vencer" texto="Stock bajo" /></div>}</td>
                  <td className="num">{fmt(k.inicio, k)}</td><td className="num">{fmt(k.ingresos, k)}</td><td className="num">{fmt(k.ventas, k)}</td><td className="num">{fmt(k.cortesias, k)}</td>
                  <td className="num">{k.ajustes ? fmt(k.ajustes, k) : '—'}</td><td className="num bold">{fmt(k.saldo, k)}</td>
                  <td className="num">{k.contado != null ? <>{fmt(k.contado, k)}<div className="xs muted">{fechaCorta(k.ultimo_conteo!)}</div></> : '—'}</td>
                  <td className="num bold" style={{ color: Number(k.diferencia) < 0 ? 'var(--peligro-tinta)' : Number(k.diferencia) > 0 ? 'var(--alerta-tinta)' : undefined }}>
                    {k.diferencia != null && Number(k.diferencia) !== 0 ? <>{Number(k.diferencia) < 0 ? 'Falta ' : 'Sobra '}{fmt(Math.abs(Number(k.diferencia)), k)}<div className="xs">{moneda(k.valor_diferencia)}</div></> : k.diferencia != null ? 'Cuadra' : '—'}
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Cierres ------------------------------ */
function Cierres() {
  const { datos } = useDatos(async () => ok(await supabase.from('cierres_barra').select('id, fecha, esperado, contado, diferencia_total, total_ventas, total_cortesias, n_comandas, faltante_kardex, nota, es_ejemplo, barras(nombre)').order('fecha', { ascending: false }).order('barra_id').limit(90)) as unknown as
    { id: string; fecha: string; esperado: Record<string, number>; contado: Record<string, number>; diferencia_total: number; total_ventas: number; total_cortesias: number; n_comandas: number; faltante_kardex: number; nota: string | null; es_ejemplo: boolean; barras: { nombre: string } }[], [])
  if (!datos) return <EsqueletoLista filas={8} />
  if (!datos.length) return <Vacio icono={<Lock />} titulo="Aún no hay cierres" texto="Cada noche la barra cierra el día desde su tablet y aparece aquí." />
  return (
    <div className="card tabla-wrap" style={{ padding: 8 }}>
      <table className="tabla" style={{ minWidth: 860 }}>
        <thead><tr><th>Fecha</th><th>Barra</th><th className="num">Vendido</th><th className="num">Efectivo esp./contado</th><th className="num">Tarjeta</th><th className="num">Yape</th><th className="num">Diferencia caja</th><th className="num">Faltante licor</th></tr></thead>
        <tbody>{datos.map((c) => (
          <tr key={c.id}>
            <td className="num">{fechaCorta(c.fecha)}</td><td>{c.barras.nombre}{c.es_ejemplo && <div><EjemploTag texto="Ejemplo" /></div>}</td>
            <td className="num bold">{moneda(c.total_ventas)}<div className="xs muted">{c.n_comandas} comandas</div></td>
            <td className="num">{monedaCorta(c.esperado.efectivo)} / {monedaCorta(c.contado.efectivo)}</td><td className="num">{monedaCorta(c.contado.tarjeta)}</td><td className="num">{monedaCorta(c.contado.yape)}</td>
            <td className="num">{Number(c.diferencia_total) === 0 ? <PillEstado estado="cuadrado" /> : <PillEstado estado={c.diferencia_total < 0 ? 'faltante' : 'sobrante'} texto={moneda(c.diferencia_total)} />}</td>
            <td className="num">{c.faltante_kardex > 0 ? <PillEstado estado="faltante" texto={moneda(c.faltante_kardex)} /> : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

/* ------------------------------ Cortesías ------------------------------ */
function Cortesias() {
  const { datos } = useDatos(async () => ok(await supabase.from('cortesias').select('id, fecha, motivo, valor, es_ejemplo, personal(nombres, apellidos), barras(nombre), comandas(numero, mesa)').order('fecha', { ascending: false }).limit(150)) as unknown as
    { id: string; fecha: string; motivo: string; valor: number; es_ejemplo: boolean; personal: { nombres: string; apellidos: string }; barras: { nombre: string }; comandas: { numero: number; mesa: string | null } }[], [])
  if (!datos) return <EsqueletoLista filas={6} />
  if (!datos.length) return <Vacio icono={<Gift />} titulo="Sin cortesías" texto="Cada cortesía queda aquí con su motivo y quién la autorizó." />
  const total = datos.reduce((s, c) => s + Number(c.valor), 0)
  return (
    <div className="stack">
      <p className="muted">{datos.length} cortesías · {moneda(total)} a precio de carta.</p>
      <div className="card tabla-wrap" style={{ padding: 8 }}>
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Barra</th><th>Motivo</th><th>Autorizó</th><th>Comanda</th><th className="num">Valor</th></tr></thead>
          <tbody>{datos.map((c) => <tr key={c.id}><td className="num">{fechaCorta(c.fecha)}</td><td>{c.barras.nombre}</td><td>{c.motivo}{c.es_ejemplo && <div><EjemploTag texto="Ejemplo" /></div>}</td><td>{c.personal.nombres} {c.personal.apellidos}</td><td className="num">N° {c.comandas.numero}</td><td className="num">{moneda(c.valor)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
