# Casino de Pimentel · Plataforma del club

Un solo sistema para el club: **web pública**, **panel de administración**, **tablet de barra El Astillero**, **tablet de portería con asistencia** y **app del socio**, sobre una sola base de datos en Supabase y un solo inicio de sesión.

| Parte | Ruta | Tecnología |
|---|---|---|
| Web pública | `/` | Astro (páginas estáticas) · `web/` |
| App (PWA) | `/app` | React + Vite + TypeScript · `app/` |
| Ingreso único | `/app/ingresar` | socios con DNI + PIN; personal con correo y clave |
| Panel | `/app/admin` | presidente, directivos y administración |
| Barra | `/app/barra` | tablet de El Astillero |
| Portería | `/app/porteria` | tablet de la puerta + modo asistencia |
| Socio | `/app/socio` | carnet con QR, cuenta, reservas, avisos |
| Sistema de diseño | `/app/sistema` | vitrina de todos los componentes |
| Base de datos | — | Supabase: `supabase/migrations`, `supabase/functions`, `supabase/seed` |
| Diseño compartido | — | `design/` (tokens, fuentes, logo provisional) |

Documentos de control: `DESIGN.md` (sistema de diseño), `PENDIENTES.md` (lo que falta del club), `RESUMEN.md` (entrega y usuarios de prueba).

---

## Trabajar desde otra PC

1. Instala **Node 22 o superior** y **Git**.
2. Clona el repositorio privado y entra a la carpeta:
   ```bash
   git clone https://github.com/<cuenta>/casino-pimentel.git
   cd casino-pimentel
   npm install
   npm run instalar
   ```
3. Crea `app/.env.local` y `web/.env` con los valores **públicos** del proyecto de Supabase (URL y clave publicable). Usa `app/.env.example` como guía. Las claves secretas (Telegram, Claude, VAPID privada) **no** van en archivos: viven en Supabase.
4. Levanta lo que necesites:
   ```bash
   npm run dev:app
   ```
   ```bash
   npm run dev:web
   ```
   La app queda en `http://localhost:5173/app/` y la web en `http://localhost:4321/`.
5. Para ver todo junto como en producción:
   ```bash
   npm run build
   ```
   ```bash
   npm run servir
   ```
6. Probar la base de datos sin tocar Supabase (Postgres en memoria con PGlite): carga las migraciones, el seed y corre las pruebas de RLS y de reglas.
   ```bash
   node supabase/tests/local/probar.mjs
   ```

**Publicar:** Netlify construye con `netlify.toml` (web + app en un solo despliegue). En Netlify deben existir las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_VAPID_PUBLIC_KEY`, `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (todas públicas).

**Base de datos:** las migraciones se aplican en orden (`supabase/migrations`). Las Edge Functions están en `supabase/functions`. El seed (`supabase/seed`) carga la carta y los insumos reales del club y los datos de ejemplo.

---

## Cómo agregar un club nuevo

El sistema es multi-club: **todas las tablas llevan `club_id`** y **todas las reglas viven en `config.reglas`**, nunca en el código.

1. **Crear el club y su configuración** (SQL editor de Supabase):
   ```sql
   insert into public.clubes (slug, nombre, direccion, telefono, celular)
   values ('club-ejemplo', 'Club Ejemplo', 'Dirección', '000-000000', '900 000 000')
   returning id;
   insert into public.config (club_id) values ('<id del club>');   -- toma las reglas por defecto
   insert into app.secretos (club_id) values ('<id del club>');    -- clave para firmar el QR del carnet
   ```
2. **Ajustar sus reglas** desde el panel → Configuración (invitados por día, visitas por mes, tarifas, horario y reglas de tenis, cuota de mantenimiento y vencimiento, tolerancia de tardanza, hora del reporte diario, regla de morosos, IGV de alquileres).
3. **Crear sus barras, canchas, ambientes con tarifas, categorías y carta** (copiar el patrón de `supabase/seed/01_club_carta.sql`).
4. **Crear el primer usuario administrador**: crea el usuario en Supabase Auth y luego `insert into public.usuarios_staff (id, club_id, nombre, correo, rol) values (...,'admin')`. Desde ahí, el resto de usuarios se crea en el panel → Configuración → Usuarios.
5. **Cargar el padrón** desde el panel → Socios → Importar padrón (Excel) y crear los accesos de los socios (se descargan los PIN temporales).
6. **Web pública del club**: duplicar `web/` y cambiar `CLUB_SLUG` y `CLUB` en `web/src/lib/datos.ts`; la app usa el club del usuario que inicia sesión.
7. **Reporte diario por Telegram**: guardar en Supabase Vault (o como secretos de Edge Functions) `telegram_token` y `telegram_chat_id` del club. Hoy el reporte usa un solo grupo por proyecto; para varios clubes en el mismo proyecto, guardar el chat en `config.reglas.reporte.telegram_chat_id`.

---

## Seguridad en pocas palabras

- RLS en todas las tablas: el socio ve solo lo suyo y lo de su familia; barra y portería solo lo que operan; la directiva ve todo; solo administración edita la configuración.
- Nadie borra: no hay permiso de borrado; todo es borrado lógico con motivo.
- Todo queda en el **Registro** (auditoría por trigger en todas las tablas + accesos).
- El QR del carnet está firmado (HMAC-SHA256) y vence a los 30 segundos: una captura de pantalla no sirve.
- Los PIN del personal se guardan con bcrypt en un esquema privado.
- Ningún secreto en el repositorio.
