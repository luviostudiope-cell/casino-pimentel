import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && key)

export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'sin-clave', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'casino-pimentel-sesion' },
  realtime: { params: { eventsPerSecond: 5 } },
})

/** Llama una función RPC y lanza un Error con mensaje en español si falla. */
export async function rpc<T = unknown>(nombre: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nombre, args ?? {})
  if (error) throw new Error(traducirError(error.message))
  return data as T
}

/** Ejecuta una Edge Function con la sesión actual. */
export async function funcion<T = unknown>(nombre: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nombre, { body: body ?? {} })
  if (error) {
    let msg = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx) { const j = await ctx.json(); msg = j.error ?? j.mensaje ?? msg }
    } catch { /* sin cuerpo */ }
    throw new Error(traducirError(msg))
  }
  return data as T
}

export function traducirError(m: string): string {
  if (/Invalid login credentials/i.test(m)) return 'El correo o la clave no coinciden. Revísalos e intenta otra vez.'
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No hay conexión con el servidor. Revisa el internet e intenta de nuevo.'
  if (/JWT expired/i.test(m)) return 'Tu sesión venció. Vuelve a ingresar.'
  if (/permission denied|row-level security/i.test(m)) return 'No tienes permiso para hacer esto. Pide ayuda a administración.'
  return m.replace(/^.*?ERROR:\s*/i, '')
}

/** URL firmada (1 hora) para archivos privados de Storage */
export async function urlFirmada(bucket: string, ruta: string | null | undefined, segundos = 3600): Promise<string | null> {
  if (!ruta) return null
  if (/^https?:|^data:|^\//.test(ruta)) return ruta
  const { data } = await supabase.storage.from(bucket).createSignedUrl(ruta, segundos)
  return data?.signedUrl ?? null
}

export function urlPublica(bucket: string, ruta: string | null | undefined): string | null {
  if (!ruta) return null
  if (/^https?:|^data:|^\//.test(ruta)) return ruta
  return supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl
}
