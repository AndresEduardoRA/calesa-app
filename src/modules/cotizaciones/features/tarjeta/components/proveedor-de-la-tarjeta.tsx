'use client'

import { useCallback, useMemo, type ReactNode } from 'react'
import { ContextoDeLaVistaPrevia } from '../../hoja/components/hueco-de-la-vista-previa'
import type { PropsDeLaVistaPrevia } from '../../hoja/components/huecos'
import { CompartirDeLaGuardada } from './compartir/compartir-de-la-guardada'
import { VistaPreviaDiferida } from './diferidos'
import { PdfDelMenu } from './pdf-del-menu'
import type { DatosDeLaPagina } from './vista-previa-de-la-tarjeta'

type Props = DatosDeLaPagina & { children: ReactNode }

// Enciende «Vista previa» en la hoja (4.18-2): llena el hueco `ContextoDeLaVistaPrevia` con una función que dibuja el modal con lo que la página sabe (título, cliente,
// vehículo con lote y VIN, asesor, número, vencimiento, nombre y logo de la empresa y, en una guardada, su id para el PDF y sus retoques con si quien mira la puede retocar). Sólo importa la cáscara diferida: la tarjeta, su modelo y su lectura no viajan con la hoja. Sin este proveedor la hoja no dibuja el botón.
// En una guardada suma «Compartir» (`compartir` del hueco: lo dibuja la cabecera) y «Descargar PDF» al «⋯» de la cabecera (`<PdfDelMenu>`).
export function ProveedorDeLaTarjeta({
  children,
  titulo,
  cliente,
  vehiculo,
  asesor,
  numero,
  vencida,
  venceEl,
  guardadaEl,
  empresa,
  logo,
  cotizacionId,
  retoque,
}: Props) {
  // El título de una guardada llega de la página (el guardado); sin él, la hoja nueva lee el que se está escribiendo.
  const pagina = useMemo<DatosDeLaPagina>(
    () => ({
      cliente,
      vehiculo,
      asesor,
      numero,
      vencida,
      venceEl,
      guardadaEl,
      empresa,
      logo,
      cotizacionId,
      ...(titulo === undefined ? {} : { titulo }),
      ...(retoque === undefined ? {} : { retoque }),
    }),
    [
      titulo,
      cliente,
      vehiculo,
      asesor,
      numero,
      vencida,
      venceEl,
      guardadaEl,
      empresa,
      logo,
      cotizacionId,
      retoque,
    ],
  )
  const dibujar = useCallback(
    (props: PropsDeLaVistaPrevia) => <VistaPreviaDiferida {...props} pagina={pagina} />,
    [pagina],
  )
  // «Compartir» sólo en una guardada: la hoja nueva no cambia.
  const valor = useMemo(
    () => ({
      dibujar,
      ...(cotizacionId === null
        ? {}
        : { compartir: () => <CompartirDeLaGuardada cotizacionId={cotizacionId} /> }),
    }),
    [dibujar, cotizacionId],
  )
  return (
    <ContextoDeLaVistaPrevia value={valor}>
      {children}
      {cotizacionId === null ? null : <PdfDelMenu cotizacionId={cotizacionId} numero={numero} />}
    </ContextoDeLaVistaPrevia>
  )
}
