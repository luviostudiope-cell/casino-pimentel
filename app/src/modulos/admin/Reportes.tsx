import { useMemo, useState } from 'react'
import { FileDown } from 'lucide-react'
import { rpc } from '../../lib/supabase'
import { useDatos } from '../../lib/datos'
import { exportarExcel } from '../../lib/excel'
import { diaMes, fechaCorta, hoyLima, moneda, numero } from '../../lib/formato'
import { BarraEstados, BarrasHorizontales, BarrasVerticales, Boton, Chips, EjemploTag, Encabezado, Esqueleto, Indicador, Tarjeta } from '../../ui'

type Periodo = 'dia' | 'semana' | 'mes' | 'temporada'
interface Reporte {
  ventas_por_dia: { fecha: string; total: number; comandas: number }[]; ventas_por_barra: { barra: string; total: number }[]; ventas_por_medio: Record<string, number>
  productos: { producto: string; categoria: string; cantidad: number; monto: number; precio: number; costo_receta: number | null; margen: number | null; margen_pct: number | null; costo_es_ejemplo: boolean }[]
  cortesias: { cantidad: number; valor: number }
  porteria_por_dia: { fecha: string; ingresos: number; invitados: number; cobrado: number }[]
  morosidad: { socios_con_deuda: number; por_vencer: number; al_dia: number; deuda_total: number }
  asistencia: { nombre: string; tipo_contrato: string; dias_trabajados: number; tardanzas: number; faltas: number; horas: number }[]
}
const MEDIO: Record<string, string> = { tarjeta: 'Tarjeta', efectivo: 'Efectivo', yape: 'Yape', cuenta_socio: 'A cuenta de socios' }

function rango(p: Periodo): [string, string] {
  const hoy = hoyLima()
  if (p === 'dia') return [hoy, hoy]
  if (p === 'semana') return [hoyLima(-6), hoy]
  if (p === 'mes') return [hoy.slice(0, 8) + '01', hoy]
  const y = Number(hoy.slice(0, 4)); const m = Number(hoy.slice(5, 7))
  // Temporada alta: diciembre a marzo; baja: abril a noviembre
  return m >= 4 && m <= 11 ? [`${y}-04-01`, hoy] : [`${m === 12 ? y : y - 1}-12-01`, hoy]
}

