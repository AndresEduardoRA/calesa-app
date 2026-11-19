'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useCallback, useTransition } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { CLAVE_DE_AGRUPAR, VALORES_DE_AGRUPAR } from '../../../entities/listado/grupos-del-listado'
import { guardarPreferenciaDeLaLista } from './guardar-preferencia-de-la-lista'

const PARAMETROS = {
  [CLAVE_DE_AGRUPAR]: parseAsStringLiteral(VALORES_DE_AGRUPAR),
  [CLAVE_DE_CURSOR]: parseAsString,
}

// «Agrupar por vehículo»: lo que dice la URL (`?agrupar=si|no`) o, si no dice nada, lo que la página decidió con la preferencia (`preferida`). Cambiar relee la página
// (otra lectura: grupos o cotizaciones), vuelve a la primera (un cursor de una no sirve en la otra) y guarda la preferencia; escribe siempre la clave, así la página
// no depende de que la preferencia ya esté guardada al releer. Si no se pudo guardar, la lista igual cambió en esta pestaña.
export function useAgruparCotizaciones(preferida: boolean) {
  const [cambiando, startTransition] = useTransition()
  const [parametros, setParametros] = useQueryStates(PARAMETROS, {
    shallow: false,
    startTransition,
  })
  const pedida = parametros[CLAVE_DE_AGRUPAR]
  const agrupar = pedida === null ? preferida : pedida === 'si'
  const cambiar = useCallback(
    (valor: boolean) => {
      void setParametros({ [CLAVE_DE_AGRUPAR]: valor ? 'si' : 'no', [CLAVE_DE_CURSOR]: null })
      guardarPreferenciaDeLaLista({ clave: 'agrupar', valor })
    },
    [setParametros],
  )
  return { agrupar, cambiar, cambiando }
}
