import type { ReactNode } from 'react'
import type { ClienteDeLaCabecera } from '../../../entities/proyectos/cliente-de-la-cabecera'
import type { ProyectoDetallado } from '../../../entities/proyectos/detalle'
import type { EstadoDelProyecto as Estado } from '../../../entities/proyectos/estado'
import { BotonDeCierre } from './boton-de-cierre'
import { BotonDeEliminarProyecto } from './boton-de-eliminar-proyecto'
import { ClienteDelProyecto } from './cliente-del-proyecto'
import { EstadoDelProyecto } from './estado-del-proyecto'
import { ProyectoExterno } from './vehiculo-de-la-cabecera'

type Props = {
  proyecto: ProyectoDetallado
  // El vehículo de un proyecto con vehículo, ya compuesto por `src/app` (`repuestos` no importa `vehiculos`): el bloque de `vehiculos`, «Vehículo que no puedes ver»
  // o su error con «Reintentar», en su propio `<Suspense>`. Un proyecto externo no lo usa: la cabecera dice sola «Proyecto externo · sin vehículo».
  vehiculo?: ReactNode
  // El cliente ya resuelto por la página (`clienteDeLaCabecera`): el lead, oculto, el nombre escrito o ninguno.
  cliente: ClienteDeLaCabecera
  estado: Estado
  puedeEditar: boolean
  // La hoja no tiene ítems vivos: sólo así se ofrece eliminar el proyecto (8.09-4).
  sinItems?: boolean
  // Lo que va debajo de la cabecera (las pestañas o la hoja).
  children?: ReactNode
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="[overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

// La cabecera de `/repuestos/[id]` (8.09-2, C5): el número y el estado derivado; debajo, el vehículo en un recuadro (lo primero que se busca: de qué vehículo es) o el
// proyecto externo; luego el cliente y las notas; con `repuestos.editar`, cerrar o reabrir (y eliminar, si la hoja no tiene ítems). En el celular se apila y el botón
// ocupa el ancho.
export function CabeceraDeProyecto({
  proyecto,
  vehiculo,
  cliente,
  estado,
  puedeEditar,
  sinItems = false,
  children,
}: Props) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-(length:--text-xl) font-semibold tabular-nums">
              Proyecto #{proyecto.numero}
            </h1>
            <EstadoDelProyecto estado={estado} />
          </div>
          <section
            aria-label="Vehículo"
            className="max-w-xl min-w-0 rounded-(--radius-card) border border-(--color-line) p-3"
          >
            {proyecto.vehiculoId === null ? (
              <ProyectoExterno etiqueta={proyecto.vehiculoEtiqueta} vin={proyecto.vin} />
            ) : (
              vehiculo
            )}
          </section>
          <dl className="grid gap-x-8 gap-y-2 text-(length:--text-sm) sm:grid-cols-2">
            <Dato etiqueta="Cliente">
              <ClienteDelProyecto cliente={cliente} />
            </Dato>
            {proyecto.notas ? <Dato etiqueta="Notas">{proyecto.notas}</Dato> : null}
          </dl>
        </div>
        {puedeEditar ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {sinItems ? (
              <BotonDeEliminarProyecto
                id={proyecto.id}
                numero={proyecto.numero}
                actualizadoEn={proyecto.actualizadoEn}
              />
            ) : null}
            <BotonDeCierre
              id={proyecto.id}
              numero={proyecto.numero}
              actualizadoEn={proyecto.actualizadoEn}
              cerrado={proyecto.cerradoEn !== null}
            />
          </div>
        ) : null}
      </header>
      {children}
    </div>
  )
}
