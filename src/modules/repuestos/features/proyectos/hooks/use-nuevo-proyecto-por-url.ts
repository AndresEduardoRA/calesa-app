'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  CLAVE_DE_LEAD_DEL_PROYECTO,
  CLAVE_DE_VEHICULO,
  CLAVE_DEL_PROYECTO_NUEVO,
  PANEL_NUEVO_PROYECTO,
  PROYECTO_NUEVO,
  nuevoProyectoALaVista,
  nuevoProyectoEnLaUrl,
} from '../../../entities/proyectos/paneles'
import { SIN_PERMISO_PARA_CREAR_PROYECTOS } from '../../../entities/proyectos/errores'

const CLAVES = [CLAVE_DE_VEHICULO, CLAVE_DE_LEAD_DEL_PROYECTO, CLAVE_DEL_PROYECTO_NUEVO]
const PARSERS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DEL_PROYECTO_NUEVO]: parseAsString,
  [CLAVE_DE_LEAD_DEL_PROYECTO]: parseAsString,
}

// «Nuevo proyecto» en la URL (`?panel=nuevo-proyecto`, y `&vehiculo=<id>` para abrirlo ya vinculado, 8.09-4, o `&lead=<id>` con el cliente elegido): se puede recargar, «atrás»
// lo cierra y se comparte. Sin `repuestos.editar` no abre: se avisa y la URL se limpia, una vez. Cada apertura es nueva (`apertura`): un id de intento nuevo y los campos vacíos.
// Mientras «Nuevo lead» ocupa `?panel=`, el formulario sigue en la URL por su clave propia (`?nuevo=proyecto`, que escribe `dejarDebajo()`): `enLaUrl` sigue y `abierto`
// (a la vista) no. Cerrar y abrir limpian las cuatro claves.
export function useNuevoProyectoPorUrl(puedeEditar: boolean) {
  const url = usePanelPorUrl(PANEL_NUEVO_PROYECTO, CLAVES)
  const [claves, escribir] = useQueryStates(PARSERS)
  const enLaUrl = nuevoProyectoEnLaUrl(claves)
  const aLaVista = nuevoProyectoALaVista(claves)
  const apertura = useApertura(enLaUrl)
  const rechazada = useRevisionAlAbrir(
    enLaUrl ? String(apertura) : null,
    puedeEditar ? null : SIN_PERMISO_PARA_CREAR_PROYECTOS,
    url.cerrar,
  )
  return {
    abierto: aLaVista && !rechazada,
    enLaUrl: enLaUrl && !rechazada,
    apertura,
    // El `?vehiculo=` y el `?lead=` que trae la URL ahora: el servidor sólo los resolvió si son los de la carga.
    vehiculoEnLaUrl: url.valor(CLAVE_DE_VEHICULO),
    leadEnLaUrl: claves[CLAVE_DE_LEAD_DEL_PROYECTO],
    abrir: () => {
      url.abrir()
    },
    cerrar: url.cerrar,
    // Antes de abrir «Nuevo lead»: el formulario queda en la URL debajo del alta (reemplaza la entrada, como el alta).
    dejarDebajo: () => {
      void escribir({ [CLAVE_DEL_PROYECTO_NUEVO]: PROYECTO_NUEVO }, { history: 'replace' })
    },
    // El lead de `?lead=` ya está en el formulario: la clave se suelta sin sumar una entrada.
    soltarLead: () => {
      void escribir({ [CLAVE_DE_LEAD_DEL_PROYECTO]: null }, { history: 'replace' })
    },
  }
}
