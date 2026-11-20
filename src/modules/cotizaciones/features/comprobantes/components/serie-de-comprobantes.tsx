import { Suspense } from 'react'
import { EsqueletoTarjetas } from '@/shared/ui/esqueletos'
import { leerSerieVigente } from '../../../areas/comprobantes/composicion'
import { ErrorDeLectura } from './error-de-lectura'
import { TarjetaDeLaSerie } from './tarjeta-de-la-serie'

// La pestaña «Comprobantes» de Configuración › Empresa (4.26-3): la serie vigente se lee en el servidor tras `<Suspense>` y se dibuja como una tarjeta sin `key` de versión: el modal recibe la versión por props al abrir. Si la lectura falla, el error con
// «Reintentar»; nunca una serie inventada.
export function SerieDeComprobantes({ puedeCambiar }: { puedeCambiar: boolean }) {
  return (
    <Suspense fallback={<EsqueletoTarjetas tarjetas={1} />}>
      <Serie puedeCambiar={puedeCambiar} />
    </Suspense>
  )
}

async function Serie({ puedeCambiar }: { puedeCambiar: boolean }) {
  const lectura = await leerSerieVigente()
  if (!lectura.ok) {
    return <ErrorDeLectura titulo="No se pudo cargar la serie" />
  }
  return <TarjetaDeLaSerie vigente={lectura.data} puedeCambiar={puedeCambiar} />
}
