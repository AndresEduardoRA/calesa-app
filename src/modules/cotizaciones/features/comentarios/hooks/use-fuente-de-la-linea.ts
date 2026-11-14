'use client'

import { useCallback, useEffect, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'

type Estado<P, C> = {
  paginas: P[]
  siguiente: C | null
  leida: boolean
  error: ErrorApp | null
  pidiendo: boolean
  // Un intento más de la primera página: cambia el pedido aunque el error ya estuviera limpio.
  intento: number
}

type Opciones<P, T, C> = {
  leer: (cursor: C | null) => Promise<Resultado<P>>
  itemsDe: (pagina: P) => readonly T[]
  // El cursor de la página que sigue a ésta; nulo si la base no tiene más.
  siguienteDe: (pagina: P) => C | null
  // Lo que se dice si la lectura se cae sin dar un error.
  mensajeDeFallo: string
}

const SIN_LEER = {
  paginas: [],
  siguiente: null,
  leida: false,
  error: null,
  pidiendo: false,
  intento: 0,
}

// Una de las fuentes de «Todo» (comentarios, revisiones o adjuntos): su primera página al montarse y las que siguen por cursor, cada una con su error. Lo que falla en una fuente
// no toca a las otras ni a lo que ya llegó de ella. Quien la monta le pone `key` de la cotización: con otra, empieza de cero.
export function useFuenteDeLaLinea<P, T, C>({
  leer,
  itemsDe,
  siguienteDe,
  mensajeDeFallo,
}: Opciones<P, T, C>) {
  const [estado, setEstado] = useState<Estado<P, C>>(SIN_LEER)
  const porLeer = !estado.leida && estado.error === null
  const { intento } = estado
  useEffect(() => {
    if (!porLeer) {
      return
    }
    let vigente = true
    leer(null)
      .catch((): Resultado<P> => fallo('inesperado', mensajeDeFallo))
      .then((resultado) => {
        if (vigente) {
          setEstado((antes) =>
            antes.intento !== intento
              ? antes
              : resultado.ok
                ? {
                    ...antes,
                    paginas: [resultado.data],
                    siguiente: siguienteDe(resultado.data),
                    leida: true,
                  }
                : { ...antes, error: resultado.error },
          )
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
    // `leer`, `siguienteDe` y el mensaje cambian en cada render; lo que decide cuándo se vuelve a leer es `porLeer` y el intento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porLeer, intento])

  const { siguiente, pidiendo, leida } = estado
  const pedirMas = useCallback(() => {
    if (!leida || pidiendo || siguiente === null) {
      return
    }
    setEstado((antes) => ({ ...antes, pidiendo: true, error: null }))
    leer(siguiente)
      .catch((): Resultado<P> => fallo('inesperado', mensajeDeFallo))
      .then((resultado) => {
        setEstado((antes) =>
          resultado.ok
            ? {
                ...antes,
                paginas: [...antes.paginas, resultado.data],
                siguiente: siguienteDe(resultado.data),
                pidiendo: false,
              }
            : { ...antes, pidiendo: false, error: resultado.error },
        )
      })
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leida, pidiendo, siguiente])

  return {
    paginas: estado.paginas,
    items: estado.paginas.flatMap(itemsDe),
    leida,
    hayMas: siguiente !== null,
    error: estado.error,
    pidiendo,
    pedirMas,
    // Sin primera página vuelve a pedirla; con ella, repite el «Ver más» que falló.
    reintentar: () => {
      if (!leida) {
        setEstado((antes) => ({ ...antes, error: null, intento: antes.intento + 1 }))
      } else {
        pedirMas()
      }
    },
  }
}
