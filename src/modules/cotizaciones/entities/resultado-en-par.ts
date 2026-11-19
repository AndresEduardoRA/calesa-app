// Lo que vuelve de guardar en par (glosario: «Cotizaciones hermanas»), en la forma que usa el núcleo del guardado: la de la primera opción es la cotización
// guardada y la de la segunda, su `hermana`. Los rechazos se leen como los de crear y guardar; el PT409 de guardar en par trae en el `hint` el id de la que cambió y
// el aviso la nombra por su opción.
import { z } from 'zod'
import {
  resultadoDeCrear,
  type CotizacionGuardada,
  type ErrorDeCrear,
  type ResultadoDeCrear,
} from './guardado'
import { resultadoDeGuardar } from './resultado-de-guardar'

type Respuesta = { data: unknown; error: ErrorDeCrear | null }

const esquemaDelPar = z.object({
  cotizaciones: z.tuple([z.unknown(), z.unknown()]),
  repetido: z.boolean(),
})

function guardadaDe(una: unknown, repetido: boolean): CotizacionGuardada | null {
  const r = resultadoDeCrear({ data: { ...(una as object), repetido }, error: null })
  return r.tipo === 'guardada' ? r.cotizacion : null
}

function parDe(data: unknown): ResultadoDeCrear {
  const leido = esquemaDelPar.safeParse(data)
  if (!leido.success) return { tipo: 'perdida' }
  const [a, b] = leido.data.cotizaciones
  const primera = guardadaDe(a, leido.data.repetido)
  const segunda = guardadaDe(b, leido.data.repetido)
  if (primera === null || segunda === null) return { tipo: 'perdida' }
  return { tipo: 'guardada', cotizacion: { ...primera, hermana: segunda } }
}

export function resultadoDeCrearEnPar(respuesta: Respuesta): ResultadoDeCrear {
  return respuesta.error ? resultadoDeCrear(respuesta) : parDe(respuesta.data)
}

// `ids` y `etiquetas`, en el orden de las opciones: el PT409 nombra la que cambió.
export function resultadoDeGuardarEnPar(
  respuesta: Respuesta,
  {
    ids,
    etiquetas,
    cambiaElVehiculo,
  }: {
    ids: readonly [string, string]
    etiquetas: readonly [string, string]
    cambiaElVehiculo: boolean
  },
): ResultadoDeCrear {
  if (!respuesta.error) return parDe(respuesta.data)
  const r = resultadoDeGuardar(respuesta, { cambiaElVehiculo })
  const cual = ids.indexOf(respuesta.error.hint ?? '')
  if (r.tipo === 'rechazo' && r.motivo === 'version_cambiada' && cual >= 0 && r.mensaje) {
    return { ...r, mensaje: `Cambió la de ${etiquetas[cual] ?? ''}: ${r.mensaje}` }
  }
  return r
}
