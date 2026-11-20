// El filtro viejo «Situación» (`?situacion=`: las situaciones propias, las fases y «Sin fase» en una sola lista) se partió en «Subasta» y «Fase». Un enlace
// guardado redirige con 308 al equivalente (lo llama `src/app/(app)/vehiculos/enlace-viejo/route.ts`, adonde lo reescribe `src/proxy.ts`) y una vista guardada
// se lee traducida (sin migrar datos): su enlace y «la vista actual» usan las claves nuevas. Sin I/O.
//   en_subasta → subasta=vivas · sin_resolver → subasta=sin_resolver · no_ganada → subasta=no_ganadas · las fases y `ninguna` → fase=
// «Subasta» es una a la vez: si venían varias propias gana la primera en su orden (vivas › sin resolver › no ganadas). Un `subasta` o un `fase` que ya esté se
// respeta. Se quita también el cursor: era de otro filtro.
import { z } from 'zod'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { FILTRO_FASE, SIN_FASE } from './filtros'
import { FILTRO_SUBASTA, type ValorDeSubasta } from './filtros-de-subasta'
import { SITUACIONES_PROPIAS, type SituacionPropia } from './situacion'

export const CLAVE_VIEJA_DE_SITUACION = 'situacion'

const SUBASTA_DE_LA_PROPIA: Record<SituacionPropia, ValorDeSubasta> = {
  en_subasta: 'vivas',
  sin_resolver: 'sin_resolver',
  no_ganada: 'no_ganadas',
}

const esFase = (valor: string) => valor === SIN_FASE || z.guid().safeParse(valor).success

// Lo que dice el valor viejo en las claves nuevas (cada una, si tiene algo).
function traduccion(vieja: string): { subasta?: string; fase?: string } {
  const valores = vieja.split(',')
  const propia = SITUACIONES_PROPIAS.find((situacion) => valores.includes(situacion))
  const fases = [...new Set(valores.filter(esFase))]
  return {
    ...(propia ? { subasta: SUBASTA_DE_LA_PROPIA[propia] } : {}),
    ...(fases.length > 0 ? { fase: fases.join(',') } : {}),
  }
}

type Parametros = Readonly<Record<string, string | readonly string[] | undefined>>

// El resto de la consulta, sin la clave vieja ni el cursor.
function elResto(parametros: Parametros): URLSearchParams {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    if (clave === CLAVE_VIEJA_DE_SITUACION || clave === CLAVE_DE_CURSOR) continue
    for (const uno of typeof valor === 'string' ? [valor] : (valor ?? [])) {
      consulta.append(clave, uno)
    }
  }
  return consulta
}

function ponerSiFalta(consulta: URLSearchParams, clave: string, valor: string | undefined): void {
  if (valor !== undefined && !consulta.has(clave)) {
    consulta.set(clave, valor)
  }
}

/** A dónde lleva una URL del inventario con `?situacion=`: lo mismo con las claves nuevas y sin `cursor`. Sin esa clave, null. */
export function destinoDeLaSituacionVieja(parametros: Parametros): string | null {
  const vieja = parametros[CLAVE_VIEJA_DE_SITUACION]
  if (vieja === undefined) return null
  const consulta = elResto(parametros)
  const nuevas = traduccion(typeof vieja === 'string' ? vieja : (vieja[0] ?? ''))
  ponerSiFalta(consulta, FILTRO_SUBASTA, nuevas.subasta)
  ponerSiFalta(consulta, FILTRO_FASE, nuevas.fase)
  return consulta.size === 0 ? RUTAS.vehiculos : `${RUTAS.vehiculos}?${consulta.toString()}`
}

/** Una vista guardada con `situacion`, leída con las claves nuevas (la misma vista si no la tiene). */
export function conSituacionTraducida<
  V extends { params: Readonly<Record<string, string | undefined>> },
>(vista: V): V {
  const { [CLAVE_VIEJA_DE_SITUACION]: vieja, [CLAVE_DE_CURSOR]: _cursor, ...resto } = vista.params
  if (vieja === undefined) return vista
  const nuevas = traduccion(vieja)
  return {
    ...vista,
    params: {
      ...resto,
      ...(nuevas.subasta !== undefined && resto[FILTRO_SUBASTA] === undefined
        ? { [FILTRO_SUBASTA]: nuevas.subasta }
        : {}),
      ...(nuevas.fase !== undefined && resto[FILTRO_FASE] === undefined
        ? { [FILTRO_FASE]: nuevas.fase }
        : {}),
    },
  }
}
