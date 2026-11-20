'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DEL_VISOR } from '@/shared/ui/visor-de-imagenes/use-carrusel'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  idDelResumen,
} from '../../../entities/listado/resumen-del-listado'
import { CLAVE_DE_PESTANA_DEL_RESUMEN } from '../../../entities/pestanas-del-resumen'

const CLAVE_DE_LA_FOTO = 'foto'

const PARAMETROS = {
  [CLAVE_DE_RESUMEN_DE_COTIZACION]: parseAsString,
  [CLAVE_DE_PESTANA_DEL_RESUMEN]: parseAsString,
  [CLAVE_DEL_VISOR]: parseAsString,
  [CLAVE_DE_LA_FOTO]: parseAsString,
}

// Qué cotización está abierta en el resumen, en la URL (`?cotizacion=`): sobrevive a recargar y se puede compartir. Abrir suma al historial («atrás» lo cierra), empieza en la
// pestaña «Todo» (`?pestana=` se borra al abrir y al cerrar) y abrir la que ya está abierta no suma otra. Sin `shallow: false`: abrirlo no pide nada al servidor; el resumen se dibuja con la fila de la página. `texto` es la URL tal cual (abre el resumen aunque no sea
// un guid: dice «no disponible») e `id` es el guid en minúsculas, o null. Tras recargar con el resumen abierto, «atrás» devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`).
export function useResumenDeCotizacion() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const texto = parametros[CLAVE_DE_RESUMEN_DE_COTIZACION]
  const id = idDelResumen(texto)
  useVueltaDelFoco(CLAVE_DE_RESUMEN_DE_COTIZACION, texto !== null)
  return {
    texto,
    id,
    abrir: (cotizacionId: string) => {
      abrirConVuelta(
        CLAVE_DE_RESUMEN_DE_COTIZACION,
        () =>
          setParametros(
            {
              [CLAVE_DE_RESUMEN_DE_COTIZACION]: cotizacionId,
              [CLAVE_DE_PESTANA_DEL_RESUMEN]: null,
            },
            { history: 'push' },
          ),
        id === idDelResumen(cotizacionId),
      )
    },
    // Cerrar se lleva también el visor de la imagen (`?visor=&foto=`): si no, reabrir la misma cotización lo volvería a abrir.
    cerrar: () => {
      void setParametros({
        [CLAVE_DE_RESUMEN_DE_COTIZACION]: null,
        [CLAVE_DE_PESTANA_DEL_RESUMEN]: null,
        [CLAVE_DEL_VISOR]: null,
        [CLAVE_DE_LA_FOTO]: null,
      })
    },
  }
}
