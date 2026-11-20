import 'server-only'
import sharp from 'sharp'

// La imagen de la tarjeta en WebP (`sharp`, sólo en el servidor: la composición carga este archivo con `import()` y nunca llega al navegador): el PNG de la
// tarjeta a lo sumo a 1.600 px de ancho, o al de la miniatura que se pida (480, la de las listas), sin agrandar y calidad 80. La miniatura sale **del PNG**: nunca
// pasa dos veces por WebP. Si cambias cómo se dibuja (esto, `imagen-de-la-tarjeta.tsx` o `geometriaDeLaTarjeta()`), sube `VERSION_DEL_DIBUJO`
// (`entities/tarjeta/etiqueta-de-la-imagen.ts`): si no, el navegador sigue mostrando la que guardó.
export const ANCHO_MAXIMO_DE_LA_IMAGEN = 1600
export const CALIDAD_DE_LA_IMAGEN = 80

export async function webpDeLaTarjeta(
  png: Uint8Array,
  { ancho = ANCHO_MAXIMO_DE_LA_IMAGEN }: { ancho?: number } = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const webp = await sharp(png)
    .resize({ width: Math.min(ancho, ANCHO_MAXIMO_DE_LA_IMAGEN), withoutEnlargement: true })
    .webp({ quality: CALIDAD_DE_LA_IMAGEN })
    .toBuffer()
  return new Uint8Array(webp)
}
