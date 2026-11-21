import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { leerFormulasDelOrigen } from '../../../areas/formulas-del-origen/composicion'
import { origenesParaCopiar } from '../../../entities/formulas-del-origen/copiar'
import { ListaDeFormulas } from './lista-de-formulas'

type Props = {
  // El origen abierto (la página ya comprobó `cotizaciones.configurar` en él; este módulo no depende de `origenes`).
  origen: { id: string; nombre: string }
  // Los orígenes de la empresa y los permisos de quien mira: de cuáles puede copiar una fórmula.
  origenes: readonly { id: string; nombre: string }[]
  permisos: Permisos
}

// La pestaña «Fórmulas» de la página del origen, leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: las fórmulas sin archivar con sus
// piezas de hoy. La base vuelve a decidir (policy `formulas_del_origen: leer`). Una lectura que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDeLasFormulas({ origen, origenes, permisos }: Props) {
  const lectura = datosO(await leerFormulasDelOrigen(origen.id))
  return (
    <ListaDeFormulas
      origen={origen}
      lectura={lectura}
      origenesParaCopiar={origenesParaCopiar(origenes, permisos, origen.id).map(
        ({ id, nombre }) => ({ id, nombre }),
      )}
    />
  )
}
