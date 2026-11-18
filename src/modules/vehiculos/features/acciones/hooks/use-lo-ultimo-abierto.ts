'use client'

import { useState } from 'react'

// Lo que un panel mostraba mientras estuvo abierto, para que no cambie mientras se va: al cerrar, la URL suelta `para` y el servidor deja de mandar lo
// leído, y el cuerpo pasaría a «No existe» o al esqueleto durante la animación de cierre.
export function useLoUltimoAbierto<T>(valor: T, abierto: boolean): T {
  const [ultimo, setUltimo] = useState(valor)
  if (abierto && valor !== ultimo) {
    setUltimo(valor)
  }
  return abierto ? valor : ultimo
}
