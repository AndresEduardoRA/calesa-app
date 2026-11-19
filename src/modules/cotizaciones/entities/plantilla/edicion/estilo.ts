// El formato de las celdas del editor de la tarjeta: color de fondo y de texto, negrita, cursiva, tamaño, alineación y bordes, aplicados a todo lo elegido (las
// casillas vacías reciben una celda vacía con ese formato, como en Excel). Un valor igual al de por omisión (`ESTILO_POR_OMISION`, `auto`) quita la clave en vez de
// escribirla, y un estilo que queda vacío se quita: la plantilla no crece con lo que no cambia el dibujo (D1 de T310). Puro.
import {
  type ALINEAR,
  type ALINEAR_VERTICAL,
  COLOR_AUTOMATICO,
  ESTILO_POR_OMISION,
  LADOS,
  type Borde,
  type BordesDeLaCelda,
  type EstiloDeLaCelda,
  type Lado,
  type PlantillaEnCuadricula,
  type TamanoDeLetra,
} from '../../cuadricula-de-la-tarjeta'
import { idsNuevos } from './ids-nuevos'
import { medido } from './limites'
import { celdasConAnclaEn, mapaDeLaGrilla } from './mapa-de-la-grilla'
import { casillasVacias, celdaNueva, conEstilo, enPlural, idsDeCeldas, iguales } from './piezas'
import type { Rect, ResultadoDeEdicion } from './tipos'

export type CambioDeEstilo = {
  readonly fondo?: string
  readonly texto?: string
  readonly negrita?: boolean
  readonly cursiva?: boolean
  readonly tamano?: TamanoDeLetra
  readonly alinear?: (typeof ALINEAR)[number]
  readonly alinear_vertical?: (typeof ALINEAR_VERTICAL)[number]
  readonly borde?: { readonly lado: Lado | 'todos'; readonly borde: Borde }
}

type Escribible = { -readonly [K in keyof EstiloDeLaCelda]: EstiloDeLaCelda[K] }

// Los bordes con un lado cambiado. «Todos» reemplaza los cuatro lados; un lado igual a lo que ya da `todos` (o «ninguno» sin `todos`) no se escribe.
function bordesCon(
  bordes: BordesDeLaCelda | undefined,
  { lado, borde }: { lado: Lado | 'todos'; borde: Borde },
): BordesDeLaCelda | undefined {
  if (lado === 'todos') return borde === 'ninguno' ? undefined : { todos: borde }
  const nuevos: { -readonly [K in keyof BordesDeLaCelda]: Borde } = { ...(bordes ?? {}) }
  if (borde === (nuevos.todos ?? 'ninguno')) delete nuevos[lado]
  else nuevos[lado] = borde
  return Object.keys(nuevos).length === 0 ? undefined : nuevos
}

// El estilo con el cambio encima; nada (`undefined`) si no le queda ninguna clave.
export function estiloConCambio(
  estilo: EstiloDeLaCelda | undefined,
  cambio: CambioDeEstilo,
): EstiloDeLaCelda | undefined {
  const nuevo: Escribible = { ...(estilo ?? {}) }
  const poner = <K extends keyof Escribible>(
    clave: K,
    valor: Escribible[K] | undefined,
    omision: unknown,
  ) => {
    if (valor === undefined) return
    if (valor === omision) delete nuevo[clave]
    else nuevo[clave] = valor
  }
  poner('fondo', cambio.fondo, COLOR_AUTOMATICO)
  poner('texto', cambio.texto, COLOR_AUTOMATICO)
  poner('negrita', cambio.negrita, ESTILO_POR_OMISION.negrita)
  poner('cursiva', cambio.cursiva, ESTILO_POR_OMISION.cursiva)
  poner('tamano', cambio.tamano, ESTILO_POR_OMISION.tamano)
  poner('alinear', cambio.alinear, ESTILO_POR_OMISION.alinear)
  poner('alinear_vertical', cambio.alinear_vertical, ESTILO_POR_OMISION.alinear_vertical)
  if (cambio.borde !== undefined) {
    const bordes = bordesCon(estilo?.bordes, cambio.borde)
    if (bordes === undefined) delete nuevo.bordes
    else nuevo.bordes = bordes
  }
  return Object.keys(nuevo).length === 0 ? undefined : nuevo
}

