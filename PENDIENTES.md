# Pendientes · Casino de Pimentel

Lo que depende del club, de Arturo o de un dato real. Todo lo demás funciona con datos de ejemplo (marcados `es_ejemplo = true` y con la etiqueta "Dato de ejemplo" en pantalla).

## Bloqueante al construir (30-oct-2026)

- [ ] **Crear el proyecto de Supabase "casino-pimentel".** La herramienta de Supabase (MCP) exige una confirmación de costo (`get_cost` / `confirm_cost`) que este cliente de Claude Code no tiene, y en la máquina no hay sesión del CLI de Supabase. Hay que crearlo a mano: organización **Kontrola** (plan Pro), región **São Paulo (sa-east-1)**, nombre **casino-pimentel**. Al estar creado, se aplican las migraciones de `supabase/migrations` y el seed.

## Del club

- [ ] **Logo oficial** en buena calidad (SVG o PNG grande). Hoy se usa un wordmark de texto "Casino de Pimentel" con un ícono de ola (`design/ola.svg`).
- [ ] **QR de Yape del club** (imagen). Hoy se muestra uno de ejemplo en "Pagar".
- [ ] **Padrón real de socios** (Excel). Se carga con el importador del panel (Socios → Importar padrón). Hoy hay 60 socios ficticios.
- [ ] **Costos de compra de cada insumo.** Hoy son de ejemplo.
- [ ] **Recetas de cada trago en onzas.** Hoy son de ejemplo.
- [ ] **Stock inicial** de cada insumo (conteo físico de arranque).
- [ ] **Personal y turnos** (nombres, DNI, área, cargo, planilla o recibo). Hoy son de ejemplo.
- [ ] **Cuota de ingreso** y confirmar la cuota de mantenimiento (ejemplo: S/ 80).
- [ ] **Precios por confirmar** (la carta impresa y la lista interna no coinciden): Margarita 20 o 18, Negroni 20 o 18, Sunset Beach 15 o 12. Se usan los de la carta impresa con la marca "por confirmar".
- [ ] **Tarifa del deck.**
- [ ] **Capacidad de cada ambiente.**
- [ ] **WhatsApp del club** para la web.
- [ ] **Historia del club** para la página "El club" (hoy: "[texto por confirmar con el club]").
- [ ] **Fotos reales del club** (malecón, piscina, canchas, salón, barra). Hoy hay imágenes de ejemplo marcadas "Foto de ejemplo".
- [ ] **Regla para socios morosos** en portería: hoy NO se bloquea el ingreso, solo se avisa a administración (`config.morosos.bloquear_ingreso = false`).
- [ ] **Línea base** para el caso de éxito (ver `caso-de-exito/caso-de-exito-casino-pimentel.md`, sección 1).

## De Arturo / Luvio Studio

- [ ] **Crédito del desarrollador en el pie** de la web y de la app (texto y enlace).
- [ ] **Dominio propio** (hoy: casino-pimentel.netlify.app).
- [ ] **Rediseño completo de la web pública** con su prompt dedicado (momento firma, fotografía, SEO avanzado). La versión base deja cada sección en su propio componente para rediseñarla una por una.
- [ ] **WhatsApp:** no se usa en esta versión. Si se pide, debe ser con la API oficial de WhatsApp Business.

## Herramientas

- [ ] Skill **frontend-design** no está instalada en esta máquina: se aplicaron impeccable, ui-ux-pro-max, emil-design-eng y apple-design.
- [ ] El buscador de **ui-ux-pro-max** (`scripts/search.py`) necesita Python y esta PC no lo tiene: se usaron su checklist (`references/pro-rules.md`) y sus reglas de prioridad.
