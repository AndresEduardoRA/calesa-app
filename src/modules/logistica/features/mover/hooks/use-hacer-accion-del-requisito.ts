'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import type { AccionADibujar } from '../../../entities/mover/acciones-a-dibujar'
import { CLAVE_DE_LA_FALTA, CLAVE_DE_PEDIR, PANEL_PEDIR } from '../../../entities/mover/textos'
import { CLAVE_DEL_HUECO_ABIERTO } from '../../../entities/nucleo/enlaces'
import {
  ATRIBUTO_DE_CLAVE_DE_DATO,
  ATRIBUTO_DE_TIPO_DE_DOCUMENTO,
  CLAVE_DE_PAGO,
  CLAVE_DE_SUBIR,
  CLAVE_DEL_TIPO_A_SUBIR,
  PAGO_NUEVO,
  PANEL_PAGO,
} from '../../../entities/nucleo/paneles-de-la-unidad'
import { useEnZonas } from '../../nucleo/disposicion'
import { enfocarAlAparecer } from '../../nucleo/hooks/enfocar-al-aparecer'
import { abrirHueco } from '../../nucleo/hooks/eventos-de-la-unidad'

const CLAVES = {
  [CLAVE_DEL_HUECO_ABIERTO]: parseAsString,
  [CLAVE_DE_SUBIR]: parseAsString,
  [CLAVE_DEL_TIPO_A_SUBIR]: parseAsString,
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_PAGO]: parseAsString,
  [CLAVE_DE_PEDIR]: parseAsString,
  [CLAVE_DE_LA_FALTA]: parseAsString,
}

const selector = (atributo: string, valor: string) => `[${atributo}="${CSS.escape(valor)}"]`

// Lo que hace cada acción de un requisito de «Qué falta» (ya filtrada por `accionesADibujar`). En las zonas de la página, lo que abre un panel de otro hueco va en
// **una** escritura de la URL que también elige su pestaña (`?hueco=`): mezclarla con la de `abrirHueco` en el mismo tick pisaría una de las dos. En bloques
// (celular, drawers), primero se abre el bloque y después se escribe. «Ir» navega con `salirSinPerder` (un formulario abierto pregunta).
export function useHacerAccionDelRequisito() {
  const enZonas = useEnZonas()
  const router = useRouter()
  const [valores, escribir] = useQueryStates(CLAVES)
  // El panel de pago y la subida marcan su vuelta con su propio `usePanelPorUrl`; «Pedirlo» la marca aquí también (el modal se monta recién al primer uso).
  useVueltaDelFoco(CLAVE_DE_PEDIR, valores[CLAVE_DE_PEDIR] === PANEL_PEDIR)
  const empujar = (clave: string, valores: Partial<Record<keyof typeof CLAVES, string>>) => {
    abrirConVuelta(clave, () => escribir(valores, { history: 'push' }))
  }

  return (accion: AccionADibujar, requisitoId: string): void => {
    switch (accion.tipo) {
      case 'subir':
        if (enZonas) {
          empujar(CLAVE_DE_SUBIR, {
            [CLAVE_DEL_HUECO_ABIERTO]: 'documentos',
            [CLAVE_DE_SUBIR]: 'documentos',
            [CLAVE_DEL_TIPO_A_SUBIR]: accion.tipoDocumentoId,
          })
        } else {
          abrirHueco('documentos')
          void escribir({ [CLAVE_DEL_TIPO_A_SUBIR]: accion.tipoDocumentoId })
          enfocarAlAparecer(
            '[data-bloque-del-hueco="documentos"] form[aria-label="Subir documentos"]',
            {
              campo: true,
            },
          )
        }
        return
      case 'revisar':
        abrirHueco('documentos')
        enfocarAlAparecer(selector(ATRIBUTO_DE_TIPO_DE_DOCUMENTO, accion.tipoDocumentoId))
        return
      case 'hueco':
        abrirHueco(accion.hueco)
        if (accion.enfocar) {
          enfocarAlAparecer(selector(ATRIBUTO_DE_CLAVE_DE_DATO, accion.enfocar), { campo: true })
        }
        return
      case 'registrar-pago':
        if (!enZonas) abrirHueco('pagos')
        empujar(CLAVE_DE_PANEL, {
          ...(enZonas ? { [CLAVE_DEL_HUECO_ABIERTO]: 'pagos' } : {}),
          [CLAVE_DE_PANEL]: PANEL_PAGO,
          [CLAVE_DE_PAGO]: PAGO_NUEVO,
        })
        return
      case 'pedir':
        empujar(CLAVE_DE_PEDIR, { [CLAVE_DE_PEDIR]: PANEL_PEDIR, [CLAVE_DE_LA_FALTA]: requisitoId })
        return
      case 'ir':
        salirSinPerder(() => {
          router.push(accion.ruta as Route)
        })
        return
    }
  }
}
