'use client'

import { useCallback, useMemo, type ReactNode } from 'react'
import { pedirLaPortada } from '../../../areas/tarjeta/composicion-portada.client'
import { ContextoDeLaVistaPrevia } from '../../hoja/components/hueco-de-la-vista-previa'
import type { PropsDeLaVistaPrevia } from '../../hoja/components/huecos'
import { CompartirDeLaGuardada } from './compartir/compartir-de-la-guardada'
import { VistaPreviaDiferida } from './diferidos'
import type { DatosDeLaPagina } from './vista-previa-de-la-tarjeta'

type Props = DatosDeLaPagina & { children: ReactNode }

// Enciende «Vista previa» en la hoja (4.18-2): llena el hueco `ContextoDeLaVistaPrevia` con una función que dibuja el modal con lo que la página sabe (título, cliente,
// vehículo con lote y VIN, asesor, número, vencimiento, logo y, en una guardada, su id para el PDF). Sólo importa la cáscara diferida: la tarjeta, su modelo y su lectura no viajan con la hoja. Sin este proveedor la hoja no dibuja el botón.
// En una guardada suma «Compartir» junto a «Vista previa» (`compartir` del hueco). Con una cotización guardada (crear, guardar, cotizar encima) pide su portada (`pedirLaPortada`: la ruta la arma y la guarda), sin esperarla.
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
  logo,
  cotizacionId,
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
      logo,
      cotizacionId,
      ...(titulo === undefined ? {} : { titulo }),
    }),
    [titulo, cliente, vehiculo, asesor, numero, vencida, venceEl, guardadaEl, logo, cotizacionId],
  )
  const dibujar = useCallback(
    (props: PropsDeLaVistaPrevia) => <VistaPreviaDiferida {...props} pagina={pagina} />,
    [pagina],
  )
  // «Compartir» sólo en una guardada: la hoja nueva no cambia.
  const valor = useMemo(
    () => ({
      dibujar,
      alGuardarLaCotizacion: pedirLaPortada,
      ...(cotizacionId === null
        ? {}
        : { compartir: () => <CompartirDeLaGuardada cotizacionId={cotizacionId} /> }),
    }),
    [dibujar, cotizacionId],
  )
  return <ContextoDeLaVistaPrevia value={valor}>{children}</ContextoDeLaVistaPrevia>
}
