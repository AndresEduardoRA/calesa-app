'use client'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Skeleton } from '@/shared/ui/skeleton'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { leerComprobantesDelResumen } from '../../../../areas/comprobantes/composicion.client'
import { seVenLosComprobantes } from '../../../../entities/comprobantes/acceso'
import {
  numeroDeComprobante,
  type ComprobanteDeLaCotizacion,
} from '../../../../entities/comprobantes/comprobante'
import type { PropsDeLosComprobantesDelResumen } from '../../../hoja/components/huecos-del-resumen'

const TEXTO = 'text-(length:--text-sm) text-(--color-ink-soft)'

function Fila({ comprobante }: { comprobante: ComprobanteDeLaCotizacion }) {
  const numero = numeroDeComprobante(comprobante.serie, comprobante.numero)
  const vigente = comprobante.anuladoEn === null
  return (
    <li className="grid min-w-0 gap-1" data-comprobante={numero}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-(--color-ink)">{numero}</span>
        <Badge variant={vigente ? 'secondary' : 'destructive'}>
          {vigente ? 'Vigente' : 'Anulado'}
        </Badge>
      </p>
      <p className={TEXTO}>
        Emitido el {formatearFechaHora(comprobante.emitidoEn)}
        {comprobante.emitidoPor ? ` por ${comprobante.emitidoPor}` : ''}
      </p>
      {comprobante.anuladoEn === null ? null : (
        <p className={`${TEXTO} break-words`}>
          Anulado el {formatearFechaHora(comprobante.anuladoEn)}
          {comprobante.anuladoPor ? ` por ${comprobante.anuladoPor}` : ''}
          {comprobante.motivo ? `: ${comprobante.motivo}` : ''}
        </p>
      )}
    </li>
  )
}

// Los comprobantes de la cotización abierta en el resumen, bajo sus adjuntos: la misma regla de la guardada (se ven en una final o si ya tiene alguno; si no, nada) y de sólo lectura:
// emitir y anular son de la guardada. Se lee al abrir la pestaña «Adjuntos». Si la lectura falla lo dice acá, sin tocar los adjuntos.
export function ComprobantesDelResumen({ cotizacionId, clase }: PropsDeLosComprobantesDelResumen) {
  const { lectura, reintentar } = useLecturaAlMontar(
    () => leerComprobantesDelResumen(cotizacionId),
    cotizacionId,
  )
  if (lectura.estado === 'leyendo') {
    return clase === 'final' ? (
      <div aria-busy="true" aria-label="Cargando los comprobantes" className="grid gap-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ) : null
  }
  if (lectura.estado === 'fallo') {
    return clase === 'final' ? (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className={TEXTO}>No se pudieron cargar los comprobantes.</p>
        <Button type="button" variant="outline" size="sm" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    ) : null
  }
  const { filas, hayMas } = lectura.dato
  if (!seVenLosComprobantes(clase, filas)) {
    return null
  }
  return (
    <section aria-label="Comprobantes" className="grid min-w-0 gap-2">
      <h3 className="text-(length:--text-base) font-semibold text-(--color-ink)">Comprobantes</h3>
      {filas.length === 0 ? (
        <p className={TEXTO}>Todavía no tiene comprobantes.</p>
      ) : (
        <ul className="grid min-w-0 gap-3">
          {filas.map((comprobante) => (
            <Fila key={comprobante.id} comprobante={comprobante} />
          ))}
        </ul>
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={`Mostrando los ${String(TAMANO_DE_VER_MAS)} más recientes.`}
          camino="Para ver el resto, abre la cotización."
        />
      ) : null}
    </section>
  )
}
