'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { plantillasDeV1 } from '../../../areas/plantilla/composicion'
import { MOTIVO_SIN_PERMISO_DE_PLANTILLA } from '../../../entities/plantilla/escritura-de-la-plantilla'
import { TOPE_DE_TONOS } from '../../../entities/plantilla/lectura-de-la-plantilla'
import { plantillaDeV1 } from '../../../entities/plantillas-de-v1'
import { coloresDeLaPlantilla, motivoDeColores } from '../../../entities/plantillas-de-v1/colores'
import { plantillaConClaves } from '../../../entities/plantillas-de-v1/con-claves'
import { pedidoDeLaPlantilla } from '../../../entities/plantillas-de-v1/pedido'
import type { Aplicada } from '../../../entities/plantillas-de-v1/pedido'
import { esquemaDeAplicarPlantillaDeV1 } from '../schemas/plantilla-de-v1'

// Empieza un origen desde una plantilla de V1 (`cotizacion_paquete_aplicar()`): crea los borradores de la fórmula (con su diseño) y de la tarjeta, y los colores que
// falten, todo o nada; no publica. El navegador manda la clave del paquete y las versiones de los borradores que leyó; el paquete sale del código. Los colores se
// eligen aquí contra el catálogo de ahora (si no caben, no se llama a la base) y la base vuelve a mirar el reuso y el tope bajo su candado. Cada color nuevo lleva el
// id de este intento: repetir el pedido no duplica nada. docs/COTIZADOR.md › «Plantillas de V1».
export const aplicarLaPlantillaDeV1 = actionClient
  .inputSchema(esquemaDeAplicarPlantillaDeV1)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<Aplicada>> => {
    const { origenId, plantilla: clave, formulaEsperada, plantillaEsperada } = parsedInput
    if (!puede(ctx.permisos, 'cotizaciones.configurar', origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_PLANTILLA)
    }
    const plantilla = plantillaDeV1(clave)
    const estado = await plantillasDeV1.leerEstado(origenId)
    if (!estado.ok) return estado
    const colores = coloresDeLaPlantilla(plantilla, estado.data.catalogo, TOPE_DE_TONOS)
    if (!colores.ok) return fallo('regla', motivoDeColores(colores))
    const pedido = pedidoDeLaPlantilla(
      plantillaConClaves(plantilla, colores.mapa),
      colores,
      colores.crear.map(() => crypto.randomUUID()),
    )
    const hecho = await plantillasDeV1.aplicar({
      origenId,
      pedido,
      formulaEsperada,
      plantillaEsperada,
    })
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion, 'layout')
    }
    return hecho
  })
