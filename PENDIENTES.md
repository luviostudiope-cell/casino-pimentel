# Pendientes · Casino de Pimentel

Lo que depende del club, de Arturo o de un dato real. Todo lo demás funciona con datos de ejemplo (marcados `es_ejemplo = true` y con la etiqueta "Dato de ejemplo" en pantalla).

## 🔴 Bloqueante (30-oct-2026)

- [ ] **Crear el proyecto de Supabase "casino-pimentel".** La herramienta de Supabase exige confirmar el costo (`get_cost` / `confirm_cost`) y este cliente no tiene esas funciones; en la PC tampoco hay sesión del CLI de Supabase. Hay que crearlo a mano en el panel de Supabase: organización **Kontrola** (plan Pro), región **South America (São Paulo)**, nombre **casino-pimentel**. Apenas exista, Claude Code ejecuta solo:
  1. Aplicar las 12 migraciones de `supabase/migrations` y el seed (`supabase/seed`).
  2. Guardar las claves (Telegram y Claude, ya verificadas) **solo** como secretos de Supabase (Vault), más la URL del proyecto, las claves VAPID y el secreto del cron.
  3. Desplegar las 5 Edge Functions (`login-socio` y `enviar-push`/`reporte-diario` sin JWT; el resto con JWT).
  4. Correr las 38 pruebas de RLS y reglas en la base real, revisar los avisos de seguridad de Supabase.
  5. Configurar las variables públicas en Netlify, reconstruir y volver a publicar.
  6. Prueba de punta a punta con cada rol, capturas y videos de la app, Lighthouse, composiciones antes/después y envío del reporte de prueba al grupo de Telegram.

## Del club

- [ ] **Logo oficial** en buena calidad (SVG o PNG grande). Hoy se usa un wordmark de texto "Casino de Pimentel" con un ícono de ola (`design/ola.svg`).
- [ ] **QR de Yape del club** (imagen) y número de Yape. Hoy se muestra un QR de ejemplo en "Pagar". Se cargan en el panel → Configuración → Barra y alquileres.
- [ ] **Padrón real de socios** (Excel). Se carga con el importador del panel (Socios → Importar padrón) y crea los accesos con PIN temporal. Hoy hay 60 socios ficticios.
- [ ] **Costos de compra de cada insumo.** Hoy son de ejemplo (se editan en Barra → Insumos y recetas).
- [ ] **Recetas de cada trago en onzas.** Hoy son de ejemplo.
- [ ] **Stock inicial** de cada insumo (conteo físico de arranque).
- [ ] **Personal y turnos** (nombres, DNI, área, cargo, planilla o recibo, PIN de asistencia). Hoy son de ejemplo.
- [ ] **Cuota de ingreso** y confirmar la cuota de mantenimiento (ejemplo: S/ 80) y **su vencimiento** (hoy: día 10 del mes siguiente, configurable).
- [ ] **Precios por confirmar** (carta impresa vs. lista interna): Margarita 20 o 18, Negroni 20 o 18, Sunset Beach 15 o 12. Se usan los de la carta impresa con la marca "por confirmar".
- [ ] **Precios de evento** de cada producto (hoy no hay ninguno cargado: el modo evento no cambia precios hasta que se carguen).
- [ ] **Tarifa del deck** y tarifas no socio / institución de salón 1/2, 1/3 y piscina.
- [ ] **Capacidad de cada ambiente.**
- [ ] **Horarios del club, piscina y barra** (hoy "[por confirmar]" en la web).
- [ ] **Nombre o ubicación de cada barra** (hoy "Barra 1" y "Barra 2").
- [ ] **WhatsApp del club** para la web.
- [ ] **Historia del club** y requisitos para ser socio (hoy "[texto por confirmar con el club]").
- [ ] **Fotos reales del club** (malecón, piscina, canchas, salón, barra). Hoy hay una ilustración marcada "Imagen de ejemplo".
- [ ] **Regla para socios morosos** en portería: hoy NO se bloquea el ingreso, solo se avisa a administración (`config.morosos.bloquear_ingreso = false`).
- [ ] **Línea base** para el caso de éxito (ver `caso-de-exito/caso-de-exito-casino-pimentel.md`, sección 1).
- [ ] **Permiso del club** para publicar el caso con su nombre.

## De Arturo / Luvio Studio

- [ ] **Crédito del desarrollador en el pie** de la web y de la app (texto y enlace).
- [ ] **Dominio propio** (hoy: casino-pimentel.netlify.app).
- [ ] **Rediseño completo de la web pública** con su prompt dedicado (momento firma, fotografía, SEO avanzado). Cada sección está en su propio componente (`web/src/components/secciones`).
- [ ] **Cambiar las claves de prueba** de `RESUMEN.md` antes de usar datos reales.
- [ ] **WhatsApp:** no se usa en esta versión. Si se pide, debe ser con la API oficial de WhatsApp Business.
- [ ] **Despliegue automático desde GitHub** en Netlify (hoy se publica la carpeta construida con el CLI; conectar el repositorio requiere autorizar la app de Netlify en GitHub).
- [ ] **Claves de Telegram y de Claude**: verificadas el 30-oct (el bot ve el grupo "CASINO PIMENTEL | REPORTES" y la clave de Claude respondió con `claude-haiku-5-5`). Se guardan en Supabase cuando exista el proyecto.

## Herramientas

- [ ] Skill **frontend-design** no está instalada en esta máquina: se aplicaron impeccable, ui-ux-pro-max, emil-design-eng y apple-design.
- [ ] El buscador de **ui-ux-pro-max** (`scripts/search.py`) necesita Python y esta PC no lo tiene: se usaron su checklist (`references/pro-rules.md`) y sus reglas de prioridad.
- [ ] Impeccable tiene versión nueva (v4.7.0); se usó la instalada (v4.1.3).
