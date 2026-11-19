// Lo que comparten las pruebas de cada plantilla de V1 (`usa.test.ts`, `china.test.ts`, `oficina.test.ts`, `dealer.test.ts`): los tres validadores contra su
// propia fórmula, con los colores del paquete y todo del nivel «todos» (V1 no tenía niveles por celda), y el motor con la unidad de ejemplo de V1. Vive en el área
// `plantilla` porque usa `validarPlantilla()`; arma la entrada del motor con `esquemaEntrada` del núcleo (no la de prueba del área `formula`).
import { expect } from 'vitest'
import type { ModoDeCambio } from '../../formula'
import { evaluar, type Resultado } from '../../motor'
import { esquemaEntrada } from '../../motor-entrada'
import { TOPE_EN_BYTES_DE_LA_CUADRICULA } from '../../cuadricula-de-la-tarjeta'
import { validarFormula } from '../../validar'
import { validarDiseno } from '../../validar-diseno'
import type { ClaveDePlantillaDeV1 } from '../../plantillas-de-v1/claves'
import { plantillaDeV1 } from '../../plantillas-de-v1'
import type { PlantillaDeV1, UnidadDePlantillaDeV1 } from '../../plantillas-de-v1/tipos'
import { validarPlantilla } from '../validar-plantilla'

export const paquete = (clave: ClaveDePlantillaDeV1): PlantillaDeV1 => plantillaDeV1(clave)

const visibilidadDeTodos = (p: PlantillaDeV1) =>
  Object.fromEntries(
    p.formula.definicion.nodos.map((n) => [n.id, { ver: 'todos', editar: 'todos' }]),
  )

// Los tres validadores en verde y la tarjeta en forma 2, dentro de su tope.
export function validarLosTres(p: PlantillaDeV1) {
  const tonos = p.colores.map((c) => c.clave)
  const formula = validarFormula(p.formula.definicion, p.formula.params)
  expect(formula.ok ? 'ok' : formula.error).toBe('ok')
  const diseno = validarDiseno(p.formula.definicion, p.formula.diseno, {
    niveles: [],
    retirados: [],
    tonos,
  })
  expect(diseno.ok ? 'ok' : diseno.error).toBe('ok')
  const tarjeta = validarPlantilla(p.tarjeta, {
    definicion: p.formula.definicion,
    diseno: p.formula.diseno,
    visibilidad: visibilidadDeTodos(p),
    tonos,
  })
  expect(tarjeta.ok ? tarjeta.forma : tarjeta.error).toBe(2)
  expect(new TextEncoder().encode(JSON.stringify(p.tarjeta)).length).toBeLessThanOrEqual(
    TOPE_EN_BYTES_DE_LA_CUADRICULA,
  )
}

// Cada color que nombran los grupos, el diseño y la tarjeta está en `colores`, y nada sobra.
export function coloresNombrados(p: PlantillaDeV1): string[] {
  const nombrados = new Set<string>()
  for (const g of p.formula.definicion.grupos ?? []) nombrados.add(g.tono)
  if (p.formula.diseno.cabecera.tono !== undefined) nombrados.add(p.formula.diseno.cabecera.tono)
  for (const s of p.formula.diseno.secciones) if (s.tono !== undefined) nombrados.add(s.tono)
  for (const c of p.tarjeta.celdas) {
    for (const x of [c.estilo?.fondo, c.estilo?.texto])
      if (x !== undefined && x !== 'auto') nombrados.add(x)
  }
  return [...nombrados].sort()
}

type Cambio = {
  inputs?: Record<string, number>
  banderas?: Record<string, boolean>
  overrides?: Record<string, number>
  variante?: string
  tipos_cambio?: Record<string, number>
  // Otras constantes (como las de otro juego de params): se aplican como el ⚙, sobre `params`.
  params?: Record<string, number>
}

// El motor con la unidad de ejemplo de V1 (o lo que el caso cambie) en un modo del diseño (sin modo, los buckets de la fórmula).
export function calcular(p: PlantillaDeV1, modo?: string, cambio: Cambio = {}): Resultado {
  const params = { ...p.formula.params, ...cambio.params }
  const v = validarFormula(p.formula.definicion, params)
  if (!v.ok) throw new Error(v.error.mensaje)
  const u: UnidadDePlantillaDeV1 = p.unidad
  const variante = cambio.variante ?? u.variante
  const entrada = esquemaEntrada.parse({
    inputs: { ...u.inputs, ...cambio.inputs },
    banderas: { ...u.banderas, ...cambio.banderas },
    tipos_cambio: { ...u.tipos_cambio, ...cambio.tipos_cambio },
    vehiculo: u.vehiculo,
    tablas: {},
    overrides: { ...u.overrides, ...cambio.overrides },
    ...(variante === undefined ? {} : { variante }),
  })
  const m = p.formula.diseno.cabecera.modos.find((x) => x.clave === modo)
  if (modo !== undefined && m === undefined) throw new Error(`No hay modo «${modo}».`)
  const elModo: ModoDeCambio | undefined = m && {
    buckets: Object.fromEntries(m.buckets.map((b) => [b.bucket, b.nodo])),
    total_en: m.total_en,
  }
  return evaluar(v.formula, entrada, elModo)
}
