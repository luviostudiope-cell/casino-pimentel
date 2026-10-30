// Prueba local de migraciones, seed y pruebas de RLS/RPC con PGlite (Postgres en WebAssembly).
// Uso: node supabase/tests/local/probar.mjs   (requiere: npm i -D @electric-sql/pglite en la raíz)
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const db = new PGlite({ extensions: { pgcrypto } })
const correr = async (nombre, sql) => {
  const t = Date.now()
  try { await db.exec(sql); console.log(`✓ ${nombre} (${Date.now() - t} ms)`) }
  catch (e) { console.error(`✗ ${nombre}: ${e.message}`); if (e.position) console.error('  posición', e.position, '→', sql.slice(Math.max(0, e.position - 200), Number(e.position) + 120)); process.exit(1) }
}
await db.exec(`set timezone = 'UTC'`)
await correr('stub de Supabase', readFileSync(join(raiz, 'tests/local/stub_supabase.sql'), 'utf8'))
for (const f of readdirSync(join(raiz, 'migrations')).sort()) {
  if (f.includes('_cron')) { console.log(`- ${f} (se omite: pg_cron/pg_net/vault solo existen en Supabase)`); continue }
  await correr(f, readFileSync(join(raiz, 'migrations', f), 'utf8'))
}
for (const f of readdirSync(join(raiz, 'seed')).sort()) await correr('seed ' + f, readFileSync(join(raiz, 'seed', f), 'utf8'))
const conteo = await db.query(`select (select count(*) from socios) socios, (select count(*) from miembros) miembros, (select count(*) from productos) productos,
  (select count(*) from insumos) insumos, (select count(*) from comandas) comandas, (select count(*) from ingresos) ingresos, (select count(*) from cuotas) cuotas,
  (select count(*) from auth.users) usuarios, (select count(*) from estado_socios where estado_cuenta='deuda') con_deuda,
  (select count(*) from estado_socios where estado_cuenta='por_vencer') por_vencer, (select count(*) from estado_socios where estado_cuenta='al_dia') al_dia`)
console.log(conteo.rows[0])
const pruebas = readFileSync(join(raiz, 'tests/pruebas.sql'), 'utf8')
let res
try { res = await db.exec(pruebas) } catch (e) { console.error('✗ pruebas: ' + e.message); process.exit(1) }
const filas = res.at(-1)?.rows ?? []
let fallas = 0
for (const r of filas) { console.log(`${r.ok ? '✓' : '✗'} ${r.caso}${r.ok ? '' : '  → ' + r.detalle}`); if (!r.ok) fallas++ }
console.log(`\n${filas.length - fallas} de ${filas.length} pruebas superadas`)
process.exit(fallas ? 1 : 0)
