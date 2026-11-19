'use client'

import { parseAsStringLiteral, useQueryStates } from 'nuqs'
import {
  CLAVE_DE_REFERENCIA,
  REFERENCIA_DE_EJEMPLO,
} from '../../../entities/plantilla/referencia-del-lienzo'

const PARAMETROS = { [CLAVE_DE_REFERENCIA]: parseAsStringLiteral([REFERENCIA_DE_EJEMPLO]) }

// La referencia del lienzo en la URL: `?referencia=ejemplo` dibuja con las cifras de ejemplo; sin la clave, con la cotización de referencia. Sin ir al servidor
// (`shallow`): el servidor siempre lee la referencia y ninguna lectura depende de la clave.
export function useReferenciaDelLienzo() {
  const [url, setUrl] = useQueryStates(PARAMETROS, { shallow: true, history: 'replace' })
  return {
    ejemplo: url[CLAVE_DE_REFERENCIA] === REFERENCIA_DE_EJEMPLO,
    elegir: (ejemplo: boolean) => {
      void setUrl({ [CLAVE_DE_REFERENCIA]: ejemplo ? REFERENCIA_DE_EJEMPLO : null })
    },
  }
}
