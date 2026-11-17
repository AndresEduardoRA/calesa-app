'use client'

import { useMemo, type ReactNode } from 'react'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { marcasDeRevision } from '../../../entities/revisar/marcas'
import { ContextoDeMarcasDelDiagrama } from '../../configuracion/hooks/use-marcas-del-diagrama'
import { useAvisosDeRevisar } from '../hooks/use-avisos-de-revisar'
import { ContextoDeRevisar } from '../hooks/use-revisar-del-flujo'

type Props = { flujo: FlujoParaConfigurar; children: ReactNode }

// El hueco `proveedorDeRevisar`: lee «Revisar» una sola vez por versión del flujo y lo da a la franja (`useRevisarDelFlujo`) y, como marcas por fase y por
// salida, al diagrama, la lista y el panel (`ContextoDeMarcasDelDiagrama`, del núcleo). Cambiar de flujo lo vuelve a leer desde cero (`key`).
export function ProveedorDeRevisar({ flujo, children }: Props) {
  return (
    <Proveedor key={flujo.id} flujo={flujo}>
      {children}
    </Proveedor>
  )
}

function Proveedor({ flujo, children }: Props) {
  const revisar = useAvisosDeRevisar(flujo)
  const { avisos, estado } = revisar
  const marcas = useMemo(() => marcasDeRevision(avisos, flujo, estado), [avisos, flujo, estado])
  return (
    <ContextoDeRevisar value={revisar}>
      <ContextoDeMarcasDelDiagrama value={marcas}>{children}</ContextoDeMarcasDelDiagrama>
    </ContextoDeRevisar>
  )
}
