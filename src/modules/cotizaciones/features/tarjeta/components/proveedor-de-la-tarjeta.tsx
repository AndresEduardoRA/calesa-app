'use client'

import { useCallback, useMemo, type ReactNode } from 'react'
import { ContextoDeLaVistaPrevia } from '../../hoja/components/hueco-de-la-vista-previa'
import type { PropsDeLaVistaPrevia } from '../../hoja/components/huecos'
import { VistaPreviaDiferida } from './diferidos'
import type { DatosDeLaPagina } from './vista-previa-de-la-tarjeta'

type Props = DatosDeLaPagina & { children: ReactNode }

// Enciende «Vista previa» en la hoja (4.18-2): llena el hueco `ContextoDeLaVistaPrevia` con una función que dibuja el modal con lo que la página sabe (vehículo, asesor, número,
// logo y, en una guardada, su id para el PDF). Sólo importa la cáscara diferida: la tarjeta, su modelo y su lectura no viajan con la hoja. Sin este proveedor la hoja no dibuja el botón.
export function ProveedorDeLaTarjeta({
  children,
  vehiculo,
  asesor,
  numero,
  vencida,
  guardadaEl,
  logo,
  cotizacionId,
  titulo,
}: Props) {
  // El título de una guardada llega de la página (el guardado); sin él, la hoja nueva lee el que se está escribiendo.
  const pagina = useMemo<DatosDeLaPagina>(
    () => ({
      vehiculo,
      asesor,
      numero,
      vencida,
      guardadaEl,
      logo,
      cotizacionId,
      ...(titulo === undefined ? {} : { titulo }),
    }),
    [vehiculo, asesor, numero, vencida, guardadaEl, logo, cotizacionId, titulo],
  )
  const dibujar = useCallback(
    (props: PropsDeLaVistaPrevia) => <VistaPreviaDiferida {...props} pagina={pagina} />,
    [pagina],
  )
  const valor = useMemo(() => ({ dibujar }), [dibujar])
  return <ContextoDeLaVistaPrevia value={valor}>{children}</ContextoDeLaVistaPrevia>
}
