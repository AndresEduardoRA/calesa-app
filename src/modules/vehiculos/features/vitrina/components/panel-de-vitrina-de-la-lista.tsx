'use client'

import type { OrigenResumen } from '@/modules/origenes/client'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import type { CampoDeVehiculo } from '../../../entities/campo'
import type { DatosDelPanelDeVitrina } from '../../../entities/paneles-de-la-lista'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import { FormularioDeVitrina } from './formulario-de-vitrina'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El vehículo que pide la URL (`para`); null si falta.
  esperado: string | null
  // Lo que leyó el servidor al abrirse; null o de otro vehículo mientras llega.
  datos: DatosDelPanelDeVitrina | null
  permiso: PermisoDeVitrina
  origen: OrigenResumen
  fases: readonly { id: string; nombre: string }[]
  campos: readonly CampoDeVehiculo[]
}

// La forma del formulario de la vitrina mientras llega el vehículo.
function EsqueletoDeVitrina() {
  return (
    <div aria-busy className="grid gap-4">
      <Skeleton className="h-10 rounded-(--radius-md)" />
      <Skeleton className="h-24 rounded-(--radius-md)" />
      <Skeleton className="h-40 rounded-(--radius-card)" />
    </div>
  )
}

// El panel completo de «Publicar en la web» (el de la ficha: interruptor, precio público, rango, nota, destacado y «Así lo verá el visitante»), abierto
// desde el inventario sin salir de la lista (`?panel=vitrina&para=<id>`). Sin el permiso no se abre, aunque la URL lo pida.
export function PanelDeVitrinaDeLaLista(props: Props) {
  const { abierto, alCerrar, esperado, datos, permiso, origen, fases, campos } = props
  const listo = datos !== null && datos.id === esperado
  return (
    <Drawer
      abierto={abierto && permiso.estado === 'habilitado'}
      alCerrar={alCerrar}
      titulo="Publicar en la web"
      descripcion={listo && datos.disponible ? datos.vehiculo.titulo : undefined}
    >
      {esperado === null || (listo && !datos.disponible) ? (
        <EstadoVacio
          titulo="No existe o no tienes acceso"
          descripcion="Puede que se haya eliminado, o que esté en un origen que no ves."
        />
      ) : listo && datos.disponible ? (
        // Arranca de lo guardado cada vez que cambia la versión del vehículo.
        <FormularioDeVitrina
          key={datos.vehiculo.actualizadoEn}
          vehiculo={datos.vehiculo}
          origen={origen}
          fase={fases.find((fase) => fase.id === datos.vehiculo.faseId) ?? null}
          campos={campos}
          previa={datos.previa}
          alCerrar={alCerrar}
        />
      ) : (
        <EsqueletoDeVitrina />
      )}
    </Drawer>
  )
}
