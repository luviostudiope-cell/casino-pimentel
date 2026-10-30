import { Megaphone, Pin } from 'lucide-react'
import { useDatos } from '../../lib/datos'
import { urlPublica } from '../../lib/supabase'
import { fechaLarga } from '../../lib/formato'
import { Aparece, EjemploTag, EsqueletoLista, Vacio } from '../../ui'
import { avisos } from './datos'

export default function Avisos() {
  const { datos, cargando } = useDatos(() => avisos(40), [])
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <div>
        <h1>Avisos</h1>
        <p className="page-lead">Noticias del club. También te llegan como notificación.</p>
      </div>
      {cargando && !datos ? <EsqueletoLista filas={3} /> : !datos?.length ? (
        <Vacio icono={<Megaphone />} titulo="Aún no hay avisos" texto="Cuando la directiva publique una noticia, la verás aquí." />
      ) : datos.map((a, i) => (
        <Aparece key={a.id} retraso={Math.min(i, 4) * 0.04}>
          <article className="card stack" style={{ ['--gap' as string]: '10px', padding: 0, overflow: 'hidden' }}>
            {a.foto_path && <img src={urlPublica('avisos', a.foto_path) ?? ''} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />}
            <div className="stack" style={{ ['--gap' as string]: '8px', padding: 20 }}>
              <div className="row wrap">
                {a.fijado && <span className="pill pill-sol"><Pin aria-hidden />Fijado</span>}
                <span className="small muted">{fechaLarga(a.publicado_en)}</span>
              </div>
              <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--tinta)' }}>{a.titulo}</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{a.texto}</p>
              {a.es_ejemplo && <EjemploTag />}
            </div>
          </article>
        </Aparece>
      ))}
    </div>
  )
}
