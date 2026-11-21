import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const ES_GRUPO = /^\(.+\)$/

function grupos(carpeta: string): string[] {
  if (!existsSync(carpeta)) {
    return []
  }
  return readdirSync(carpeta, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory() && ES_GRUPO.test(entrada.name))
    .map((entrada) => path.join(carpeta, entrada.name))
}

function tieneDestino(carpeta: string): boolean {
  return existsSync(path.join(carpeta, 'page.tsx')) || existsSync(path.join(carpeta, 'route.ts'))
}

// Si una URL tiene su pantalla en `src/app`: una carpeta por segmento con su `page.tsx` o su `route.ts` (las raíces que redirigen), atravesando los
// grupos de rutas (`(pestanas)`), que no son parte de la URL. Lo usan los tests de a dónde lleva cada paso.
export function existeLaRuta(carpeta: string, segmentos: readonly string[]): boolean {
  const [primero, ...resto] = segmentos
  if (primero === undefined) {
    return tieneDestino(carpeta) || grupos(carpeta).some((grupo) => existeLaRuta(grupo, []))
  }
  const directa = path.join(carpeta, primero)
  return (
    (existsSync(directa) && existeLaRuta(directa, resto)) ||
    grupos(carpeta).some((grupo) => existeLaRuta(grupo, segmentos))
  )
}
