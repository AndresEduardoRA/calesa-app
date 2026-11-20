import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { puede } from '@/shared/lib/permisos'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'
import { ConLaFormulaDeTrabajo } from '../con-la-formula-de-trabajo'
import { EsqueletoDeLaTarjeta } from './esqueleto-de-la-tarjeta'
import { leerReferenciaDeLaTarjeta } from './referencia'

export const metadata: Metadata = { title: 'Tarjeta del origen' }

// Configuración › Orígenes › un origen › Fórmula › Tarjeta: la imagen que recibe el cliente (la plantilla de la tarjeta de la cotización), editada como un
// Excel sobre el lienzo, a todo el ancho: el lienzo es la vista previa (`?panel=publicar-tarjeta`, `descartar-plantilla`). La referencia del lienzo (la
// cotización más reciente del origen que quien configura ve) se pide aquí como promesa, sin esperarla: la sección la espera junto a la plantilla y la
// latencia es la de la más lenta.
export default async function PaginaDeLaTarjeta({
  params,
}: PageProps<'/configuracion/origenes/[id]/formula/tarjeta'>) {
  const abierto = await abrirOrigen((await params).id, 'formula')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const { sesion } = abierto
  const { id, nombre, activo } = abierto.origen
  return (
    <Suspense fallback={<EsqueletoDeLaTarjeta />}>
      <ConLaFormulaDeTrabajo origenId={id}>
        {(formula) => (
          <SeccionDeLaPlantilla
            origen={{ id, nombre, activo }}
            formula={formula}
            referencia={leerReferenciaDeLaTarjeta(id, sesion.permisos)}
            Lienzo={LienzoDeLaPlantillaDiferido}
            puedeCambiarElLogo={puede(sesion.permisos, 'empresa.ajustes.gestionar')}
          />
        )}
      </ConLaFormulaDeTrabajo>
    </Suspense>
  )
}
