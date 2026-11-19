import 'server-only'
import sharp from 'sharp'

// La portada de la cotización en WebP (`sharp`, sólo en el servidor: la composición carga este archivo con `import()` y nunca llega al navegador): el PNG de la
// tarjeta a lo sumo a 1.600 px de ancho (sin agrandar) y calidad 80. Si cambias cómo se dibuja (esto, `imagen-de-la-tarjeta.tsx` o `geometriaDeLaTarjeta()`),
// sube `_portada_version_del_dibujo()` en una migración: si no, las portadas ya guardadas no se rehacen.
export const ANCHO_MAXIMO_DE_LA_PORTADA = 1600
export const CALIDAD_DE_LA_PORTADA = 80

export async function webpDeLaTarjeta(png: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const webp = await sharp(png)
    .resize({ width: ANCHO_MAXIMO_DE_LA_PORTADA, withoutEnlargement: true })
    .webp({ quality: CALIDAD_DE_LA_PORTADA })
    .toBuffer()
  return new Uint8Array(webp)
}

// La miniatura de la portada para las listas (`?ancho=480`): la grande (lo bajado del bucket o lo recién armado) a ese ancho, sin agrandar, calidad 80. El bucket guarda
// sólo la grande: la miniatura se achica al responder y el navegador la revalida con su ETag (304).
export async function miniaturaDeLaPortada(
  webp: Uint8Array,
  ancho: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const chica = await sharp(webp)
    .resize({ width: ancho, withoutEnlargement: true })
    .webp({ quality: CALIDAD_DE_LA_PORTADA })
    .toBuffer()
  return new Uint8Array(chica)
}
