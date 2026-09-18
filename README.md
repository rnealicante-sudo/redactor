# Ayudante de Redacción — Guía de Despliegue en GitHub y Uso Local

Esta aplicación está preparada para funcionar de dos formas:
1. **En un solo archivo autónomo `index.html`** (ideal para subir directamente a GitHub Pages o abrir con doble clic en tu ordenador).
2. **Como aplicación completa con servidor** en Google AI Studio o Cloud Run.

---

## 🚀 ¿Por qué no se veía antes al subir a GitHub?

Cuando subes un proyecto moderno de React/Vite a GitHub, ocurren dos cosas si no está adaptado:
1. El archivo `index.html` de desarrollo tiene una etiqueta `<script type="module" src="/src/main.tsx">`. Los navegadores **no pueden leer archivos TypeScript (.tsx) directamente**, por lo que salía una pantalla en blanco con errores en la consola.
2. Además, GitHub Pages aloja tu web en una subcarpeta (por ejemplo: `https://usuario.github.io/repositorio/`). Si las rutas no son relativas (`./`), busca los archivos en la raíz y fallan.
3. Se ha **eliminado por completo la grabación de voz y cualquier permiso de micrófono**, tal como solicitaste.

---

## 📦 Opción 1: Subir en UN SOLO ARCHIVO a GitHub (GitHub Pages)

En la carpeta `single-file-github/` de este proyecto tienes el archivo **`index.html`** que contiene **todo el código en un único fichero autocontenido** (HTML, CSS con Tailwind y JavaScript).

### Pasos para publicarlo en GitHub Pages:
1. Descarga el archivo `index.html` (o cópialo desde la carpeta `single-file-github/index.html`).
2. En tu cuenta de GitHub, crea un repositorio o entra en el que ya tengas.
3. Sube el archivo `index.html` a la **raíz** del repositorio (puedes arrastrarlo y hacer *Commit changes*).
4. Ve a la pestaña **Settings** (Ajustes) de tu repositorio.
5. En el menú lateral izquierdo, haz clic en **Pages**.
6. En el apartado **Build and deployment**:
   - Source: *Deploy from a branch*
   - Branch: selecciona `main` (o `master`) y la carpeta `/(root)`.
   - Haz clic en **Save**.
7. En unos 30-60 segundos, GitHub te indicará el enlace público (ejemplo: `https://tu-usuario.github.io/tu-repo/`).
8. ¡Listo! Ya podrás verlo y utilizarlo desde cualquier dispositivo.

---

## 💻 Opción 2: Abrirlo en tu ordenador (Modo Local)

1. Descarga el archivo `index.html`.
2. Haz **doble clic** directamente sobre el archivo en tu explorador de archivos.
3. Se abrirá inmediatamente en Google Chrome, Microsoft Edge, Mozilla Firefox o Safari.
4. No necesitas instalar Node.js ni ningún servidor web local.

---

## 📻 Funcionalidades incluidas en el archivo único:
1. **1. Resumen y Puntos Clave**: Minutaje cronológico exacto `[mm:ss]` y tipografía amplia para lectura rápida.
2. **2. Transcripción Detallada**: Saltos de línea diferenciados y preguntas de periodistas en **negrita**.
3. **3. Noticia de Periódico**: Formato de prensa escrita con titular, entradilla capitular (*drop cap*), ladillos y cuerpo maquetado.
4. **4. Boletín de Radio de 90 segundos**: Con locutora española nativa (`es-ES`) mediante la síntesis de voz de tu navegador (Chrome, Edge, etc.) sin necesidad de servidores externos.
5. **5. Descargas**: Exportación en TXT, Word (.doc), Markdown (.md), JSON y Guion de Radio (.txt).
6. **Sin micrófono ni grabación**: 100% libre de peticiones de permisos de micrófono.
