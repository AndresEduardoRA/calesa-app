'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_CAMBIO, idDelCambio } from '../../../entities/actividad'

const PARAMETROS = { [CLAVE_DE_CAMBIO]: parseAsString }

// Qué cambio está desplegado, en la URL (`?cambio=<id>`): sobrevive a recargar y se puede compartir. Uno a la vez; desplegar otro pliega el
// anterior. Reemplaza la entrada del historial (desplegar una fila no es ir a otra pantalla) y no va al servidor: el detalle se lee desde el
// navegador. `texto` es la URL tal cual (un `?cambio=` que no es un id dice «sin acceso») e `id`, el número o nulo.
export function useCambioAbierto() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const texto = parametros[CLAVE_DE_CAMBIO]
  const id = idDelCambio(texto)
  return {
    texto,
    id,
    abierto: texto !== null,
    alternar: (cambioId: number) => {
      void setParametros({ [CLAVE_DE_CAMBIO]: id === cambioId ? null : String(cambioId) })
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_CAMBIO]: null })
    },
  }
}

export type CambioAbierto = ReturnType<typeof useCambioAbierto>
