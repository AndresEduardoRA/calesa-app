// Composición del área `plantilla` de `cotizaciones` en el servidor (4.15-4): lo que lee y escribe el editor de la plantilla de la tarjeta. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeLaPlantilla } from '../../entities/plantilla/escritura-de-la-plantilla'
import { plantillaSupabase } from '../../infra/plantilla/escritura'
import { lecturaDeLaTarjetaDeTrabajo } from '../../entities/plantilla/tarjeta-de-trabajo'
import type { LecturaDeLaTarjetaEnVivo } from '../../entities/tarjeta-en-vivo'
import { leerPlantillaDelOrigen as leerLaPlantillaDelOrigen } from '../../infra/plantilla/lectura'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { DatosDePlantillasDeV1 } from '../../entities/plantilla/datos-de-plantillas-de-v1'
import { datosDePlantillasDeV1 } from '../../entities/plantilla/plantillas-de-v1'
import { PLANTILLAS_DE_V1 } from '../../entities/plantillas-de-v1'
import { plantillasDeV1Supabase } from '../../infra/plantilla/plantillas-de-v1-de-la-sesion'

// El borrador, la publicada y lo que las valida (la fórmula publicada y el catálogo de tonos) de un origen, con la sesión de quien mira (4.19-3a).
export const leerPlantillaDelOrigen = leerLaPlantillaDelOrigen
// Guardar el borrador, publicarlo con nota y descartarlo, por las RPC del 4.19-1 (4.19-3a).
export const repositorioDeLaPlantilla: RepositorioDeLaPlantilla = plantillaSupabase

// La tarjeta de trabajo del origen para la tarjeta en vivo de la planilla de la fórmula (`entities/tarjeta-en-vivo.ts`): la misma lectura que la pestaña «Tarjeta»
// (`plantillas_tarjeta`, `formulas` y `tonos` con la sesión de quien mira), en el servidor y en paralelo con la de la fórmula. Nunca rechaza: un fallo es `no_se_leyo`.
export async function leerLaTarjetaDeTrabajo(origen: {
  id: string
  nombre: string
}): Promise<LecturaDeLaTarjetaEnVivo> {
  try {
    const leida = await leerLaPlantillaDelOrigen(origen.id)
    return leida.ok ? lecturaDeLaTarjetaDeTrabajo(leida.data, origen) : { estado: 'no_se_leyo' }
  } catch {
    return { estado: 'no_se_leyo' }
  }
}

// Las plantillas de V1 para el modal «Empezar desde una plantilla» de un origen (la ruta `GET …/<origen>/plantillas-de-v1` de `src/app`, que suma lo que esta área
// no lee: los tipos de cambio de la empresa y los campos del origen). Los borradores y el catálogo, con la sesión de quien configura.
export async function leerPlantillasDeV1(
  origen: { id: string; nombre: string },
  hay: { tiposDeCambio: readonly string[]; campos: readonly string[] },
  usuarioId: string,
): Promise<Resultado<DatosDePlantillasDeV1>> {
  const estado = await plantillasDeV1Supabase.leerEstado(origen.id)
  if (!estado.ok) return estado
  const { formula, tarjeta, catalogo } = estado.data
  return ok(
    datosDePlantillasDeV1(PLANTILLAS_DE_V1, {
      origen: origen.nombre,
      catalogo,
      tiposDeCambio: hay.tiposDeCambio,
      campos: hay.campos,
      borradores: {
        formula:
          formula === null
            ? null
            : {
                // Sin nombre (o sin quien la empezó), «Alguien», como el historial de la fórmula.
                autor: formula.autor ?? 'Alguien',
                tuyo: formula.creadoPor === usuarioId,
                actualizadoEn: formula.actualizadoEn,
              },
        tarjeta,
      },
    }),
  )
}

// Leer el catálogo y aplicar una plantilla de V1 (`cotizacion_paquete_aplicar()`), para la action.
export const plantillasDeV1 = plantillasDeV1Supabase
