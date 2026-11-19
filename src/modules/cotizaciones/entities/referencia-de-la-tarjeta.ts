// La referencia del lienzo del editor de la plantilla (`docs/GLOSARIO.md` › «Referencia de la tarjeta»): la cotización más reciente del origen que quien configura ve,
// dibujada con **lo guardado** como el PDF (`calculoDeLoGuardado()`), o las cifras de ejemplo. Vive en el núcleo porque la arma `src/app` (cruza el listado, la hoja
// guardada y los módulos `leads` y `vehiculos`), la recorta el área `plantilla` y la dibuja el área `tarjeta`. Plana y sin `Map`: cruza props de una página de servidor a
// un componente de cliente. Pura.
import type { CalculoDeLaTarjeta } from './calculo-de-la-tarjeta'
import type { ContextoDeLaCotizacion } from './contexto-de-la-cotizacion'
import type { Estado } from './motor-contexto'

export type ValorDeLaReferencia = number | string | null

export type ReferenciaDeLaTarjeta =
  | {
      readonly estado: 'cotizacion'
      // El número de la cotización: «Cotización n.º 123».
      readonly numero: number
      readonly valores: readonly (readonly [string, ValorDeLaReferencia])[]
      readonly estados: readonly (readonly [string, Estado])[]
      readonly totales: { readonly usd: number | null; readonly bs: number | null }
      readonly modoTc: string | null
      readonly verTotalBs: boolean
      // La moneda local del total de su versión (`cabecera.monedaBs`), para «Ver total Bs».
      readonly monedaBs: string | null
      readonly contexto: ContextoDeLaCotizacion
    }
  // El origen no tiene una cotización que quien configura vea (sin papelera).
  | { readonly estado: 'sin_cotizacion' }
  // Algo falló al leerla, o su primer recálculo no dio estados (la tarjeta caería a la de por omisión): cifras de ejemplo y se dice.
  | { readonly estado: 'no_se_leyo' }

export type ReferenciaLeida = Extract<ReferenciaDeLaTarjeta, { estado: 'cotizacion' }>

// Lo que se lee de una guardada para la referencia, en la forma plana. Sin estados (el recálculo falló) no hay referencia: `no_se_leyo`.
export function referenciaPlana(
  calculo: CalculoDeLaTarjeta,
  datos: { numero: number; monedaBs: string | null; contexto: ContextoDeLaCotizacion },
): ReferenciaDeLaTarjeta {
  if (calculo.estados === null) return { estado: 'no_se_leyo' }
  return {
    estado: 'cotizacion',
    numero: datos.numero,
    valores: [...calculo.valores.entries()],
    estados: [...calculo.estados.entries()],
    totales: { usd: calculo.totales.usd, bs: calculo.totales.bs },
    modoTc: calculo.modoTc,
    verTotalBs: calculo.verTotalBs,
    monedaBs: datos.monedaBs,
    contexto: datos.contexto,
  }
}

// Sólo los valores y estados de estos ids (los nodos del contexto reducido del editor): el primer HTML no crece con la fórmula.
export function recortarLaReferencia(
  referencia: ReferenciaDeLaTarjeta,
  ids: ReadonlySet<string>,
): ReferenciaDeLaTarjeta {
  if (referencia.estado !== 'cotizacion') return referencia
  return {
    ...referencia,
    valores: referencia.valores.filter(([id]) => ids.has(id)),
    estados: referencia.estados.filter(([id]) => ids.has(id)),
  }
}

// La referencia en la forma que usa la geometría (por id, con `Map`: `__proto__` y `constructor` son ids legales).
export function calculoDeLaReferencia(referencia: ReferenciaLeida): CalculoDeLaTarjeta {
  return {
    valores: new Map(referencia.valores),
    estados: new Map(referencia.estados),
    totales: { usd: referencia.totales.usd, bs: referencia.totales.bs },
    modoTc: referencia.modoTc,
    verTotalBs: referencia.verTotalBs,
  }
}
