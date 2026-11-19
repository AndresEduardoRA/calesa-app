'use client'

import { EstadoError } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import type { HermanaEnLaVistaPrevia } from '../../hoja/components/huecos'
import { useModeloDeLaTarjeta, type PaginaDelModelo } from '../hooks/use-modelo-de-la-tarjeta'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

// La tarjeta de la otra opción en la vista previa de una hoja en par (glosario: «Cotizaciones hermanas»): la misma plantilla (la misma versión) con sus números, su
// título y, de una guardada, su número y sus retoques. Sólo se mira: «Retocar» retoca la de la cotización abierta.
export function TarjetaDeLaHermana({
  hermana,
  formulaId,
  monedaBs,
  pagina,
}: {
  hermana: HermanaEnLaVistaPrevia
  formulaId: string
  monedaBs: string | null
  pagina: PaginaDelModelo
}) {
  const { pagina: suya } = hermana
  const modelo = useModeloDeLaTarjeta({
    formulaId,
    calculo: hermana.calculo,
    monedaBs,
    pagina: suya
      ? { ...pagina, titulo: suya.titulo, numero: suya.numero, guardadaEl: suya.guardadaEl }
      : pagina,
    retoques: suya?.retoques ?? null,
    opcion: suya ? undefined : hermana.opcion,
  })
  const { estado, geometria, contexto } = modelo
  return (
    <section
      aria-label={`Tarjeta de ${hermana.opcion}`}
      data-tarjeta-de-la-hermana=""
      className="grid min-w-0 gap-2"
    >
      {estado.tipo === 'cargando' ? (
        <Skeleton className="h-40" />
      ) : geometria === null ? (
        <EstadoError titulo="No se pudo leer la tarjeta." alReintentar={modelo.reintentar} />
      ) : (
        <TarjetaDeCotizacion geometria={geometria} logo={contexto.logo} />
      )}
    </section>
  )
}
