# Contexto para la web pública · Casino de Pimentel

Documento de traspaso para trabajar la página web en un chat nuevo. Resume lo decidido hasta el 2-nov-2026 en el chat del sistema. Léelo completo antes de proponer nada.

---

## 1. Qué se va a hacer y cómo empezar

- El club **no tiene web propia** (en Google lo confunden con un casino de juego y comentan que "suele estar cerrado"). Vamos a hacer una **web demo de buen nivel, no básica**, que se irá mejorando si al club le interesa.
- **Primero se conversa el sistema de diseño con el usuario**, y solo después se construye. No empezar a programar sin acordar la dirección visual.
- El usuario quiere cosas reales y funcionando, que pueda abrir y mostrar. Un manual de colores o una demo en la que no se puede entrar no reemplaza el trabajo: la conversación de diseño es para decidir rápido y luego construir.
- Idioma: español de Perú, frases cortas, sin tecnicismos. El usuario no es técnico.

## 2. El club

**Datos públicos confirmados** (impresos en los talonarios del club):
- Casino de Pimentel · Calle Manuel Seoane 725, Cercado, Pimentel, Chiclayo, Lambayeque.
- Teléfono 074-425244 · celular 920 349 713.
- Es un **club social privado de socios**, no una casa de juegos de azar: aclararlo con elegancia.

**Instalaciones** (confirmadas con el formulario del club):
- Piscina, **1 cancha de tenis** (no 2), **1 cancha de básquet** de uso libre, bar El Astillero, comedor.
- Ambientes para eventos: salón principal (completo, 1/2 y 1/3), rincón parrillero, rincón parrillero + jardín, piscina (solo temporada baja) y deck. Adicional de cocina para el rincón parrillero.
- Tenis: turnos de una hora de 6:00 a 22:00; máximo 1 reserva por socio al día y 3 por semana. Lo reserva el socio desde su app.

**Por confirmar con el club** (en la web van marcados "[por confirmar]" o no se publican):
- Horarios del club, piscina y barra; historia del club; requisitos de admisión; WhatsApp; capacidad de cada ambiente.
- Si hay cancha de fútbol y si se reserva; si el básquet se reserva.
- **Fotos reales del club: no hay ninguna.** Hoy solo hay una ilustración de ejemplo del malecón. Pedirlas o decidir con el usuario cómo resolverlo; nunca fotos de banco presentadas como el club o sus socios.
- Datos del caso de éxito (265 socios titulares, actividad desde 1984, 4.2 en Google con 230 reseñas) vienen de la investigación: no publicarlos sin confirmación del club.

## 3. Reglas que no se rompen

- Nunca nombres reales de socios ni montos reales de caja. Los archivos marcados PRIVADO no se usan en nada público.
- Nunca inventar testimonios, cifras, precios, fechas ni historia del club. Lo no confirmado se marca "[por confirmar]".
- Todo dato o imagen de ejemplo va marcado como ejemplo.
- **No mostrar tarifas en la web** (indicación del brief original): "Consulta tarifas para socios y no socios".
- WhatsApp no se integra en esta versión.
- Nada de claves, tokens ni contraseñas en el código ni en el repositorio (el repositorio de GitHub es **público**).

## 4. La marca (la que usa hoy el sistema)

Fuente: `presentacion/marca/colores-y-tipografias.md` y la carpeta `presentacion/marca/`.

- **Colores:** azul del club `#1658A4`, azul noche `#0C3F7C`, celeste `#479FD5`, celeste claro `#E4F2FC`, cielo `#F0F6FB`, tinta `#0E2A47`, gris texto `#4B5F76`. Sol: degradado de `#DF8234` (arriba) a `#EDB948` (abajo), con moderación.
- **Tipografías:** Outfit (600–700) para títulos y números; Plus Jakarta Sans (400–600) para textos.
- **Elementos:** el sol asomando por una esquina, tres olas blancas finas en los fondos azules, brillo celeste arriba a la derecha, todo redondeado (tarjetas de 28 a 32 px, píldoras). Nada cuadrado.
- **Logos:** `presentacion/marca/logo-casino-pimentel-color.png` (fondos claros), `logo-casino-pimentel-blanco.png` (fondos azules), `emblema-sol.png`, `icono-app-512.png`, `qr-casino-pimentel-vercel.png`. El PDF original del logo está en `D:\Logotipo CasinoPimentel.pdf`.
- Estilo de referencia que eligió el usuario para el sistema: minimalista, redondeado y entendible, con fondos azules que "realmente impacten" y títulos grandes con jerarquía clara.

