import { useRef, useState } from 'react'
import { EyeOff, Globe, ImagePlus, Megaphone, Pin, Plus } from 'lucide-react'
import { supabase, urlPublica } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { useSesion } from '../../lib/sesion'
import { fechaHora } from '../../lib/formato'
import { AreaTexto, Boton, Campo, EjemploTag, Encabezado, EsqueletoLista, Hoja, Interruptor, Pill, Vacio, useConfirmar, useToast } from '../../ui'

interface Aviso { id: string; titulo: string; texto: string; foto_path: string | null; publicado_en: string; expira_en: string | null; fijado: boolean; publico_web: boolean; eliminado_en: string | null; es_ejemplo: boolean }

export default function Avisos() {
  const { perfil } = useSesion()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const archivo = useRef<HTMLInputElement>(null)
  const { datos, cargando, recargar } = useDatos(async () => ok(await supabase.from('avisos').select('*').is('eliminado_en', null).order('publicado_en', { ascending: false })) as Aviso[], [])
  const [f, setF] = useState<{ titulo: string; texto: string; fijado: boolean; publico_web: boolean; notificar: boolean; expira_en: string; foto: File | null } | null>(null)
  const [publicando, setPublicando] = useState(false)

  const publicar = async () => {
    if (!f || f.titulo.trim().length < 3 || f.texto.trim().length < 5) { avisar('Escribe un título y el texto del aviso.', 'alerta'); return }
    setPublicando(true)
    try {
      let foto_path: string | null = null
      if (f.foto) {
        foto_path = `${perfil!.club_id}/${Date.now()}.${(f.foto.name.split('.').pop() || 'jpg').toLowerCase()}`
        const up = await supabase.storage.from('avisos').upload(foto_path, f.foto, { contentType: f.foto.type })
        if (up.error) throw new Error('No se pudo subir la foto.')
      }
      ok(await supabase.from('avisos').insert({ club_id: perfil!.club_id, titulo: f.titulo.trim(), texto: f.texto.trim(), fijado: f.fijado, publico_web: f.publico_web, notificar: f.notificar, expira_en: f.expira_en ? new Date(f.expira_en + 'T23:59:00-05:00').toISOString() : null, foto_path }))
      avisar(f.notificar ? 'Aviso publicado y enviado a los socios.' : 'Aviso publicado.'); setF(null); recargar(true)
    } catch (e) { avisar((e as Error).message, 'error') } finally { setPublicando(false) }
  }
  const ocultar = async (a: Aviso) => {
    if (!(await confirmar({ titulo: '¿Ocultar este aviso?', texto: 'Dejará de verse en la app y en la web. Queda guardado en el registro.', confirmar: 'Ocultar' }))) return
    await supabase.from('avisos').update({ eliminado_en: new Date().toISOString(), eliminado_motivo: 'Ocultado desde el panel' }).eq('id', a.id); avisar('Aviso ocultado.'); recargar(true)
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Avisos" explicacion="Noticias del club con foto. Llegan como notificación a los socios y, si lo marcas, también salen en la web pública."
        acciones={<Boton icono={<Plus aria-hidden />} onClick={() => setF({ titulo: '', texto: '', fijado: false, publico_web: true, notificar: true, expira_en: '', foto: null })}>Publicar aviso</Boton>} />
      {cargando && !datos ? <EsqueletoLista filas={4} /> : !datos?.length ? <Vacio icono={<Megaphone />} titulo="Aún no hay avisos" texto="Publica el primero: horarios, torneos, asambleas o eventos." /> : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
          {datos.map((a) => (
            <article key={a.id} className="card stack" style={{ ['--gap' as string]: '10px', padding: 0, overflow: 'hidden' }}>
              {a.foto_path && <img src={urlPublica('avisos', a.foto_path) ?? ''} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />}
              <div className="stack" style={{ ['--gap' as string]: '8px', padding: 20 }}>
                <div className="row wrap" style={{ ['--gap' as string]: '6px' }}>
                  {a.fijado && <Pill tono="sol"><Pin aria-hidden />Fijado</Pill>}
                  {a.publico_web ? <Pill tono="info"><Globe aria-hidden />En la web</Pill> : <Pill tono="neutro">Solo socios</Pill>}
                  {a.es_ejemplo && <EjemploTag />}
                </div>
                <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--tinta)' }}>{a.titulo}</h2>
                <p className="clamp-2 muted">{a.texto}</p>
                <span className="small muted">{fechaHora(a.publicado_en)}{a.expira_en ? ` · hasta ${fechaHora(a.expira_en)}` : ''}</span>
                <Boton variante="ghost" tam="sm" icono={<EyeOff aria-hidden />} onClick={() => ocultar(a)} style={{ alignSelf: 'flex-start' }}>Ocultar</Boton>
              </div>
            </article>
          ))}
        </div>
      )}
      <Hoja abierta={Boolean(f)} onCerrar={() => setF(null)} titulo="Publicar aviso" pie={<><Boton variante="outline" onClick={() => setF(null)}>Cancelar</Boton><Boton onClick={publicar} cargando={publicando}>Publicar</Boton></>}>
        {f && (
          <div className="stack">
            <Campo etiqueta="Título" value={f.titulo} maxLength={140} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
            <AreaTexto etiqueta="Texto" value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} rows={6} />
            <input ref={archivo} type="file" accept="image/*" hidden onChange={(e) => setF({ ...f, foto: e.target.files?.[0] ?? null })} />
            <Boton variante="secondary" icono={<ImagePlus aria-hidden />} onClick={() => archivo.current?.click()}>{f.foto ? `Foto: ${f.foto.name}` : 'Agregar foto (opcional)'}</Boton>
            <Interruptor etiqueta="Enviar notificación a los socios" activo={f.notificar} onCambio={(v) => setF({ ...f, notificar: v })} />
            <Interruptor etiqueta="Mostrar en la web pública" activo={f.publico_web} onCambio={(v) => setF({ ...f, publico_web: v })} />
            <Interruptor etiqueta="Fijar arriba" activo={f.fijado} onCambio={(v) => setF({ ...f, fijado: v })} />
            <Campo etiqueta="Visible hasta (opcional)" type="date" value={f.expira_en} onChange={(e) => setF({ ...f, expira_en: e.target.value })} />
          </div>
        )}
      </Hoja>
    </div>
  )
}
