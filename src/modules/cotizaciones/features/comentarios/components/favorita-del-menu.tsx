'use client'

import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { useAporteAlMenu } from '../../hoja/components/menu-de-la-guardada'
import { ponerFavorita } from '../actions/poner-favorita'

const NO_SE_MARCO = 'No se pudo cambiar la favorita.'

// «Favorita» (4.27-4): una casilla del «⋯» de la cabecera de la guardada, una marca privada de quien mira. Cambia al tocar, antes de que responda la base; la respuesta manda
// y, si falla, vuelve a como estaba y lo avisa. No dibuja nada: sólo suma su línea.
export function FavoritaDelMenu({
  cotizacionId,
  favorita,
}: {
  cotizacionId: string
  favorita: boolean
}) {
  const [marcada, setMarcada] = useState(favorita)
  const [leida, setLeida] = useState(favorita)
  // Lo que trae una lectura nueva de la página (otra pestaña la cambió y se recargó) reemplaza lo de aquí.
  if (favorita !== leida) {
    setLeida(favorita)
    setMarcada(favorita)
  }
  // El último toque manda: una respuesta vieja no pisa lo que se tocó después.
  const ultimo = useRef(0)

  async function cambiar(valor: boolean) {
    const antes = marcada
    const toque = ++ultimo.current
    setMarcada(valor)
    const resultado = await enviarAccion(ponerFavorita({ cotizacionId, valor }), NO_SE_MARCO)
    if (toque !== ultimo.current) {
      return
    }
    if (resultado.ok) {
      setMarcada(resultado.data.valor)
    } else {
      setMarcada(antes)
      avisarError(resultado.error)
    }
  }

  useAporteAlMenu({
    favorita: {
      tipo: 'casilla',
      marcada,
      alCambiar: (valor) => {
        void cambiar(valor)
      },
    },
  })
  return null
}
