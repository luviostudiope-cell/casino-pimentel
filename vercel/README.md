# Página de entrada en Vercel

Da una dirección corta al sistema del club: https://casino-pimentel.vercel.app

El sistema vive en Google Apps Script (carpeta `appscript/`). Esta página solo muestra la portada con el logo y abre la web app de Google a pantalla completa. También trae el manifiesto para que en el celular se pueda "Agregar a pantalla de inicio" con el ícono del club.

- `index.html`: portada y marco con el sistema. Si algún día cambia el enlace de Google, se cambia en la variable `SISTEMA`.
- `manifest.webmanifest`: nombre, colores e íconos para instalarlo en el celular.
- Las imágenes (`logo.png`, `sol.png`, íconos) se sirven desde este repositorio público por jsDelivr.

Para volver a publicar desde esta carpeta (con la cuenta de Vercel del proyecto):

```bash
npx vercel deploy --prod
```
