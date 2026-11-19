// Qué colores de una plantilla de V1 se crean y cuáles se reusan del catálogo «Colores», antes de llamar a la base (`cotizacion_paquete_aplicar()` vuelve a
// mirar el reuso y el tope bajo el candado de `tonos`). Pura. docs/COTIZADOR.md › «Plantillas de V1».
//
// Por cada color del paquete (`v1_<nombre>`, «V1 <nombre>»): la clave que no existe se crea; la que existe con el mismo hex se reusa; con otro hex, se prueba
// `v1_<paquete>_<nombre>` («V1 <paquete> <nombre>»), que a su vez se reusa si tiene el mismo hex. Si las dos chocan, no se crea nada. Un nombre que ya usa otro
// color (la base lo rechaza con 23505) cuenta como choque. Si los que hay más los nuevos pasan del tope, no se crea nada.
import type { ColorDePlantillaDeV1, PlantillaDeV1 } from './tipos'

export type ColorDelCatalogo = {
  readonly clave: string
  readonly nombre: string
  readonly hex: string
}

export type PlanDeColores =
  | {
      readonly ok: true
      // La clave de cada color del paquete → la que queda en el catálogo.
      readonly mapa: Readonly<Record<string, string>>
      readonly reusar: readonly { readonly clave: string; readonly hex: string }[]
      readonly crear: readonly ColorDePlantillaDeV1[]
    }
  | { readonly ok: false; readonly motivo: 'tope'; readonly faltan: number; readonly tope: number }
  | {
      readonly ok: false
      readonly motivo: 'choque'
      readonly nombre: string
      readonly otro: string
    }

const PREFIJO_DE_CLAVE = 'v1_'
const PREFIJO_DE_NOMBRE = 'V1 '

const mismoNombre = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase()

// «V1 teal» → «V1 usa teal»; `v1_teal` → `v1_usa_teal`.
export function colorDeChoque(paquete: string, c: ColorDePlantillaDeV1): ColorDePlantillaDeV1 {
  return {
    clave: `${PREFIJO_DE_CLAVE}${paquete}_${c.clave.slice(PREFIJO_DE_CLAVE.length)}`,
    nombre: `${PREFIJO_DE_NOMBRE}${paquete} ${c.nombre.slice(PREFIJO_DE_NOMBRE.length)}`,
    hex: c.hex,
  }
}

type Eleccion = { tipo: 'reusar' | 'crear'; color: ColorDePlantillaDeV1 } | { tipo: 'choca' }

function elegir(c: ColorDePlantillaDeV1, catalogo: readonly ColorDelCatalogo[]): Eleccion {
  const existente = catalogo.find((x) => x.clave === c.clave)
  if (existente !== undefined) {
    return existente.hex.toLowerCase() === c.hex.toLowerCase()
      ? { tipo: 'reusar', color: c }
      : { tipo: 'choca' }
  }
  return catalogo.some((x) => mismoNombre(x.nombre, c.nombre))
    ? { tipo: 'choca' }
    : { tipo: 'crear', color: c }
}

export function coloresDeLaPlantilla(
  plantilla: Pick<PlantillaDeV1, 'clave' | 'colores'>,
  catalogo: readonly ColorDelCatalogo[],
  tope: number,
): PlanDeColores {
  const mapa: Record<string, string> = {}
  const reusar: { clave: string; hex: string }[] = []
  const crear: ColorDePlantillaDeV1[] = []
  for (const c of plantilla.colores) {
    const choque = colorDeChoque(plantilla.clave, c)
    let e = elegir(c, catalogo)
    if (e.tipo === 'choca') e = elegir(choque, catalogo)
    if (e.tipo === 'choca')
      return { ok: false, motivo: 'choque', nombre: c.nombre, otro: choque.nombre }
    mapa[c.clave] = e.color.clave
    if (e.tipo === 'reusar') reusar.push({ clave: e.color.clave, hex: e.color.hex })
    else crear.push(e.color)
  }
  if (catalogo.length + crear.length > tope) {
    return { ok: false, motivo: 'tope', faltan: crear.length, tope }
  }
  return { ok: true, mapa, reusar, crear }
}

// El texto de un plan que no se puede aplicar: el del tope es el mismo que da la base (`_paquete_colores_preparar()`).
export function motivoDeColores(plan: Extract<PlanDeColores, { ok: false }>): string {
  if (plan.motivo === 'tope') {
    const colores = plan.faltan === 1 ? '1 color más' : `${plan.faltan} colores más`
    return `No hay lugar para ${colores} en el catálogo (máximo ${plan.tope}): elimina alguno que no se use.`
  }
  return `Los colores «${plan.nombre}» y «${plan.otro}» ya existen con otro tono: cámbiale el nombre a uno en Configuración › Colores para usar esta plantilla.`
}
