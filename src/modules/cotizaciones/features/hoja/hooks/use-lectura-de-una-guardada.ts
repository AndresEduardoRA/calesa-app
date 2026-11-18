'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// «Recargar» en la hoja de una cotización guardada (4.15-3): pide la página al servidor y, cuando su lectura llega (`llego`), cuenta una lectura más para que la hoja se vuelva a
// montar con ella aunque la versión de la cotización no se haya movido (`nodo_no_editable`, un recálculo que pide recargar). Una lectura que llega sin que nadie la pidió no la cuenta:
// lo tipeado se queda. `olvidarAviso` es el del guardado: el aviso del último intento hablaba de la hoja de antes. `antes` corre primero y, si ya pidió la página (soltó el
// vehículo elegido de la URL, T315), no se pide otra vez.
export function useLecturaDeUnaGuardada(
  olvidarAviso: () => void,
  antes: () => boolean = () => false,
): {
  lecturas: number
  recargar: () => void
  llego: () => void
} {
  const router = useRouter()
  const [pedida, setPedida] = useState(false)
  const [lecturas, setLecturas] = useState(0)
  return {
    lecturas,
    recargar: () => {
      setPedida(true)
      if (!antes()) {
        router.refresh()
      }
    },
    llego: () => {
      if (pedida) {
        setPedida(false)
        setLecturas((n) => n + 1)
        olvidarAviso()
      }
    },
  }
}
