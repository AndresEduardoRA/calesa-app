'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'

// El interruptor «Privada» de la hoja nueva vive en la URL (`?privada=si`, `.claude/rules/ui.md`): la hoja se vuelve a montar al elegir el cliente o el vehículo, y lo
// elegido no se pierde. Sin ir al servidor (la página no lo lee) y sin sumar al historial. Guardada, `useSoltarLoAbierto()` lo quita: la próxima nace pública.
export const CLAVE_DE_PRIVADA = 'privada'
const SI = 'si'

export function usePrivadaDeLaNueva(): { privada: boolean; cambiar: (privada: boolean) => void } {
  const [valor, escribir] = useQueryState(CLAVE_DE_PRIVADA, parseAsStringLiteral([SI]))
  return {
    privada: valor === SI,
    cambiar: (privada) => {
      void escribir(privada ? SI : null, { history: 'replace' })
    },
  }
}