export function ponerEstilo(
  p: PlantillaEnCuadricula,
  r: Rect,
  cambio: CambioDeEstilo,
): ResultadoDeEdicion {
  const mapa = mapaDeLaGrilla(p)
  const enR = new Set(celdasConAnclaEn(mapa, p, r).map((c) => c.indice))
  let cambiadas = 0
  const celdas = p.celdas.map((c, i) => {
    if (!enR.has(i)) return c
    const estilo = estiloConCambio(c.estilo, cambio)
    if (iguales(estilo, c.estilo)) return c
    cambiadas += 1
    return conEstilo(c, estilo)
  })
  const estiloDeLasVacias = estiloConCambio(undefined, cambio)
  const vacias = estiloDeLasVacias === undefined ? [] : casillasVacias(mapa, r)
  const nuevas = idsNuevos('c', idsDeCeldas(p), vacias.length).map((id, j) =>
    celdaNueva(p, id, vacias[j] ?? { f: 0, k: 0 }, {
      contenido: { tipo: 'vacio' },
      estilo: estiloDeLasVacias,
    }),
  )
  if (cambiadas + nuevas.length === 0)
    return { ok: true, plantilla: p, anuncio: 'El formato ya era ese.' }
  return medido(p, {
    ok: true,
    plantilla: { ...p, celdas: [...celdas, ...nuevas] },
    anuncio: enPlural(
      enR.size + nuevas.length,
      'Se cambió el formato de la celda.',
      'Se cambió el formato de N celdas.',
    ),
  })
}

const CLAVES_SIMPLES = [
  'fondo',
  'texto',
  'negrita',
  'cursiva',
  'tamano',
  'alinear',
  'alinear_vertical',
] as const

const efectivo = (e: EstiloDeLaCelda | undefined, clave: (typeof CLAVES_SIMPLES)[number]) =>
  e?.[clave] ?? ESTILO_POR_OMISION[clave]
const ladoEfectivo = (e: EstiloDeLaCelda | undefined, lado: Lado): Borde =>
  e?.bordes?.[lado] ?? e?.bordes?.todos ?? 'ninguno'

// Lo que comparten todas las celdas con ancla en `r` y las casillas vacías (que valen lo de por omisión), con su valor efectivo: el panel muestra el que hay y
// deja en blanco lo que difiere (la clave ausente). Los bordes, por lado; si los cuatro coinciden, `todos`.
export function estiloComun(p: PlantillaEnCuadricula, r: Rect): EstiloDeLaCelda {
  const mapa = mapaDeLaGrilla(p)
  const estilos: (EstiloDeLaCelda | undefined)[] = [
    ...celdasConAnclaEn(mapa, p, r).map((c) => c.celda.estilo),
    ...casillasVacias(mapa, r).map(() => undefined),
  ]
  const comun: Escribible = {}
  for (const clave of CLAVES_SIMPLES) {
    const valores = new Set(estilos.map((e) => efectivo(e, clave)))
    const [unico] = valores
    if (valores.size === 1 && unico !== undefined) Object.assign(comun, { [clave]: unico })
  }
  const lados = LADOS.flatMap((lado): [Lado, Borde][] => {
    const valores = new Set(estilos.map((e) => ladoEfectivo(e, lado)))
    const [unico] = valores
    return valores.size === 1 && unico !== undefined ? [[lado, unico]] : []
  })
  const [primero] = lados
  if (
    lados.length === LADOS.length &&
    primero !== undefined &&
    lados.every(([, b]) => b === primero[1])
  )
    comun.bordes = { todos: primero[1] }
  else if (lados.length > 0) comun.bordes = Object.fromEntries(lados)
  return comun
}
