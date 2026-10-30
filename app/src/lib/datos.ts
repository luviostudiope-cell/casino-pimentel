import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

/** Carga de datos simple con estado de carga, error y recarga. */
export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fn = useRef(cargar)
  fn.current = cargar
  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    try { setDatos(await fn.current()); setError(null) }
    catch (e) { setError((e as Error).message) }
    finally { setCargando(false) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { recargar() }, deps)
  return { datos, cargando, error, recargar, setDatos }
}

/** Escucha cambios en tablas (Realtime) y llama onCambio con un pequeño retraso. */
export function useEnVivo(tablas: string[], onCambio: () => void, activo = true) {
  const cb = useRef(onCambio)
  cb.current = onCambio
  useEffect(() => {
    if (!activo) return
    let t: number | undefined
    const canal = supabase.channel(`vivo-${tablas.join('-')}-${Math.random().toString(36).slice(2, 7)}`)
    for (const tabla of tablas) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        clearTimeout(t)
        t = window.setTimeout(() => cb.current(), 400)
      })
    }
    canal.subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(canal) }
  }, [tablas.join(','), activo]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Lanza si la respuesta de Supabase trae error */
export function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}
