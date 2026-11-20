import { datosO } from '@/shared/lib/errores'
import {
  leerDisenoDelOrigen,
  leerNivelesDelDiseno,
  leerTonosDelCatalogo,
} from '../../../areas/diseno/composicion'
import type { FormulaDelOrigen } from '../../../entities/formula-del-origen'
import { DisenoDelOrigenDiferido } from './diferidos'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
  // La fórmula del origen que abre la URL: la ruta ya la leyó por id y origen.
  formula: FormulaDelOrigen
}

// La pestaña «Hoja» de la Fórmula de un origen (Configuración › Orígenes) (el diseño de la hoja, 4.22-2), leída en el servidor con la sesión de quien mira y detrás de
// `<Suspense>`: el borrador o la publicada y los niveles. La base vuelve a decidir (policy `formulas: leer`). Una lectura que falla sube al
// `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDelDiseno({ origen, formula }: Props) {
  const [leida, niveles, catalogo] = await Promise.all([
    leerDisenoDelOrigen(formula.id),
    leerNivelesDelDiseno(),
    leerTonosDelCatalogo(),
  ])
  // El tono es adorno: si su lectura falla, la vista previa se dibuja sin colores, el color de una sección no se elige (`catalogo` nulo) y la pestaña sigue.
  const tonos = catalogo.ok
    ? catalogo.data.tonos.map((t) => ({
        clave: t.clave,
        claro: t.colores.claro,
        oscuro: t.colores.oscuro,
      }))
    : []
  return (
    <DisenoDelOrigenDiferido
      origen={origen}
      formulaDelOrigenId={formula.id}
      leida={datosO(leida)}
      niveles={datosO(niveles)}
      tonos={tonos}
      catalogo={
        catalogo.ok ? catalogo.data.tonos.map((t) => ({ clave: t.clave, nombre: t.nombre })) : null
      }
    />
  )
}
