import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import { esquemaDeSituacionDeLaUnidad, type SituacionDeLaUnidad } from '../nucleo/situacion'

// Lo que devuelven `logistica_cadena_columna()` (la lista de una fase) y `logistica_donde_esta()` (6.02), validado con Zod en el borde (ids con `z.guid()`, fechas como texto ISO): su
// `Returns` es `Json`. Una forma que no es la esperada es un error visible, nunca una página cortada ni una fila a medias.

export type VehiculoDeLaFase = {
  id: string
  // La identidad del vehículo «<principal> · <título>» (6.13); mientras no se arma, es el título (la infra la reemplaza).
  nombre: string
  titulo: string
  vin: string | null
  lote: string | null
  faseDesde: string | null
  // La situación real (la calcula la base): la fila dice «En subasta» o «Sin resolver»; una no ganada no llega (no cuenta).
  situacion: SituacionDeLaUnidad
  // Lo calculó la base con los días de la fase y la regla `alerta_demora`: la interfaz no lo recalcula.
  demorada: boolean
  contenedor: string | null
  booking: string | null
  etaEl: string | null
}

export type PaginaDeLaFase = { vehiculos: VehiculoDeLaFase[]; hayMas: boolean }

export type UnidadDondeEsta = {
  id: string
  origenId: string
  titulo: string
  vin: string | null
  lote: string | null
  faseId: string | null
  faseNombre: string | null
  faseColor: string | null
  faseDesde: string | null
  etaEl: string | null
}

export type ResultadoDeDondeEsta = { unidades: UnidadDondeEsta[]; hayMas: boolean }

const esquemaDeVehiculo = z.object({
  id: z.guid(),
  titulo: z.string(),
  vin: z.string().nullable(),
  lote: z.string().nullable(),
  fase_desde: z.string().nullable(),
  situacion: esquemaDeSituacionDeLaUnidad,
  demorada: z.boolean(),
  contenedor: z.string().nullable(),
  booking: z.string().nullable(),
  eta_el: z.string().nullable(),
})

const esquemaDeLaPagina = z.object({ tarjetas: z.array(esquemaDeVehiculo), hay_mas: z.boolean() })

const esquemaDeDondeEsta = z.object({
  unidades: z.array(
    z.object({
      id: z.guid(),
      origen_id: z.guid(),
      titulo: z.string(),
      vin: z.string().nullable(),
      lote: z.string().nullable(),
      fase_id: z.guid().nullable(),
      fase_nombre: z.string().nullable(),
      fase_color: z.string().nullable(),
      fase_desde: z.string().nullable(),
      eta_el: z.string().nullable(),
    }),
  ),
  hay_mas: z.boolean(),
})

function vehiculoDe(fila: z.infer<typeof esquemaDeVehiculo>): VehiculoDeLaFase {
  return {
    id: fila.id,
    nombre: fila.titulo,
    titulo: fila.titulo,
    vin: fila.vin,
    lote: fila.lote,
    faseDesde: fila.fase_desde,
    situacion: fila.situacion,
    demorada: fila.demorada,
    contenedor: fila.contenedor,
    booking: fila.booking,
    etaEl: fila.eta_el,
  }
}

/** La página que devolvió `logistica_cadena_columna()`: los vehículos de la fase, con el título como nombre (la infra lo reemplaza por la identidad). */
export function paginaDeLaFaseDesde(datos: unknown): Resultado<PaginaDeLaFase> {
  const leida = esquemaDeLaPagina.safeParse(datos)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok({ vehiculos: leida.data.tarjetas.map(vehiculoDe), hayMas: leida.data.hay_mas })
}

/** Lo que devolvió `logistica_donde_esta()`. */
export function dondeEstaDesde(datos: unknown): Resultado<ResultadoDeDondeEsta> {
  const leida = esquemaDeDondeEsta.safeParse(datos)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok({
    unidades: leida.data.unidades.map((u) => ({
      id: u.id,
      origenId: u.origen_id,
      titulo: u.titulo,
      vin: u.vin,
      lote: u.lote,
      faseId: u.fase_id,
      faseNombre: u.fase_nombre,
      faseColor: u.fase_color,
      faseDesde: u.fase_desde,
      etaEl: u.eta_el,
    })),
    hayMas: leida.data.hay_mas,
  })
}
