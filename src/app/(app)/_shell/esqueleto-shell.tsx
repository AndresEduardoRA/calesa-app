import { codigoDelGuionDelMenu } from '@/shared/lib/menu-plegado'
import { EsqueletoBandeja } from '@/shared/ui/esqueletos'
import { Skeleton } from '@/shared/ui/skeleton'

// La forma del marco mientras se resuelve la sesión: es lo que Next sirve como cáscara estática.
export function EsqueletoShell() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="flex min-h-dvh flex-1">
      <aside
        data-barra-lateral=""
        // El guion de abajo la marca plegada antes de pintar, si la persona la dejó así en este navegador.
        suppressHydrationWarning
        className="group/lateral hidden h-dvh w-(--sidebar) shrink-0 flex-col border-r border-(--color-line) bg-(--color-surface) data-plegado:w-(--sidebar-plegado) md:flex"
      >
        <div className="flex h-(--topbar) items-center border-b border-(--color-line) px-4 group-data-plegado/lateral:justify-center group-data-plegado/lateral:px-0">
          <Skeleton className="h-6 w-36 group-data-plegado/lateral:w-7" />
        </div>
        <div className="grid gap-1.5 p-2">
          {Array.from({ length: 5 }, (_, entrada) => (
            <Skeleton key={entrada} className="h-(--fila) w-full" />
          ))}
        </div>
      </aside>
      <script dangerouslySetInnerHTML={{ __html: codigoDelGuionDelMenu() }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-(--topbar) items-center gap-2 border-b border-(--color-line) bg-(--color-surface) px-3 md:px-5">
          <Skeleton className="h-9 w-full max-w-sm" />
          <Skeleton className="ml-auto size-8 rounded-(--radius-pill)" />
        </div>
        <div className="flex-1 p-4 md:p-6">
          <EsqueletoBandeja />
        </div>
      </div>
    </div>
  )
}
