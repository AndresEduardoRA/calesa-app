'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import type { PlantillaDeV1ParaElegir } from '../../../entities/plantilla/datos-de-plantillas-de-v1'
import type { ClaveDePlantillaDeV1 } from '../../../entities/plantillas-de-v1/claves'
import { preguntaDeReemplazo } from '../../../entities/plantillas-de-v1/pregunta'
import { useAplicarPlantillaDeV1 } from './use-aplicar-plantilla-de-v1'
import { usePlantillasDeV1 } from './use-plantillas-de-v1'

export type PasoDeLaEleccion = 'elegir' | 'confirmar'

// El modal «Empezar desde una plantilla» como modelo: la lectura al abrir, la plantilla elegida, el paso (elegir o confirmar, sólo si hay borradores o avisos) y
// aplicar. Al aplicar avisa y lleva a la planilla de esa fórmula (la action ya revalidó la página); un rechazo queda en el modal con su salida.
export function useEleccionDePlantillaDeV1(
  origen: { id: string; nombre: string },
  formula: { id: string; nombre: string },
) {
  const router = useRouter()
  const { zonaHoraria } = useRegional()
  const { lectura, recargar } = usePlantillasDeV1(origen.id, formula.id)
  const [elegida, setElegida] = useState<ClaveDePlantillaDeV1 | null>(null)
  const [paso, setPaso] = useState<PasoDeLaEleccion>('elegir')
  const datos = lectura.estado === 'lista' ? lectura.datos : null
  const plantilla: PlantillaDeV1ParaElegir | null =
    datos?.plantillas.find((p) => p.clave === elegida) ?? null
  const aplicacion = useAplicarPlantillaDeV1(origen.id, formula.id, () => {
    avisarExito(
      `Se crearon los borradores de la fórmula y de la tarjeta desde «${plantilla?.nombre ?? ''}». Revísalos y publícalos.`,
    )
    router.push(rutaDeLaFormula(origen.id, formula.id, 'planilla'))
  })
  const pregunta =
    plantilla === null || lectura.estado !== 'lista'
      ? null
      : preguntaDeReemplazo(`«${formula.nombre}»`, plantilla.nombre, lectura.datos.borradores, {
          ahora: lectura.leidoEn,
          zona: zonaHoraria,
        })
  const aplicar = () => {
    if (plantilla !== null && datos !== null)
      void aplicacion.aplicar(plantilla.clave, datos.borradores)
  }
  return {
    lectura,
    plantilla,
    elegida,
    paso,
    pregunta,
    // Por qué no se puede usar la elegida (sus colores no caben en el catálogo), o nulo.
    motivo: plantilla?.colores.tipo === 'no_caben' ? plantilla.colores.motivo : null,
    enviando: aplicacion.enviando,
    rechazo: aplicacion.rechazo,
    elegir: (clave: ClaveDePlantillaDeV1) => {
      aplicacion.olvidar()
      setElegida(clave)
    },
    // El primario: del paso de elegir pasa a confirmar si hay algo que decir; si no (o ya confirmado), aplica.
    usar: () => {
      if (plantilla === null) return
      if (paso === 'elegir' && (pregunta !== null || plantilla.avisos.length > 0))
        setPaso('confirmar')
      else aplicar()
    },
    reintentar: aplicar,
    volver: () => {
      aplicacion.olvidar()
      setPaso('elegir')
    },
    recargar: () => {
      aplicacion.olvidar()
      setPaso('elegir')
      recargar()
    },
  }
}

export type EleccionDePlantillaDeV1 = ReturnType<typeof useEleccionDePlantillaDeV1>