**Ojo:** existe un sistema de diseño anterior, "Malecón de Pimentel" (`design/tokens.css`, `DESIGN.md`), con otro azul (`#1B4F8F`) y la fuente Figtree. Lo usa la web vieja. Hay que decidir con el usuario si se unifica todo con la marca actual.

## 5. Lo que ya existe

- **Web vieja (30-oct-2026):** Astro en `web/`, 8 páginas (inicio, el club, instalaciones, tenis, ambientes con formulario, avisos, contacto, 404), cada sección en su componente. Publicada en https://casino-pimentel.netlify.app (sitio "casino-pimentel" en Netlify). Lighthouse 100 en inicio. **Tiene errores:** dice "dos canchas de tenis" (en `Ofrece.astro`, `instalaciones.astro`, `tenis.astro` y los datos estructurados de `Base.astro`). Lee avisos y ambientes de Supabase, que nunca se conectó (usa datos de respaldo de `web/src/lib/datos.ts`). Capturas en `caso-de-exito/despues/`. Decidir con el usuario: rediseñar sobre esta base o empezar de nuevo.
- **El sistema del club (lo que se usa hoy):** Google Apps Script + Google Sheets, código en `appscript/`. Entrada pública: https://casino-pimentel.vercel.app (carpeta `vercel/`, proyecto de Vercel en la cuenta favioliza.s@gmail.com), que abre el sistema publicado en Google. El botón "Soy socio" de la web debe llevar ahí.
- **Supabase y la app React (`app/`, `supabase/`)** quedaron para una etapa futura. No tocarlos sin que el usuario lo pida.
- **Material útil:** mockups del sistema en `presentacion/mockups/` (laptop, tablet, celular con fondo transparente), fotos del antes en `caso-de-exito/antes/`, contenido del sistema en `presentacion/CONTENIDO-DEL-SISTEMA.md`, formulario del club en `assets-cliente/INFORMACION_SISTEMA.pdf` (local, no está en GitHub; puede tener datos privados).

## 6. Puntos para conversar al inicio

1. ¿Rediseñar la web vieja o empezar de cero?
2. Dirección visual: ¿la misma estética del sistema o algo más editorial para el público?
3. Fotos: el club no tiene fotos reales en el proyecto.
4. Secciones y objetivo principal: ¿atraer socios nuevos, alquilar ambientes, informar a los socios, o todo?
5. Formulario de consulta de alquiler: ¿a dónde llega? (Supabase no está conectado; podría llegar al sistema de Google.)
6. Dónde se publica (Vercel o Netlify) y si habrá dominio propio.

## 7. Cómo se trabaja en este proyecto

- Windows, Node y PowerShell/Git Bash. Si un heredoc de bash falla, escribir el guion en un archivo y ejecutarlo con node.
- Vista previa: `.claude/launch.json` tiene "web" (Astro en el puerto 4321) y "sistema" (el sistema local en el puerto 3000).
- Capturas con Playwright usando `channel: 'chrome'` (ver `appscript/dev/capturas-kit.mjs` como ejemplo).
- Commits en español, en `main`, y push al repositorio público `luviostudiope-cell/casino-pimentel`. Revisar que no haya secretos antes de subir.
- Las fases están en `FASES.md` (la web es la fase 9). Pendiente aparte, sin relación con la web: el bot de Telegram con IA (fase 8) y el buzón del socio, que el usuario está consultando con el club.
