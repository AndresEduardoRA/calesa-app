import type { Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import { EnlaceARepuestos } from './enlace-a-repuestos'
import { ESTILO_DEL_ENLACE_CORTO } from './enlaces-cortos-estilo'

type Props = {
  vehiculoId: string
  // `logistica.ver` del origen: sin él, la situación queda sin «Ver en logística».
  verLogistica: boolean
}

// Los enlaces cortos de la cabecera, al lado de la situación: «Ver en logística» (la unidad, donde se mueve) y «Repuestos · Proyecto #N», cada uno
// con su permiso. El de repuestos lee su fila tras su propio `<Suspense>`: la cabecera no lo espera.
export function EnlacesCortos({ vehiculoId, verLogistica }: Props) {
  return (
    <>
      {verLogistica ? (
        <Link href={unidadDeLogistica(vehiculoId) as Route} className={ESTILO_DEL_ENLACE_CORTO}>
          Ver en logística
        </Link>
      ) : null}
      <Suspense fallback={null}>
        <EnlaceARepuestos vehiculoId={vehiculoId} />
      </Suspense>
    </>
  )
}