export default function Reportes() {
  const [p, setP] = useState<Periodo>('mes')
  const [desde, hasta] = useMemo(() => rango(p), [p])
  const { datos: r } = useDatos(() => rpc<Reporte>('reporte_periodo', { p_desde: desde, p_hasta: hasta }), [desde, hasta])
  const ventas = (r?.ventas_por_dia ?? []).reduce((s, d) => s + Number(d.total), 0)
  const ingresos = (r?.porteria_por_dia ?? []).reduce((s, d) => s + Number(d.ingresos), 0)
  const exportar = () => r && exportarExcel(`reporte-${desde}-al-${hasta}`, {
    'Ventas por día': r.ventas_por_dia.map((d) => ({ Fecha: d.fecha, 'Total (S/)': Number(d.total), Comandas: d.comandas })),
    'Productos': r.productos.map((x) => ({ Producto: x.producto, Categoría: x.categoria, Cantidad: Number(x.cantidad), 'Vendido (S/)': Number(x.monto), 'Precio (S/)': Number(x.precio), 'Costo receta (S/)': x.costo_receta, 'Margen (S/)': x.margen, 'Margen %': x.margen_pct, 'Costo de ejemplo': x.costo_es_ejemplo ? 'Sí' : 'No' })),
    'Portería': r.porteria_por_dia.map((d) => ({ Fecha: d.fecha, Ingresos: d.ingresos, Invitados: d.invitados, 'Cobrado (S/)': Number(d.cobrado) })),
    'Asistencia': r.asistencia.map((a) => ({ Trabajador: a.nombre, Contrato: a.tipo_contrato, Días: a.dias_trabajados, Horas: a.horas, Tardanzas: a.tardanzas, Faltas: a.faltas })),
  })
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Reportes" explicacion="Ventas, márgenes por trago, productos más vendidos, portería, morosidad y asistencia por día, semana, mes o temporada."
        acciones={<Boton variante="secondary" icono={<FileDown aria-hidden />} onClick={exportar} disabled={!r}>Exportar a Excel</Boton>} />
      <div className="row wrap between">
        <Chips etiqueta="Período" valor={p} onCambio={setP} opciones={[{ valor: 'dia', etiqueta: 'Hoy' }, { valor: 'semana', etiqueta: '7 días' }, { valor: 'mes', etiqueta: 'Este mes' }, { valor: 'temporada', etiqueta: 'Temporada' }]} />
        <span className="muted">Del {fechaCorta(desde)} al {fechaCorta(hasta)}</span>
      </div>
      {!r ? <Esqueleto alto={420} radio={28} /> : (
        <>
          <div className="grid-auto" style={{ ['--min' as string]: '200px' }}>
            <Indicador etiqueta="Ventas de barra" valor={ventas} formato={moneda} destacado nota={`${numero(r.ventas_por_dia.reduce((s, d) => s + d.comandas, 0))} comandas`} />
            <Indicador etiqueta="Ingresos al club" valor={ingresos} nota={`${numero(r.porteria_por_dia.reduce((s, d) => s + d.invitados, 0))} invitados`} />
            <Indicador etiqueta="Cortesías" valor={Number(r.cortesias.valor)} formato={moneda} nota={`${r.cortesias.cantidad} registradas`} />
            <Indicador etiqueta="Deuda de socios" valor={Number(r.morosidad.deuda_total)} formato={moneda} nota={`${r.morosidad.socios_con_deuda} socios`} />
          </div>
          {r.ventas_por_dia.length > 1 && (
            <Tarjeta titulo="Ventas de barra por día">
              <BarrasVerticales etiqueta="Ventas de barra por día" formato={moneda} datos={r.ventas_por_dia.map((d) => ({ x: diaMes(d.fecha), y: Number(d.total), detalle: `${d.comandas} comandas` }))} />
            </Tarjeta>
          )}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', alignItems: 'start' }}>
            <Tarjeta titulo="Por medio de pago"><BarrasHorizontales formato={moneda} datos={Object.entries(r.ventas_por_medio).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ etiqueta: MEDIO[k] ?? k, valor: Number(v) }))} /></Tarjeta>
            <Tarjeta titulo="Por barra"><BarrasHorizontales formato={moneda} color="var(--arena-oscura)" datos={r.ventas_por_barra.map((b) => ({ etiqueta: b.barra, valor: Number(b.total) }))} /></Tarjeta>
          </div>
          <Tarjeta titulo="Productos más vendidos y margen por trago" accion={r.productos.some((x) => x.costo_es_ejemplo) ? <EjemploTag texto="Costos y recetas de ejemplo" /> : undefined}>
            <div className="tabla-wrap">
              <table className="tabla">
                <thead><tr><th>Producto</th><th className="num">Cantidad</th><th className="num">Vendido</th><th className="num">Costo receta</th><th className="num">Margen por unidad</th></tr></thead>
                <tbody>{r.productos.slice(0, 20).map((x) => (
                  <tr key={x.producto}><td><b>{x.producto}</b><div className="xs muted">{x.categoria}</div></td><td className="num">{numero(x.cantidad)}</td><td className="num bold">{moneda(x.monto)}</td>
                    <td className="num">{x.costo_receta != null ? moneda(x.costo_receta) : '—'}</td><td className="num">{x.margen != null ? `${moneda(x.margen)} (${x.margen_pct} %)` : '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </Tarjeta>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', alignItems: 'start' }}>
            <Tarjeta titulo="Morosidad hoy">
              <BarraEstados partes={[{ etiqueta: 'al día', valor: r.morosidad.al_dia, color: 'var(--ok)' }, { etiqueta: 'por vencer', valor: r.morosidad.por_vencer, color: 'var(--alerta)' }, { etiqueta: 'con deuda', valor: r.morosidad.socios_con_deuda, color: 'var(--peligro)' }]} />
            </Tarjeta>
            <Tarjeta titulo="Ingresos a portería por día">
              {r.porteria_por_dia.length > 1 ? <BarrasVerticales etiqueta="Ingresos por día" alto={170} formato={(n) => `${n} personas`} datos={r.porteria_por_dia.map((d) => ({ x: diaMes(d.fecha), y: d.ingresos, detalle: `${d.invitados} invitados · ${moneda(d.cobrado)}` }))} />
                : <p className="muted">{ingresos} ingresos en el período.</p>}
            </Tarjeta>
          </div>
          <Tarjeta titulo="Asistencia del personal">
            <div className="tabla-wrap"><table className="tabla"><thead><tr><th>Trabajador</th><th>Contrato</th><th className="num">Días</th><th className="num">Horas</th><th className="num">Tardanzas</th><th className="num">Faltas</th></tr></thead>
              <tbody>{r.asistencia.map((a) => <tr key={a.nombre}><td>{a.nombre}</td><td>{a.tipo_contrato}</td><td className="num">{a.dias_trabajados}</td><td className="num">{a.horas}</td><td className="num">{a.tardanzas}</td><td className="num" style={{ color: a.faltas ? 'var(--peligro-tinta)' : undefined }}>{a.faltas}</td></tr>)}</tbody></table></div>
          </Tarjeta>
        </>
      )}
    </div>
  )
}
