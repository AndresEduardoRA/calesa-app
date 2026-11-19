import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { PaginaPorOrigen } from '../pagina-por-origen'
import { EsqueletoDeLaTarjeta } from './esqueleto-de-la-tarjeta'
import { leerReferenciaDeLaTarjeta } from './referencia'

export const metadata: Metadata = { title: 'Tarjeta' }

// Configuración › Cotización › un origen › Tarjeta: la imagen que recibe el cliente (la plantilla de la tarjeta de la cotización), editada como un Excel sobre el lienzo,
// a todo el ancho: el lienzo es la vista previa (`?panel=publicar-tarjeta`, `descartar-plantilla`). La referencia del lienzo (la cotización más reciente del origen
// que quien configura ve) se pide aquí como promesa, sin esperarla: la sección la espera junto a la plantilla y la latencia es la de la más lenta.
export default async function PaginaDeLaTarjeta({
  params,
}: PageProps<'/configuracion/cotizacion/[origen]/tarjeta'>) {
  const [{ origen: id }, sesion] = await Promise.all([params, requerirSesion()])
  return (
    <PaginaPorOrigen
      id={id}
      pestana="tarjeta"
      ancho="completo"
      contenido={(origen) => (
        <Suspense key={origen.id} fallback={<EsqueletoDeLaTarjeta />}>
          <SeccionDeLaPlantilla
            origen={origen}
            referencia={leerReferenciaDeLaTarjeta(origen.id, sesion.permisos)}
            Lienzo={LienzoDeLaPlantillaDiferido}
          />
        </Suspense>
      )}
    />
  )
}
