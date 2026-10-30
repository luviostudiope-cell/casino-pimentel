/** Exporta filas a un archivo de Excel (.xlsx). La librería se carga solo cuando se usa. */
export async function exportarExcel(nombreArchivo: string, hojas: Record<string, Record<string, unknown>[]>) {
  const XLSX = await import('xlsx')
  const libro = XLSX.utils.book_new()
  for (const [nombre, filas] of Object.entries(hojas)) {
    const hoja = XLSX.utils.json_to_sheet(filas)
    const cols = Object.keys(filas[0] ?? {}).map((k) => ({ wch: Math.min(48, Math.max(k.length, ...filas.slice(0, 200).map((f) => String(f[k] ?? '').length)) + 2) }))
    hoja['!cols'] = cols
    XLSX.utils.book_append_sheet(libro, hoja, nombre.slice(0, 31))
  }
  XLSX.writeFile(libro, nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`)
}

/** Lee la primera hoja de un Excel y devuelve sus filas como objetos. */
export async function leerExcel(archivo: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx')
  const libro = XLSX.read(await archivo.arrayBuffer(), { cellDates: true })
  const hoja = libro.Sheets[libro.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' })
}
