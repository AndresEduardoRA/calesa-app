import { leerFasesDeOrigen } from '@/modules/flujos'
import { getOrigenes } from '@/modules/origenes'
import { VehiculoQueNoSeVe } from '@/modules/repuestos/pantallas/proyectos'
import type { Vehiculo } from '@/modules/vehiculos'
import { VehiculoEnLaCabecera } from '@/modules/vehiculos/pantallas/proyecto-de-repuestos-cabecera'
import type { Resultado } from '@/shared/lib/errores'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorDelPanel } from './error-del-panel'

export const ERROR_DEL_VEHICULO = 'No pudimos cargar el vehículo.'

// El vehículo de la cabecera de un proyecto, en su propio `<Suspense>` (`docs/UX.md` › «Repuestos: proyecto (estados propios)» › «Vehículo»). `leido` es la lectura que
// la página empezó en paralelo con la hoja: aquí sólo se espera. Se mira `ok` a mano (nunca `datosO`): un error se dice en el recuadro con «Reintentar» y la hoja sigue.
// Nulo = no existe, en la papelera o no se ve (D49). La fase (para la situación) y el nombre del origen son lecturas de configuración cacheadas por pedido: si una
// falla, ese dato no se dibuja.
export async function VehiculoDelProyecto({
  leido,
}: {
  leido: Promise<Resultado<Vehiculo | null>>
}) {
  const resultado = await leido
  if (!resultado.ok) {
    return <ErrorDelPanel titulo={ERROR_DEL_VEHICULO} />
  }
  const vehiculo = resultado.data
  if (vehiculo === null) {
    return <VehiculoQueNoSeVe />
  }
  const [origenes, fases] = await Promise.all([
    getOrigenes(true),
    leerFasesDeOrigen(vehiculo.origenId),
  ])
  const origen = origenes.ok
    ? (origenes.data.find((o) => o.id === vehiculo.origenId)?.nombre ?? null)
    : null
  return (
    <VehiculoEnLaCabecera
      vehiculo={vehiculo}
      origen={origen}
      situacion={fases.ok ? situacionDe(vehiculo.faseId, fases.data) : null}
    />
  )
}

// Sin fase es un dato («Sin fase»); una fase que no está entre las leídas no se adivina: sin insignia.
function situacionDe(
  faseId: string | null,
  fases: readonly { id: string; nombre: string; color: string }[],
) {
  if (faseId === null) return { fase: null }
  const fase = fases.find((f) => f.id === faseId)
  return fase ? { fase } : null
}

// Lo que se ve mientras llega el vehículo: la miniatura (4:3) y dos líneas.
export function EsqueletoDelVehiculo() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="aspect-4/3 w-24 shrink-0" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}
