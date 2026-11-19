'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { CLAVE_DE_VISTA, vistaDeLista, type VistaDeLista } from '@/shared/lib/vista-de-lista'
import { guardarPreferenciaDeLaLista } from './guardar-preferencia-de-la-lista'

// Tabla o tarjetas en escritorio (como el inventario): `?vista=` (para compartir lo que se ve) o, si no dice nada, lo que la persona eligió la última vez; sin elegir,
// las tarjetas. Cambiar escribe la URL sin volver a pedir la página (las filas son las mismas) y guarda la preferencia, así la encuentra igual en su otro
// dispositivo. Si no se pudo guardar, la vista igual cambió en esta pestaña: sólo se avisa lo que la persona tiene que saber.
export function useVistaDeCotizaciones(preferida: VistaDeLista | null) {
  const parametros = useSearchParams()
  const vista = vistaDeLista({
    pedida: parametros.get(CLAVE_DE_VISTA),
    preferida,
    porDefecto: 'tarjetas',
  })
  const cambiar = useCallback(
    (nueva: VistaDeLista) => {
      const siguientes = new URLSearchParams(parametros.toString())
      siguientes.set(CLAVE_DE_VISTA, nueva)
      window.history.replaceState(null, '', `${window.location.pathname}?${siguientes.toString()}`)
      guardarPreferenciaDeLaLista({ clave: 'vista', valor: nueva })
    },
    [parametros],
  )
  return { vista, cambiar }
}
