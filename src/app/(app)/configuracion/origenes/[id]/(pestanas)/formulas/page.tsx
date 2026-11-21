import type { Metadata } from 'next'
import { Suspense } from 'react'
import { leerOrigenes } from '@/modules/origenes'
import { SeccionDeLasFormulas } from '@/modules/cotizaciones/pantallas/formulas-del-origen'
import { datosO } from '@/shared/lib/errores'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'

export const metadata: Metadata = { title: 'Fórmulas del origen' }

// Configuración › Orígenes › un origen › Fórmulas: las fórmulas del origen (la activa primero), con «Nueva fórmula» (`?panel=nueva-formula`, `&copia=<id>` al
// copiar) y el «⋯» de cada una (`?panel=renombrar-formula|activar-formula|archivar-formula|eliminar-formula&formula=<id>`). Cada fórmula se edita en
// `…/formulas/<fórmula>/planilla|hoja|tarjeta`. Los orígenes (de cuáles se copia) son los de la empresa, leídos una vez por request (`leerOrigenes()`).
export default async function PaginaDeLasFormulas({
  params,
}: PageProps<'/configuracion/origenes/[id]/formulas'>) {
  const abierto = await abrirOrigen((await params).id, 'formulas')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const { id, nombre } = abierto.origen
  const origenes = datosO(await leerOrigenes()).map((otro) => ({
    id: otro.id,
    nombre: otro.nombre,
  }))
  return (
    <div className="grid max-w-4xl min-w-0 gap-4">
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={4} />}>
        <SeccionDeLasFormulas
          origen={{ id, nombre }}
          origenes={origenes}
          permisos={abierto.sesion.permisos}
        />
      </Suspense>
    </div>
  )
}
