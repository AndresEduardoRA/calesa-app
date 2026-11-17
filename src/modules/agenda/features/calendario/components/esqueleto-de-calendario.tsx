import { Skeleton } from '@/shared/ui/skeleton'
import { EsqueletoDePendientes } from '../../pendientes/components/esqueleto-de-pendientes'

const HORAS = Array.from({ length: 12 }, (_, indice) => indice)

// Mientras llega la agenda: el título, la barra, las filas de la hoja del día y la columna de pendientes. Un Server Component que no trae la barra ni las vistas
// (el esqueleto de una ruta no debe sumar sus chunks al JS en frío).
export function EsqueletoDeCalendario() {
  return (
    <div aria-busy="true" aria-label="Cargando la agenda" className="@container/agenda grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-48 max-w-full" />
      </div>
      <Skeleton className="h-8 w-80 max-w-full" />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 @3xl/agenda:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid gap-1">
          {HORAS.map((hora) => (
            <Skeleton key={hora} className="h-9" />
          ))}
        </div>
        <EsqueletoDePendientes />
      </div>
    </div>
  )
}
