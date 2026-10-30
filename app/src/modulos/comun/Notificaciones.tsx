import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos, useEnVivo } from '../../lib/datos'
import { fechaHora } from '../../lib/formato'
import { Boton, EsqueletoLista, Vacio } from '../../ui'
import { ActivarPush } from './ActivarPush'

interface Notif { id: string; tipo: string; titulo: string; cuerpo: string | null; url: string | null; leida: boolean; importante: boolean; creado_en: string }

/** Centro de notificaciones: lo usan la app del socio y el panel. */
export default function Notificaciones() {
  const navegar = useNavigate()
  const { datos, cargando, recargar } = useDatos(async () => ok(await supabase.from('notificaciones')
    .select('id, tipo, titulo, cuerpo, url, leida, importante, creado_en').order('creado_en', { ascending: false }).limit(80)) as Notif[], [])
  useEnVivo(['notificaciones'], () => recargar(true))
  const noLeidas = (datos ?? []).filter((n) => !n.leida).length

  const abrir = async (n: Notif) => {
    if (!n.leida) await rpc('marcar_notificaciones_leidas', { p_ids: [n.id] }).catch(() => {})
    if (n.url) navegar(n.url.replace(/^\/app/, ''))
    else recargar(true)
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <div className="row between wrap">
        <div>
          <h1>Notificaciones</h1>
          <p className="page-lead">{noLeidas ? `Tienes ${noLeidas} sin leer.` : 'Estás al día.'}</p>
        </div>
        {noLeidas > 0 && <Boton variante="secondary" icono={<CheckCheck aria-hidden />} onClick={async () => { await rpc('marcar_notificaciones_leidas', { p_ids: null }); recargar(true) }}>Marcar todas como leídas</Boton>}
      </div>
      <ActivarPush />
      {cargando && !datos ? <EsqueletoLista filas={4} /> : !datos?.length ? (
        <Vacio icono={<BellOff />} titulo="No tienes notificaciones" texto="Aquí verás avisos del club, pagos validados, reservas y alertas." />
      ) : (
        <div className="card list" style={{ padding: 8 }}>
          {datos.map((n) => (
            <button key={n.id} type="button" className="list-item" onClick={() => abrir(n)} style={{ alignItems: 'flex-start' }}>
              <span className="empty-icono" style={{ width: 44, height: 44, flex: 'none', background: n.importante ? 'var(--peligro-suave)' : 'var(--surface-2)', color: n.importante ? 'var(--peligro-tinta)' : 'var(--azul)' }} aria-hidden><Bell size={20} /></span>
              <span className="li-main">
                <span className="li-title" style={{ display: 'block', fontWeight: n.leida ? 550 : 750 }}>{n.titulo}</span>
                {n.cuerpo && <span className="li-sub" style={{ display: 'block' }}>{n.cuerpo}</span>}
                <span className="xs muted" style={{ display: 'block', marginTop: 4 }}>{fechaHora(n.creado_en)}</span>
              </span>
              {!n.leida && <span className="badge sol" aria-label="Sin leer">Nuevo</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
