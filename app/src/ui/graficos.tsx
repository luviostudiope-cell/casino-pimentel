import { useId, useState, type ReactNode } from 'react'

/* Gráficos ligeros en SVG/HTML siguiendo el método de dataviz:
 * una serie = un tono (azul Pimentel), marcas finas con extremo redondeado, eje recesivo,
 * tooltip al pasar o al enfocar, etiquetas solo donde suman y tabla accesible. */

export function BarrasVerticales({ datos, formato, alto = 200, etiqueta }: {
  datos: { x: string; y: number; detalle?: string }[]; formato: (n: number) => string; alto?: number; etiqueta: string
}) {
  const id = useId()
  const [activo, setActivo] = useState<number | null>(null)
  const max = Math.max(1, ...datos.map((d) => d.y))
  const iMax = datos.findIndex((d) => d.y === max)
  const ancho = Math.max(320, datos.length * 22)
  const paso = ancho / Math.max(1, datos.length)
  const barra = Math.min(18, paso - 4)
  const h = alto - 28
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: 'relative', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" height={alto} role="img" aria-labelledby={`${id}-t`} style={{ minWidth: Math.min(ancho, 720) }}>
          <title id={`${id}-t`}>{etiqueta}</title>
          {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={0} x2={ancho} y1={h - h * f} y2={h - h * f} stroke="#E3ECF5" strokeWidth={1} />)}
          <line x1={0} x2={ancho} y1={h} y2={h} stroke="#B9CCE0" strokeWidth={1} />
          {datos.map((d, i) => {
            const bh = Math.max(d.y > 0 ? 3 : 0, (d.y / max) * (h - 8))
            const x = i * paso + (paso - barra) / 2
            const on = activo === i
            return (
              <g key={d.x} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} onFocus={() => setActivo(i)} onBlur={() => setActivo(null)} tabIndex={0}
                aria-label={`${d.x}: ${formato(d.y)}`} style={{ outline: 'none' }}>
                <rect x={i * paso} y={0} width={paso} height={h} fill="transparent" />
                <path d={`M${x},${h} V${h - bh + 4} q0,-4 4,-4 h${barra - 8} q4,0 4,4 V${h} Z`} fill={on ? '#2A6BC0' : '#1B4F8F'} opacity={activo === null || on ? 1 : 0.55} style={{ transition: 'opacity 160ms ease' }} />
                {(i === iMax || i === datos.length - 1) && d.y > 0 && !on && (
                  <text x={x + barra / 2} y={h - bh - 6} textAnchor="middle" fontSize={11} fill="#4A5B6E" style={{ fontVariantNumeric: 'tabular-nums' }}>{formato(d.y)}</text>
                )}
                {(datos.length <= 14 || i % Math.ceil(datos.length / 10) === 0) && (
                  <text x={x + barra / 2} y={alto - 8} textAnchor="middle" fontSize={11} fill="#4A5B6E">{d.x}</text>
                )}
              </g>
            )
          })}
        </svg>
        {activo !== null && datos[activo] && (
          <div role="status" style={{ position: 'absolute', top: 4, left: `clamp(8px, ${((activo + 0.5) / datos.length) * 100}% - 70px, calc(100% - 148px))`, width: 140, background: 'var(--tinta)', color: '#fff', borderRadius: 12, padding: '8px 10px', fontSize: 13, pointerEvents: 'none', boxShadow: 'var(--shadow-2)' }}>
            <div style={{ opacity: 0.8 }}>{datos[activo].x}</div>
            <b className="num" style={{ fontSize: 15 }}>{formato(datos[activo].y)}</b>
            {datos[activo].detalle && <div style={{ opacity: 0.8 }}>{datos[activo].detalle}</div>}
          </div>
        )}
      </div>
      <table className="sr-only"><caption>{etiqueta}</caption><tbody>{datos.map((d) => <tr key={d.x}><th>{d.x}</th><td>{formato(d.y)}</td></tr>)}</tbody></table>
    </figure>
  )
}

/** Barras horizontales de una sola serie, con etiqueta directa y valor (ranking, medios de pago). */
export function BarrasHorizontales({ datos, formato, color = 'var(--azul)' }: { datos: { etiqueta: ReactNode; valor: number; nota?: string }[]; formato: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...datos.map((d) => d.valor))
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {datos.map((d, i) => (
        <li key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 34%) 1fr auto', alignItems: 'center', gap: 10 }}>
          <span className="small bold break">{d.etiqueta}</span>
          <span style={{ height: 14, background: '#EEF3F8', borderRadius: 999, overflow: 'hidden' }} aria-hidden>
            <span style={{ display: 'block', height: '100%', width: `${(d.valor / max) * 100}%`, background: color, borderRadius: 999, transformOrigin: 'left', animation: 'crecer 600ms var(--ease-out) both' }} />
          </span>
          <span className="num bold small" style={{ minWidth: 72, textAlign: 'right' }}>{formato(d.valor)}{d.nota && <span className="muted" style={{ display: 'block', fontWeight: 500 }}>{d.nota}</span>}</span>
        </li>
      ))}
    </ul>
  )
}

/** Barra 100 % por estado (al día / por vencer / deuda), siempre con texto en la leyenda. */
export function BarraEstados({ partes }: { partes: { etiqueta: string; valor: number; color: string; icono?: ReactNode }[] }) {
  const total = Math.max(1, partes.reduce((s, p) => s + p.valor, 0))
  return (
    <div className="stack" style={{ ['--gap' as string]: '12px' }}>
      <div style={{ display: 'flex', gap: 2, height: 18, borderRadius: 999, overflow: 'hidden' }} role="img" aria-label={partes.map((p) => `${p.etiqueta}: ${p.valor}`).join(', ')}>
        {partes.filter((p) => p.valor > 0).map((p) => <span key={p.etiqueta} style={{ flex: p.valor, background: p.color, transformOrigin: 'left', animation: 'crecer 600ms var(--ease-out) both' }} />)}
      </div>
      <div className="row wrap" style={{ ['--gap' as string]: '16px' }}>
        {partes.map((p) => (
          <span key={p.etiqueta} className="row small" style={{ ['--gap' as string]: '6px' }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: p.color }} aria-hidden />
            {p.icono}<b className="num">{p.valor}</b> {p.etiqueta} <span className="muted num">({Math.round((p.valor / total) * 100)} %)</span>
          </span>
        ))}
      </div>
    </div>
  )
}
