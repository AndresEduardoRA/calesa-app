import { datosO } from '@/shared/lib/errores'
import { leerTablasDeReferencia } from '../../../areas/tablas/composicion'
import { ListaDeTablas } from './lista-de-tablas'
import { TablaAbierta } from './tabla-abierta'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
  // `?tabla=`: la tabla que se edita.
  tablaPedida: string | undefined
}

// La pestaña «Tablas» de un origen en Configuración › Cotización (4.23-3), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: las tablas de
// referencia del origen. La base vuelve a decidir (policy `tablas_referencia: leer`). Una lectura que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
// Con `?tabla=`, el editor ocupa el lugar de la lista (como el de la fórmula).
export async function SeccionDeLasTablas({ origen, tablaPedida }: Props) {
  const lectura = datosO(await leerTablasDeReferencia(origen.id))
  return (
    <div className="grid min-w-0 gap-4">
      {tablaPedida === undefined ? (
        <ListaDeTablas origen={origen} lectura={lectura} />
      ) : (
        <TablaAbierta
          origen={origen}
          item={lectura.tablas.find((tabla) => tabla.id === tablaPedida)}
        />
      )}
    </div>
  )
}
