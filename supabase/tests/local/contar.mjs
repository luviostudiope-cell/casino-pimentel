import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const db = new PGlite({ extensions: { pgcrypto } })
await db.exec(readFileSync(join(raiz, 'tests/local/stub_supabase.sql'), 'utf8'))
for (const f of readdirSync(join(raiz, 'migrations')).sort()) if (!f.includes('_cron')) await db.exec(readFileSync(join(raiz, 'migrations', f), 'utf8'))
const r = await db.query(`select
 (select count(*) from pg_tables where schemaname='public') tablas_publicas,
 (select count(*) from pg_tables where schemaname='app') tablas_privadas,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public') funciones_rpc,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app') funciones_internas,
 (select count(*) from pg_policies where schemaname='public') politicas,
 (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','app')) triggers`)
console.log(r.rows[0])
