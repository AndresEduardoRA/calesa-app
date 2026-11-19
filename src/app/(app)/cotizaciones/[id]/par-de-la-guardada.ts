import {
  ladoDeLaOpcion,
  leerHojaDeUnaGuardada,
  modoDeLaHermana,
  type HojaDeUnaGuardada,
  type ModoDeLaHermana,
  type ParDeHoja,
} from '@/modules/cotizaciones'

type Lectura = Extract<Awaited<ReturnType<typeof leerHojaDeUnaGuardada>>, { ok: true }>['data']
type DeDos<T> = readonly [T, T]

export type ParDeLaGuardada =
  | { modo: Exclude<ModoDeLaHermana, { modo: 'par' }> }
  | {
      modo: { modo: 'par' }
      par: ParDeHoja
      // En el orden de las opciones; `abierta`, la posición de la que se abrió.
      hojas: DeDos<HojaDeUnaGuardada>
      iniciales: DeDos<Lectura['inicial']>
      abierta: 0 | 1
    }

// Cómo abre la guardada de una hermana (glosario: «Cotizaciones hermanas»): con la variante en par y la hermana disponible (y el mismo permiso de guardar), con las dos,
// leyendo la hermana con SU versión y el vehículo elegido; si no, o si su lectura falla, sola con el aviso.
export async function leerElParDeLaGuardada(
  lectura: Lectura,
  vehiculo: string | null,
): Promise<ParDeLaGuardada & { etiquetaDeLaOtra: string | null }> {
  const { hoja } = lectura
  const par = hoja.diseno.par
  if (!par || !hoja.hermana) return { modo: { modo: 'sin_hermana' }, etiquetaDeLaOtra: null }
  const abierta = ladoDeLaOpcion(par, hoja.opcionDelPar) ?? 0
  const otra = abierta === 0 ? 1 : 0
  const etiquetaDeLaOtra = par.opciones[otra].etiqueta
  const modo = modoDeLaHermana(hoja.hermana, hoja.puedeGuardar, etiquetaDeLaOtra)
  if (modo.modo !== 'par') return { modo, etiquetaDeLaOtra }
  const hermana = await leerHojaDeUnaGuardada(hoja.hermana.id, { vehiculo })
  if (!hermana.ok) {
    return {
      modo: { modo: 'sola', aviso: `La de ${etiquetaDeLaOtra} no está disponible.` },
      etiquetaDeLaOtra,
    }
  }
  const hojas: [HojaDeUnaGuardada, HojaDeUnaGuardada] = [hoja, hoja]
  const iniciales: [Lectura['inicial'], Lectura['inicial']] = [lectura.inicial, lectura.inicial]
  hojas[otra] = hermana.data.hoja
  iniciales[otra] = hermana.data.inicial
  return { modo, par, hojas, iniciales, abierta, etiquetaDeLaOtra }
}

// Una hermana sola (la otra no está disponible, o sólo se puede guardar una) no cambia el vehículo: es de las dos.
export const esHermanaSola = (hoja: HojaDeUnaGuardada): boolean =>
  Boolean(hoja.diseno.par && hoja.hermana) &&
  !(hoja.hermana?.disponible && hoja.hermana.puedeGuardar === hoja.puedeGuardar)
