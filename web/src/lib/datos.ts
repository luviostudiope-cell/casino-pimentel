// Datos de la web pública. Lee los MISMOS datos que la app (ambientes, horarios, avisos públicos)
// desde Supabase con la función pública web_publica. Si la base aún no está conectada, usa estos
// valores de respaldo para que la web se construya igual.

export const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined
export const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined
export const CLUB_SLUG = 'casino-pimentel'

export const CLUB = {
  nombre: 'Casino de Pimentel',
  direccion: 'Calle Manuel Seoane 725, Cercado, Pimentel, Chiclayo',
  calle: 'Calle Manuel Seoane 725',
  distrito: 'Pimentel',
  provincia: 'Chiclayo',
  region: 'Lambayeque',
  telefono: '074-425244',
  celular: '920 349 713',
  whatsapp: '[número por confirmar]',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Casino+de+Pimentel%2C+Calle+Manuel+Seoane+725%2C+Pimentel%2C+Chiclayo',
}

export interface Ambiente { id: string; nombre: string; descripcion: string | null; capacidad: number | null; solo_temporada_baja: boolean }
export interface AvisoPublico { id: string; titulo: string; texto: string; foto_path: string | null; publicado_en: string; fijado: boolean }
export interface DatosWeb {
  horarios: { club: string; piscina: string; barra: string }
  tenis: { hora_inicio: string; hora_fin: string }
  ambientes: Ambiente[]
  avisos: AvisoPublico[]
  desdeBase: boolean
}

const RESPALDO: DatosWeb = {
  horarios: { club: 'Martes a domingo, 8:00 a 22:00 [por confirmar]', piscina: '9:00 a 18:00 [por confirmar]', barra: '11:00 a 23:00 [por confirmar]' },
  tenis: { hora_inicio: '06:00', hora_fin: '22:00' },
  ambientes: [
    { id: 'salon', nombre: 'Salón principal', descripcion: 'El salón para matrimonios, quinceañeros y eventos grandes.', capacidad: null, solo_temporada_baja: false },
    { id: 'salon-2', nombre: 'Salón principal 1/2', descripcion: 'La mitad del salón principal.', capacidad: null, solo_temporada_baja: false },
    { id: 'salon-3', nombre: 'Salón principal 1/3', descripcion: 'Un tercio del salón principal.', capacidad: null, solo_temporada_baja: false },
    { id: 'parrilla', nombre: 'Rincón parrillero', descripcion: 'Parrilla y mesas al aire libre.', capacidad: null, solo_temporada_baja: false },
    { id: 'parrilla-jardin', nombre: 'Rincón parrillero + jardín', descripcion: 'La parrilla con el jardín para más invitados.', capacidad: null, solo_temporada_baja: false },
    { id: 'piscina', nombre: 'Piscina', descripcion: 'Solo en temporada baja.', capacidad: null, solo_temporada_baja: true },
    { id: 'deck', nombre: 'Deck', descripcion: 'Terraza frente al mar.', capacidad: null, solo_temporada_baja: false },
  ],
  avisos: [],
  desdeBase: false,
}

export async function cargarDatos(): Promise<DatosWeb> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return RESPALDO
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/web_publica`, {
      method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_club_slug: CLUB_SLUG }),
    })
    if (!r.ok) return RESPALDO
    const d = await r.json()
    return { horarios: d.horarios ?? RESPALDO.horarios, tenis: d.tenis ?? RESPALDO.tenis, ambientes: d.ambientes?.length ? d.ambientes : RESPALDO.ambientes, avisos: d.avisos ?? [], desdeBase: true }
  } catch {
    return RESPALDO
  }
}

export const fecha = (iso: string) => new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(iso))
