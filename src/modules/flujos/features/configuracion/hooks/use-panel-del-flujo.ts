'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { createContext, use } from 'react'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_SECCION,
  CLAVES_DEL_PANEL_DE_FASE,
  SECCIONES_DEL_PANEL,
  type SeccionDelPanel,
} from '../../../entities/panel-del-flujo'
import { CLAVE_DE_FASE_ABIERTA } from './use-fase-abierta'

// Las secciones del flujo que esta persona puede abrir en el panel (las que la página le dio a `<PantallaDelFlujo secciones>`).
export const ContextoDeSeccionesDelPanel = createContext<readonly SeccionDelPanel[]>([])

const PARAMETROS = {
  [CLAVE_DE_SECCION]: parseAsString,
  [CLAVE_DE_FASE_ABIERTA]: parseAsString,
  ...Object.fromEntries(CLAVES_DEL_PANEL_DE_FASE.map((clave) => [clave, parseAsString])),
}
const LIMPIAS = Object.fromEntries(CLAVES_DEL_PANEL_DE_FASE.map((clave) => [clave, null]))

const esSeccion = (valor: string | null | undefined): valor is SeccionDelPanel =>
  SECCIONES_DEL_PANEL.some((clave) => clave === valor)

// Lo del flujo entero en el panel (`?seccion=reglas|documentos`): las reglas y la oferta de transporte, los tipos de documento. Abrir suma al historial, quita la
// fase abierta y lo que abría, y pide la sección al servidor (`shallow: false`: la dibuja él); mientras llega, el panel muestra su esqueleto.
export function usePanelDelFlujo() {
  const disponibles = use(ContextoDeSeccionesDelPanel)
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const valor = url[CLAVE_DE_SECCION]
  const seccion = esSeccion(valor) && disponibles.includes(valor) ? valor : null
  useVueltaDelFoco(CLAVE_DE_SECCION, seccion !== null)
  return {
    seccion,
    disponibles,
    abrirSeccion: (clave: SeccionDelPanel) => {
      abrirConVuelta(
        CLAVE_DE_SECCION,
        () =>
          setUrl(
            { ...LIMPIAS, [CLAVE_DE_FASE_ABIERTA]: null, [CLAVE_DE_SECCION]: clave },
            { shallow: false, history: 'push' },
          ),
        seccion === clave,
      )
    },
    cerrar: () => {
      void setUrl({ ...LIMPIAS, [CLAVE_DE_SECCION]: null })
    },
  }
}
