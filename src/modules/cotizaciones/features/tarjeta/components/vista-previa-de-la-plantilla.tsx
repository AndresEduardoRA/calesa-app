'use client'

import { useMemo } from 'react'
import { useRegional } from '@/shared/ui/regional'
import { geometriaDeLaTarjeta } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import { lecturaDesdeLaPlana } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  calculoDeEjemplo,
  CONTEXTO_DE_EJEMPLO,
} from '../../../entities/tarjeta/vista-previa-de-ejemplo'
import {
  FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA,
  type PropsDeLaVistaPreviaDeLaPlantilla,
} from '../../../entities/vista-previa-de-la-plantilla'
import { OcultasDeLaTarjeta } from './ocultas-de-la-tarjeta'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

// La vista previa en vivo del editor de la plantilla (4.19-4): la cuadrícula convertida con cifras de ejemplo, que sigue a lo que se tipea, y debajo las filas
// que se ocultarían con esta referencia. No lee, no escribe y no es interactiva.
export function VistaPreviaDeLaPlantilla({ lectura }: PropsDeLaVistaPreviaDeLaPlantilla) {
  const { locale } = useRegional()
  const geometria = useMemo(() => {
    const tarjeta = lecturaDesdeLaPlana(lectura.lectura)
    return geometriaDeLaTarjeta({
      lectura: tarjeta,
      calculo: calculoDeEjemplo(tarjeta),
      contexto: CONTEXTO_DE_EJEMPLO,
      monedaBs: null,
      locale,
    })
  }, [lectura, locale])
  return (
    <section
      aria-label="Vista previa de la tarjeta"
      data-vista-previa-de-la-plantilla=""
      className="grid min-w-0 gap-2"
    >
      <h3 className="text-(length:--text-md) font-semibold">Vista previa</h3>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">Cifras de ejemplo.</p>
      <TarjetaDeCotizacion geometria={geometria} logo={CONTEXTO_DE_EJEMPLO.logo} />
      <OcultasDeLaTarjeta ocultas={geometria.ocultas} />
      {lectura.filasDeMas > 0 ? (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Se muestran las primeras {FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA} filas de cada grupo.
        </p>
      ) : null}
    </section>
  )
}
